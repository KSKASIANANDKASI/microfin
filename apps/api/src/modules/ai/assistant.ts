/**
 * Portfolio analytics assistant — answers branch staff's questions about
 * collection efficiency, risk and the loan book with Claude.
 *
 * Until the ledger API exists the web app computes the portfolio snapshot and
 * posts it with each turn. Once loans live in Postgres, build the snapshot here
 * from the database instead and stop accepting it from the client.
 */

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const MODEL = 'claude-opus-5';

const client = new Anthropic();

export const chatRequest = z.object({
  locale: z.enum(['en', 'ta']).default('en'),
  messages: z
    .array(z.object({ role: z.enum(['user', 'assistant']), content: z.string().min(1).max(4000) }))
    .min(1)
    .max(40)
    .refine((m) => m[0]?.role === 'user' && m.at(-1)?.role === 'user', 'Conversation must start and end with the user'),
  snapshot: z.record(z.unknown()).refine((s) => JSON.stringify(s).length <= 200_000, 'Snapshot too large'),
});

export type ChatRequest = z.infer<typeof chatRequest>;

const INSTRUCTIONS = `You are the analytics assistant inside Finance Easy, a loan management system used by a local microfinance branch in Tamil Nadu. Your users are branch managers and field collection officers who walk daily, weekly and monthly collection "lines" door to door.

You receive a JSON snapshot of the branch portfolio. Answer only from it; if a question needs data the snapshot does not hold, say what is missing instead of estimating. Key definitions:
- Collection efficiency = amount collected / amount due for the period.
- PAR1 / PAR30 = outstanding on loans with any installment more than 0 / 30 days late, as a share of total outstanding.
- Risk score = the rule-based 0-100 score described in risk.scoringMethod; each loan lists the factors that drove it.
- branchAging covers the whole branch ledger; risk.loans is the detailed sample loan book, so their totals differ.

How to answer:
- Lead with the direct answer and the numbers behind it, then concrete next steps an officer can take this week (which line, which borrower, what action).
- Format money in rupees with Indian grouping (₹1,24,500) and use lakh / crore for large figures.
- Keep answers short: a sentence or two, then at most a handful of bullet points. Use "- " for bullets and **bold** sparingly; no tables or headings.
- Name borrowers and loan numbers when it helps follow-up, but never speculate about a borrower's personal circumstances.`;

const LANGUAGE = {
  en: 'Reply in English.',
  ta: 'Reply in Tamil (தமிழ்). Keep loan numbers, line names and figures as they appear in the data.',
} as const;

export type ChatEvent = { type: 'text'; text: string } | { type: 'done' } | { type: 'error'; message: string };

/** Streams the assistant's reply as text chunks, ending with `done` or `error`. */
export async function* chat({ locale, messages, snapshot }: ChatRequest): AsyncGenerator<ChatEvent> {
  const stream = client.beta.messages.stream({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium' },
    system: [
      { type: 'text', text: INSTRUCTIONS, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: `${LANGUAGE[locale]}\n\nPortfolio snapshot:\n${JSON.stringify(snapshot)}` },
    ],
    messages,
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield { type: 'text', text: event.delta.text };
    }
  }

  const final = await stream.finalMessage();
  if (final.stop_reason === 'refusal') {
    yield { type: 'error', message: 'The assistant could not answer that question.' };
    return;
  }
  if (final.stop_reason === 'max_tokens') {
    yield { type: 'error', message: 'The answer was cut short. Try a narrower question.' };
    return;
  }
  yield { type: 'done' };
}

/** A message safe to show staff; details stay in the server log. */
export function describeError(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) return 'The AI service is not configured (check ANTHROPIC_API_KEY).';
  if (error instanceof Anthropic.RateLimitError) return 'The AI service is busy. Please try again in a minute.';
  if (error instanceof Anthropic.APIConnectionError) return 'Could not reach the AI service.';
  if (error instanceof Anthropic.APIError) return `The AI service returned an error (${error.status ?? 'unknown'}).`;
  // Raised before any request is sent — in practice, no credentials resolved.
  if (error instanceof Anthropic.AnthropicError) return 'The AI service is not configured (check ANTHROPIC_API_KEY).';
  return 'Something went wrong while answering.';
}
