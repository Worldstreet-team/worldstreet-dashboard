/**
 * Create authorization context for Privy wallet operations
 * This includes the user's JWT token for verification
 */
export function createAuthorizationContext(clerkJwt: string) {
  return {
    userJwts: [clerkJwt]
  };
}

/**
 * Authorization context type for Privy operations
 */
export interface AuthorizationContext {
  userJwts: string[];
}
