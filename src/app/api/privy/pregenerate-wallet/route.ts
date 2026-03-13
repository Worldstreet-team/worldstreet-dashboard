import { NextRequest, NextResponse } from 'next/server';
import { PrivyClient as PrivyNodeClient } from '@privy-io/node';
import { UserWallet } from '@/models/UserWallet';
import { connectDB } from '@/lib/mongodb';

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
    const { clerkUserId, email } = await request.json();

    if (!email || !clerkUserId) {
      return NextResponse.json(
        { error: 'Email and clerkUserId are required' },
        { status: 400 }
      );
    }

    console.log('[Privy] Creating user with wallets for email:', email, 'clerkUserId:', clerkUserId);

    // Try to connect to MongoDB with better error handling
    try {
      await connectDB();
      console.log('[Privy] Database connected successfully');
    } catch (dbError: any) {
      console.error('[Privy] Database connection failed:', dbError.message);
      return NextResponse.json(
        { 
          error: 'Database connection failed', 
          details: dbError.message,
          suggestion: 'Please check your network connection and try again later.'
        },
        { status: 503 }
      );
    }

    // Prevent duplicates
    let userWallet = await UserWallet.findOne({ email });
    if (userWallet) {
      console.log('[Privy] User already exists in database');
      return NextResponse.json({
        success: true,
        privyUserId: userWallet.privyUserId,
        wallets: userWallet.wallets,
        message: 'User already exists'
      });
    }

    // Create Privy user with both custom_auth and email linked
    const privyUser = await privyNode.users().create({
      linked_accounts: [
        {
          type: 'custom_auth',
          custom_user_id: clerkUserId
        },
        {
          type: 'email',
          address: email
        }
      ],
      wallets: [
        { chain_type: 'ethereum' },
        { chain_type: 'solana' },
        { chain_type: 'sui' },
        { chain_type: 'ton' },
        { chain_type: 'tron' }
      ]
    });

    console.log('[Privy] User created:', privyUser.id);

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

    // Save to DB
    userWallet = await UserWallet.create({
      email,
      clerkUserId,
      privyUserId: privyUser.id,
      wallets
    });

    console.log('[Privy] Wallets saved to database');

    return NextResponse.json({
      success: true,
      privyUserId: privyUser.id,
      wallets
    });
  } catch (error: any) {
    console.error('[Privy] Error creating wallets:', error);
    
    // Provide more specific error messages based on error type
    if (error.message?.includes('MongoDB') || error.message?.includes('database')) {
      return NextResponse.json(
        { 
          error: 'Database error', 
          details: error.message,
          suggestion: 'Please try again later or contact support if the issue persists.'
        },
        { status: 503 }
      );
    } else if (error.message?.includes('Privy') || error.status) {
      return NextResponse.json(
        { 
          error: 'Privy API error', 
          details: error.message,
          suggestion: 'Please check your Privy configuration and try again.'
        },
        { status: error.status || 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to create wallets', 
        details: error.message,
        suggestion: 'Please try again later.'
      },
      { status: 500 }
    );
  }
}