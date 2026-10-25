/**
 * Sign-in against the Spring API (`/api/v1/auth/*`, backed by PostgreSQL) and
 * the session it hands back. "Keep me signed in" keeps the session in
 * localStorage; otherwise it lives in sessionStorage and ends with the tab.
 */

import { t } from '@lms/i18n';

export const API_URL: string = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export type SessionUser = {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  role: 'ADMIN' | 'MANAGER' | 'LOAN_OFFICER';
  status: 'ACTIVE' | 'SUSPENDED';
  company: string;
};

export type Session = { token: string; expiresAt: string; user: SessionUser };

/** A failed API call, carrying the server's error code and a message fit to show. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

const STORAGE_KEY = 'lms.session';

function stores(): Storage[] {
  try {
    return [localStorage, sessionStorage];
  } catch {
    return []; // storage blocked: the session lasts as long as the page
  }
}

let current: Session | null = null;

/** Managers and admins approve, disburse, set up lines and run reports; loan officers work the field. */
export function isManager(): boolean {
  const role = getSession()?.user.role;
  return role === 'ADMIN' || role === 'MANAGER';
}

export function getSession(): Session | null {
  if (!current) {
    for (const store of stores()) {
      try {
        const saved = store.getItem(STORAGE_KEY);
        if (saved) {
          current = JSON.parse(saved) as Session;
          break;
        }
      } catch {
        // unreadable entry: treat as signed out
      }
    }
  }
  if (current && Date.parse(current.expiresAt) <= Date.now()) clearSession();
  return current;
}

function saveSession(session: Session, remember: boolean) {
  current = session;
  const [local, tab] = stores();
  try {
    (remember ? tab : local)?.removeItem(STORAGE_KEY);
    (remember ? local : tab)?.setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // kept in memory only
  }
}

export function clearSession() {
  current = null;
  for (const store of stores()) {
    try {
      store.removeItem(STORAGE_KEY);
    } catch {
      // nothing to clear
    }
  }
}

/** Maps the API's error codes to translated copy; unknown codes fall back to a generic line. */
function messageFor(code: string, serverMessage?: string): string {
  switch (code) {
    case 'BAD_CREDENTIALS':
      return t('auth.errors.badCredentials');
    case 'TOO_MANY_ATTEMPTS':
      return t('auth.errors.tooManyAttempts');
    case 'RESET_LINK_INVALID':
      return t('auth.reset.invalidLink');
    case 'FORBIDDEN':
      return t('auth.errors.suspended');
    case 'UNAUTHENTICATED':
      return t('auth.errors.sessionExpired');
    case 'WRONG_PASSWORD':
      return t('settings.changePassword.wrongCurrent');
    default:
      // Business-rule refusals (an installment not yet due, a duplicate application...) carry their own copy.
      return serverMessage || t('auth.errors.generic');
  }
}

async function send<T>(method: string, path: string, body: unknown, token?: string): Promise<T> {
  const form = body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1${path}`, {
      method,
      headers: {
        // fetch sets the multipart boundary itself.
        ...(body === undefined || form ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : form ? body : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', t('auth.errors.network'));
  }
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { code?: string; message?: string };
    const code = error.code ?? 'UNKNOWN';
    if (response.status === 401 && token) clearSession();
    throw new ApiError(response.status, code, messageFor(code, error.message));
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

function post<T>(path: string, body: unknown, token?: string): Promise<T> {
  return send<T>('POST', path, body, token);
}

/** An authenticated call as the signed-in user; `body` may be JSON-able or `FormData`. */
export function api<T>(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE', path: string, body?: unknown): Promise<T> {
  const session = getSession();
  if (!session) return Promise.reject(new ApiError(401, 'UNAUTHENTICATED', messageFor('UNAUTHENTICATED')));
  return send<T>(method, path, body, session.token);
}

/** Headers for requests made outside `api`, such as KYC photos and the assistant stream. */
export function authHeaders(): Record<string, string> {
  const session = getSession();
  return session ? { Authorization: `Bearer ${session.token}` } : {};
}

export async function signIn(email: string, password: string, remember: boolean): Promise<Session> {
  const session = await post<Session>('/auth/sign-in', { email: email.trim(), password, remember });
  saveSession(session, remember);
  return session;
}

export type SignUpInput = { companyName: string; fullName: string; email: string; phone: string; password: string };

/** Registers a company with its first admin; the new admin is signed in for this tab. */
export async function signUp(input: SignUpInput): Promise<Session> {
  const session = await post<Session>('/auth/sign-up', {
    ...input,
    email: input.email.trim(),
    phone: input.phone.replace(/\D/g, ''),
  });
  saveSession(session, false);
  return session;
}

/** Asks for a reset link. Succeeds whether or not the email has an account. */
export async function requestPasswordReset(email: string): Promise<void> {
  await post('/auth/forgot-password', { email: email.trim() });
}

/** Sets a new password with the token from an emailed reset link. The link works once. */
export async function resetPassword(token: string, password: string): Promise<void> {
  await post('/auth/reset-password', { token, password });
}

/** The server revokes the old token, so the fresh session it returns replaces it where it was kept. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const session = getSession();
  if (!session) throw new ApiError(401, 'UNAUTHENTICATED', messageFor('UNAUTHENTICATED'));
  let remembered = false;
  try {
    remembered = localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    // storage blocked
  }
  const next = await post<Session>('/auth/change-password', { currentPassword, newPassword }, session.token);
  saveSession(next, remembered);
}

/** The copy to show for anything a save can throw. */
export function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : t('auth.errors.generic');
}
