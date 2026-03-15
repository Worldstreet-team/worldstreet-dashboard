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

    console.log('[Futures Wallet] Database check result:', {
      userWalletExists: !!userWallet,
      hasChains: !!userWallet?.chains,
      hasArbitrum: !!userWallet?.chains?.arbitrum,
      arbitrumAddress: userWallet?.chains?.arbitrum?.address,
      arbitrumWalletId: userWallet?.chains?.arbitrum?.walletId
    });

    if (userWallet?.chains?.arbitrum?.address && userWallet?.chains?.arbitrum?.walletId) {
      console.log('[Futures Wallet] User already has complete Arbitrum wallet');
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
        console.log('[Futures Wallet] Attempting to get existing Privy user:', userWallet.privyUserId);
        privyUser = await privyNode.users().get(userWallet.privyUserId);
        console.log('[Futures Wallet] Found existing Privy user:', privyUser.id);
      } catch (error) {
        console.log('[Futures Wallet] Privy user not found, will create new one. Error:', error);
        privyUser = null;
      }
    }

    if (!privyUser) {
      console.log('[Futures Wallet] Creating new Privy user for clerkUserId:', clerkUserId);
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
      console.log('[Futures Wallet] Privy user linked_accounts:', privyUser.linked_accounts?.length || 0);
    }

    // Extract Arbitrum wallet from Privy user
    console.log('[Futures Wallet] Extracting wallet from Privy user...');
    
    // First, try to find wallet in linked_accounts
    const linkedWallets = (privyUser as any).linked_accounts?.filter(
      (account: any) => account.type === 'wallet' && account.chain_type === 'ethereum'
    ) || [];

    console.log('[Futures Wallet] Found', linkedWallets.length, 'wallets in linked_accounts');

    let arbitrumWallet = linkedWallets[0]; // Get the first Ethereum wallet

    if (!arbitrumWallet) {
      // If no wallet exists in linked_accounts, check the wallets API
      console.log('[Futures Wallet] No wallet found in linked_accounts, checking wallets API...');
      
      const userWallets = [];
      for await (const wallet of privyNode.wallets().list({ 
        user_id: privyUser.id,
        chain_type: 'ethereum' 
      })) {
        userWallets.push(wallet);
        console.log('[Futures Wallet] Found wallet via API:', wallet.address);
      }
      
      if (userWallets.length > 0) {
        arbitrumWallet = userWallets[0];
        console.log('[Futures Wallet] Using wallet from API:', arbitrumWallet.address);
      } else {
        console.log('[Futures Wallet] No wallets found via API, this should not happen');
        throw new Error('No Ethereum wallet found for user');
      }
    } else {
      console.log('[Futures Wallet] Using wallet from linked_accounts:', arbitrumWallet.address);
    }

    if (!arbitrumWallet || !arbitrumWallet.address) {
      throw new Error('Failed to create or find Arbitrum wallet with valid address');
    }

    console.log('[Futures Wallet] Final wallet details:', {
      id: arbitrumWallet.id,
      address: arbitrumWallet.address,
      chainType: arbitrumWallet.chain_type
    });

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

    console.log('[Futures Wallet] Saving wallet data to database...');

    userWallet = await UserWallet.findOneAndUpdate(
      { clerkUserId },
      walletData,
      { upsert: true, new: true }
    );

    console.log('[Futures Wallet] Database save result:', {
      saved: !!userWallet,
      arbitrumWallet: userWallet?.chains?.arbitrum?.address,
      walletId: userWallet?.chains?.arbitrum?.walletId
    });

    // Verify the save worked
    if (!userWallet?.chains?.arbitrum?.address) {
      throw new Error('Database save failed - wallet address not found after save');
    }

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