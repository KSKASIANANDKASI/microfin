/**
 * Client for the analytics assistant (`POST /ai/chat` on apps/api). The reply
 * streams back as server-sent events, one JSON object per `data:` line.
 */

import { getLocale } from '@lms/i18n';
import { portfolioSnapshot } from './analytics';

export const API_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export type ChatMessage = { role: 'user' | 'assistant'; content: string };

type ChatEvent = { type: 'text'; text: string } | { type: 'done' } | { type: 'error'; message: string };

/**
 * Sends the conversation and calls `onText` with each chunk of the reply.
 * Rejects with a message fit to show when the request or the model fails.
 */
export async function askAssistant(
  messages: ChatMessage[],
  onText: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch(`${API_URL}/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locale: getLocale(), messages, snapshot: portfolioSnapshot() }),
    signal,
  });

  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => undefined);
    throw new Error((body as { error?: string } | undefined)?.error ?? `HTTP ${response.status}`);
  }

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;

    let boundary: number;
    while ((boundary = buffer.indexOf('\n\n')) >= 0) {
      const frame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      if (!frame.startsWith('data: ')) continue;

      const event = JSON.parse(frame.slice(6)) as ChatEvent;
      if (event.type === 'text') onText(event.text);
      else if (event.type === 'error') throw new Error(event.message);
      else return;
    }
  }
}
