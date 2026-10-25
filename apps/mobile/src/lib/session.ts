/**
 * Sign-in against the Spring API (`/api/v1/auth/*`, backed by PostgreSQL) and
 * the session it hands back. "Keep me signed in" saves the session to
 * AsyncStorage; otherwise it lasts until the app is closed.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { t } from '@lms/i18n';

const API_PORT = 4000;

/**
 * `EXPO_PUBLIC_API_URL` wins when set. Otherwise the API is assumed to run on
 * the machine serving the JS bundle, which is the address a phone on the LAN
 * (or the Android emulator) already reaches it by.
 */
function resolveApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'web' && typeof location !== 'undefined') return `http://${location.hostname}:${API_PORT}`;
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  return `http://${host || (Platform.OS === 'android' ? '10.0.2.2' : 'localhost')}:${API_PORT}`;
}

export const API_URL = resolveApiUrl();

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

let current: Session | null = null;
let remembered = false;

/** Reads a saved session before the first render; the navigator opens on it. */
export async function loadSession(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved) {
      current = JSON.parse(saved) as Session;
      remembered = true;
    }
  } catch {
    // unreadable: start signed out
  }
}

/** Managers and admins approve, disburse, set up lines and run reports; loan officers work the field. */
export function isManager(): boolean {
  const role = getSession()?.user.role;
  return role === 'ADMIN' || role === 'MANAGER';
}

export function getSession(): Session | null {
  if (current && Date.parse(current.expiresAt) <= Date.now()) clearSession();
  return current;
}

function saveSession(session: Session, remember: boolean) {
  current = session;
  remembered = remember;
  const write = remember
    ? AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    : AsyncStorage.removeItem(STORAGE_KEY);
  write.catch(() => {
    // kept in memory only
  });
}

export function clearSession() {
  current = null;
  remembered = false;
  AsyncStorage.removeItem(STORAGE_KEY).catch(() => {
    // nothing to clear
  });
}

/** Maps the API's error codes to translated copy; unknown codes fall back to a generic line. */
function messageFor(code: string, serverMessage?: string): string {
  switch (code) {
    case 'BAD_CREDENTIALS':
      return t('auth.errors.badCredentials');
    case 'TOO_MANY_ATTEMPTS':
      return t('auth.errors.tooManyAttempts');
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
  const form = typeof FormData !== 'undefined' && body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/v1${path}`, {
      method,
      headers: {
        // fetch sets the multipart boundary itself.
        ...(body === undefined || form ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : form ? (body as FormData) : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, 'NETWORK', t('auth.errors.network'));
  }
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { code?: string; message?: string };
    const code = error.code ?? 'UNKNOWN';
    if (response.status === 401 && token) clearSession();
    // FORBIDDEN means a suspended account at sign-in, but a role that may not do this anywhere else.
    const forbiddenAction = code === 'FORBIDDEN' && !path.startsWith('/auth/');
    throw new ApiError(response.status, code, forbiddenAction ? error.message || t('auth.errors.generic') : messageFor(code, error.message));
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

/** Headers for resources fetched outside `api`, such as KYC photos shown by `<Image>`. */
export function authHeaders(): Record<string, string> {
  const session = getSession();
  return session ? { Authorization: `Bearer ${session.token}` } : {};
}

export async function signIn(email: string, password: string, remember: boolean): Promise<Session> {
  const session = await post<Session>('/auth/sign-in', { email: email.trim(), password, remember });
  saveSession(session, remember);
  return session;
}

/** The server revokes the old token, so the fresh session it returns replaces it. */
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const session = getSession();
  if (!session) throw new ApiError(401, 'UNAUTHENTICATED', messageFor('UNAUTHENTICATED'));
  const next = await post<Session>('/auth/change-password', { currentPassword, newPassword }, session.token);
  saveSession(next, remembered);
}
