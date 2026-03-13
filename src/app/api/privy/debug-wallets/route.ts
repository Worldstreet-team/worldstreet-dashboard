import { NextRequest, NextResponse } from "next/server";
import { PrivyClient as PrivyNodeClient } from '@privy-io/node';

const privyNode = new PrivyNodeClient({
  appId: process.env.PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!
});

/**
 * GET /api/privy/debug-wallets?userId=privy_user_id
 * Debug endpoint to test Privy SDK parameter names and wallet structure
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId parameter is required" },
        { status: 400 }
      );
    }

    console.log('[Debug] Testing wallet list for user:', userId);

    // Test different parameter combinations
    const results: any = {
      userId,
      tests: {}
    };

    // Test 1: List all wallets (no filters)
    try {
      const allWallets = [];
      for await (const wallet of privyNode.wallets().list()) {
        allWallets.push({
          id: wallet.id,
          address: wallet.address,
          chain_type: (wallet as any).chain_type,
          chainType: (wallet as any).chainType,
          public_key: (wallet as any).public_key,
          publicKey: (wallet as any).publicKey,
          owner: (wallet as any).owner,
          user_id: (wallet as any).user_id,
          userId: (wallet as any).userId
        });
      }
      results.tests.allWallets = {
        success: true,
        count: allWallets.length,
        sample: allWallets.slice(0, 2)
      };
    } catch (error) {
      results.tests.allWallets = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 2: List with user_id filter
    try {
      const userIdWallets = [];
      for await (const wallet of privyNode.wallets().list({ user_id: userId } as any)) {
        userIdWallets.push({
          id: wallet.id,
          address: wallet.address,
          chain_type: (wallet as any).chain_type
        });
      }
      results.tests.userIdFilter = {
        success: true,
        count: userIdWallets.length,
        wallets: userIdWallets
      };
    } catch (error) {
      results.tests.userIdFilter = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 3: List with userId filter (camelCase)
    try {
      const userIdCamelWallets = [];
      for await (const wallet of privyNode.wallets().list({ userId: userId } as any)) {
        userIdCamelWallets.push({
          id: wallet.id,
          address: wallet.address,
          chain_type: (wallet as any).chain_type
        });
      }
      results.tests.userIdCamelFilter = {
        success: true,
        count: userIdCamelWallets.length,
        wallets: userIdCamelWallets
      };
    } catch (error) {
      results.tests.userIdCamelFilter = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test 4: Get user info
    try {
      const user = await privyNode.users().get(userId);
      results.tests.userInfo = {
        success: true,
        id: user.id,
        linked_accounts: (user as any).linked_accounts?.length || 0,
        linkedAccounts: (user as any).linkedAccounts?.length || 0
      };
    } catch (error) {
      results.tests.userInfo = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    return NextResponse.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error("[Debug Wallets] Error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to debug wallets"
      },
      { status: 500 }
    );
  }
}