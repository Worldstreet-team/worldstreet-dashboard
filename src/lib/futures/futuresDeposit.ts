/**
 * Futures Deposit Library
 * 
 * Handles margin deposit completion for futures trading
 * Similar to spot deposit but funds stay in Hyperliquid perps account as margin
 */

import { connectDB } from '@/lib/mongodb';
import FuturesDeposit from '@/models/FuturesDeposit';
import { UserWallet } from '@/models/UserWallet';
import { privyClient } from '@/lib/privy/client';
import { createAuthorizationContext } from '@/lib/privy/authorization';
import { sanitizeError } from '@/lib/errors/swapErrors';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface FuturesDepositParams {
  depositId: string;
  clerkUserId: string;
  clerkJwt: string;
}

export interface FuturesDepositResult {
  success: boolean;
  txHash?: string;
  marginAmount?: number;
  error?: string;
  errorCode?: string;
  executionTime: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN DEPOSIT COMPLETION FUNCTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Complete a futures margin deposit
 * 
 * Key difference from spot: Funds stay in Hyperliquid perps account as margin
 * No transfer to spot wallet needed
 */
export async function completeFuturesDeposit({
  depositId,
  clerkUserId,
  clerkJwt,
}: FuturesDepositParams): Promise<FuturesDepositResult> {
  const startTime = Date.now();

  try {
    console.log('[FuturesDeposit] Starting completion for:', depositId);

    // Connect to database
    await connectDB();

    // Find the deposit record
    const deposit = await FuturesDeposit.findOne({
      _id: depositId,
      userId: clerkUserId,
    });

    if (!deposit) {
      return {
        success: false,
        error: 'Deposit not found',
        errorCode: 'DEPOSIT_NOT_FOUND',
        executionTime: Date.now() - startTime,
      };
    }

    if (deposit.status === 'completed') {
      return {
        success: true,
        marginAmount: deposit.marginAmount,
        txHash: deposit.txHash,
        executionTime: Date.now() - startTime,
      };
    }

    if (deposit.status === 'failed') {
      return {
        success: false,
        error: deposit.error || 'Deposit previously failed',
        errorCode: 'DEPOSIT_FAILED',
        executionTime: Date.now() - startTime,
      };
    }

    // Get user wallet
    const userWallet = await UserWallet.findOne({ clerkUserId });
    if (!userWallet?.futuresWallet?.walletId) {
      return {
        success: false,
        error: 'Futures wallet not found',
        errorCode: 'WALLET_NOT_FOUND',
        executionTime: Date.now() - startTime,
      };
    }

    // Update status to processing
    deposit.status = 'processing';
    await deposit.save();

    try {
      // Create authorization context
      const authContext = await createAuthorizationContext(clerkJwt);

      // Bridge funds to Hyperliquid
      console.log('[FuturesDeposit] Bridging to Hyperliquid:', {
        amount: deposit.depositAmount,
        walletAddress: userWallet.futuresWallet.address,
      });

      // Update status to bridging
      deposit.status = 'bridging';
      await deposit.save();

      // Import bridge function
      const { bridgeToHyperliquid } = await import('@/lib/hyperliquid/bridge');
      
      const bridgeResult = await bridgeToHyperliquid({
        privyClient,
        walletId: userWallet.futuresWallet.walletId,
        walletAddress: userWallet.futuresWallet.address,
        authorizationContext: authContext,
        amount: deposit.depositAmount.toString(),
        fromChain: deposit.depositChain,
      });

      if (!bridgeResult.success) {
        throw new Error(bridgeResult.error || 'Bridge to Hyperliquid failed');
      }

      // Update status to transferring (crediting margin)
      deposit.status = 'transferring';
      deposit.bridgeTxHash = bridgeResult.txHash;
      await deposit.save();

      // For futures, margin stays in perps account (no transfer to spot needed)
      // The bridged amount becomes the margin amount directly
      deposit.marginAmount = deposit.depositAmount;
      deposit.status = 'completed';
      deposit.txHash = bridgeResult.txHash;
      deposit.completedAt = new Date();
      await deposit.save();

      // Update user wallet margin balance
      if (userWallet.futuresWallet.marginBalance) {
        const currentBalance = parseFloat(userWallet.futuresWallet.marginBalance);
        userWallet.futuresWallet.marginBalance = (currentBalance + deposit.depositAmount).toString();
      } else {
        userWallet.futuresWallet.marginBalance = deposit.depositAmount.toString();
      }
      
      userWallet.futuresWallet.availableMargin = userWallet.futuresWallet.marginBalance;
      await userWallet.save();

      console.log('[FuturesDeposit] Completed successfully:', {
        depositId,
        marginAmount: deposit.marginAmount,
        txHash: deposit.txHash,
      });

      return {
        success: true,
        txHash: deposit.txHash,
        marginAmount: deposit.marginAmount,
        executionTime: Date.now() - startTime,
      };

    } catch (error: any) {
      console.error('[FuturesDeposit] Processing error:', error);

      // Update deposit with error
      deposit.status = 'failed';
      deposit.error = sanitizeError(error);
      await deposit.save();

      return {
        success: false,
        error: sanitizeError(error),
        errorCode: 'PROCESSING_FAILED',
        executionTime: Date.now() - startTime,
      };
    }

  } catch (error: any) {
    console.error('[FuturesDeposit] Completion error:', error);
    return {
      success: false,
      error: sanitizeError(error),
      errorCode: 'UNKNOWN_ERROR',
      executionTime: Date.now() - startTime,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get deposit status
 */
export async function getFuturesDepositStatus(depositId: string, clerkUserId: string) {
  try {
    await connectDB();
    
    const deposit = await FuturesDeposit.findOne({
      _id: depositId,
      userId: clerkUserId,
    });

    if (!deposit) {
      return { success: false, error: 'Deposit not found' };
    }

    return {
      success: true,
      deposit: {
        id: deposit._id,
        status: deposit.status,
        depositAmount: deposit.depositAmount,
        marginAmount: deposit.marginAmount,
        txHash: deposit.txHash,
        bridgeTxHash: deposit.bridgeTxHash,
        error: deposit.error,
        createdAt: deposit.createdAt,
        completedAt: deposit.completedAt,
      },
    };
  } catch (error: any) {
    console.error('[FuturesDeposit] Status check error:', error);
    return {
      success: false,
      error: sanitizeError(error),
    };
  }
}

/**
 * Get user's futures deposit history
 */
export async function getFuturesDepositHistory(clerkUserId: string, limit: number = 10) {
  try {
    await connectDB();
    
    const deposits = await FuturesDeposit.find({ userId: clerkUserId })
      .sort({ createdAt: -1 })
      .limit(limit);

    return {
      success: true,
      deposits: deposits.map(deposit => ({
        id: deposit._id,
        status: deposit.status,
        depositChain: deposit.depositChain,
        depositToken: deposit.depositToken,
        depositAmount: deposit.depositAmount,
        marginAmount: deposit.marginAmount,
        txHash: deposit.txHash,
        createdAt: deposit.createdAt,
        completedAt: deposit.completedAt,
      })),
    };
  } catch (error: any) {
    console.error('[FuturesDeposit] History error:', error);
    return {
      success: false,
      error: sanitizeError(error),
    };
  }
}