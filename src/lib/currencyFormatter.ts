/**
 * Currency formatting utilities
 */

interface CompactOptions {
  currency?: string;
  decimals?: number;
  compact?: boolean;
  compactThreshold?: number;
}

/**
 * Format currency in compact form (e.g., 1.5L, 25Cr)
 */
export function formatCurrencyCompact(
  amount: number,
  options: CompactOptions = {}
): string {
  const { currency = 'INR', decimals = 2, compactThreshold = 100000 } = options;

  const symbol = currency === 'INR' ? '\u20B9' : currency === 'USD' ? '$' : currency;

  if (Math.abs(amount) < compactThreshold) {
    return `${symbol}${amount.toLocaleString('en-IN', {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    })}`;
  }

  // Indian numbering system
  if (currency === 'INR') {
    if (Math.abs(amount) >= 10000000) {
      return `${symbol}${(amount / 10000000).toFixed(1)}Cr`;
    }
    if (Math.abs(amount) >= 100000) {
      return `${symbol}${(amount / 100000).toFixed(1)}L`;
    }
  }

  // Western numbering
  if (Math.abs(amount) >= 1000000000) {
    return `${symbol}${(amount / 1000000000).toFixed(1)}B`;
  }
  if (Math.abs(amount) >= 1000000) {
    return `${symbol}${(amount / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(amount) >= 1000) {
    return `${symbol}${(amount / 1000).toFixed(1)}K`;
  }

  return `${symbol}${amount.toLocaleString('en-IN')}`;
}

/**
 * Format currency in full form (e.g., ₹1,50,000.00)
 */
export function formatCurrencyFull(
  amount: number,
  currency: string = 'INR'
): string {
  try {
    return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    const symbol = currency === 'INR' ? '\u20B9' : currency === 'USD' ? '$' : currency;
    return `${symbol}${amount.toLocaleString('en-IN')}`;
  }
}
