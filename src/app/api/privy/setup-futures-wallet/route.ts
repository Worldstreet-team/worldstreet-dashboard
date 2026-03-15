import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient as PrivyNodeClient } from '@privy-io/node';
import { UserWallet } from '@/models/UserWallet';
import { connectDB } from '@/lib/mongodb';

const privyNode = new PrivyNodeClient({
  appId: process.env.PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!
});

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
        privyUser = await privyNode.users().get(userWallet.privyUserId);
      } catch (error) {
        console.log('[Futures Wallet] Privy user not found, creating new one');
        privyUser = null;
      }
    }

    if (!privyUser) {
      // Create new Privy user with Arbitrum wallet
      privyUser = await privyNode.users().create({
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

    // Extract Arbitrum wallet from Privy user
    const wallets = (privyUser as any).linked_accounts?.filter(
      (account: any) => account.type === 'wallet' && account.chain_type === 'ethereum'
    ) || [];

    let arbitrumWallet = wallets[0]; // Get the first Ethereum wallet

    if (!arbitrumWallet) {
      // If no wallet exists, we need to list the wallets using the wallets API
      console.log('[Futures Wallet] No wallet found in linked_accounts, checking wallets API...');
      
      const userWallets = [];
      for await (const wallet of privyNode.wallets().list({ 
        user_id: privyUser.id,
        chain_type: 'ethereum' 
      })) {
        userWallets.push(wallet);
      }
      
      if (userWallets.length > 0) {
        arbitrumWallet = userWallets[0];
        console.log('[Futures Wallet] Found wallet via wallets API:', arbitrumWallet.address);
      } else {
        throw new Error('No Ethereum wallet found for user');
      }
    }

    if (!arbitrumWallet) {
      throw new Error('Failed to create or find Arbitrum wallet');
    }

    console.log('[Futures Wallet] Found/created wallet:', arbitrumWallet.address);

    // Update or create user wallet record
    const walletData = {
      clerkUserId,
      privyUserId: privyUser.id,
      email: (privyUser as any).email || `${clerkUserId}@temp.local`, // Provide a default email if none exists
      chains: {
        ...userWallet?.chains,
        arbitrum: {
          walletId: arbitrumWallet.id,
          address: arbitrumWallet.address,
          publicKey: arbitrumWallet.public_key || null
        }
      },
      // Preserve existing wallet data
      wallets: userWallet?.wallets || {},
      tradingWallet: userWallet?.tradingWallet || {}
    };

    console.log('[Futures Wallet] Saving wallet data:', {
      clerkUserId,
      privyUserId: privyUser.id,
      arbitrumAddress: arbitrumWallet.address
    });

    userWallet = await UserWallet.findOneAndUpdate(
      { clerkUserId },
      walletData,
      { upsert: true, new: true }
    );

    console.log('[Futures Wallet] Database save result:', {
      saved: !!userWallet,
      arbitrumWallet: userWallet?.chains?.arbitrum?.address
    });

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
    console.error('[Futures Wallet] Error stack:', error.stack);
    
    return NextResponse.json(
      { 
        error: 'Failed to setup futures wallet',
        details: error.message,
        debug: {
          errorType: error.constructor.name,
          privyError: error.privyError || null,
          mongoError: error.code || null
        }
      },
      { status: 500 }
    );
  }
}