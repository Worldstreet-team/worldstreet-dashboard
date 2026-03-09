import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { ClientManager } from './ClientManager';
import { MasterWalletManager } from './MasterWalletManager';
import DriftSubaccount from '@/models/DriftSubaccount';
import FeeAuditLog from '@/models/FeeAuditLog';
import { DepositResult } from '@/types/drift-master-wallet';
import { pollTransactionConfirmation } from '@/lib/solana/pollTransactionConfirmation';
import {
  ValidationError,
  NotFoundError,
  TransactionError
} from '@/lib/errors/drift-errors';

// Simple mutex implementation for per-user locking
class Mutex {
  private locked = false;
  private queue: Array<() => void> = [];

  async acquire(): Promise<void> {
    if (!this.locked) {
      this.locked = true;
      return;
    }

    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const resolve = this.queue.shift()!;
      resolve();
    } else {
      this.locked = false;
    }
  }

  async runExclusive<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}

export class DepositManager {
  private clientManager: ClientManager;
  private masterWalletManager: MasterWalletManager;
  private userLocks: Map<string, Mutex>;
  private feePercentage: number;

  constructor(
    clientManager: ClientManager,
    masterWalletManager: MasterWalletManager
  ) {
    this.clientManager = clientManager;
    this.masterWalletManager = masterWalletManager;
    this.userLocks = new Map();
    this.feePercentage = parseFloat(process.env.FEE_PERCENTAGE || '5');
  }

  async depositCollateral(userId: string, amount: number): Promise<DepositResult> {
    // 1. Validate amount
    if (amount <= 0) {
      throw new ValidationError('Deposit amount must be greater than zero');
    }

    const feeAmount = this.calculateFee(amount);
    if (feeAmount < 0.000001) {
      throw new ValidationError(
        'Deposit amount too small (fee < 0.000001 SOL)',
        { amount, feeAmount }
      );
    }

    // 2. Get or create per-user lock
    if (!this.userLocks.has(userId)) {
      this.userLocks.set(userId, new Mutex());
    }
    const lock = this.userLocks.get(userId)!;

    // 3. Acquire lock and process deposit
    return await lock.runExclusive(async () => {
      return await this.processDeposit(userId, amount, feeAmount);
    });
  }

  private async processDeposit(
    userId: string,
    amount: number,
    feeAmount: number
  ): Promise<DepositResult> {
    const collateralAmount = amount - feeAmount;

    console.log(`[DepositManager] Processing deposit for ${userId}:`, {
      total: amount,
      fee: feeAmount,
      collateral: collateralAmount
    });

    // 1. Get user's Drift client
    const userClient = await this.clientManager.getUserClient(userId);
    if (!userClient) {
      throw new NotFoundError('Drift client', userId);
    }

    // 2. Verify user has sufficient balance
    const userBalance = await userClient.connection.getBalance(
      userClient.wallet.publicKey
    );
    const userBalanceSOL = userBalance / LAMPORTS_PER_SOL;

    if (userBalanceSOL < amount + 0.01) { // +0.01 for tx fees
      throw new ValidationError(
        `Insufficient balance. Have: ${userBalanceSOL} SOL, Need: ${amount + 0.01} SOL`
      );
    }

    // 3. Transfer fee to master wallet
    const masterAddress = this.masterWalletManager.getAddress();
    let feeSignature: string;

    try {
      const feeTransaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: userClient.wallet.publicKey,
          toPubkey: new PublicKey(masterAddress),
          lamports: Math.floor(feeAmount * LAMPORTS_PER_SOL)
        })
      );

      feeSignature = await userClient.connection.sendTransaction(
        feeTransaction,
        [userClient.wallet.payer]
      );

      // Confirm via HTTP polling (no WebSocket needed)
      const confirm = await pollTransactionConfirmation(
        userClient.connection,
        feeSignature,
        { commitment: 'confirmed', timeoutMs: 60_000, intervalMs: 2000 }
      );
      if (confirm.confirmed && confirm.err) {
        throw new Error(`Fee transfer failed on-chain: ${JSON.stringify(confirm.err)}`);
      }
      if (!confirm.confirmed) {
        console.warn('[DepositManager] Fee confirmation timed out, proceeding...');
      }

      console.log(`[DepositManager] Fee transferred: ${feeSignature}`);
    } catch (error) {
      console.error('[DepositManager] Fee transfer failed:', error);
      throw new TransactionError(
        `Fee transfer failed: ${(error as Error).message}`,
        undefined,
        error as Error
      );
    }

    // 4. Deposit collateral to Drift subaccount
    let depositSignature: string;

    try {
      // Note: Actual Drift deposit would use the SDK
      // For now, we'll simulate with a placeholder
      depositSignature = await this.depositToDrift(
        userClient,
        collateralAmount
      );

      console.log(`[DepositManager] Collateral deposited: ${depositSignature}`);
    } catch (error) {
      console.error('[DepositManager] Collateral deposit failed:', error);
      // Note: Fee already transferred, cannot rollback on-chain
      throw new TransactionError(
        `Collateral deposit failed (fee already deducted): ${(error as Error).message}`,
        feeSignature,
        error as Error
      );
    }

    // 5. Update database
    await DriftSubaccount.updateOne(
      { userId },
      { $set: { updatedAt: new Date() } }
    );

    // 6. Log to audit trail
    await FeeAuditLog.create({
      timestamp: new Date(),
      userId,
      operationType: 'deposit',
      totalAmount: amount,
      feeAmount,
      collateralAmount,
      feePercentage: this.feePercentage,
      feeSignature,
      depositSignature
    });

    return {
      success: true,
      feeAmount,
      collateralAmount,
      feeSignature,
      depositSignature,
      totalAmount: amount
    };
  }

  calculateFee(amount: number): number {
    return amount * (this.feePercentage / 100);
  }

  private async depositToDrift(
    userClient: any,
    amount: number
  ): Promise<string> {
    // Placeholder for actual Drift SDK deposit
    // In production, this would be:
    // const signature = await userClient.driftClient.deposit(
    //   Math.floor(amount * LAMPORTS_PER_SOL),
    //   0, // USDC market index
    //   userClient.wallet.publicKey
    // );

    console.log(`[DepositManager] Drift deposit placeholder: ${amount} SOL`);
    return 'placeholder_deposit_signature';
  }
}
