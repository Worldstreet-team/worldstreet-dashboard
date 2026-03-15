import { currentUser } from "@clerk/nextjs/server";
import { connectDB } from "@/lib/mongodb";
import { UserWallet } from "@/models/UserWallet";
import { privyClient } from "@/lib/privy/client";

/**
 * Ensures a UserWallet document exists for the given clerkUserId.
 * 
 * Lookup order:
 * 1. By clerkUserId
 * 2. By email (from Clerk), then backfill clerkUserId
 * 3. Create Privy user + wallets + UserWallet from scratch
 * 
 * Returns the UserWallet document or null if creation fails.
 */
export async function ensureUserWallet(clerkUserId: string) {
  await connectDB();

  // 1. Try by clerkUserId
  let userWallet = await UserWallet.findOne({ clerkUserId });
  if (userWallet) return userWallet;

  // 2. Get email from Clerk and try by email
  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses?.[0]?.emailAddress;
  if (!email) {
    console.error("[ensureUserWallet] No email found for clerk user:", clerkUserId);
    return null;
  }

  userWallet = await UserWallet.findOne({ email });
  if (userWallet) {
    // Backfill clerkUserId
    if (!userWallet.clerkUserId || userWallet.clerkUserId !== clerkUserId) {
      userWallet.clerkUserId = clerkUserId;
      await userWallet.save();
      console.log("[ensureUserWallet] Backfilled clerkUserId on existing wallet for:", email);
    }
    return userWallet;
  }

  // 3. No wallet at all — create Privy user + wallets
  console.log("[ensureUserWallet] No wallet found, creating for:", email);

  let privyUser;
  try {
    privyUser = await privyClient.users().create({
      linked_accounts: [
        { type: "custom_auth", custom_user_id: clerkUserId },
        { type: "email", address: email },
      ],
      wallets: [
        { chain_type: "ethereum" },
        { chain_type: "solana" },
      ],
    });
    console.log("[ensureUserWallet] Created new Privy user:", privyUser.id);
  } catch (error: any) {
    // Handle conflict — user already exists in Privy
    if (error.message?.includes("Input conflict") || error.status === 422) {
      const conflictMatch = error.message?.match(/did:privy:[a-z0-9]+/i);
      const existingDid = conflictMatch ? conflictMatch[0] : null;
      if (existingDid) {
        try {
          privyUser = await privyClient.users().get(existingDid);
          console.log("[ensureUserWallet] Retrieved existing Privy user:", existingDid);
        } catch {
          console.error("[ensureUserWallet] Failed to retrieve conflicting Privy user:", existingDid);
          return null;
        }
      } else {
        console.error("[ensureUserWallet] Conflict but no DID found:", error.message);
        return null;
      }
    } else {
      console.error("[ensureUserWallet] Privy user creation failed:", error.message);
      return null;
    }
  }

  // Extract wallets from Privy user
  const accounts = (privyUser as any).linkedAccounts || (privyUser as any).linked_accounts || [];
  const wallets: Record<string, any> = {};

  for (const chainType of ["ethereum", "solana"]) {
    const wallet = accounts.find(
      (acc: any) =>
        acc.type === "wallet" &&
        (acc.chainType === chainType || acc.chain_type === chainType)
    );
    if (wallet) {
      wallets[chainType] = {
        walletId: wallet.id,
        address: wallet.address,
        publicKey: wallet.publicKey || wallet.public_key || null,
      };
    }
  }

  // Build tradingWallet (unified = ethereum)
  const tradingWallet = wallets.ethereum
    ? {
        walletId: wallets.ethereum.walletId,
        address: wallets.ethereum.address,
        chainType: "ethereum",
        initialized: false,
      }
    : undefined;

  userWallet = await UserWallet.findOneAndUpdate(
    { email },
    {
      email,
      clerkUserId,
      privyUserId: (privyUser as any).id,
      wallets,
      ...(tradingWallet && { tradingWallet }),
    },
    { upsert: true, new: true }
  );

  console.log("[ensureUserWallet] Created wallet for:", email, "address:", tradingWallet?.address);
  return userWallet;
}
