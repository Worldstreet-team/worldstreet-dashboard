/**
 * Token decimals utilities
 */

// Standard token decimals (cached to avoid RPC calls)
const STANDARD_DECIMALS: Record<string, Record<string, number>> = {
  sol: {
    SOL: 9,
    WSOL: 9,
    USDT: 6,
    USDC: 6,
  },
  eth: {
    ETH: 18,
    BTC: 8,
    WBTC: 8,
    USDT: 6,
    USDC: 6,
  },
};

/**
 * Check if a token is standard (has known decimals)
 */
export function isStandardToken(symbol: string): boolean {
  const standardTokens = ['SOL', 'WSOL', 'ETH', 'BTC', 'WBTC', 'USDT', 'USDC'];
  return standardTokens.includes(symbol.toUpperCase());
}

/**
 * Get decimals for a standard token
 */
export function getStandardDecimals(symbol: string, chain: 'sol' | 'eth'): number | null {
  const chainDecimals = STANDARD_DECIMALS[chain];
  if (!chainDecimals) return null;
  
  return chainDecimals[symbol.toUpperCase()] || null;
}

/**
 * Fetch token decimals from blockchain
 */
export async function fetchTokenDecimals(
  tokenAddress: string,
  chain: 'sol' | 'eth',
  userId: string
): Promise<number> {
  try {
    const response = await fetch(
      `/api/users/${userId}/token-decimals?tokenAddress=${tokenAddress}&chain=${chain}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch token decimals');
    }

    const data = await response.json();
    
    if (data.success && typeof data.decimals === 'number') {
      return data.decimals;
    }

    // Fallback to default
    return chain === 'sol' ? 9 : 18;
  } catch (error) {
    console.error('Error fetching token decimals:', error);
    // Fallback to default
    return chain === 'sol' ? 9 : 18;
  }
}

/**
 * Get token decimals (checks standard first, then fetches from blockchain)
 */
export async function getTokenDecimals(
  symbol: string,
  tokenAddress: string | undefined,
  chain: 'sol' | 'eth',
  userId: string
): Promise<number> {
  // Try standard decimals first
  if (isStandardToken(symbol)) {
    const standardDecimals = getStandardDecimals(symbol, chain);
    if (standardDecimals !== null) {
      return standardDecimals;
    }
  }

  // If not standard and we have tokenAddress, fetch from blockchain
  if (tokenAddress) {
    return await fetchTokenDecimals(tokenAddress, chain, userId);
  }

  // Fallback to default
  return chain === 'sol' ? 9 : 18;
}

/**
 * Convert human-readable amount to smallest unit (raw amount)
 */
export function toRawAmount(amount: string, decimals: number): string {
  const [intPart = '0', fracPart = ''] = amount.split('.');
  const paddedFrac = fracPart.padEnd(decimals, '0').slice(0, decimals);
  const rawAmount = (intPart + paddedFrac).replace(/^0+/, '') || '0';
  return rawAmount;
}

/**
 * Convert smallest unit (raw amount) to human-readable amount
 */
export function fromRawAmount(rawAmount: string, decimals: number): string {
  const paddedAmount = rawAmount.padStart(decimals + 1, '0');
  const intPart = paddedAmount.slice(0, -decimals) || '0';
  const fracPart = paddedAmount.slice(-decimals);
  return `${intPart}.${fracPart}`.replace(/\.?0+$/, '');
}
