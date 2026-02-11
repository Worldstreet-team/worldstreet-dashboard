import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { ethers } from "ethers";

// RPC endpoints
const SOL_RPC = process.env.NEXT_PUBLIC_SOL_RPC || "https://api.mainnet-beta.solana.com";
const ETH_RPC = process.env.NEXT_PUBLIC_ETH_RPC || "https://rpc.ankr.com/eth";

// Minimal ERC20 ABI for metadata
const ERC20_ABI = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
];

interface TokenMetadata {
  address: string;
  chain: "ethereum" | "solana";
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  coingeckoId?: string;
  price?: number;
  priceChange24h?: number;
}

/**
 * GET /api/tokens/metadata?address=...&chain=...
 * Fetch token metadata from on-chain and CoinGecko
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");
    const chain = searchParams.get("chain") as "ethereum" | "solana";

    if (!address || !chain) {
      return NextResponse.json(
        { error: "Missing required params: address, chain" },
        { status: 400 }
      );
    }

    if (!["ethereum", "solana"].includes(chain)) {
      return NextResponse.json(
        { error: "Invalid chain. Must be 'ethereum' or 'solana'" },
        { status: 400 }
      );
    }

    let metadata: TokenMetadata;

    if (chain === "ethereum") {
      metadata = await fetchEthereumTokenMetadata(address);
    } else {
      metadata = await fetchSolanaTokenMetadata(address);
    }

    // Try to enrich with CoinGecko data
    const enriched = await enrichWithCoinGecko(metadata);

    return NextResponse.json({ metadata: enriched });
  } catch (error) {
    console.error("Error fetching token metadata:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch token metadata" },
      { status: 500 }
    );
  }
}

/**
 * Fetch ERC20 token metadata from Ethereum
 */
async function fetchEthereumTokenMetadata(address: string): Promise<TokenMetadata> {
  const provider = new ethers.JsonRpcProvider(ETH_RPC);

  // Validate address format
  if (!ethers.isAddress(address)) {
    throw new Error("Invalid Ethereum address format");
  }

  const contract = new ethers.Contract(address, ERC20_ABI, provider);

  try {
    const [name, symbol, decimals] = await Promise.all([
      contract.name(),
      contract.symbol(),
      contract.decimals(),
    ]);

    return {
      address: address.toLowerCase(),
      chain: "ethereum",
      name,
      symbol,
      decimals: Number(decimals),
    };
  } catch {
    throw new Error("Failed to fetch token data. Make sure this is a valid ERC20 token address.");
  }
}

/**
 * Fetch SPL token metadata from Solana
 */
async function fetchSolanaTokenMetadata(address: string): Promise<TokenMetadata> {
  const connection = new Connection(SOL_RPC);

  // Validate address format
  let mintPubkey: PublicKey;
  try {
    mintPubkey = new PublicKey(address);
  } catch {
    throw new Error("Invalid Solana address format");
  }

  try {
    // Get mint info
    const mintInfo = await connection.getParsedAccountInfo(mintPubkey);

    if (!mintInfo.value) {
      throw new Error("Token mint not found");
    }

    const data = mintInfo.value.data;
    if (!("parsed" in data)) {
      throw new Error("Unable to parse mint data");
    }

    const parsedData = data.parsed;
    const decimals = parsedData.info?.decimals;

    if (decimals === undefined) {
      throw new Error("Unable to get token decimals");
    }

    // Try to get metadata from Metaplex
    let name = "Unknown Token";
    let symbol = "UNKNOWN";

    // Try fetching from token metadata program
    const metadataAddress = await getMetaplexMetadataAddress(mintPubkey);
    const metadataAccount = await connection.getAccountInfo(metadataAddress);

    if (metadataAccount) {
      const metadataDecoded = decodeMetaplexMetadata(metadataAccount.data);
      if (metadataDecoded) {
        name = metadataDecoded.name;
        symbol = metadataDecoded.symbol;
      }
    }

    // If still unknown, try Jupiter token list API
    if (symbol === "UNKNOWN") {
      const jupiterData = await fetchJupiterTokenInfo(address);
      if (jupiterData) {
        name = jupiterData.name || name;
        symbol = jupiterData.symbol || symbol;
      }
    }

    return {
      address,
      chain: "solana",
      name,
      symbol,
      decimals,
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes("Invalid")) {
      throw error;
    }
    throw new Error("Failed to fetch token data. Make sure this is a valid SPL token mint address.");
  }
}

