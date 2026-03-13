import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongodb";
import { UserWallet } from "@/models/UserWallet";
import { createAuthorizationContext } from "@/lib/privy/authorization";
import { privyClient } from "@/lib/privy/client";
import { createViemAccount } from "@privy-io/node/viem";
import { createPublicClient, http, parseUnits, encodeFunctionData } from "viem";
import { mainnet, arbitrum, arbitrumSepolia } from "viem/chains";

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
  {
    constant: true,
    inputs: [{ name: "_owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "balance", type: "uint256" }],
    type: "function",
  },
] as const;

// Config for USDC on Arbitrum (Hyperliquid uses Arbitrum)
const CONFIG = {
  chain: process.env.NODE_ENV === 'production' ? arbitrum : arbitrumSepolia,
  usdcAddress: process.env.NODE_ENV === 'production'
    ? '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' // Arbitrum USDC
    : '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d', // Sepolia USDC
  ethChainId: 1,
  rbChainId: 42161,
  arbSepoliaChainId: 421614
};

export async function POST(request: NextRequest) {
  try {
    const { userId: authUserId, getToken } = await auth();
    if (!authUserId) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { amount, asset = "USDC" } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, error: "Invalid amount" }, { status: 400 });
    }

    await connectDB();
    
    // First attempt: Find by clerkUserId
    let userWallet = await UserWallet.findOne({ clerkUserId: authUserId });
    console.log(`[Internal Transfer] Lookup by clerkUserId (${authUserId}): ${userWallet ? 'Found ✓' : 'Not Found ✗'}`);
    
    // Fallback: If not found by Clerk ID, try to find by Email if possible
    if (!userWallet) {
      const { currentUser } = await import("@clerk/nextjs/server");
      const clerkUser = await currentUser();
      const email = clerkUser?.emailAddresses[0]?.emailAddress;
      
      if (email) {
        userWallet = await UserWallet.findOne({ email });
        console.log(`[Internal Transfer] Lookup by email (${email}): ${userWallet ? 'Found ✓' : 'Not Found ✗'}`);
        
        // If found by email, link the clerkUserId for future lookups
        if (userWallet && !userWallet.clerkUserId) {
          userWallet.clerkUserId = authUserId;
          await userWallet.save();
          console.log(`[Internal Transfer] Linked clerkUserId ${authUserId} to existing wallet record`);
        }
      }
    }

    if (!userWallet || !userWallet.tradingWallet?.address || !userWallet.wallets?.ethereum?.address) {
      console.log(`[Internal Transfer] Wallet validation failed:`, {
        hasUserWallet: !!userWallet,
        hasTradingWallet: !!userWallet?.tradingWallet?.address,
        hasMainWallet: !!userWallet?.wallets?.ethereum?.address,
        tradingWallet: userWallet?.tradingWallet,
        mainWallet: userWallet?.wallets?.ethereum
      });

      const missingDetails = [];
      if (!userWallet) missingDetails.push("No wallet record found");
      else {
        if (!userWallet.tradingWallet?.address) missingDetails.push("Trading wallet missing in DB");
        if (!userWallet.wallets?.ethereum?.address) missingDetails.push("Main wallet missing in DB");
      }

      return NextResponse.json({
        success: false,
        error: "Wallets not fully initialized. Please set up your trading wallet first.",
        details: missingDetails.join(", "),
        debug: {
          clerkUserId: authUserId,
          foundEmail: userWallet?.email || 'unknown'
        }
      }, { status: 404 });
    }

    const mainWalletAddress = userWallet.wallets.ethereum.address;
    const tradingWalletAddress = userWallet.tradingWallet.address;
    const mainWalletId = userWallet.wallets.ethereum.walletId;

    console.log(`[Internal Transfer] Validated profiles. Main: ${mainWalletAddress}, Trading: ${tradingWalletAddress}`);

    // Get Auth Context for signing from Main Wallet
    const clerkJwt = await getToken();
    if (!clerkJwt) {
      return NextResponse.json({ success: false, error: "Failed to get auth token" }, { status: 401 });
    }

    const authContext = await createAuthorizationContext(clerkJwt);

    // Initialize Viem account for the Main Wallet
    const viemAccount = createViemAccount(privyClient, {
      walletId: mainWalletId,
      address: mainWalletAddress as `0x${string}`,
    });

    const publicClient = createPublicClient({
      chain: CONFIG.chain,
      transport: http()
    });

    let txHash: `0x${string}`;

    if (asset.toUpperCase() === "ETH") {
      // Native transfer
      txHash = await viemAccount.signTransaction({
        to: tradingWalletAddress as `0x${string}`,
        value: parseUnits(amount.toString(), 18),
        chain: CONFIG.chain,
        account: viemAccount,
      });
    } else {
      // ERC20 transfer (USDC/USDT)
      const tokenAddress = CONFIG.usdcAddress as `0x${string}`;
      const decimals = 6; // USDC is 6 decimals on most chains

      const data = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [tradingWalletAddress as `0x${string}`, parseUnits(amount.toString(), decimals)]
      });

      txHash = await viemAccount.signTransaction({
        to: tokenAddress,
        data,
        chain: CONFIG.chain,
        account: viemAccount,
      });
    }

    console.log(`[Internal Transfer] Transaction sent: ${txHash}`);

    return NextResponse.json({
      success: true,
      data: {
        txHash,
        from: mainWalletAddress,
        to: tradingWalletAddress,
        amount,
        asset
      }
    });

  } catch (error: any) {
    console.error("[Internal Transfer] Error:", error);
    return NextResponse.json({
      success: false,
      error: error.message || "Transfer failed",
      details: error.stack
    }, { status: 500 });
  }
}
