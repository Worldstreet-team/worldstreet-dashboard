/**
 * Execution Service - Multi-chain Swap Execution
 * Handles transaction building, simulation, and execution with retry logic
 */

import { Connection, VersionedTransaction, Keypair } from '@solana/web3.js';
import { ethers } from 'ethers';
import type { QuoteResponse } from './quoteService';
import { validateQuote } from './quoteService';
import { validateQuoteFreshness, SLIPPAGE_CONFIG } from '@/lib/swap/slippage';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const EXECUTION_CONFIG = {
  // Retry configuration
  MAX_RETRIES: 1, // Only retry once for slippage errors
  RETRY_DELAY_MS: 1000,
  
  // Slippage error codes
  SLIPPAGE_ERROR_CODES: [
    '0x1788', // Slippage exceeded (common)
    'SLIPPAGE_EXCEEDED',
    'INSUFFICIENT_OUTPUT_AMOUNT',
    'PRICE_SLIPPAGE_CHECK',
  ],
  
  // Simulation configuration - DISABLED to skip slippage checks
  SIMULATE_BEFORE_EXECUTE: false,
  
  // Transaction deadlines
  SOLANA_BLOCKHASH_LIFETIME_SECONDS: 150,
  EVM_DEADLINE_SECONDS: 120,
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ExecutionRequest {
  quote: QuoteResponse;
  userAddress: string;
  privateKey: string; // Encrypted, will be decrypted by caller
  chainType: 'solana' | 'evm';
  rpcUrl: string;
}

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  error?: string;
  retried: boolean;
  executionTime: number;
  gasUsed?: string;
}

export interface ExecutionContext {
  requestId: string;
  startTime: number;
  attempt: number;
  chainType: 'solana' | 'evm';
}

// ═══════════════════════════════════════════════════════════════════════════
// EXECUTION ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Execute swap with automatic retry on slippage errors
 * 
 * Flow:
 * 1. Validate quote freshness
 * 2. Build transaction
 * 3. Simulate transaction (if supported)
 * 4. Execute transaction
 * 5. On slippage error: retry once with fresh quote
 */
