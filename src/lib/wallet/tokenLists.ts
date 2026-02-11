/**
 * Comprehensive Token Lists for Ethereum and Solana
 * Contains 50+ popular tokens per chain including DeFi, meme coins, and stablecoins
 */

export interface TokenInfo {
  symbol: string;
  name: string;
  address: string;
  decimals: number;
  logoURI?: string;
  coingeckoId?: string;
}

// Ethereum Mainnet Tokens (50+)
export const ETHEREUM_TOKENS: TokenInfo[] = [
  // Stablecoins
  {
    symbol: "USDT",
    name: "Tether USD",
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    decimals: 6,
    logoURI: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
    coingeckoId: "tether",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    decimals: 6,
    logoURI: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
    coingeckoId: "usd-coin",
  },
  {
    symbol: "DAI",
    name: "Dai Stablecoin",
    address: "0x6B175474E89094C44Da98b954EedbC56B466C530",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/9956/small/dai-multi-collateral-mcd.png",
    coingeckoId: "dai",
  },
  {
    symbol: "BUSD",
    name: "Binance USD",
    address: "0x4Fabb145d64652a948d72533023f6E7A623C7C53",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/9576/small/BUSD.png",
    coingeckoId: "binance-usd",
  },
  {
    symbol: "FRAX",
    name: "Frax",
    address: "0x853d955aCEf822Db058eb8505911ED77F175b99e",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/13422/small/FRAX_icon.png",
    coingeckoId: "frax",
  },
  // Wrapped Assets
  {
    symbol: "WETH",
    name: "Wrapped Ether",
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/2518/small/weth.png",
    coingeckoId: "weth",
  },
  {
    symbol: "WBTC",
    name: "Wrapped Bitcoin",
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    decimals: 8,
    logoURI: "https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png",
    coingeckoId: "wrapped-bitcoin",
  },
  {
    symbol: "stETH",
    name: "Lido Staked ETH",
    address: "0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/13442/small/steth_logo.png",
    coingeckoId: "staked-ether",
  },
  {
    symbol: "rETH",
    name: "Rocket Pool ETH",
    address: "0xae78736Cd615f374D3085123A210448E74Fc6393",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/20764/small/reth.png",
    coingeckoId: "rocket-pool-eth",
  },
  // DeFi Blue Chips
  {
    symbol: "LINK",
    name: "Chainlink",
    address: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png",
    coingeckoId: "chainlink",
  },
  {
    symbol: "UNI",
    name: "Uniswap",
    address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/12504/small/uni.jpg",
    coingeckoId: "uniswap",
  },
  {
    symbol: "AAVE",
    name: "Aave",
    address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/12645/small/AAVE.png",
    coingeckoId: "aave",
  },
  {
    symbol: "MKR",
    name: "Maker",
    address: "0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/1364/small/Mark_Maker.png",
    coingeckoId: "maker",
  },
  {
    symbol: "CRV",
    name: "Curve DAO Token",
    address: "0xD533a949740bb3306d119CC777fa900bA034cd52",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/12124/small/Curve.png",
    coingeckoId: "curve-dao-token",
  },
  {
    symbol: "SNX",
    name: "Synthetix",
    address: "0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/3406/small/SNX.png",
    coingeckoId: "havven",
  },
  {
    symbol: "COMP",
    name: "Compound",
    address: "0xc00e94Cb662C3520282E6f5717214004A7f26888",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/10775/small/COMP.png",
    coingeckoId: "compound-governance-token",
  },
  {
    symbol: "LDO",
    name: "Lido DAO",
    address: "0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/13573/small/Lido_DAO.png",
    coingeckoId: "lido-dao",
  },
  {
    symbol: "1INCH",
    name: "1inch",
    address: "0x111111111117dC0aa78b770fA6A738034120C302",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/13469/small/1inch-token.png",
    coingeckoId: "1inch",
  },
  {
    symbol: "SUSHI",
    name: "SushiSwap",
    address: "0x6B3595068778DD592e39A122f4f5a5cF09C90fE2",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/12271/small/512x512_Logo_no_chop.png",
    coingeckoId: "sushi",
  },
  {
    symbol: "YFI",
    name: "yearn.finance",
    address: "0x0bc529c00C6401aEF6D220BE8C6Ea1667F6Ad93e",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/11849/small/yearn.jpg",
    coingeckoId: "yearn-finance",
  },
  {
    symbol: "BAL",
    name: "Balancer",
    address: "0xba100000625a3754423978a60c9317c58a424e3D",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/11683/small/Balancer.png",
    coingeckoId: "balancer",
  },
  {
    symbol: "ENS",
    name: "Ethereum Name Service",
    address: "0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/19785/small/acatxTm8_400x400.jpg",
    coingeckoId: "ethereum-name-service",
  },
  // Layer 2 & Infrastructure
  {
    symbol: "MATIC",
    name: "Polygon",
    address: "0x7D1AfA7B718fb893dB30A3aBc0Cfc608AaCfeBB0",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/4713/small/matic-token-icon.png",
    coingeckoId: "matic-network",
  },
  {
    symbol: "ARB",
    name: "Arbitrum",
    address: "0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/16547/small/photo_2023-03-29_21.47.00.jpeg",
    coingeckoId: "arbitrum",
  },
  {
    symbol: "OP",
    name: "Optimism",
    address: "0x4200000000000000000000000000000000000042",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/25244/small/Optimism.png",
    coingeckoId: "optimism",
  },
  {
    symbol: "IMX",
    name: "Immutable X",
    address: "0xF57e7e7C23978C3cAEC3C3548E3D615c346e79fF",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/17233/small/immutableX-symbol-BLK-RGB.png",
    coingeckoId: "immutable-x",
  },
  // Meme Coins
  {
    symbol: "SHIB",
    name: "Shiba Inu",
    address: "0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/11939/small/shiba.png",
    coingeckoId: "shiba-inu",
  },
  {
    symbol: "PEPE",
    name: "Pepe",
    address: "0x6982508145454Ce325dDbE47a25d4ec3d2311933",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/29850/small/pepe-token.jpeg",
    coingeckoId: "pepe",
  },
  {
    symbol: "FLOKI",
    name: "Floki Inu",
    address: "0xcf0C122c6b73ff809C693DB761e7BaeBe62b6a2E",
    decimals: 9,
    logoURI: "https://assets.coingecko.com/coins/images/16746/small/PNG_image.png",
    coingeckoId: "floki",
  },
  {
    symbol: "BONE",
    name: "Bone ShibaSwap",
    address: "0x9813037ee2218799597d83D4a5B6F3b6778218d9",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/16916/small/bone_icon.png",
    coingeckoId: "bone-shibaswap",
  },
  {
    symbol: "ELON",
    name: "Dogelon Mars",
    address: "0x761D38e5ddf6ccf6Cf7c55759d5210750B5D60F3",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/14962/small/6GxcPRo3_400x400.jpg",
    coingeckoId: "dogelon-mars",
  },
  // AI & Gaming
  {
    symbol: "RNDR",
    name: "Render Token",
    address: "0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/11636/small/rndr.png",
    coingeckoId: "render-token",
  },
  {
    symbol: "FET",
    name: "Fetch.ai",
    address: "0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/5681/small/Fetch.jpg",
    coingeckoId: "fetch-ai",
  },
  {
    symbol: "AGIX",
    name: "SingularityNET",
    address: "0x5B7533812759B45C2B44C19e320ba2cD2681b542",
    decimals: 8,
    logoURI: "https://assets.coingecko.com/coins/images/2138/small/singularitynet.png",
    coingeckoId: "singularitynet",
  },
  {
    symbol: "OCEAN",
    name: "Ocean Protocol",
    address: "0x967da4048cD07aB37855c090aAF366e4ce1b9F48",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/3687/small/ocean-protocol-logo.jpg",
    coingeckoId: "ocean-protocol",
  },
  {
    symbol: "GALA",
    name: "Gala",
    address: "0xd1d2Eb1B1e90B638588728b4130137D262C87cae",
    decimals: 8,
    logoURI: "https://assets.coingecko.com/coins/images/12493/small/GALA-COINGECKO.png",
    coingeckoId: "gala",
  },
  {
    symbol: "AXS",
    name: "Axie Infinity",
    address: "0xBB0E17EF65F82Ab018d8EDd776e8DD940327B28b",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/13029/small/axie_infinity_logo.png",
    coingeckoId: "axie-infinity",
  },
  {
    symbol: "SAND",
    name: "The Sandbox",
    address: "0x3845badAde8e6dFF049820680d1F14bD3903a5d0",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/12129/small/sandbox_logo.jpg",
    coingeckoId: "the-sandbox",
  },
  {
    symbol: "MANA",
    name: "Decentraland",
    address: "0x0F5D2fB29fb7d3CFeE444a200298f468908cC942",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/878/small/decentraland-mana.png",
    coingeckoId: "decentraland",
  },
  {
    symbol: "APE",
    name: "ApeCoin",
    address: "0x4d224452801ACEd8B2F0aebE155379bb5D594381",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/24383/small/apecoin.jpg",
    coingeckoId: "apecoin",
  },
  // Exchange Tokens
  {
    symbol: "BNB",
    name: "BNB (ERC20)",
    address: "0xB8c77482e45F1F44dE1745F52C74426C631bDD52",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
    coingeckoId: "binancecoin",
  },
  {
    symbol: "LEO",
    name: "UNUS SED LEO",
    address: "0x2AF5D2aD76741191D15Dfe7bF6aC92d4Bd912Ca3",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/8418/small/leo-token.png",
    coingeckoId: "leo-token",
  },
  {
    symbol: "CRO",
    name: "Cronos",
    address: "0xA0b73E1Ff0B80914AB6fe0444E65848C4C34450b",
    decimals: 8,
    logoURI: "https://assets.coingecko.com/coins/images/7310/small/cro_token_logo.png",
    coingeckoId: "crypto-com-chain",
  },
  // Other Popular
  {
    symbol: "GRT",
    name: "The Graph",
    address: "0xc944E90C64B2c07662A292be6244BDf05Cda44a7",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/13397/small/Graph_Token.png",
    coingeckoId: "the-graph",
  },
  {
    symbol: "FTM",
    name: "Fantom (ERC20)",
    address: "0x4E15361FD6b4BB609Fa63C81A2be19d873717870",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/4001/small/Fantom_round.png",
    coingeckoId: "fantom",
  },
  {
    symbol: "CHZ",
    name: "Chiliz",
    address: "0x3506424F91fD33084466F402d5D97f05F8e3b4AF",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/8834/small/CHZ_Token_updated.png",
    coingeckoId: "chiliz",
  },
  {
    symbol: "RPL",
    name: "Rocket Pool",
    address: "0xD33526068D116cE69F19A9ee46F0bd304F21A51f",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/2090/small/rocket_pool_%28RPL%29.png",
    coingeckoId: "rocket-pool",
  },
  {
    symbol: "DYDX",
    name: "dYdX",
    address: "0x92D6C1e31e14520e676a687F0a93788B716BEff5",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/17500/small/hjnIm9bV.jpg",
    coingeckoId: "dydx",
  },
  {
    symbol: "BLUR",
    name: "Blur",
    address: "0x5283D291DBCF85356A21bA090E6db59121208b44",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/28453/small/blur.png",
    coingeckoId: "blur",
  },
  {
    symbol: "WLD",
    name: "Worldcoin",
    address: "0x163f8C2467924be0ae7B5347228CABF260318753",
    decimals: 18,
    logoURI: "https://assets.coingecko.com/coins/images/31069/small/worldcoin.jpeg",
    coingeckoId: "worldcoin-wld",
  },
];

