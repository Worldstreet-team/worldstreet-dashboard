import { privyClient } from "@/lib/privy/client";
import { createAuthorizationContext } from "@/lib/privy/authorization";
import { parseUnits, encodeFunctionData, toHex } from "viem";
import { arbitrum } from "viem/chains";

const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: "_to", type: "address" },
      { name: "_value", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "boolean" }],
    type: "function",
  },
] as const;

// Hyperliquid Bridge2 Configuration
export const HL_BRIDGE_CONFIG = {
  chain: arbitrum,
  chainId: 42161,
  bridgeAddress: '0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7',
  usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', // Arbitrum USDC
  minimumAmount: 5, // 5 USDC minimum (below = lost forever)
};

export interface BridgeTransferParams {
  walletId: string;
  amount: number;
  asset?: 'USDC' | 'ETH';
  clerkJwt: string;
}

export interface BridgeTransferResult {
  success: boolean;
  txHash?: string;
  error?: string;
  details?: string;
}

/**
 * Shared utility for bridging assets to Hyperliquid
 * Handles both USDC (ERC-20 transfer) and ETH (native transfer)
 */
export async function bridgeToHyperliquid({
  walletId,
  amount,
  asset = 'USDC',
  clerkJwt
}: BridgeTransferParams): Promise<BridgeTransferResult> {
  try {
    console.log(`[HL Bridge] Initiating ${asset} bridge: ${amount} from wallet ${walletId}`);

    // Validate minimum amount for USDC
    if (asset === 'USDC' && amount < HL_BRIDGE_CONFIG.minimumAmount) {
      return {
        success: false,
        error: `Minimum deposit is ${HL_BRIDGE_CONFIG.minimumAmount} USDC. Below this amount will be lost forever.`
      };
    }

    // Get authorization context
    const authContext = await createAuthorizationContext(clerkJwt);

    // Build transaction parameters
    let txParams: any = {};

    if (asset === 'ETH') {
      // Native ETH deposit
      txParams = {
        to: HL_BRIDGE_CONFIG.bridgeAddress,
        value: toHex(parseUnits(amount.toString(), 18)),
      };
    } else {
      // USDC deposit (ERC-20 transfer to bridge)
      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [
          HL_BRIDGE_CONFIG.bridgeAddress as `0x${string}`, 
          parseUnits(amount.toString(), 6)
        ]
      });

      txParams = {
        to: HL_BRIDGE_CONFIG.usdcAddress,
        data,
        value: "0x0"
      };
    }

    console.log(`[HL Bridge] Sending sponsored transaction...`);

    // Execute sponsored transaction via Privy
    const result = await (privyClient.wallets() as any).ethereum().sendTransaction(walletId, {
      sponsor: true,
      caip2: `eip155:${HL_BRIDGE_CONFIG.chainId}`,
      params: {
        transaction: txParams
      },
      authorization_context: authContext
    });

    const txHash = result.hash;
    console.log(`[HL Bridge] Transaction successful! Hash: ${txHash}`);

    return {
      success: true,
      txHash,
      details: `${amount} ${asset} bridged to Hyperliquid`
    };

  } catch (error: any) {
    console.error("[HL Bridge] Error:", error);
    
    // Sanitize error message
    let errorMessage = error.message || String(error);
    
    if (errorMessage.includes('insufficient funds')) {
      errorMessage = "Insufficient funds for gas + transfer value.";
    } else if (errorMessage.includes('missing_or_invalid_token')) {
      errorMessage = "Session expired. Please refresh.";
    }

    return {
      success: false,
      error: errorMessage,
      details: error.message
    };
  }
}

/**
 * Utility to check if an amount meets Hyperliquid minimum requirements
 */
export function validateBridgeAmount(amount: number, asset: 'USDC' | 'ETH' = 'USDC'): {
  valid: boolean;
  error?: string;
} {
  if (asset === 'USDC' && amount < HL_BRIDGE_CONFIG.minimumAmount) {
    return {
      valid: false,
      error: `Minimum deposit is ${HL_BRIDGE_CONFIG.minimumAmount} USDC. Below this amount will be lost forever.`
    };
  }

  if (amount <= 0) {
    return {
      valid: false,
      error: "Amount must be greater than 0"
    };
  }

  return { valid: true };
}