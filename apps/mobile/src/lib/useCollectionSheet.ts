import { useSyncExternalStore } from 'react';
import { getCollectionSheet, subscribeCollectionSheet } from './data';

/** Today's collection sheet; re-renders when an installment is receipted. */
export function useCollectionSheet() {
  return useSyncExternalStore(subscribeCollectionSheet, getCollectionSheet, getCollectionSheet);
}
