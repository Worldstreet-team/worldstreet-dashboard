/**
 * Tron Swap Execution Service
 * 
 * Handles swap execution for TRX <-> USDT on SunSwap
 */

const SUNSWAP_POOL_ADDRESS = "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE";
const USDT_CONTRACT_ADDRESS = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"; // Mainnet USDT

// Complete SunSwap Pool ABI
const POOL_ABI = [
  {
    constant: false,
    inputs: [
      { name: "min_tokens", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
    name: "trxToTokenSwapInput",
    outputs: [{ name: "", type: "uint256" }],
    payable: true,
    stateMutability: "payable",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "tokens_sold", type: "uint256" },
      { name: "min_trx", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
    name: "tokenToTrxSwapInput",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "trx_sold", type: "uint256" }],
    name: "getTrxToTokenInputPrice",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
  {
    constant: true,
    inputs: [{ name: "tokens_sold", type: "uint256" }],
    name: "getTokenToTrxInputPrice",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function",
  },
];

// TRC20 ABI for approval
const TRC20_ABI = [
  {
    constant: true,
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    constant: false,
    inputs: [
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
];

export interface SwapResult {
  txHash: string;
  success: boolean;
  message?: string;
}

/**
 * Execute TRX -> USDT swap
 */
export async function executeTrxToUsdtSwap(
  tronWeb: any,
  privateKey: string,
  trxAmount: number,
  minimumUsdt: number
): Promise<SwapResult> {
  try {
    // Set private key for signing
    tronWeb.setPrivateKey(privateKey);

    // Convert amounts to base units
    const trxSun = Math.floor(trxAmount * 1_000_000);
    const minTokens = Math.floor(minimumUsdt * 1_000_000);

    // Calculate deadline (10 minutes from now)
    const deadline = Math.floor(Date.now() / 1000) + 600;

    // Get contract instance
    const contract = await tronWeb.contract(POOL_ABI, SUNSWAP_POOL_ADDRESS);

    console.log("[SwapService] Executing TRX->USDT swap:", {
      trxAmount,
      trxSun,
      minTokens,
      deadline,
    });

    // Execute swap
    const tx = await contract.methods.trxToTokenSwapInput(minTokens, deadline).send({
      callValue: trxSun,
      feeLimit: 100_000_000, // 100 TRX fee limit
      shouldPollResponse: true,
    });

    console.log("[SwapService] Swap transaction sent:", tx);

    // Extract transaction ID (handle different return formats)
    const txId = typeof tx === 'string' ? tx : (tx.txid || tx.transaction?.txID || tx);

    return {
      txHash: String(txId),
      success: true,
      message: "Swap executed successfully",
    };
  } catch (error: any) {
    console.error("[SwapService] TRX->USDT swap error:", error);
    
    let message = "Swap failed";
    if (error.message?.includes("REVERT")) {
      message = "Swap reverted - check slippage or liquidity";
    } else if (error.message?.includes("energy")) {
      message = "Insufficient energy for transaction";
    }

    return {
      txHash: "",
      success: false,
      message,
    };
  }
}

/**
 * Execute USDT -> TRX swap
 */
export async function executeUsdtToTrxSwap(
  tronWeb: any,
  privateKey: string,
  usdtAmount: number,
  minimumTrx: number
): Promise<SwapResult> {
  try {
    // Set private key for signing
    tronWeb.setPrivateKey(privateKey);

    const userAddress = tronWeb.address.fromPrivateKey(privateKey);

    // Convert amounts to base units
    const tokensSold = Math.floor(usdtAmount * 1_000_000);
    const minTrx = Math.floor(minimumTrx * 1_000_000);

    // Calculate deadline (10 minutes from now)
    const deadline = Math.floor(Date.now() / 1000) + 600;

    // Step 1: Check allowance
    const usdtContract = await tronWeb.contract(TRC20_ABI, USDT_CONTRACT_ADDRESS);
    const allowanceResult = await usdtContract.methods.allowance(userAddress, SUNSWAP_POOL_ADDRESS).call();
    const currentAllowance = Number(allowanceResult.toString());

    console.log("[SwapService] Current USDT allowance:", currentAllowance);

    // Step 2: Approve if needed
    if (currentAllowance < tokensSold) {
      console.log("[SwapService] Approving USDT...");
      
      const approveTx = await usdtContract.methods.approve(
        SUNSWAP_POOL_ADDRESS,
        tokensSold
      ).send({
        feeLimit: 50_000_000, // 50 TRX fee limit
        shouldPollResponse: true,
      });

      console.log("[SwapService] Approval transaction:", approveTx);
      
      // Wait a bit for approval to be confirmed
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Step 3: Execute swap
    const poolContract = await tronWeb.contract(POOL_ABI, SUNSWAP_POOL_ADDRESS);

    console.log("[SwapService] Executing USDT->TRX swap:", {
      usdtAmount,
      tokensSold,
      minTrx,
      deadline,
    });

    const tx = await poolContract.methods.tokenToTrxSwapInput(
      tokensSold,
      minTrx,
      deadline
    ).send({
      feeLimit: 100_000_000, // 100 TRX fee limit
      shouldPollResponse: true,
    });

    console.log("[SwapService] Swap transaction sent:", tx);

    // Extract transaction ID (handle different return formats)
    const txId = typeof tx === 'string' ? tx : (tx.txid || tx.transaction?.txID || tx);

    return {
      txHash: String(txId),
      success: true,
      message: "Swap executed successfully",
    };
  } catch (error: any) {
    console.error("[SwapService] USDT->TRX swap error:", error);
    
    let message = "Swap failed";
    if (error.message?.includes("REVERT")) {
      message = "Swap reverted - check slippage or liquidity";
    } else if (error.message?.includes("energy")) {
      message = "Insufficient energy for transaction";
    } else if (error.message?.includes("allowance")) {
      message = "Token approval failed";
    }

    return {
      txHash: "",
      success: false,
      message,
    };
  }
}

/**
 * Check if user has sufficient balance for swap
 */
export async function validateSwapBalance(
  tronWeb: any,
  address: string,
  fromToken: "TRX" | "USDT",
  amount: number
): Promise<{ valid: boolean; error?: string }> {
  try {
    if (fromToken === "TRX") {
      const balance = await tronWeb.trx.getBalance(address);
      const trxBalance = balance / 1_000_000;
      
      // Need extra TRX for fees
      const requiredBalance = amount + 10; // 10 TRX buffer for fees
      
      if (trxBalance < requiredBalance) {
        return {
          valid: false,
          error: `Insufficient TRX. Need ${requiredBalance.toFixed(2)} TRX (including fees)`,
        };
      }
    } else {
      const usdtContract = await tronWeb.contract(TRC20_ABI, USDT_CONTRACT_ADDRESS);
      const balanceResult = await usdtContract.methods.balanceOf(address).call();
      const usdtBalance = Number(balanceResult.toString()) / 1_000_000;
      
      if (usdtBalance < amount) {
        return {
          valid: false,
          error: `Insufficient USDT. Balance: ${usdtBalance.toFixed(2)} USDT`,
        };
      }

      // Also check TRX for fees
      const trxBalance = await tronWeb.trx.getBalance(address);
      const trx = trxBalance / 1_000_000;
      
      if (trx < 50) {
        return {
          valid: false,
          error: "Insufficient TRX for transaction fees (need ~50 TRX)",
        };
      }
    }

    return { valid: true };
  } catch (error) {
    console.error("[SwapService] Balance validation error:", error);
    return {
      valid: false,
      error: "Failed to validate balance",
    };
  }
}
