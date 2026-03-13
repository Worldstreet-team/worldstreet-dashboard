import { privyClient } from "./client";
import { createViemAccount } from "@privy-io/node/viem";
import { createWalletClient, http } from "viem";
import { mainnet, arbitrum, polygon, optimism, bsc, base } from "viem/chains";

export interface EthereumTransactionParams {
  to: string;
  value?: string; // hex or string
  data?: string;
  gas?: string;
  gasPrice?: string;
  nonce?: number;
  chain_id?: number;
}

const getChain = (chainId: number) => {
  switch (chainId) {
    case 1: return mainnet;
    case 42161: return arbitrum;
    case 137: return polygon;
    case 10: return optimism;
    case 56: return bsc;
    case 8453: return base;
    default: return mainnet; // Default to mainnet
  }
};

/**
 * Send an Ethereum transaction using Privy's native Viem integration
 * Designed to seamlessly execute complex operations like cross-chain Li.Fi bridging.
 */
export async function sendEthereumTransaction(
  walletId: string,
  params: EthereumTransactionParams,
  clerkJwt: string | null // Clerk JWT token for user authorization
) {
  try {
    const wallet = await privyClient.wallets().get(walletId);
    if (!wallet || wallet.chain_type !== "ethereum") {
      throw new Error("Invalid Ethereum wallet");
    }

    console.log('[Privy Ethereum/Viem] Sending transaction from', wallet.address, 'to', params.to);

    const authorizationContext = clerkJwt ? { user_jwts: [clerkJwt] } : undefined;
    if (!authorizationContext) throw new Error("No authorization context available - JWT required");

    // Helper to ensure values are properly hex-encoded as Privy expects
    const toHex = (val?: string | number): string | undefined => {
      if (!val) return undefined;
      if (typeof val === 'string' && val.startsWith('0x')) return val;
      try {
        return `0x${BigInt(val).toString(16)}`;
      } catch (e) {
        return undefined; // fallback if invalid
      }
    };

    const chainId = params.chain_id || 1;

    // Use native Privy server-side SDK which perfectly maps authorization_context headers natively.
    // Explicitly targeting correct JSON-RPC / SDK parameter mappings.
    const txParams = {
      to: params.to,
      value: toHex(params.value) || "0x0",
      data: params.data,
      chain_id: chainId,
      gas_limit: toHex(params.gas),
      gas_price: toHex(params.gasPrice), // Let legacy EIP155 overrides handle gas
      nonce: params.nonce,
    };

    // Remove undefined fields to prevent SDK errors
    Object.keys(txParams).forEach(key => (txParams as any)[key] === undefined && delete (txParams as any)[key]);

    const result = await privyClient.wallets().rpc(walletId, {
      method: "eth_sendTransaction",
      caip2: `eip155:${chainId}`,
      params: {
        transaction: txParams as any
      },
      authorization_context: authorizationContext
    });

    console.log('[Privy Ethereum] Broadcast success:', (result as any).data.hash);

    return {
      transactionHash: (result as any).data.hash,
      status: "success"
    };
  } catch (error: any) {
    console.error('[Privy Ethereum Execution] Error:', error);
    throw new Error(error.message || 'Failed to send ETH transaction');
  }
}

/**
 * Send ETH directly to an address
 */
export async function sendEth(
  walletId: string,
  toAddress: string,
  amountInEth: string,
  clerkJwt: string | null
) {
  const valueInWei = BigInt(Math.floor(parseFloat(amountInEth) * 1e18));
  return sendEthereumTransaction(
    walletId,
    {
      to: toAddress,
      value: valueInWei.toString(),
      chain_id: 1
    },
    clerkJwt
  );
}

/**
 * Get Ethereum wallet balance
 */
export async function getEthereumBalance(walletId: string) {
  const wallet = await privyClient.wallets().get(walletId);
  if (!wallet || wallet.chain_type !== "ethereum") {
    throw new Error("Invalid Ethereum wallet");
  }
  return {
    address: wallet.address
  };
}
