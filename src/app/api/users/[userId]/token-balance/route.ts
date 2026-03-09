import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey } from '@solana/web3.js';
import { ethers } from 'ethers';

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
const EVM_RPC_URL = process.env.EVM_RPC_URL || 'https://eth.llamarpc.com';

// ERC20 ABI for balanceOf
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

/**
 * GET /api/users/[userId]/token-balance
 * Fetch custom token balance directly from blockchain
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
    const { userId } = params;
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

    // First, get user's wallet address from backend
    const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://trading.watchup.site';
    const searchAsset = chain === 'sol' ? 'SOL' : 'ETH';
    
    const walletsResponse = await fetch(
      `${BACKEND_URL}/api/users/${userId}/wallets`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!walletsResponse.ok) {
      throw new Error('Failed to fetch user wallets');
    }

    const walletsData = await walletsResponse.json();
    const wallet = walletsData.find(
      (w: any) => w.asset === searchAsset && w.chain === chain
    );

    if (!wallet) {
      return NextResponse.json(
        { success: false, error: `No ${searchAsset} wallet found for user` },
        { status: 404 }
      );
    }

    const walletAddress = wallet.public_address;
    let balance = 0;

    if (chain === 'sol') {
      // Fetch Solana SPL token balance
      balance = await fetchSolanaTokenBalance(tokenAddress, walletAddress);
    } else {
      // Fetch EVM ERC20 token balance
      balance = await fetchEVMTokenBalance(tokenAddress, walletAddress);
    }

    return NextResponse.json({
      success: true,
      balance,
      tokenAddress,
      walletAddress,
      chain,
    });
  } catch (error) {
    console.error('Error fetching custom token balance:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch token balance',
      },
      { status: 500 }
    );
  }
}

/**
 * Fetch Solana SPL token balance
 */
async function fetchSolanaTokenBalance(
  mintAddress: string,
  walletAddress: string
): Promise<number> {
  try {
    const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
    const walletPubkey = new PublicKey(walletAddress);
    const mintPubkey = new PublicKey(mintAddress);

    // Get token accounts for this wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletPubkey,
      { mint: mintPubkey }
    );

    if (tokenAccounts.value.length === 0) {
      return 0;
    }

    // Sum up all token account balances (usually just one)
    let totalBalance = 0;
    for (const accountInfo of tokenAccounts.value) {
      const parsedInfo = accountInfo.account.data.parsed.info;
      const balance = parsedInfo.tokenAmount.uiAmount;
      totalBalance += balance || 0;
    }

    return totalBalance;
  } catch (error) {
    console.error('Error fetching Solana token balance:', error);
    return 0;
  }
}

/**
 * Fetch EVM ERC20 token balance
 */
async function fetchEVMTokenBalance(
  tokenAddress: string,
  walletAddress: string
): Promise<number> {
  try {
    const provider = new ethers.JsonRpcProvider(EVM_RPC_URL);
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

    // Get balance and decimals
    const [balance, decimals] = await Promise.all([
      contract.balanceOf(walletAddress),
      contract.decimals(),
    ]);

    // Convert to human-readable format
    const formattedBalance = parseFloat(ethers.formatUnits(balance, decimals));
    return formattedBalance;
  } catch (error) {
    console.error('Error fetching EVM token balance:', error);
    return 0;
  }
}
