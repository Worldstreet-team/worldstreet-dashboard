import { privyClient } from "./client";

export interface UserWallets {
  ethereum: {
    id: string;
    address: string;
    chainType: "ethereum";
  };
  solana: {
    id: string;
    address: string;
    chainType: "solana";
  };
  sui: {
    id: string;
    address: string;
    chainType: "sui";
  };
  ton: {
    id: string;
    address: string;
    chainType: "ton";
  };
  tron: {
    id: string;
    address: string;
    chainType: "tron";
  };
}

/**
 * Create all 5 chain wallets for a Privy user
 */
export async function createUserWallets(
  privyUserId: string
): Promise<UserWallets> {
  // Create wallets for all 5 chains using @privy-io/node API
  const [ethWallet, solWallet, suiWallet, tonWallet, tronWallet] = await Promise.all([
    privyClient.wallets().create({
      chainType: "ethereum",
      userId: privyUserId
    }),
    privyClient.wallets().create({
      chainType: "solana",
      userId: privyUserId
    }),
    privyClient.wallets().create({
      chainType: "sui",
      userId: privyUserId
    }),
    privyClient.wallets().create({
      chainType: "ton",
      userId: privyUserId
    }),
    privyClient.wallets().create({
      chainType: "tron",
      userId: privyUserId
    })
  ]);

  return {
    ethereum: {
      id: ethWallet.id,
      address: ethWallet.address,
      chainType: "ethereum"
    },
    solana: {
      id: solWallet.id,
      address: solWallet.address,
      chainType: "solana"
    },
    sui: {
      id: suiWallet.id,
      address: suiWallet.address,
      chainType: "sui"
    },
    ton: {
      id: tonWallet.id,
      address: tonWallet.address,
      chainType: "ton"
    },
    tron: {
      id: tronWallet.id,
      address: tronWallet.address,
      chainType: "tron"
    }
  };
}

/**
 * Get all wallets for a Privy user
 */
export async function getUserWallets(privyUserId: string) {
  const wallets = await privyClient.wallets().list({
    userId: privyUserId
  });

  const ethereum = wallets.find((w) => w.chainType === "ethereum");
  const solana = wallets.find((w) => w.chainType === "solana");
  const sui = wallets.find((w) => w.chainType === "sui");
  const ton = wallets.find((w) => w.chainType === "ton");
  const tron = wallets.find((w) => w.chainType === "tron");

  return {
    ethereum: ethereum
      ? {
          id: ethereum.id,
          address: ethereum.address,
          chainType: "ethereum" as const
        }
      : null,
    solana: solana
      ? {
          id: solana.id,
          address: solana.address,
          chainType: "solana" as const
        }
      : null,
    sui: sui
      ? {
          id: sui.id,
          address: sui.address,
          chainType: "sui" as const
        }
      : null,
    ton: ton
      ? {
          id: ton.id,
          address: ton.address,
          chainType: "ton" as const
        }
      : null,
    tron: tron
      ? {
          id: tron.id,
          address: tron.address,
          chainType: "tron" as const
        }
      : null
  };
}
