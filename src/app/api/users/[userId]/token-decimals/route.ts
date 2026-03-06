import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { ethers } from 'ethers';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const EVM_RPC_URL = process.env.EVM_RPC_URL || 'https://eth.llamarpc.com';

// ERC20 ABI for decimals
const ERC20_ABI = ['function decimals() view returns (uint8)'];

/**
 * GET /api/users/[userId]/token-decimals
 * Fetch token decimals from blockchain
 * 
 * Query params:
 * - tokenAddress: Token mint/contract address
 * - chain: Blockchain network ('sol' or 'evm')
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const tokenAddress = searchParams.get('tokenAddress');
    const chain = searchParams.get('chain');

    if (!tokenAddress) {
      return NextResponse.json(
        { success: false, error: 'tokenAddress is required' },
        { status: 400 }
      );
    }

    if (!chain || !['sol', 'evm', 'eth'].includes(chain)) {
      return NextResponse.json(
        { success: false, error: 'Invalid chain. Must be sol or evm' },
        { status: 400 }
      );
    }

    let decimals = 18; // Default

    if (chain === 'sol') {
      decimals = await fetchSolanaTokenDecimals(tokenAddress);
    } else {
      decimals = await fetchEVMTokenDecimals(tokenAddress);
    }

    return NextResponse.json({
      success: true,
      decimals,
      tokenAddress,
      chain,
    });
  } catch (error) {
    console.error('Error fetching token decimals:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch token decimals',
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch Solana SPL token decimals
 */
async function fetchSolanaTokenDecimals(mintAddress: string): Promise<number> {
  try {
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    const mintPubkey = new PublicKey(mintAddress);

    // Get mint account info
    const mintInfo = await connection.getParsedAccountInfo(mintPubkey);

    if (!mintInfo.value) {
      throw new Error('Mint account not found');
    }

    const data = mintInfo.value.data;
    if ('parsed' in data && data.parsed.type === 'mint') {
      return data.parsed.info.decimals;
    }

    // Default to 9 for Solana if we can't parse
    return 9;
  } catch (error) {
    console.error('Error fetching Solana token decimals:', error);
    return 9; // Default for Solana
  }
}

/**
 * Fetch EVM ERC20 token decimals
 */
async function fetchEVMTokenDecimals(tokenAddress: string): Promise<number> {
  try {
    const provider = new ethers.JsonRpcProvider(EVM_RPC_URL);
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

    const decimals = await contract.decimals();
    return Number(decimals);
  } catch (error) {
    console.error('Error fetching EVM token decimals:', error);
    return 18; // Default for EVM
  }
}
