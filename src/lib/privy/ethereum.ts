import { privyClient } from "./client";

export interface EthereumTransactionParams {
  to: string;
  value?: string; // in wei (hex string)
  data?: string;
  gas?: string;
  gasPrice?: string;
  nonce?: number;
  chain_id?: number;
}

/**
 * Send an Ethereum transaction using Privy's sendTransaction API with proper authorization
 * This method handles transaction building, signing, and broadcasting automatically
 */
export async function sendEthereumTransaction(
  walletId: string,
  params: EthereumTransactionParams,
  clerkJwt: string | null // Clerk JWT token for user authorization
) {
  try {
    // Validate the wallet exists and is an Ethereum wallet
    const wallet = await privyClient.wallets().get(walletId);
    if (!wallet || wallet.chain_type !== "ethereum") {
      throw new Error("Invalid Ethereum wallet");
    }

    console.log('[Privy Ethereum] Sending transaction from', wallet.address, 'to', params.to);

    // Create authorization context with user's JWT
    const authorizationContext = clerkJwt ? {
      user_jwts: [clerkJwt]
    } : undefined;

    if (!authorizationContext) {
      throw new Error("No authorization context available - JWT required");
    }

    console.log('[Privy Ethereum] Authorization context created with user JWT');

    // Use Privy's sendTransaction method with authorization context
    const result = await privyClient.wallets().ethereum().sendTransaction(walletId, {
      caip2: "eip155:1", // Ethereum mainnet
      params: {
        transaction: {
          to: params.to,
          value: params.value || "0x0",
          data: params.data,
          gas: params.gas,
          gasPrice: params.gasPrice,
          nonce: params.nonce,
          chain_id: params.chain_id || 1, // Ethereum mainnet
        }
      }
    }, {
      authorizationContext
    });

    return {
      transactionHash: result.hash,
      status: "success"
    };
  } catch (error: any) {
    console.error('[Privy Ethereum] Send error:', error);
    throw new Error(error.message || 'Failed to send ETH transaction');
  }
}

/**
 * Send ETH to an address
 */
export async function sendEth(
  walletId: string,
  toAddress: string,
  amountInEth: string,
  clerkJwt: string | null // Clerk JWT token for user authorization
) {
  // Convert ETH to wei and then to hex string
  const valueInWei = BigInt(Math.floor(parseFloat(amountInEth) * 1e18));
  const valueHex = "0x" + valueInWei.toString(16);

  return sendEthereumTransaction(
    walletId,
    {
      to: toAddress,
      value: valueHex,
      chain_id: 1 // Ethereum mainnet
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
  
  // Return the wallet address so the caller can query balance via RPC
  return {
    address: wallet.address
  };
}
