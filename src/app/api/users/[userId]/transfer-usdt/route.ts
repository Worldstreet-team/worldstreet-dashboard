import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey, Transaction, Keypair } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { convertDisplayToRaw } from "@/lib/wallet/amounts";
import { decryptWithPIN } from "@/lib/wallet/encryption";
import { connectDB } from "@/lib/mongodb";
import DashboardProfile from "@/models/DashboardProfile";

const SOL_RPC =
  process.env.NEXT_PUBLIC_SOL_RPC ||
  "https://solana-mainnet.g.alchemy.com/v2/uvE7piT7UVw4cgmTePITN";

// USDT on Solana (SPL Token)
const USDT_MINT = "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";
const USDT_DECIMALS = 6;

interface TransferRequest {
  pin: string;
  recipient: string;
  amount: number;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const userId = params.userId;

    if (!userId) {
      return NextResponse.json(
        { success: false, message: "User ID is required" },
        { status: 400 }
      );
    }

    const body: TransferRequest = await request.json();
    const { pin, recipient, amount } = body;

    // Validate inputs
    if (!pin || !recipient || !amount) {
      return NextResponse.json(
        { success: false, message: "PIN, recipient, and amount are required" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, message: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Validate recipient address
    try {
      new PublicKey(recipient);
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid recipient address" },
        { status: 400 }
      );
    }

    await connectDB();
    const profile = await DashboardProfile.findOne({
      authUserId: userId,
    });

    if (!profile) {
      return NextResponse.json(
        { success: false, message: "User profile not found" },
        { status: 404 }
      );
    }

    // Check if user has Solana wallet
    if (!profile.wallets?.solana?.address || !profile.wallets?.solana?.encryptedPrivateKey) {
      return NextResponse.json(
        { success: false, message: "No Solana wallet found" },
        { status: 400 }
      );
    }

    const solanaAddress = profile.wallets.solana.address;
    const encryptedKey = profile.wallets.solana.encryptedPrivateKey;

    try {
      // Decrypt the private key with PIN
      const privateKeyBase64 = decryptWithPIN(encryptedKey, pin);
      const secretKey = new Uint8Array(Buffer.from(privateKeyBase64, "base64"));
      const keypair = Keypair.fromSecretKey(secretKey);
      const fromAddress = keypair.publicKey.toBase58();

      // Verify the keypair matches the stored address
      if (fromAddress !== solanaAddress) {
        return NextResponse.json(
          { success: false, message: "PIN verification failed" },
          { status: 401 }
        );
      }

      const connection = new Connection(SOL_RPC);
      const mintPubkey = new PublicKey(USDT_MINT);
      const recipientPubkey = new PublicKey(recipient);

      // Get associated token addresses
      const fromAta = await getAssociatedTokenAddress(
        mintPubkey,
        keypair.publicKey
      );
      const toAta = await getAssociatedTokenAddress(
        mintPubkey,
        recipientPubkey
      );

      const transaction = new Transaction();

      // Check if recipient ATA exists
      const toAtaInfo = await connection.getAccountInfo(toAta);
      if (!toAtaInfo) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            keypair.publicKey,
            toAta,
            recipientPubkey,
            mintPubkey
          )
        );
      }

      // Add transfer instruction
      transaction.add(
        createTransferInstruction(
          fromAta,
          toAta,
          keypair.publicKey,
          BigInt(convertDisplayToRaw(amount, USDT_DECIMALS))
        )
      );

      // Get latest blockhash and sign
      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = keypair.publicKey;
      transaction.sign(keypair);

      // Send transaction
      const signature = await connection.sendRawTransaction(
        transaction.serialize(),
        { maxRetries: 5, skipPreflight: false }
      );

      return NextResponse.json({
        success: true,
        transactionHash: signature,
        from: solanaAddress,
        to: recipient,
        amount,
        mint: USDT_MINT,
        decimals: USDT_DECIMALS,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Transfer failed";
      
      // Check if it's a PIN error
      if (errorMessage.includes("decrypt") || errorMessage.includes("PIN")) {
        return NextResponse.json(
          { success: false, message: "Invalid PIN" },
          { status: 401 }
        );
      }

      console.error("Transfer error:", error);
      return NextResponse.json(
        { success: false, message: errorMessage },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Transfer API error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Failed to process transfer",
      },
      { status: 500 }
    );
  }
}
