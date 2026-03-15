import { NextRequest, NextResponse } from "next/server";
import { hyperliquid } from "@/lib/hyperliquid/simple";
import { UserWallet } from "@/models/UserWallet";
import { connectDB } from "@/lib/mongodb";
import { auth, currentUser } from "@clerk/nextjs/server";

/**
 * GET /api/hyperliquid/balance
 * Get Hyperliquid account balance (USDC and other assets)
 * Uses the authenticated Clerk session — no userId param accepted.
 */
export async function GET(request: NextRequest) {
  try {
    // Always use the authenticated user's ID — ignore query params to prevent IDOR
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Hyperliquid Balance] Fetching balance for user:', clerkUserId);

    // Connect to database
    await connectDB();
    
    // Check well: Try finding by Clerk ID first
    let userWallet = await UserWallet.findOne({ clerkUserId });

    // Fallback: If not found by Clerk ID, try to find by email
    if (!userWallet) {
      const user = await currentUser();
      const email = user?.primaryEmailAddress?.emailAddress;
      
      if (email) {
        console.log('[Hyperliquid Balance] Not found by ID, checking by email:', email);
        userWallet = await UserWallet.findOne({ email });
        
        // If found by email, sync the Clerk ID for future lookups
        if (userWallet && !userWallet.clerkUserId) {
          userWallet.clerkUserId = clerkUserId;
          await userWallet.save();
          console.log('[Hyperliquid Balance] Synced Clerk ID to existing UserWallet record');
        }
      }
    }

    if (!userWallet) {
      return NextResponse.json(
        { 
          error: 'No wallet record found in database. Please ensure your wallet is initialized.',
          code: 'WALLET_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    // Determine which address to use: Priority to specialized Trading Wallet
    let address = '';
    let addressSource = '';

    if (userWallet.tradingWallet?.address) {
      address = userWallet.tradingWallet.address;
      addressSource = 'trading_wallet';
    } else if (userWallet.wallets?.ethereum?.address) {
      address = userWallet.wallets.ethereum.address;
      addressSource = 'main_ethereum_wallet';
    }

    if (!address) {
      return NextResponse.json(
        { 
          error: 'No Ethereum or Trading address found for user',
          code: 'ADDRESS_NOT_FOUND'
        },
        { status: 404 }
      );
    }

    console.log(`[Hyperliquid Balance] Using ${addressSource}:`, address);

    // Fetch both clearinghouse (perp) and spot states in parallel
    const [accountState, spotAccountState] = await Promise.all([
      hyperliquid.getAccount(address),
      hyperliquid.getSpotAccount(address)
    ]) as [any, any];

    // Extract spot balances from spotAccountState (no longer nested in accountState)
    const spotBalances = spotAccountState?.balances || [];
    
    // Find USDC balance in spot
    const usdcSpotBalance = spotBalances.find((balance: any) => balance.coin === "USDC");
    
    // Parse balances into a more usable format
    const balances = spotBalances.map((balance: any) => ({
      coin: balance.coin,
      total: parseFloat(balance.total || "0"),
      available: parseFloat(balance.total || "0") - parseFloat(balance.hold || "0"),
      hold: parseFloat(balance.hold || "0")
    }));

    // Get account equity from clearinghouseState cross margin summary
    const accountValue = accountState?.crossMarginSummary?.accountValue || "0";
    const withdrawable = accountState?.withdrawable || "0";

    return NextResponse.json({
      success: true,
      data: {
        address,
        balances,
        usdcBalance: {
          total: parseFloat(usdcSpotBalance?.total || "0"),
          available: parseFloat(usdcSpotBalance?.total || "0") - parseFloat(usdcSpotBalance?.hold || "0"),
          hold: parseFloat(usdcSpotBalance?.hold || "0")
        },
        accountValue: parseFloat(accountValue),
        withdrawable: parseFloat(withdrawable),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error("[Hyperliquid Balance] Error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to fetch Hyperliquid balance",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}