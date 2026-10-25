import { useSyncExternalStore } from 'react';
import { getPortfolioVersion, subscribePortfolio } from './data';

/** Re-renders whenever the portfolio is reloaded or a write lands; the value is a change counter. */
export function usePortfolio() {
  return useSyncExternalStore(subscribePortfolio, getPortfolioVersion, getPortfolioVersion);
}