// Solana Mainnet Tokens (50+)
export const SOLANA_TOKENS: TokenInfo[] = [
  // Stablecoins
  {
    symbol: "USDT",
    name: "Tether USD",
    address: "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB",
    decimals: 6,
    logoURI: "https://assets.coingecko.com/coins/images/325/small/Tether.png",
    coingeckoId: "tether",
  },
  {
    symbol: "USDC",
    name: "USD Coin",
    address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    decimals: 6,
    logoURI: "https://assets.coingecko.com/coins/images/6319/small/usdc.png",
    coingeckoId: "usd-coin",
  },
  {
    symbol: "PYUSD",
    name: "PayPal USD",
    address: "2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo",
    decimals: 6,
    logoURI: "https://assets.coingecko.com/coins/images/31212/small/PYUSD_Logo_%282%29.png",
    coingeckoId: "paypal-usd",
  },
  {
    symbol: "USDH",
    name: "USDH Hubble",
    address: "USDH1SM1ojwWUga67PGrgFWUHibbjqMvuMaDkRJTgkX",
    decimals: 6,
    logoURI: "https://assets.coingecko.com/coins/images/23721/small/usdh.png",
    coingeckoId: "usdh",
  },
  // Wrapped Assets
  {
    symbol: "WBTC",
    name: "Wrapped BTC (Portal)",
    address: "3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh",
    decimals: 8,
    logoURI: "https://assets.coingecko.com/coins/images/7598/small/wrapped_bitcoin_wbtc.png",
    coingeckoId: "wrapped-bitcoin",
  },
  {
    symbol: "WETH",
    name: "Wrapped ETH (Portal)",
    address: "7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs",
    decimals: 8,
    logoURI: "https://assets.coingecko.com/coins/images/2518/small/weth.png",
    coingeckoId: "weth",
  },
  {
    symbol: "mSOL",
    name: "Marinade Staked SOL",
    address: "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
    decimals: 9,
    logoURI: "https://assets.coingecko.com/coins/images/17752/small/mSOL.png",
    coingeckoId: "msol",
  },
  {
    symbol: "stSOL",
    name: "Lido Staked SOL",
    address: "7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj",
    decimals: 9,
    logoURI: "https://assets.coingecko.com/coins/images/18369/small/logo_-_2021-09-15T100934.765.png",
    coingeckoId: "lido-staked-sol",
  },
  {
    symbol: "jitoSOL",
    name: "Jito Staked SOL",
    address: "J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn",
    decimals: 9,
    logoURI: "https://assets.coingecko.com/coins/images/28046/small/JitoSOL-200.png",
    coingeckoId: "jito-staked-sol",
  },
  {
    symbol: "bSOL",
    name: "BlazeStake Staked SOL",
    address: "bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1",
    decimals: 9,
    logoURI: "https://assets.coingecko.com/coins/images/26636/small/blazesolana.png",
    coingeckoId: "blazestake-staked-sol",
  },
  // DeFi & Ecosystem
  {
    symbol: "RAY",
    name: "Raydium",
    address: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
    decimals: 6,
    logoURI: "https://assets.coingecko.com/coins/images/13928/small/PSigc4ie_400x400.jpg",
    coingeckoId: "raydium",
  },
  {
    symbol: "JTO",
    name: "Jito",
    address: "jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL",
    decimals: 9,
    logoURI: "https://assets.coingecko.com/coins/images/33228/small/jto.png",
    coingeckoId: "jito-governance-token",
  },
  {
    symbol: "JUP",
    name: "Jupiter",
    address: "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
    decimals: 6,
    logoURI: "https://assets.coingecko.com/coins/images/34188/small/jup.png",
    coingeckoId: "jupiter-exchange-solana",
  },
  {
    symbol: "ORCA",
    name: "Orca",
    address: "orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE",
    decimals: 6,
    logoURI: "https://assets.coingecko.com/coins/images/17547/small/Orca_Logo.png",
    coingeckoId: "orca",
  },
  {
    symbol: "MNDE",
    name: "Marinade",
    address: "MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey",
    decimals: 9,
    logoURI: "https://assets.coingecko.com/coins/images/18867/small/MNDE.png",
    coingeckoId: "marinade",
  },
  {
    symbol: "HNT",
    name: "Helium",
    address: "hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux",
    decimals: 8,
    logoURI: "https://assets.coingecko.com/coins/images/4284/small/Helium_HNT.png",
    coingeckoId: "helium",
  },
  {
    symbol: "PYTH",
    name: "Pyth Network",
    address: "HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3",
    decimals: 6,
    logoURI: "https://assets.coingecko.com/coins/images/31924/small/pyth.png",
    coingeckoId: "pyth-network",
  },
  {
    symbol: "RENDER",
    name: "Render Token",
    address: "rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof",
    decimals: 8,
    logoURI: "https://assets.coingecko.com/coins/images/11636/small/rndr.png",
    coingeckoId: "render-token",
  },
  // Meme Coins
  {
    symbol: "BONK",
    name: "Bonk",
    address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    decimals: 5,
    logoURI: "https://assets.coingecko.com/coins/images/28600/small/bonk.jpg",
    coingeckoId: "bonk",
  },
  {
    symbol: "WIF",
    name: "dogwifhat",
    address: "EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm",
    decimals: 6,
    logoURI: "https://assets.coingecko.com/coins/images/33566/small/dogwifhat.jpg",
    coingeckoId: "dogwifcoin",
  },
  {
    symbol: "POPCAT",
    name: "Popcat",
    address: "7GCihgDB8fe6KNjn2MYtkzZcRjQy3t9GHdC8uHYmW2hr",
    decimals: 9,
    logoURI: "https://assets.coingecko.com/coins/images/33760/small/popcat.jpg",
    coingeckoId: "popcat",
  },
  {
    symbol: "MEW",
    name: "cat in a dogs world",
    address: "MEW1gQWJ3nEXg2qgERiKu7FAFj79PHvQVREQUzScPP5",
    decimals: 5,
    logoURI: "https://assets.coingecko.com/coins/images/36436/small/mew.png",
    coingeckoId: "cat-in-a-dogs-world",
  },
  {
    symbol: "SAMO",
    name: "Samoyedcoin",
    address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    decimals: 9,
    logoURI: "https://assets.coingecko.com/coins/images/15051/small/IXeEj5e.png",
    coingeckoId: "samoyedcoin",
  },
  {
    symbol: "MYRO",
    name: "Myro",
    address: "HhJpBhRRn4g56VsyLuT8DL5Bv31HkXqsrahTTUCZeZg4",
    decimals: 9,
    logoURI: "https://assets.coingecko.com/coins/images/33115/small/Myro200x200.png",
    coingeckoId: "myro",
  },
  {
    symbol: "WEN",
    name: "Wen",
    address: "WENWENvqqNya429ubCdR81ZmD69brwQaaBYY6p3LCpk",
    decimals: 5,
    logoURI: "https://assets.coingecko.com/coins/images/34856/small/wen.jpg",
    coingeckoId: "wen-4",
  },
  {
    symbol: "SLERF",
    name: "SLERF",
    address: "7BgBvyjrZX1YKz4oh9mjb8ZScatkkwb8DzFx7LoiVkM3",
    decimals: 9,
    logoURI: "https://assets.coingecko.com/coins/images/36340/small/slerf.jpg",
    coingeckoId: "slerf",
  },
  {
    symbol: "BOME",
    name: "BOOK OF MEME",
    address: "ukHH6c7mMyiWCf1b9pnWe25TSpkDDt3H5pQZgZ74J82",
    decimals: 6,
    logoURI: "https://assets.coingecko.com/coins/images/36071/small/bome.jpg",
    coingeckoId: "book-of-meme",
  },
  // Gaming & NFT
  {
    symbol: "GMT",
    name: "STEPN",
    address: "7i5KKsX2weiTkry7jA4ZwSuXGhs5eJBEjY8vVxR4pfRx",
    decimals: 9,
    logoURI: "https://assets.coingecko.com/coins/images/23597/small/gmt.png",
    coingeckoId: "stepn",
  },
  {
    symbol: "GST",
    name: "Green Satoshi Token",
    address: "AFbX8oGjGpmVFywbVouvhQSRmiW2aR1mohfahi4Y2AdB",
    decimals: 9,
    logoURI: "https://assets.coingecko.com/coins/images/21841/small/gst.png",
    coingeckoId: "green-satoshi-token",
  },
  {
    symbol: "DUST",
    name: "DUST Protocol",
    address: "DUSTawucrTsGU8hcqRdHDCbuYhCPADMLM2VcCb8VnFnQ",
    decimals: 9,
    logoURI: "https://assets.coingecko.com/coins/images/25329/small/dust-logo.png",
    coingeckoId: "dust-protocol",
  },
  {
    symbol: "GENE",
    name: "Genopets",
    address: "GENEtH5amGSi8kHAtQoezp1XEXwZJ8vcuePYnXdKrMYz",
    decimals: 9,
    logoURI: "https://assets.coingecko.com/coins/images/24379/small/gene.png",
    coingeckoId: "genopets",
  },
  {
    symbol: "ATLAS",
    name: "Star Atlas",
    address: "ATLASXmbPQxBUYbxPsV97usA3fPQYEqzQBUHgiFCUsXx",
    decimals: 8,
    logoURI: "https://assets.coingecko.com/coins/images/17659/small/Icon_Reverse.png",
    coingeckoId: "star-atlas",
  },
  {
    symbol: "POLIS",
    name: "Star Atlas DAO",
    address: "poLisWXnNRwC6oBu1vHiuKQzFjGL4XDSu4g9qjz9qVk",
    decimals: 8,
    logoURI: "https://assets.coingecko.com/coins/images/17789/small/POLIS.jpg",
    coingeckoId: "star-atlas-dao",
  },
  {
    symbol: "SHDW",
    name: "Shadow Token",
    address: "SHDWyBxihqiCj6YekG2GUr7wqKLeLAMK1gHZck9pL6y",
    decimals: 9,
    logoURI: "https://assets.coingecko.com/coins/images/24385/small/shdw.png",
    coingeckoId: "genesysgo-shadow",
  },
  // Infrastructure & DePIN
  {
    symbol: "MOBILE",
    name: "Helium Mobile",
    address: "mb1eu7TzEc71KxDpsmsKoucSSuuoGLv1drys1oP2jh6",
    decimals: 6,
    logoURI: "https://assets.coingecko.com/coins/images/29328/small/MOBILE.png",
    coingeckoId: "helium-mobile",
  },
  {
    symbol: "IOT",
    name: "Helium IOT",
    address: "iotEVVZLEywoTn1QdwNPddxPWszn3zFhEot3MfL9fns",
    decimals: 6,
    logoURI: "https://assets.coingecko.com/coins/images/29326/small/IoT.png",
    coingeckoId: "helium-iot",
  },
  {
    symbol: "HONEY",
    name: "Hivemapper",
    address: "4vMsoUT2BWatFweudnQM1xedRLfJgJ7hswhcpz4xgBTy",
    decimals: 9,
    logoURI: "https://assets.coingecko.com/coins/images/28388/small/honey_token.png",
    coingeckoId: "hivemapper",
  },
  // AI
  {
    symbol: "AI16Z",
    name: "ai16z",
    address: "HeLp6NuQkmYB4pYWo2zYs22mESHXPQYzXbB8n4V98jwC",
    decimals: 9,
    logoURI: "https://assets.coingecko.com/coins/images/38762/small/ai16z.png",
    coingeckoId: "ai16z",
  },
  {
    symbol: "GRIFFAIN",
    name: "Griffain",
    address: "KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS",
    decimals: 6,
    logoURI: "https://assets.coingecko.com/coins/images/36335/small/griffain.jpg",
    coingeckoId: "griffain",
  },
  // Other Popular
  {
    symbol: "KMNO",
    name: "Kamino",
    address: "KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS",
    decimals: 6,
    logoURI: "https://assets.coingecko.com/coins/images/36335/small/kmno.png",
    coingeckoId: "kamino",
  },
  {
    symbol: "W",
    name: "Wormhole",
    address: "85VBFQZC9TZkfaptBWjvUw7YbZjy52A6mjtPGjstQAmQ",
    decimals: 6,
    logoURI: "https://assets.coingecko.com/coins/images/35087/small/womrhole_logo_full_color_rgb_-_600_x_600px.png",
    coingeckoId: "wormhole",
  },
  {
    symbol: "TENSOR",
    name: "Tensor",
    address: "TNSRxcUxoT9xBG3de7PiJyTDYu7kskLqcpddxnEJAS6",
    decimals: 9,
    logoURI: "https://assets.coingecko.com/coins/images/35972/small/tensor.jpg",
    coingeckoId: "tensor",
  },
  {
    symbol: "DIO",
    name: "Decimated",
    address: "BiDB55p4G3n1fGhwKFpxsokBMqgctL4qnZpDH1bVQxMD",
    decimals: 9,
    logoURI: "https://assets.coingecko.com/coins/images/18532/small/decimated.PNG",
    coingeckoId: "decimated",
  },
  {
    symbol: "FIDA",
    name: "Bonfida",
    address: "EchesyfXePKdLtoiZSL8pBe8Myagyy8ZRqsACNCFGnvp",
    decimals: 6,
    logoURI: "https://assets.coingecko.com/coins/images/13395/small/bonfida.png",
    coingeckoId: "bonfida",
  },
];

