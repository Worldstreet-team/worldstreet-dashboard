import { privyClient } from "./client";
import { Connection, PublicKey } from "@solana/web3.js";

/**
 * Send SOL to an address using Privy's Solana Kit integration
 */
export async function sendSol(
  walletId: string,
  toAddress: string,
  amountInSol: string,
  clerkJwt: string | null // Clerk JWT token for user authorization
) {
  try {
    // Get the wallet's address from Privy
    const wallet = await privyClient.wallets().get(walletId);
    if (!wallet || wallet.chain_type !== "solana") {
      throw new Error("Invalid Solana wallet");
    }

    console.log('[Privy Solana] Sending', amountInSol, 'SOL from', wallet.address, 'to', toAddress);

    // Convert SOL to lamports (1 SOL = 10^9 lamports)
    const lamports = BigInt(Math.floor(parseFloat(amountInSol) * 1e9));

    // Create authorization context with user's JWT
    const authorizationContext = clerkJwt ? {
      user_jwts: [clerkJwt]
    } : undefined;

    if (!authorizationContext) {
      throw new Error("No authorization context available - JWT required");
    }

    console.log('[Privy Solana] Authorization context created with user JWT');

    // Use Privy's Solana Kit signer
    const { createSolanaKitSigner } = await import('@privy-io/node/solana-kit');
    const {
      address,
      createTransactionMessage,
      pipe,
      setTransactionMessageFeePayerSigner,
      signAndSendTransactionMessageWithSigners,
      appendTransactionMessageInstruction
    } = await import('@solana/kit');

    // Create a Solana Kit signer
    const signer = createSolanaKitSigner(privyClient, {
      walletId,
      address: address(wallet.address),
      caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp", // Solana mainnet
      authorizationContext
    });

    // Create a Solana connection to get recent blockhash
    const connection = new Connection(
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.net"
    );

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();

    // Build the transfer instruction
    const systemProgramId = address("11111111111111111111111111111111");
    
    // Create transfer instruction data (instruction index 2 = transfer)
    const instructionData = new Uint8Array(12);
    instructionData[0] = 2; // Transfer instruction
    instructionData[1] = 0;
    instructionData[2] = 0;
    instructionData[3] = 0;
    // Write lamports as little-endian u64
    const lamportsArray = new BigUint64Array([lamports]);
    instructionData.set(new Uint8Array(lamportsArray.buffer), 4);

    // Build transaction message
    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      (m: any) => setTransactionMessageFeePayerSigner(signer, m),
      (m: any) => ({
        ...m,
        lifetimeConstraint: {
          blockhash,
          lastValidBlockHeight
        }
      }),
      (m: any) => appendTransactionMessageInstruction({
        programAddress: systemProgramId,
        accounts: [
          {
            address: address(wallet.address),
            role: 3, // AccountRole.WRITABLE_SIGNER
          },
          {
            address: address(toAddress),
            role: 1, // AccountRole.WRITABLE
          },
        ],
        data: instructionData,
      }, m)
    );

    // Sign and send the transaction
    const signature = await signAndSendTransactionMessageWithSigners(transactionMessage);

    return {
      signature,
      status: "success"
    };
  } catch (error: any) {
    console.error('[Privy Solana] Send error:', error);
    throw new Error(error.message || 'Failed to send SOL transaction');
  }
}

/**
 * Get Solana wallet balance
 */
export async function getSolanaBalance(walletId: string) {
  const wallet = await privyClient.wallets().get(walletId);
  if (!wallet || wallet.chain_type !== "solana") {
    throw new Error("Invalid Solana wallet");
  }

  const connection = new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL || "https://api.mainnet-beta.solana.net"
  );

  const publicKey = new PublicKey(wallet.address);
  const balance = await connection.getBalance(publicKey);

  return {
    balance: balance / 1e9, // Convert lamports to SOL
    lamports: balance
  };
}
