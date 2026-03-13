import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient } from '@privy-io/server-auth';
import { UserWallet } from '@/models/UserWallet';
import { connectDB } from '@/lib/mongodb';

const privy = new PrivyClient(
  process.env.PRIVY_APP_ID!,
  process.env.PRIVY_APP_SECRET!
);

/**
 * POST /api/privy/refresh-wallet
 * Delete old wallet data and fetch fresh data from Privy
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    console.log('[Privy] Refreshing wallet data for email:', email);

    // Connect to database
    await connectDB();

    // Delete existing record
    const deleteResult = await UserWallet.deleteOne({ email });
    console.log('[Privy] Deleted old records:', deleteResult.deletedCount);

    // Fetch user from Privy
    let user;
    try {
      user = await privy.getUserByEmail(email);
      console.log('[Privy] User found in Privy:', user.id);
    } catch (error) {
      return NextResponse.json(
        { error: 'User not found in Privy. Please create wallets first.' },
        { status: 404 }
      );
    }

    // Extract all wallet information
    console.log('[Privy] User data:', JSON.stringify(user, null, 2));
    
    const wallets: any = {};
    const chainTypes = ['ethereum', 'solana', 'sui', 'ton', 'tron'];

    // Try both linkedAccounts (camelCase) and linked_accounts (snake_case)
    const accounts = (user as any).linkedAccounts || (user as any).linked_accounts || [];
    
    console.log('[Privy] Found accounts:', accounts.length);

    for (const chainType of chainTypes) {
      const wallet = accounts.find(
        (account: any) => 
          account.type === 'wallet' && 
          (account.chainType === chainType || account.chain_type === chainType)
      );

      if (wallet) {
        wallets[chainType] = {
          walletId: wallet.id,
          address: wallet.address,
          publicKey: wallet.publicKey || wallet.public_key || null
        };
        console.log(`[Privy] ${chainType}:`, wallet.address);
      }
    }

    // Save fresh data to database
    const userWallet = await UserWallet.create({
      email,
      privyUserId: user.id,
      wallets
    });

    console.log('[Privy] Fresh wallet data saved to database');

    return NextResponse.json({
      success: true,
      privyUserId: user.id,
      wallets,
      message: 'Wallet data refreshed successfully'
    });
  } catch (error: any) {
    console.error('[Privy] Error refreshing wallet:', error);
    return NextResponse.json(
      { 
        error: 'Failed to refresh wallet data',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
