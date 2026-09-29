import { useSyncExternalStore } from 'react';
import { getApplications, subscribeApplications } from './data';

/** The live application queue; re-renders when anything is submitted or decided. */
export function useApplications() {
  return useSyncExternalStore(subscribeApplications, getApplications, getApplications);
}
