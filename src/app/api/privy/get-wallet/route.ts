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
 * GET /api/privy/get-wallet?email=user@example.com&clerkUserId=user_xxx
 * Authentication required via Clerk
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const clerkUserId = searchParams.get('clerkUserId');

    if (!email || !clerkUserId) {
      return NextResponse.json(
        { error: 'Email and clerkUserId are required' },
        { status: 400 }
      );
    }

    // Verify authentication
    const { userId: authUserId } = await auth();
    if (!authUserId || authUserId !== clerkUserId) {
      console.error('[Privy] Authentication failed or user mismatch:', { authUserId, clerkUserId });
      return NextResponse.json(
        { error: 'Unauthorized - Authentication required' },
        { status: 401 }
      );
    }

    // Connect to database
    await connectDB();

    // Strategy: Try to find in DB first, but if not found, create in Privy (Self-healing sync)
    console.log('[Privy] Fetching wallets for email:', email);
    
    let userWallet = await UserWallet.findOne({ email });
    
    let privyUser;
    if (userWallet?.privyUserId) {
      try {
        privyUser = await privyNode.users().get(userWallet.privyUserId);
        console.log('[Privy] Found existing user in Privy via DB record');
      } catch (e) {
        console.log('[Privy] User record in DB but not in Privy, will recreate');
      }
    }

    // If we don't have a privyUser (either never created or sync broken), create/get it
    if (!privyUser) {
      console.log('[Privy] Creating/Getting user from Privy for:', email);
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
        console.log('[Privy] Created new Privy user');
      } catch (error: any) {
        // Handle the case where the user already exists in Privy (Conflict)
        if (error.message?.includes('Input conflict') || error.status === 422) {
          console.log('[Privy] User already exists in Privy, extracting DID from error');
          
          const conflictMatch = error.message?.match(/did:privy:[a-z0-9]+/i);
          const existingDid = conflictMatch ? conflictMatch[0] : null;
          
          if (existingDid) {
            privyUser = await privyNode.users().get(existingDid);
            console.log('[Privy] Retrieved existing Privy user');
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }
    }

    // Extract wallet info
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

    // Update/Sync database record
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

    console.log('[Privy] Database record synced successfully');

    return NextResponse.json({
      success: true,
      privyUserId: privyUser.id,
      wallets: userWallet.wallets,
      tradingWallet: userWallet.tradingWallet || null,
      clerkUserId: userWallet.clerkUserId
    });

  } catch (error: any) {
    console.error('[Privy] Error in get-wallet:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch or create wallet', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}
