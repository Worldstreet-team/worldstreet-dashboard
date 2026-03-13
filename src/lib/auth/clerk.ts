import { auth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";

/**
 * Verify Clerk session and get JWT token
 * This works with Clerk session cookies - no Authorization header needed
 */
export async function verifyClerkJWT(request: NextRequest) {
  try {
    // Get userId and token from Clerk session (works with cookies)
    const { userId, getToken } = await auth();

    if (!userId) {
      throw new Error("Unauthorized - No user session found");
    }

    // Get the session token
    // Note: This token is for Privy authorization context, not for Privy to verify
    // Privy will use this to associate the wallet operation with the user
    const token = await getToken();
    
    if (!token) {
      // If no token available, create a simple identifier
      // Privy will still work as long as we have the userId
      console.warn("No Clerk token available, using userId as identifier");
      return {
        userId,
        token: userId // Use userId as fallback
      };
    }

    return {
      userId,
      token
    };
  } catch (error) {
    console.error("Clerk auth error:", error);
    throw new Error("Invalid or expired session");
  }
}

/**
 * Get current user from Clerk session
 */
export async function getCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Not authenticated");
  }

  return { userId };
}
