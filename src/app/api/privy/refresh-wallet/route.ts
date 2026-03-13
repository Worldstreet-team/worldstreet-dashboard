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

    if (!user) {
       return NextResponse.json(
        { error: 'User data not found.' },
        { status: 404 }
      );
    }

    const wallets: any = {};
    const chainTypes = ['ethereum', 'solana', 'sui', 'ton', 'tron'];
    const accounts = (user as any).linkedAccounts || (user as any).linked_accounts || [];

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
      }
    }

    // Update existing record or create new one, but PRESERVE tradingWallet if it exists
    const userWallet = await UserWallet.findOneAndUpdate(
      { email },
      { 
        $set: { 
          privyUserId: user.id,
          wallets: wallets
        }
      },
      { upsert: true, new: true }
    );

    console.log('[Privy] Wallet data updated in database');

    return NextResponse.json({
      success: true,
      privyUserId: user.id,
      wallets,
      tradingWallet: userWallet.tradingWallet || null,
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
