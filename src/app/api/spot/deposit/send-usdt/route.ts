import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongodb";
import { UserWallet } from "@/models/UserWallet";
import SpotDeposit from "@/models/SpotDeposit";
import { privyClient } from "@/lib/privy/client";
import { createAuthorizationContext, type AuthorizationContext } from "@/lib/privy/authorization";
import { ensureWalletHasSigner } from "@/lib/privy/ensureWalletSigner";
import { encodeFunctionData, parseUnits } from "viem";
import {
  Connection,
  PublicKey,
  Transaction as SolTransaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";

// Token contracts
const ETH_USDT_ADDRESS = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
const SOL_USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const USDT_DECIMALS = 6;

const ERC20_TRANSFER_ABI = [
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

/**
 * Send USDT from user's Privy wallet to treasury via ERC-20 transfer (Ethereum).
 */
async function sendUsdtEthereum(
  walletId: string,
  treasuryAddress: string,
  amount: number,
  authorizationContext: AuthorizationContext
): Promise<{ txHash: string }> {
  const data = encodeFunctionData({
    abi: ERC20_TRANSFER_ABI,
    functionName: "transfer",
    args: [
      treasuryAddress as `0x${string}`,
      parseUnits(amount.toString(), USDT_DECIMALS),
    ],
  });

  const result = await (privyClient.wallets() as any)
    .ethereum()
    .sendTransaction(walletId, {
      caip2: "eip155:1",
      params: {
        transaction: {
          to: ETH_USDT_ADDRESS,
          data,
          value: "0x0",
        },
      },
      authorization_context: authorizationContext,
    });

  return { txHash: result.hash };
}

/**
 * Send USDT from user's Privy wallet to treasury via SPL transfer (Solana).
 */
async function sendUsdtSolana(
  walletId: string,
  fromAddress: string,
  treasuryAddress: string,
  amount: number,
  authorizationContext: AuthorizationContext
): Promise<{ txHash: string }> {
  const connection = new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
      process.env.NEXT_PUBLIC_SOL_RPC ||
      "https://api.mainnet-beta.solana.com"
  );

  const fromPubkey = new PublicKey(fromAddress);
  const toPubkey = new PublicKey(treasuryAddress);
  const mintPubkey = new PublicKey(SOL_USDT_MINT);

  const fromAta = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
  const toAta = await getAssociatedTokenAddress(mintPubkey, toPubkey);

  const tx = new SolTransaction();
  tx.feePayer = fromPubkey;
  tx.recentBlockhash = (
    await connection.getLatestBlockhash("finalized")
  ).blockhash;

  // Create destination ATA if it doesn't exist
  try {
    await getAccount(connection, toAta);
  } catch {
    tx.add(
      createAssociatedTokenAccountInstruction(
        fromPubkey,
        toAta,
        toPubkey,
        mintPubkey
      )
    );
  }

  const tokenAmount = Math.round(amount * Math.pow(10, USDT_DECIMALS));
  tx.add(createTransferInstruction(fromAta, toAta, fromPubkey, tokenAmount));

  const serialized = tx
    .serialize({ requireAllSignatures: false })
    .toString("base64");

  const result = await (privyClient.wallets() as any)
    .solana()
    .signAndSendTransaction(walletId, {
      caip2: "solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp",
      transaction: serialized,
      authorization_context: authorizationContext,
    });

  return { txHash: result.signature || result.hash };
}

/**
 * POST /api/spot/deposit/send-usdt
 *
 * Server-side Privy send of USDT from user's Sol/Eth wallet to the treasury.
 * Called immediately after deposit initiation.
 */
export async function POST(request: NextRequest) {
  let parsedDepositId: string | null = null;

  try {
    const { userId: clerkUserId, getToken } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { depositId } = await request.json();
    parsedDepositId = depositId;
    if (!depositId) {
      return NextResponse.json(
        { error: "depositId required" },
        { status: 400 }
      );
    }

    const clerkJwt = await getToken();
    if (!clerkJwt) {
      return NextResponse.json(
        { error: "Auth token required" },
        { status: 401 }
      );
    }

    await connectDB();

    const deposit = await SpotDeposit.findOne({
      _id: depositId,
      userId: clerkUserId,
    });
    if (!deposit) {
      return NextResponse.json(
        { error: "Deposit not found" },
        { status: 404 }
      );
    }

    if (!["initiated", "sending_usdt"].includes(deposit.status)) {
      return NextResponse.json(
        {
          error: `Cannot send USDT in status: ${deposit.status}`,
        },
        { status: 400 }
      );
    }

    if (!deposit.treasuryAddress) {
      return NextResponse.json(
        { error: "No treasury address assigned" },
        { status: 400 }
      );
    }

    const userWallet = await UserWallet.findOne({ clerkUserId });
    if (!userWallet) {
      return NextResponse.json(
        { error: "User wallet not found" },
        { status: 404 }
      );
    }

    // Determine source wallet based on deposit chain
    const sourceWallet =
      deposit.depositChain === "solana"
        ? userWallet.wallets?.solana
        : userWallet.wallets?.ethereum;

    if (!sourceWallet?.walletId || !sourceWallet?.address) {
      return NextResponse.json(
        {
          error: `No ${deposit.depositChain} wallet found for this user`,
        },
        { status: 404 }
      );
    }

    // Update status to sending
    deposit.status = "sending_usdt";
    await deposit.save();

    // Ensure the wallet has our server auth key as an additional signer
    // (required for server-side transactions via authorization_private_keys)
    await ensureWalletHasSigner(sourceWallet.walletId);

    // Get Privy authorization context from Clerk JWT
    const authContext = await createAuthorizationContext(clerkJwt);

    console.log(
      `[Spot Deposit Send] Sending ${deposit.depositAmount} USDT from ${sourceWallet.address} (${deposit.depositChain}) to treasury ${deposit.treasuryAddress}`
    );

    let txHash: string;

    if (deposit.depositChain === "solana") {
      const result = await sendUsdtSolana(
        sourceWallet.walletId,
        sourceWallet.address,
        deposit.treasuryAddress,
        deposit.depositAmount,
        authContext
      );
      txHash = result.txHash;
    } else {
      // ethereum
      const result = await sendUsdtEthereum(
        sourceWallet.walletId,
        deposit.treasuryAddress,
        deposit.depositAmount,
        authContext
      );
      txHash = result.txHash;
    }

    // Update deposit with tx hash and advance status
    deposit.depositTxHash = txHash;
    deposit.status = "awaiting_deposit";
    await deposit.save();

    console.log(
      `[Spot Deposit Send] USDT sent: ${txHash} for deposit ${deposit._id}`
    );

    return NextResponse.json({
      success: true,
      txHash,
      deposit: {
        id: deposit._id,
        status: deposit.status,
        depositTxHash: txHash,
      },
    });
  } catch (error: any) {
    console.error("[Spot Deposit Send USDT] Error:", error);

    // Update deposit status to failed in DB so it doesn't stay stuck
    if (parsedDepositId) {
      try {
        await connectDB();
        await SpotDeposit.findByIdAndUpdate(parsedDepositId, {
          status: "failed",
          errorMessage: `USDT send failed: ${error.message}`,
        });
      } catch {
        // Ignore cleanup errors
      }
    }

    return NextResponse.json(
      { error: error.message || "Failed to send USDT" },
      { status: 500 }
    );
  }
}
