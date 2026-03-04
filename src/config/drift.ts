/**
 * Drift Protocol Configuration
 * 
 * Contains public configuration for Drift integration.
 * Master wallet public key is used for fee collection only.
 */

export const DRIFT_CONFIG = {
  // Drift Program ID on Solana
  PROGRAM_ID: process.env.NEXT_PUBLIC_DRIFT_PROGRAM_ID || 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH',
  
  // Master wallet public address for fee collection
  // Users send fees to this address when depositing collateral
  MASTER_WALLET_ADDRESS: "3eeHwZi4uRNmXJ4zs6167xR5ZvLfPa9kTwLJ8gaN9J7T",
  
  // Fee percentage (5%)
  FEE_PERCENTAGE: 0.05,
  
  // Solana RPC URL
  RPC_URL: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://solana-mainnet.g.alchemy.com/v2/uvE7piT7UVw4cgmTePITN',
} as const;

/**
 * Calculate fee amount from deposit
 */
export function calculateFee(amount: number): { fee: number; netAmount: number } {
  const fee = amount * DRIFT_CONFIG.FEE_PERCENTAGE;
  const netAmount = amount - fee;
  return { fee, netAmount };
}
