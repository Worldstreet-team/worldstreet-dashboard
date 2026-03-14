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

    // 0. Preliminary: Get existing record to know which wallet we prioritized as "Trading"
    const existingRecord = await UserWallet.findOne({ email });
    const prioritizedAddress = existingRecord?.tradingWallet?.address?.toLowerCase();

    // Fetch user from Privy
    const user = await privy.getUserByEmail(email);
    
    if (!user) {
      console.error('[Privy] User not found for email:', email);
      return NextResponse.json(
        { error: 'User data not found in Privy.' },
        { status: 404 }
      );
    }

    console.log('[Privy] User found in Privy:', user.id);

    const castUser = user as any;
    const wallets: any = {};
    const chainTypes = ['ethereum', 'solana', 'sui', 'ton', 'tron'];
    const accounts = castUser.linkedAccounts || castUser.linked_accounts || [];

    // First pass to find all wallets
    const allEthWallets = accounts.filter(
      (acc: any) => acc.type === 'wallet' && (acc.chainType === 'ethereum' || acc.chain_type === 'ethereum')
    );

    for (const chainType of chainTypes) {
      if (chainType === 'ethereum' && allEthWallets.length > 0) {
        // Find the wallet that matches our prioritized trading address, or fallback to the first one
        const wallet = allEthWallets.find((w: any) => w.address.toLowerCase() === prioritizedAddress) || allEthWallets[0];
        wallets[chainType] = {
          walletId: wallet.id,
          address: wallet.address,
          publicKey: wallet.publicKey || wallet.public_key || null
        };
      } else {
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
    }

    // Unified Wallet: Force tradingwallet to match main wallet
    const updatedTradingWallet = {
      walletId: wallets.ethereum?.walletId || "",
      address: wallets.ethereum?.address || "",
      chainType: 'ethereum',
      initialized: true
    };

    const userWallet = await UserWallet.findOneAndUpdate(
      { email },
      { 
        $set: { 
          privyUserId: user.id,
          wallets: wallets,
          tradingWallet: updatedTradingWallet
        }
      },
      { upsert: true, new: true }
    );

    console.log('[Privy] Wallet data updated and Unified in database');

    return NextResponse.json({
      success: true,
      privyUserId: user.id,
      wallets,
      tradingWallet: updatedTradingWallet,
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