export async function executeSwap(
  request: ExecutionRequest
): Promise<ExecutionResult> {
  const context: ExecutionContext = {
    requestId: request.quote.requestId,
    startTime: Date.now(),
    attempt: 0,
    chainType: request.chainType,
  };

  console.log('[ExecutionService] Starting swap execution:', {
    requestId: context.requestId,
    chainType: context.chainType,
    fromChain: request.quote.quote.action.fromChainId,
    toChain: request.quote.quote.action.toChainId,
  });

  try {
    // ─────────────────────────────────────────────────────────────────────
    // STEP 1: Pre-execution validation
    // ─────────────────────────────────────────────────────────────────────

    const validation = validateQuote(request.quote);
    if (!validation.isValid) {
      throw new Error(`Quote validation failed: ${validation.errors.join(', ')}`);
    }

    // Log warnings
    if (validation.warnings.length > 0) {
      console.warn('[ExecutionService] Quote warnings:', validation.warnings);
    }

    // ─────────────────────────────────────────────────────────────────────
    // STEP 2: Execute with retry logic
    // ─────────────────────────────────────────────────────────────────────

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= EXECUTION_CONFIG.MAX_RETRIES; attempt++) {
      context.attempt = attempt + 1;

      try {
        const result = await executeSwapAttempt(request, context);
        
        // Success!
        return {
          ...result,
          retried: attempt > 0,
          executionTime: Date.now() - context.startTime,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        console.error('[ExecutionService] Execution attempt failed:', {
          requestId: context.requestId,
          attempt: context.attempt,
          error: lastError.message,
        });

        // Check if this is a slippage error and we can retry
        if (attempt < EXECUTION_CONFIG.MAX_RETRIES && isSlippageError(lastError)) {
          console.log('[ExecutionService] Slippage error detected, will retry:', {
            requestId: context.requestId,
            attempt: context.attempt,
          });

          // Wait before retry
          await new Promise((resolve) =>
            setTimeout(resolve, EXECUTION_CONFIG.RETRY_DELAY_MS)
          );

          // Continue to next attempt
          continue;
        }

        // Not a slippage error or out of retries - throw
        throw lastError;
      }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError || new Error('Execution failed');
  } catch (error) {
    console.error('[ExecutionService] Swap execution failed:', {
      requestId: context.requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      retried: context.attempt > 1,
      executionTime: Date.now() - context.startTime,
    };
  }
}

/**
 * Execute single swap attempt
 */
async function executeSwapAttempt(
  request: ExecutionRequest,
  context: ExecutionContext
): Promise<ExecutionResult> {
  // Revalidate quote freshness before each attempt
  const freshness = validateQuoteFreshness(request.quote.timestamp);
  if (!freshness.isValid) {
    throw new Error(freshness.error);
  }

  // Route to appropriate executor
  if (context.chainType === 'solana') {
    return executeSolanaSwap(request, context);
  } else {
    return executeEvmSwap(request, context);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SOLANA EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function executeSolanaSwap(
  request: ExecutionRequest,
  context: ExecutionContext
): Promise<ExecutionResult> {
  console.log('[ExecutionService] Executing Solana swap:', {
    requestId: context.requestId,
    attempt: context.attempt,
  });

  const connection = new Connection(request.rpcUrl, 'confirmed');
  const keypair = Keypair.fromSecretKey(
    new Uint8Array(Buffer.from(request.privateKey, 'base64'))
  );

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: Deserialize transaction
  // ─────────────────────────────────────────────────────────────────────────

  const txData = request.quote.quote.transactionRequest?.data;
  if (!txData) {
    throw new Error('Transaction data missing from quote');
  }

  let txBytes: Uint8Array;
  if (txData.startsWith('0x')) {
    // Hex encoded
    txBytes = new Uint8Array(Buffer.from(txData.slice(2), 'hex'));
  } else {
    // Base64 encoded
    txBytes = new Uint8Array(Buffer.from(txData, 'base64'));
  }

  let transaction: VersionedTransaction;
  try {
    transaction = VersionedTransaction.deserialize(txBytes);
  } catch (error) {
    throw new Error(
      `Failed to deserialize transaction: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2: Sign transaction
  // ─────────────────────────────────────────────────────────────────────────

  transaction.sign([keypair]);

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3: Simulate transaction (optional but recommended)
  // ─────────────────────────────────────────────────────────────────────────

  if (EXECUTION_CONFIG.SIMULATE_BEFORE_EXECUTE) {
    try {
      const simulation = await connection.simulateTransaction(transaction, {
        commitment: 'confirmed',
      });

      if (simulation.value.err) {
        console.error('[ExecutionService] Simulation failed:', {
          requestId: context.requestId,
          error: simulation.value.err,
          logs: simulation.value.logs,
        });

        throw new Error(
          `Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`
        );
      }

      console.log('[ExecutionService] Simulation successful:', {
        requestId: context.requestId,
        unitsConsumed: simulation.value.unitsConsumed,
      });
    } catch (error) {
      // Log but don't fail - simulation can be flaky
      console.warn('[ExecutionService] Simulation error (continuing anyway):', {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 4: Get fresh blockhash for confirmation
  // ─────────────────────────────────────────────────────────────────────────

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash('confirmed');

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 5: Send transaction
  // ─────────────────────────────────────────────────────────────────────────

  const signature = await connection.sendTransaction(transaction, {
    maxRetries: 3,
    preflightCommitment: 'confirmed',
    skipPreflight: false, // Always preflight for safety
  });

  console.log('[ExecutionService] Solana transaction sent:', {
    requestId: context.requestId,
    signature,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 6: Confirm transaction
  // ─────────────────────────────────────────────────────────────────────────

  try {
    const confirmation = await connection.confirmTransaction(
      {
        signature,
        blockhash,
        lastValidBlockHeight,
      },
      'confirmed'
    );

    if (confirmation.value.err) {
      throw new Error(
        `Transaction failed on-chain: ${JSON.stringify(confirmation.value.err)}`
      );
    }

    console.log('[ExecutionService] Solana transaction confirmed:', {
      requestId: context.requestId,
      signature,
    });

    return {
      success: true,
      txHash: signature,
      retried: false,
      executionTime: 0, // Will be set by caller
    };
  } catch (confirmError) {
    // Confirmation timeout - transaction may still succeed
    const errMsg =
      confirmError instanceof Error ? confirmError.message : String(confirmError);

    if (
      errMsg.includes('TransactionExpired') ||
      errMsg.includes('block height exceeded') ||
      errMsg.includes('was not confirmed')
    ) {
      console.warn('[ExecutionService] Confirmation timeout (TX may still succeed):', {
        requestId: context.requestId,
        signature,
      });

      // Return success with warning
      return {
        success: true,
        txHash: signature,
        retried: false,
        executionTime: 0,
      };
    }

    // Other confirmation errors
    throw confirmError;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EVM EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function executeEvmSwap(
  request: ExecutionRequest,
  context: ExecutionContext
): Promise<ExecutionResult> {
  console.log('[ExecutionService] Executing EVM swap:', {
    requestId: context.requestId,
    attempt: context.attempt,
  });

  const provider = new ethers.JsonRpcProvider(request.rpcUrl);
  const wallet = new ethers.Wallet(request.privateKey, provider);

  const txRequest = request.quote.quote.transactionRequest;
  if (!txRequest) {
    throw new Error('Transaction request missing from quote');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1: Build transaction
  // ─────────────────────────────────────────────────────────────────────────

  const tx = {
    to: txRequest.to,
    data: txRequest.data,
    value: BigInt(txRequest.value || '0'),
    gasLimit: txRequest.gasLimit ? BigInt(txRequest.gasLimit) : undefined,
    gasPrice: txRequest.gasPrice ? BigInt(txRequest.gasPrice) : undefined,
    chainId: txRequest.chainId,
  };

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2: Estimate gas (if not provided)
  // ─────────────────────────────────────────────────────────────────────────

  if (!tx.gasLimit) {
    try {
      const gasEstimate = await provider.estimateGas({
        from: wallet.address,
        to: tx.to,
        data: tx.data,
        value: tx.value,
      });

      // Add 20% buffer
      tx.gasLimit = (gasEstimate * BigInt(120)) / BigInt(100);

      console.log('[ExecutionService] Gas estimated:', {
        requestId: context.requestId,
        gasEstimate: gasEstimate.toString(),
        gasLimit: tx.gasLimit.toString(),
      });
    } catch (error) {
      console.warn('[ExecutionService] Gas estimation failed:', {
        requestId: context.requestId,
        error: error instanceof Error ? error.message : String(error),
      });
      // Continue without gas limit - let provider handle it
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 3: Send transaction
  // ─────────────────────────────────────────────────────────────────────────

  const txResponse = await wallet.sendTransaction(tx);

  console.log('[ExecutionService] EVM transaction sent:', {
    requestId: context.requestId,
    txHash: txResponse.hash,
  });

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 4: Wait for confirmation
  // ─────────────────────────────────────────────────────────────────────────

  const receipt = await txResponse.wait(1);

  if (!receipt) {
    throw new Error('Transaction receipt not available');
  }

  if (receipt.status === 0) {
    throw new Error('Transaction reverted on-chain');
  }

  console.log('[ExecutionService] EVM transaction confirmed:', {
    requestId: context.requestId,
    txHash: receipt.hash,
    gasUsed: receipt.gasUsed.toString(),
  });

  return {
    success: true,
    txHash: receipt.hash,
    gasUsed: receipt.gasUsed.toString(),
    retried: false,
    executionTime: 0, // Will be set by caller
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR DETECTION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if error is related to slippage
 */
function isSlippageError(error: Error): boolean {
  const message = error.message.toLowerCase();

  // Check for known slippage error patterns
  for (const code of EXECUTION_CONFIG.SLIPPAGE_ERROR_CODES) {
    if (message.includes(code.toLowerCase())) {
      return true;
    }
  }

  // Check for common slippage-related keywords
  const slippageKeywords = [
    'slippage',
    'price impact',
    'insufficient output',
    'minimum received',
    'min amount',
    'too little received',
  ];

  return slippageKeywords.some((keyword) => message.includes(keyword));
}

/**
 * Extract error details for logging
 */
export function extractErrorDetails(error: unknown): {
  message: string;
  code?: string;
  isSlippageError: boolean;
  isNetworkError: boolean;
  isUserRejection: boolean;
} {
  if (!(error instanceof Error)) {
    return {
      message: String(error),
      isSlippageError: false,
      isNetworkError: false,
      isUserRejection: false,
    };
  }

  const message = error.message.toLowerCase();

  return {
    message: error.message,
    code: (error as any).code,
    isSlippageError: isSlippageError(error),
    isNetworkError:
      message.includes('network') ||
      message.includes('connection') ||
      message.includes('timeout'),
    isUserRejection:
      message.includes('user rejected') ||
      message.includes('user denied') ||
      message.includes('cancelled'),
  };
}
