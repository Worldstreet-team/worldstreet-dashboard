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

    // Fetch clearinghouse, spot state, spotMeta, and allMids in parallel
    const info = new (await import("@nktkas/hyperliquid")).InfoClient({
      transport: new (await import("@nktkas/hyperliquid")).HttpTransport({ isTestnet: false })
    });

    const [accountState, spotAccountState, spotMeta, allMids] = await Promise.all([
      hyperliquid.getAccount(address),
      hyperliquid.getSpotAccount(address),
      info.spotMeta(),
      info.allMids(),
    ]) as [any, any, any, Record<string, string>];

    // Build coin → universe name mapping for allMids price lookup
    const coinToMidKey: Record<string, string> = {};
    for (const entry of (spotMeta?.universe ?? [])) {
      const baseTokenIdx = entry.tokens[0];
      const baseToken = spotMeta.tokens[baseTokenIdx];
      if (baseToken?.name) {
        coinToMidKey[baseToken.name] = entry.name; // e.g. "HYPE" → "HYPE/USDC" or "@107"
      }
    }

    // Extract spot balances from spotAccountState
    const spotBalances = spotAccountState?.balances || [];
    
    // Find USDC balance in spot
    const usdcSpotBalance = spotBalances.find((balance: any) => balance.coin === "USDC");
    
    // Parse balances with P&L data
    const balances = spotBalances.map((balance: any) => {
      const coin = balance.coin;
      const total = parseFloat(balance.total || "0");
      const hold = parseFloat(balance.hold || "0");
      const available = total - hold;
      const entryNtl = parseFloat(balance.entryNtl || "0");

      // Get current price from allMids
      let currentPrice = 0;
      if (coin === "USDC") {
        currentPrice = 1;
      } else {
        const midKey = coinToMidKey[coin];
        if (midKey && allMids[midKey]) {
          currentPrice = parseFloat(allMids[midKey]);
        }
      }

      // Calculate P&L for non-USDC tokens with holdings
      const entryPrice = total > 0 && entryNtl > 0 ? entryNtl / total : 0;
      const currentValue = total * currentPrice;
      const unrealizedPnl = coin !== "USDC" && total > 0 ? currentValue - entryNtl : 0;
      const unrealizedPnlPercent =
        coin !== "USDC" && entryNtl > 0
          ? ((currentValue - entryNtl) / entryNtl) * 100
          : 0;

      return {
        coin,
        total,
        available,
        hold,
        entryNtl,
        entryPrice,
        currentPrice,
        currentValue,
        unrealizedPnl,
        unrealizedPnlPercent,
      };
    });

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