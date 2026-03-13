import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient as PrivyNodeClient } from '@privy-io/node';
import { UserWallet } from '@/models/UserWallet';
import { connectDB } from '@/lib/mongodb';

const privyNode = new PrivyNodeClient({
  appId: process.env.PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!
});

/**
 * GET /api/privy/get-wallet?email=user@example.com&clerkUserId=user_xxx
 * Get or create multi-chain wallets for a user by email
 * Optionally links a Clerk user ID via custom_auth
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const clerkUserId = searchParams.get('clerkUserId');

    if (!email) {
      return NextResponse.json(
        { error: 'Missing email parameter' },
        { status: 400 }
      );
    }

    console.log('[Privy] Fetching/creating wallets for email:', email);
    if (clerkUserId) {
      console.log('[Privy] Clerk user ID provided:', clerkUserId);
    }

    // Connect to database
    await connectDB();

    // Check if we have a database record
    let userWallet = await UserWallet.findOne({ email });
    
    // If we have a DB record, verify the Privy user still exists
    if (userWallet?.privyUserId) {
      try {
        const existingUser = await privyNode.users().get(userWallet.privyUserId);
        
        if (existingUser) {
          console.log('[Privy] Found existing user in Privy:', existingUser.id);
          
          // If clerkUserId is provided and not already saved, update the DB record
          if (clerkUserId && userWallet.clerkUserId !== clerkUserId) {
            console.log('[Privy] Updating Clerk user ID in database');
            userWallet.clerkUserId = clerkUserId;
            await userWallet.save();
          }
          
          // Return the existing wallet data from DB
          return NextResponse.json({
            success: true,
            privyUserId: userWallet.privyUserId,
            wallets: userWallet.wallets,
            clerkUserId: userWallet.clerkUserId,
            source: 'database'
          });
        }
      } catch (fetchError) {
        console.log(
          `[Privy] Privy user ID not found (${userWallet.privyUserId}), deleting old DB record`
        );
        // Privy user was deleted externally: remove db record
        await UserWallet.deleteOne({ email });
        userWallet = null;
      }
    }

    // If we get here, we need to create a new user
    console.log('[Privy] Creating new user with wallets');
    
    // Build linked accounts array
    const linkedAccounts: any[] = [
      { type: 'email', address: email }
    ];
    
    // Add custom_auth if clerkUserId is provided
    if (clerkUserId) {
      linkedAccounts.unshift({
        type: 'custom_auth',
        custom_user_id: clerkUserId
      });
      console.log('[Privy] Adding custom_auth linked account for Clerk user');
    }
    
    const user = await privyNode.users().create({
      linked_accounts: linkedAccounts,
      wallets: [
        { chain_type: 'ethereum' },
        { chain_type: 'solana' },
        { chain_type: 'sui' },
        { chain_type: 'ton' },
        { chain_type: 'tron' }
      ]
    });

    console.log('[Privy] User created with wallets:', user.id);

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
        console.log(`[Privy] Found ${chainType} wallet:`, wallet.address);
      } else {
        console.log(`[Privy] No ${chainType} wallet found`);
      }
    }

    // Save to database (update if exists, create if not)
    userWallet = await UserWallet.findOneAndUpdate(
      { email },
      {
        email,
        clerkUserId: clerkUserId || null,
        privyUserId: user.id,
        wallets
      },
      { upsert: true, new: true }
    );

    console.log('[Privy] Wallets saved to database');

    return NextResponse.json({
      success: true,
      privyUserId: user.id,
      wallets,
      clerkUserId: clerkUserId || null,
      source: 'privy'
    });
  } catch (error: any) {
    console.error('[Privy] Error fetching/creating wallet:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch or create wallet',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