/**
 * Get Metaplex metadata PDA
 */
async function getMetaplexMetadataAddress(mint: PublicKey): Promise<PublicKey> {
  const METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");
  const [metadataAddress] = PublicKey.findProgramAddressSync(
    [Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    METADATA_PROGRAM_ID
  );
  return metadataAddress;
}

/**
 * Decode Metaplex metadata
 */
function decodeMetaplexMetadata(
  data: Buffer
): { name: string; symbol: string } | null {
  try {
    // Skip first 1 + 32 + 32 bytes (key + update authority + mint)
    let offset = 1 + 32 + 32;

    // Name length (4 bytes)
    const nameLength = data.readUInt32LE(offset);
    offset += 4;

    // Name
    const name = data
      .subarray(offset, offset + nameLength)
      .toString("utf8")
      .replace(/\0/g, "")
      .trim();
    offset += nameLength;

    // Symbol length (4 bytes)
    const symbolLength = data.readUInt32LE(offset);
    offset += 4;

    // Symbol
    const symbol = data
      .subarray(offset, offset + symbolLength)
      .toString("utf8")
      .replace(/\0/g, "")
      .trim();

    if (name && symbol) {
      return { name, symbol };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch token info from Jupiter API
 */
async function fetchJupiterTokenInfo(
  address: string
): Promise<{ name: string; symbol: string } | null> {
  try {
    const response = await fetch(
      `https://token.jup.ag/strict?address=${address}`,
      { next: { revalidate: 3600 } }
    );

    if (!response.ok) {
      // Try all tokens list
      const allResponse = await fetch(
        `https://token.jup.ag/all?address=${address}`,
        { next: { revalidate: 3600 } }
      );
      if (!allResponse.ok) return null;
      const data = await allResponse.json();
      const token = data.find((t: { address: string }) => t.address === address);
      return token ? { name: token.name, symbol: token.symbol } : null;
    }

    const data = await response.json();
    const token = data.find((t: { address: string }) => t.address === address);
    return token ? { name: token.name, symbol: token.symbol } : null;
  } catch {
    return null;
  }
}

/**
 * Enrich token metadata with CoinGecko data
 */
async function enrichWithCoinGecko(
  metadata: TokenMetadata
): Promise<TokenMetadata> {
  try {
    // Search CoinGecko by contract address
    const platform = metadata.chain === "ethereum" ? "ethereum" : "solana";
    const searchUrl = `https://api.coingecko.com/api/v3/coins/${platform}/contract/${metadata.address}`;

    const response = await fetch(searchUrl, {
      headers: {
        accept: "application/json",
      },
      next: { revalidate: 3600 },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        ...metadata,
        logoURI: data.image?.small || data.image?.thumb,
        coingeckoId: data.id,
        price: data.market_data?.current_price?.usd,
        priceChange24h: data.market_data?.price_change_percentage_24h,
      };
    }

    // If not found by contract, try by symbol search
    const symbolSearchUrl = `https://api.coingecko.com/api/v3/search?query=${metadata.symbol}`;
    const symbolResponse = await fetch(symbolSearchUrl, {
      next: { revalidate: 3600 },
    });

    if (symbolResponse.ok) {
      const searchData = await symbolResponse.json();
      const coin = searchData.coins?.find(
        (c: { symbol: string }) =>
          c.symbol.toLowerCase() === metadata.symbol.toLowerCase()
      );

      if (coin) {
        return {
          ...metadata,
          logoURI: coin.large || coin.small || coin.thumb,
          coingeckoId: coin.id,
        };
      }
    }

    return metadata;
  } catch {
    // Return original metadata if CoinGecko fails
    return metadata;
  }
}
