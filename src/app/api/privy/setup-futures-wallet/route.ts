import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { PrivyClient as PrivyNodeClient } from '@privy-io/node';
import { UserWallet } from '@/models/UserWallet';
import { connectDB } from '@/lib/mongodb';

const privyNode = new PrivyNodeClient({
  appId: process.env.PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!
});

/**
 * POST /api/privy/setup-futures-wallet
 * 
 * Sets up a dedicated futures trading wallet using Privy
 * Creates a separate Ethereum wallet specifically for futures trading
 * This wallet is independent from the spot trading wallet
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email } = await request.json();
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Connect to database
    await connectDB();

    console.log('[FuturesWallet] Setting up futures wallet for user:', clerkUserId);

    // Find existing user wallet record
    let userWallet = await UserWallet.findOne({ clerkUserId });
    
    // If futures wallet already exists, return it
    if (userWallet?.futuresWallet?.walletId && userWallet?.futuresWallet?.address) {
      console.log('[FuturesWallet] Futures wallet already exists');
      return NextResponse.json({
        success: true,
        source: 'existing',
        futuresWallet: {
          walletId: userWallet.futuresWallet.walletId,
          address: userWallet.futuresWallet.address,
          chainType: userWallet.futuresWallet.chainType,
          initialized: userWallet.futuresWallet.initialized,
        },
      });
    }

    // Get or create Privy user
    let privyUser;
    if (userWallet?.privyUserId) {
      try {
        privyUser = await privyNode.users().get(userWallet.privyUserId);
        console.log('[FuturesWallet] Found existing Privy user');
      } catch (error) {
        console.log('[FuturesWallet] Privy user not found, will create new one');
      }
    }

    // Create Privy user if doesn't exist
    if (!privyUser) {
      console.log('[FuturesWallet] Creating new Privy user for futures');
      try {
        privyUser = await privyNode.users().create({
          linked_accounts: [
            { type: 'custom_auth', custom_user_id: clerkUserId },
            { type: 'email', address: email }
          ],
          wallets: [
            { chain_type: 'ethereum' }, // Primary futures wallet
            { chain_type: 'ethereum' }, // Secondary futures wallet (for separation)
          ]
        });
        console.log('[FuturesWallet] Created new Privy user');
      } catch (error: any) {
        // Handle existing user conflict
        if (error.message?.includes('Input conflict') || error.status === 422) {
          console.log('[FuturesWallet] User already exists in Privy, extracting DID');
          
          const conflictMatch = error.message?.match(/did:privy:[a-z0-9]+/i);
          const existingDid = conflictMatch ? conflictMatch[0] : null;
          
          if (existingDid) {
            privyUser = await privyNode.users().get(existingDid);
            console.log('[FuturesWallet] Retrieved existing Privy user');
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }
    }

    // Find Ethereum wallets for futures trading
    const accounts = (privyUser as any).linkedAccounts || (privyUser as any).linked_accounts || [];
    const ethWallets = accounts.filter(
      (account: any) =>
        account.type === 'wallet' &&
        (account.chainType === 'ethereum' || account.chain_type === 'ethereum')
    );

    if (ethWallets.length === 0) {
      // Create a new Ethereum wallet for futures
      console.log('[FuturesWallet] No Ethereum wallets found, creating new one');
      const newWallet = await privyNode.wallets().create({
        chainType: 'ethereum',
        userId: privyUser.id
      });
      
      ethWallets.push({
        id: newWallet.id,
        address: newWallet.address,
        chainType: 'ethereum'
      });
    }

    // Select futures wallet (prefer second wallet if available, otherwise use first)
    let futuresWallet;
    if (ethWallets.length > 1) {
      // Use second wallet for futures to separate from spot trading
      futuresWallet = ethWallets[1];
      console.log('[FuturesWallet] Using second Ethereum wallet for futures');
    } else {
      // Use first wallet if only one available
      futuresWallet = ethWallets[0];
      console.log('[FuturesWallet] Using primary Ethereum wallet for futures');
    }

    if (!futuresWallet.address) {
      throw new Error('Futures wallet address not found');
    }

    // Update database record
    if (!userWallet) {
      userWallet = new UserWallet({
        email,
        clerkUserId,
        privyUserId: privyUser.id,
        wallets: {},
      });
    }

    // Set futures wallet info
    userWallet.futuresWallet = {
      walletId: futuresWallet.id,
      address: futuresWallet.address,
      chainType: 'ethereum',
      initialized: false,
      marginBalance: '0',
      availableMargin: '0',
      timestamp: new Date(),
    };

    // Update Privy user ID if not set
    if (!userWallet.privyUserId) {
      userWallet.privyUserId = privyUser.id;
    }

    await userWallet.save();

    console.log('[FuturesWallet] Futures wallet setup completed:', {
      walletId: futuresWallet.id,
      address: futuresWallet.address,
    });

    return NextResponse.json({
      success: true,
      source: 'created',
      futuresWallet: {
        walletId: futuresWallet.id,
        address: futuresWallet.address,
        chainType: 'ethereum',
        initialized: false,
      },
      privyUserId: privyUser.id,
    });

  } catch (error: any) {
    console.error('[FuturesWallet] Setup error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to setup futures wallet', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}