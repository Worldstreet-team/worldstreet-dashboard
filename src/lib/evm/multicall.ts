/**
 * Multicall3 Utility for Batched ERC20 Balance Fetching
 * 
 * Reduces RPC calls by batching multiple contract reads into a single request.
 * Uses Multicall3 deployed at the same address on all major EVM chains.
 */

import { ethers } from "ethers";

// Multicall3 is deployed at this address on Ethereum mainnet and most EVM chains
export const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";

// Multicall3 ABI - only the aggregate3 function we need
const MULTICALL3_ABI = [
  {
    inputs: [
      {
        components: [
          { name: "target", type: "address" },
          { name: "allowFailure", type: "bool" },
          { name: "callData", type: "bytes" },
        ],
        name: "calls",
        type: "tuple[]",
      },
    ],
    name: "aggregate3",
    outputs: [
      {
        components: [
          { name: "success", type: "bool" },
          { name: "returnData", type: "bytes" },
        ],
        name: "returnData",
        type: "tuple[]",
      },
    ],
    stateMutability: "payable",
    type: "function",
  },
];

// ERC20 balanceOf function signature
const ERC20_BALANCE_OF_ABI = ["function balanceOf(address) view returns (uint256)"];

export interface MulticallResult {
  success: boolean;
  returnData: string;
}

export interface TokenBalanceCall {
  tokenAddress: string;
  walletAddress: string;
}

/**
 * Batch fetch ERC20 token balances using Multicall3
 * 
 * @param provider - Ethers provider
 * @param calls - Array of token/wallet address pairs
 * @returns Array of balance results (as BigInt strings)
 */
export async function batchFetchTokenBalances(
  provider: ethers.Provider,
  calls: TokenBalanceCall[]
): Promise<(bigint | null)[]> {
  if (calls.length === 0) return [];

  try {
    const multicall = new ethers.Contract(
      MULTICALL3_ADDRESS,
      MULTICALL3_ABI,
      provider
    );

    // Create interface for encoding balanceOf calls
    const erc20Interface = new ethers.Interface(ERC20_BALANCE_OF_ABI);

    // Encode all balanceOf calls
    const multicallCalls = calls.map((call) => ({
      target: call.tokenAddress,
      allowFailure: true, // Don't revert entire batch if one token fails
      callData: erc20Interface.encodeFunctionData("balanceOf", [call.walletAddress]),
    }));

    // Execute multicall
    const results: MulticallResult[] = await multicall.aggregate3.staticCall(multicallCalls);

    // Decode results
    return results.map((result, index) => {
      if (!result.success || result.returnData === "0x") {
        console.warn(`[Multicall] Failed to fetch balance for token ${calls[index].tokenAddress}`);
        return null;
      }

      try {
        // Decode the uint256 return value
        const decoded = ethers.AbiCoder.defaultAbiCoder().decode(
          ["uint256"],
          result.returnData
        );
        return decoded[0];
      } catch (error) {
        console.error(`[Multicall] Failed to decode balance for token ${calls[index].tokenAddress}:`, error);
        return null;
      }
    });
  } catch (error) {
    console.error("[Multicall] Batch fetch failed:", error);
    // Return array of nulls if entire multicall fails
    return calls.map(() => null);
  }
}

/**
 * Check if Multicall3 is available on the current network
 */
export async function isMulticallAvailable(provider: ethers.Provider): Promise<boolean> {
  try {
    const code = await provider.getCode(MULTICALL3_ADDRESS);
    return code !== "0x";
  } catch {
    return false;
  }
}
