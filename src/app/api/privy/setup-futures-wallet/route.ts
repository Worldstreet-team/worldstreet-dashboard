import { NextRequest, NextResponse } from 'next/server';
import { privyClient } from '@/lib/privy/client';
import { UserWallet } from '@/models/UserWallet';
import { connectDB } from '@/lib/mongodb';

/**
 * POST /api/privy/setup-futures-wallet
 * Create or get Arbitrum wallet for futures trading
 */
export async function POST(request: NextRequest) {
  try {
    const { clerkUserId } = await request.json();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: 'clerkUserId is required' },
        { status: 400 }
      );
    }

    console.log('[Futures Wallet] Setting up wallet for user:', clerkUserId);

    // Connect to database
    await connectDB();

    // Check if user already has a wallet
    let userWallet = await UserWallet.findOne({ clerkUserId });

    if (userWallet?.chains?.arbitrum) {
      console.log('[Futures Wallet] User already has Arbitrum wallet');
      return NextResponse.json({
        success: true,
        wallet: {
          address: userWallet.chains.arbitrum.address,
          walletId: userWallet.chains.arbitrum.walletId
        },
        source: 'existing'
      });
    }

    // Get or create Privy user
    let privyUser;
    if (userWallet?.privyUserId) {
      try {
        privyUser = await (privyClient as any).users().get(userWallet.privyUserId);
      } catch (error) {
        console.log('[Futures Wallet] Privy user not found, creating new one');
        privyUser = null;
      }
    }

    if (!privyUser) {
      // Create new Privy user with Arbitrum wallet
      privyUser = await (privyClient as any).users().create({
        linked_accounts: [
          {
            type: 'custom_auth',
            custom_user_id: clerkUserId
          }
        ],
        wallets: [
          { chain_type: 'ethereum' } // Arbitrum uses ethereum chain type
        ]
      });

      console.log('[Futures Wallet] Created new Privy user:', privyUser.id);
    }

    // Extract Arbitrum wallet
    const accounts = (privyUser as any).linked_accounts || [];
    const arbitrumWallet = accounts.find(
      (account: any) => account.type === 'wallet' && account.chain_type === 'ethereum'
    );

    if (!arbitrumWallet) {
      throw new Error('Failed to create Arbitrum wallet');
    }

    // Update or create user wallet record
    const walletData = {
      clerkUserId,
      privyUserId: privyUser.id,
      chains: {
        ...userWallet?.chains,
        arbitrum: {
          walletId: arbitrumWallet.id,
          address: arbitrumWallet.address,
          publicKey: arbitrumWallet.public_key || null
        }
      }
    };

    userWallet = await UserWallet.findOneAndUpdate(
      { clerkUserId },
      walletData,
      { upsert: true, new: true }
    );

    console.log('[Futures Wallet] Arbitrum wallet setup complete:', arbitrumWallet.address);

    return NextResponse.json({
      success: true,
      wallet: {
        address: arbitrumWallet.address,
        walletId: arbitrumWallet.id
      },
      source: 'created'
    });

  } catch (error: any) {
    console.error('[Futures Wallet] Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to setup futures wallet',
        details: error.message 
      },
      { status: 500 }
    );
  }
}