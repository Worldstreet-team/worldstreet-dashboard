import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient as PrivyNodeClient } from '@privy-io/node';
import { UserWallet } from '@/models/UserWallet';
import { connectDB } from '@/lib/mongodb';
import { auth } from "@clerk/nextjs/server";

const privyNode = new PrivyNodeClient({
  appId: process.env.PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!
});

/**
 * POST /api/privy/pregenerate-wallet
 * Create a Privy user with multi-chain wallets
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: authUserId, getToken } = await auth();
    const clerkToken = await getToken();
    
    const { email } = await request.json();

    if (!email || !authUserId || !clerkToken) {
      console.error('[Privy Pregenerate] Missing required auth info:', { email, authUserId, hasToken: !!clerkToken });
      return NextResponse.json(
        { error: 'Authentication and email are required' },
        { status: 400 }
      );
    }

    const clerkUserId = authUserId;

    console.log('[Privy Pregenerate] Process for:', email);

    await connectDB();

    // Helper: Get user profile with Clerk JWT fallback
    const getExistingUser = async (did: string) => {
      try {
        // Try SDK first
        return await privyNode.users().get(did);
      } catch (sdkError: any) {
        console.log('[Privy Pregenerate] SDK get failed, trying fetch fallback with clerkToken');
        // Fallback: Fetch directly using clerkToken as user JWT
        const response = await fetch(`https://api.privy.io/v1/users/${did}`, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${Buffer.from(`${process.env.PRIVY_APP_ID}:${process.env.PRIVY_APP_SECRET}`).toString('base64')}`,
            'privy-app-id': process.env.PRIVY_APP_ID!,
            'privy-user-jwt': clerkToken // Pass the Clerk JWT as the user context
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Privy API fallback failed: ${response.status} - ${errorText}`);
        }
        
        return await response.json();
      }
    };

    // 1. Check DB first
    let userWallet = await UserWallet.findOne({ email });
    if (userWallet?.privyUserId) {
      console.log('[Privy Pregenerate] User found in DB');
      try {
        const verifyUser = await getExistingUser(userWallet.privyUserId);
        if (verifyUser) {
          return NextResponse.json({
            success: true,
            privyUserId: userWallet.privyUserId,
            wallets: userWallet.wallets,
            tradingWallet: userWallet.tradingWallet || null
          });
        }
      } catch (e) {
        console.log('[Privy Pregenerate] DB record recovery failed, attempting create/get conflict');
      }
    }

    // 2. Try to create or get from Privy
    let privyUser;
    try {
      privyUser = await privyNode.users().create({
        linked_accounts: [
          { type: 'custom_auth', custom_user_id: clerkUserId },
          { type: 'email', address: email }
        ],
        wallets: [
          { chain_type: 'ethereum' },
          { chain_type: 'solana' },
          { chain_type: 'sui' },
          { chain_type: 'ton' },
          { chain_type: 'tron' }
        ]
      });
      console.log('[Privy Pregenerate] Created new user:', privyUser.id);
    } catch (error: any) {
      if (error.message?.includes('Input conflict') || error.status === 422) {
        console.log('[Privy Pregenerate] Conflict detected, extracting DID');
        const conflictMatch = error.message?.match(/did:privy:[a-z0-9]+/i);
        const existingDid = conflictMatch ? conflictMatch[0] : (error.cause || null);
        
        if (existingDid) {
          console.log('[Privy Pregenerate] Attempting get for DID:', existingDid);
          privyUser = await getExistingUser(existingDid as string);
          console.log('[Privy Pregenerate] Retrieved existing user profile');
        } else {
          throw error;
        }
      } else {
        throw error;
      }
    }

    // 3. Extract wallet info
    const wallets: any = {};
    const chainTypes = ['ethereum', 'solana', 'sui', 'ton', 'tron'];
    const accounts = (privyUser as any).linkedAccounts || (privyUser as any).linked_accounts || [];

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

    // 4. Update/Create DB record
    userWallet = await UserWallet.findOneAndUpdate(
      { email },
      {
        email,
        clerkUserId,
        privyUserId: privyUser.id,
        wallets
      },
      { upsert: true, new: true }
    );

    console.log('[Privy Pregenerate] Synced with database');

    return NextResponse.json({
      success: true,
      privyUserId: privyUser.id,
      wallets: userWallet.wallets,
      tradingWallet: userWallet.tradingWallet || null
    });

  } catch (error: any) {
    console.error('[Privy Pregenerate] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process wallet request', details: error.message },
      { status: 500 }
    );
  }
}