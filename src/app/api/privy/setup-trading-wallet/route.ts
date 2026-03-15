import { NextRequest, NextResponse } from "next/server";
import { PrivyClient as PrivyNodeClient } from '@privy-io/node';
import { createViemAccount } from '@privy-io/node/viem';
import { UserWallet } from '@/models/UserWallet';
import { connectDB } from '@/lib/mongodb';
import { HyperliquidService } from '@/lib/hyperliquid/client';
import { auth } from "@clerk/nextjs/server";
import { createAuthorizationContext, validateAuthorizationContext } from '@/lib/privy/authorization';

const privyNode = new PrivyNodeClient({
  appId: process.env.PRIVY_APP_ID!,
  appSecret: process.env.PRIVY_APP_SECRET!
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, clerkUserId } = body;

    if (!email || !clerkUserId) {
      return NextResponse.json(
        { success: false, error: "Email and Clerk user ID are required" },
        { status: 400 }
      );
    }

    console.log('[Trading Wallet] Setting up for email:', email, 'clerkUserId:', clerkUserId);

    // Get Clerk authentication and JWT for Privy authorization
    const { userId, getToken } = await auth();

    if (!userId || userId !== clerkUserId) {
      console.error('[Trading Wallet] Clerk authentication failed or user mismatch');
      return NextResponse.json(
        { success: false, error: "Unauthorized - Authentication required" },
        { status: 401 }
      );
    }

    // Get the Clerk JWT token for Privy authorization
    let clerkJwt: string | null = null;
    try {
      clerkJwt = await getToken();
      console.log('[Trading Wallet] Clerk JWT obtained:', clerkJwt ? '✓' : '✗');
    } catch (tokenError) {
      console.error('[Trading Wallet] Failed to get Clerk token:', tokenError);
      return NextResponse.json(
        { success: false, error: "Failed to get authentication token" },
        { status: 401 }
      );
    }

    if (!clerkJwt) {
      console.error('[Trading Wallet] No Clerk JWT available');
      return NextResponse.json(
        { success: false, error: "Authentication token not available" },
        { status: 401 }
      );
    }

    // Get authorization context from Privy using Clerk JWT
    let authorizationContext;
    try {
      authorizationContext = await createAuthorizationContext(clerkJwt);
      
      if (!validateAuthorizationContext(authorizationContext)) {
        throw new Error('Invalid authorization context received');
      }
      
      console.log('[Trading Wallet] Authorization context created and validated');
    } catch (authError) {
      console.error('[Trading Wallet] Failed to create authorization context:', authError);
      return NextResponse.json(
        { success: false, error: "Failed to create authorization context" },
        { status: 401 }
      );
    }

    // Connect to database
    await connectDB();

    // Step 1: Get or create Privy user with main wallets
    let privyUser;
    let userWallet = await UserWallet.findOne({ email });
    
    if (userWallet?.privyUserId) {
      try {
        privyUser = await privyNode.users().get(userWallet.privyUserId);
        console.log('[Trading Wallet] Found existing Privy user:', privyUser.id);
        
        // Sync clerkUserId if it's missing or different
        if (userWallet.clerkUserId !== clerkUserId) {
          userWallet.clerkUserId = clerkUserId;
          await userWallet.save();
          console.log('[Trading Wallet] Synced Clerk ID to existing UserWallet record');
        }
      } catch (error) {
        console.log('[Trading Wallet] Privy user not found, will create new one');
        privyUser = null;
        // Clean up old DB record
        await UserWallet.deleteOne({ email });
        userWallet = null;
      }
    }

    // Create user if doesn't exist
    if (!privyUser) {
      console.log('[Trading Wallet] Creating new Privy user with main wallets');
      
      const linkedAccounts: any[] = [
        { type: 'custom_auth', custom_user_id: clerkUserId },
        { type: 'email', address: email }
      ];
      
      // Add server auth key as additional signer so server can transact on behalf of user
      const walletAuthId = process.env.PRIVY_WALLET_AUTH_ID;
      const signerConfig = walletAuthId ? [{ signer_id: walletAuthId }] : undefined;

      try {
        privyUser = await privyNode.users().create({
          linked_accounts: linkedAccounts,
          wallets: [
            { chain_type: 'ethereum', additional_signers: signerConfig } as any,
            { chain_type: 'solana', additional_signers: signerConfig } as any,
            { chain_type: 'sui' } as any,
            { chain_type: 'ton' } as any,
            { chain_type: 'tron' } as any,
          ]
        });
        console.log('[Trading Wallet] Created Privy user:', privyUser.id);
      } catch (createError: any) {
        // Handle the case where the user already exists in Privy but not in our DB
        if (createError.message?.includes('Input conflict') || createError.status === 422) {
          console.log('[Trading Wallet] User already exists in Privy (conflict), retrieving DID');
          
          // Extract DID from error message
          const conflictMatch = createError.message?.match(/did:privy:[a-z0-9]+/i);
          const existingDid = conflictMatch ? conflictMatch[0] : null;
          
          if (existingDid) {
            console.log('[Trading Wallet] Found existing DID:', existingDid);
            privyUser = await privyNode.users().get(existingDid);
            console.log('[Trading Wallet] Retrieved existing user profile');
          } else {
            throw createError;
          }
        } else {
          throw createError;
        }
      }

      // FIXED: Use wallets().list() to get actual wallets instead of parsing linked_accounts
      const wallets: any = {};
      const chainTypes = ['ethereum', 'solana', 'sui', 'ton', 'tron'];

      // List all wallets for this user to get the actual wallet data
      for (const chainType of chainTypes) {
        const userWallets = [];
        for await (const wallet of privyNode.wallets().list({ 
          user_id: privyUser.id,
          chain_type: chainType as any // Fix lint error for WalletChainType
        })) {
          userWallets.push(wallet);
        }

        if (userWallets.length > 0) {
          const wallet = userWallets[0]; // Take the first wallet for this chain
          wallets[chainType] = {
            walletId: wallet.id,
            address: wallet.address,
            publicKey: wallet.public_key || null  // FIXED: Use public_key instead of publicKey
          };
          console.log(`[Trading Wallet] Found ${chainType} wallet:`, wallet.address);
        } else {
          console.log(`[Trading Wallet] No ${chainType} wallet found`);
        }
      }

      // Save main wallets to database
      userWallet = await UserWallet.create({
        email,
        clerkUserId,
        privyUserId: privyUser.id,
        wallets
      });
    }

    // Step 2: Check if user has Ethereum wallet
    if (!userWallet?.wallets?.ethereum) {
      return NextResponse.json(
        { 
          success: false, 
          error: "No Ethereum wallet found. Please create your main wallets first." 
        },
        { status: 400 }
      );
    }

    // Step 3: List ALL existing Ethereum wallets for this user
    const existingWallets = [];
    for await (const wallet of privyNode.wallets().list({ 
      user_id: privyUser.id,  // FIXED: Use user_id instead of userId
      chain_type: 'ethereum' 
    })) {
      existingWallets.push(wallet);
    }

    console.log('[Trading Wallet] Found', existingWallets.length, 'existing Ethereum wallets');
    console.log('[Trading Wallet] Wallet IDs:', existingWallets.map(w => w.id));

    // Step 4: Validate main wallet exists in Privy
    const mainWalletId = userWallet.wallets.ethereum.walletId;
    const mainWalletInPrivy = existingWallets.find(w => w.id === mainWalletId);
    
    if (!mainWalletInPrivy) {
      console.error('[Trading Wallet] Main wallet not found in Privy, DB out of sync');
      return NextResponse.json(
        { 
          success: false, 
          error: "Main wallet not found in Privy. Database may be out of sync." 
        },
        { status: 400 }
      );
    }

    console.log('[Trading Wallet] Main wallet validated:', mainWalletInPrivy.address);

    // Step 5: Unified Wallet Selection
    // We want the trading wallet and main wallet to be the same, 
    // but we must pick the CORRECT one (the one the user likely already initialized)
    
    let targetWallet = mainWalletInPrivy;
    
    // If there are multiple wallets, and one isn't the main one, it's likely the "Trading" one the user wants
    const existingSecondaryWallet = existingWallets.find(w => w.id !== mainWalletId);
    
    if (existingSecondaryWallet) {
      targetWallet = existingSecondaryWallet;
      console.log('[Trading Wallet] Found existing secondary wallet, promoting to Unified Main:', targetWallet.address);
    } else {
      console.log('[Trading Wallet] No secondary wallet found, using primary wallet for Unified Mode:', targetWallet.address);
    }

    const tradingWallet = targetWallet;

    // Update UserWallet record: BOTH wallets.ethereum AND tradingWallet should point to this address
    if (userWallet) {
      userWallet.wallets.ethereum = {
        walletId: tradingWallet.id,
        address: tradingWallet.address,
        publicKey: (tradingWallet as any).public_key || (tradingWallet as any).publicKey || null
      };
      
      userWallet.tradingWallet = {
        walletId: tradingWallet.id,
        address: tradingWallet.address,
        chainType: 'ethereum',
        initialized: false // Will be set to true if Hyperliquid init succeeds
      };
      await userWallet.save();
      console.log('[Trading Wallet] Unified Main Wallet and Trading Wallet in MongoDB to:', tradingWallet.address);
    }

    // Step 6: Create Viem account for trading with authorization context
    let viemAccount;
    try {
      viemAccount = createViemAccount(privyNode, {
        walletId: tradingWallet.id,
        address: tradingWallet.address as `0x${string}`,
        authorizationContext: authorizationContext,
      });

      console.log('[Trading Wallet] Created Viem account:', viemAccount.address);
    } catch (viemError) {
      console.error('[Trading Wallet] Failed to create Viem account:', viemError);
      return NextResponse.json(
        { success: false, error: "Failed to create Viem account for trading" },
        { status: 500 }
      );
    }

    // Step 7: Initialize Hyperliquid integration with Viem account
    let hyperliquidSetup;
    try {
      const hyperliquidService = new HyperliquidService({
        testnet: false
      });

      hyperliquidSetup = await hyperliquidService.initializeTradingWallet({
        address: tradingWallet.address,
        walletId: tradingWallet.id,
        chainType: 'ethereum'
      }, viemAccount);  // Pass only the Viem account - no authorization context needed

      console.log('[Trading Wallet] Hyperliquid setup completed:', hyperliquidSetup.success);

      // Update initialization status in DB
      if (userWallet && hyperliquidSetup.success) {
        userWallet.tradingWallet.initialized = true;
        userWallet.tradingWallet.timestamp = new Date();
        await userWallet.save();
        console.log('[Trading Wallet] Hyperliquid initialization status saved to DB');
      }

    } catch (hyperliquidError) {
      console.error("[Trading Wallet] Hyperliquid setup failed:", hyperliquidError);
      
      hyperliquidSetup = {
        success: false,
        initialized: false,
        error: hyperliquidError instanceof Error ? hyperliquidError.message : "Unknown error",
        timestamp: new Date().toISOString()
      };
    }

    // Step 8: Return the setup results with debugging info
    return NextResponse.json({
      success: true,
      data: {
        privyUserId: privyUser.id,
        mainWallet: {
          id: userWallet.wallets.ethereum.walletId,
          address: userWallet.wallets.ethereum.address,
          chainType: 'ethereum'
        },
        tradingWallet: {
          id: tradingWallet.id,
          address: tradingWallet.address,
          chainType: 'ethereum'
        },
        viemAccount: {
          address: viemAccount.address,
          ready: true,
          authorized: true  // Indicates authorization context was applied
        },
        hyperliquid: hyperliquidSetup,
        authorization: {
          authenticated: true,
          contextCreated: !!authorizationContext,
          contextValid: validateAuthorizationContext(authorizationContext),
          keysCount: authorizationContext.authorization_private_keys.length
        },
        debug: {
          totalEthereumWallets: existingWallets.length,
          mainWalletFoundInPrivy: !!mainWalletInPrivy,
          isUnifiedWallet: true
        }
      }
    });

  } catch (error) {
    console.error("[Trading Wallet] Setup error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to setup trading wallet",
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check current trading wallet status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");
    const clerkUserId = searchParams.get("clerkUserId");

    if (!email || !clerkUserId) {
      return NextResponse.json(
        { success: false, error: "Email and Clerk user ID are required" },
        { status: 400 }
      );
    }

    // Connect to database
    await connectDB();

    // Get user from database - check both email and clerkUserId
    let userWallet = await UserWallet.findOne({ 
      $or: [{ email }, { clerkUserId }]
    });
    
    if (!userWallet?.privyUserId) {
      // If we have clerkUserId but no record, this might be a fresh user
      // Let's not return 404 yet, try to find in Privy directly if possible
      // But for status check, 404 is technically correct if not in our DB
      return NextResponse.json(
        { 
          success: false, 
          error: "User record not found in database",
          code: "USER_NOT_FOUND"
        },
        { status: 404 }
      );
    }

    // Get Privy user
    let privyUser;
    try {
      privyUser = await privyNode.users().get(userWallet.privyUserId);
    } catch (error) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Privy user not found" 
        },
        { status: 404 }
      );
    }

    // FIXED: List all Ethereum wallets with correct parameter names
    const ethereumWallets = [];
    for await (const wallet of privyNode.wallets().list({ 
      user_id: privyUser.id,  // FIXED: Use user_id as shown in the error
      chain_type: 'ethereum' 
    })) {
      ethereumWallets.push({
        id: wallet.id,
        address: wallet.address,
        chainType: 'ethereum'
      });
    }
    
    console.log('[Trading Wallet Status] Found', ethereumWallets.length, 'Ethereum wallets');
    
    const mainWalletId = userWallet.wallets?.ethereum?.walletId;
    const mainWallet = ethereumWallets.find(w => w.id === mainWalletId);
    
    // In Unified Mode, the trading wallet IS the main wallet
    const tradingWallet = mainWallet;
    
    return NextResponse.json({
      success: true,
      data: {
        privyUserId: privyUser.id,
        hasMainWallet: !!mainWallet,
        hasTradingWallet: !!mainWallet, // Always true if main exists in unified mode
        mainWallet: mainWallet || null,
        tradingWallet: tradingWallet || null,
        ethereumWallets,
        totalEthereumWallets: ethereumWallets.length,
        isUnified: true,
        debug: {
          mainWalletIdFromDB: mainWalletId,
          mainWalletFoundInPrivy: !!mainWallet,
        }
      }
    });

  } catch (error) {
    console.error("[Trading Wallet] Status check error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get trading wallet status"
      },
      { status: 500 }
    );
  }
}