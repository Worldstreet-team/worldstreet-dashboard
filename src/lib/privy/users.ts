import { privyClient } from "./client";

/**
 * Create a Privy user linked to a Clerk user ID
 */
export async function createPrivyUser(clerkUserId: string): Promise<string> {
  try {
    // Check if user already exists
    const existingUser = await privyClient.getUserByCustomId(clerkUserId);
    if (existingUser) {
      return existingUser.id;
    }
  } catch (error) {
    // User doesn't exist, continue to create
  }

  // Create new Privy user
  const user = await privyClient.createUser({
    linkedAccounts: [
      {
        type: "custom_auth",
        customUserId: clerkUserId
      }
    ]
  });

  return user.id;
}

/**
 * Get Privy user by Clerk user ID
 */
export async function getPrivyUserByClerkId(clerkUserId: string) {
  const user = await privyClient.getUserByCustomId(clerkUserId);
  return user;
}

/**
 * Get Privy user by Privy user ID
 */
export async function getPrivyUser(privyUserId: string) {
  const user = await privyClient.getUser(privyUserId);
  return user;
}
