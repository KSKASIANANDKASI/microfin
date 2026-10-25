import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ScreenOrientation from 'expo-screen-orientation';

export type RotationMode = 'portrait' | 'auto';

export const ROTATION_MODES: RotationMode[] = ['portrait', 'auto'];

const STORAGE_KEY = 'lms.rotation';

let current: RotationMode = 'portrait';
const listeners = new Set<(mode: RotationMode) => void>();

function isRotationMode(value: unknown): value is RotationMode {
  return value === 'portrait' || value === 'auto';
}

/** Locks to portrait, or hands rotation back to the device's own setting. */
async function apply(mode: RotationMode): Promise<void> {
  try {
    if (mode === 'auto') await ScreenOrientation.unlockAsync();
    else await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  } catch {
    // Not supported here (e.g. web outside fullscreen); the screen stays as it is.
  }
}

/** Restores and applies the saved rotation. Resolves even when storage is unavailable. */
export async function loadRotation(): Promise<void> {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (isRotationMode(saved)) current = saved;
  } catch {
    // Keep the default.
  }
  await apply(current);
}

export function setRotation(mode: RotationMode): void {
  if (mode === current) return;
  current = mode;
  apply(mode);
  AsyncStorage.setItem(STORAGE_KEY, mode).catch(() => {
    // Not persisted; the choice still holds until the app restarts.
  });
  listeners.forEach((fn) => fn(mode));
}

/** The saved rotation mode, re-rendering on change. */
export function useRotation(): [RotationMode, (next: RotationMode) => void] {
  const [mode, setMode] = useState(current);

  useEffect(() => {
    listeners.add(setMode);
    return () => {
      listeners.delete(setMode);
    };
  }, []);

  return [mode, setRotation];
}
