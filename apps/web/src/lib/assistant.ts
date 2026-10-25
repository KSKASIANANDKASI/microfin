/**
 * Client for the analytics assistant (`POST /api/v1/ai/chat`). The API builds
 * the portfolio snapshot itself from the database; the reply streams back as
 * server-sent events, one JSON object per `data:` line.
 */

import { getLocale } from '@lms/i18n';
import { API_URL, authHeaders } from './session';

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
  const response = await fetch(`${API_URL}/api/v1/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ locale: getLocale(), messages }),
    signal,
  });

  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => undefined);
    const error = body as { error?: string; message?: string } | undefined;
    throw new Error(error?.message ?? error?.error ?? `HTTP ${response.status}`);
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