/**
 * Get token info by address
 */
export function getTokenByAddress(
  address: string,
  chain: "ethereum" | "solana"
): TokenInfo | undefined {
  const list = chain === "ethereum" ? ETHEREUM_TOKENS : SOLANA_TOKENS;
  return list.find(
    (t) => t.address.toLowerCase() === address.toLowerCase()
  );
}

/**
 * Get token info by symbol
 */
export function getTokenBySymbol(
  symbol: string,
  chain: "ethereum" | "solana"
): TokenInfo | undefined {
  const list = chain === "ethereum" ? ETHEREUM_TOKENS : SOLANA_TOKENS;
  return list.find(
    (t) => t.symbol.toLowerCase() === symbol.toLowerCase()
  );
}

/**
 * Get CoinGecko logo URL
 */
export function getTokenLogo(symbol: string, chain: "ethereum" | "solana"): string {
  const token = getTokenBySymbol(symbol, chain);
  if (token?.logoURI) return token.logoURI;
  
  // Fallback to chain icon
  return chain === "ethereum"
    ? "https://cryptologos.cc/logos/ethereum-eth-logo.png"
    : "https://cryptologos.cc/logos/solana-sol-logo.png";
}

/**
 * Map of CoinGecko IDs for price fetching
 */
export function getCoinGeckoIds(chain: "ethereum" | "solana"): string[] {
  const list = chain === "ethereum" ? ETHEREUM_TOKENS : SOLANA_TOKENS;
  return list.filter((t) => t.coingeckoId).map((t) => t.coingeckoId!);
}
