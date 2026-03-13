/**
 * Privy Authorization Context Utilities
 * 
 * This module handles the authorization context required for Privy wallet operations,
 * particularly for transaction signing with Viem accounts.
 */

export interface AuthorizationContext {
  authorization_private_keys: string[];
}

/**
 * Get user authorization key from Privy using Clerk JWT
 * This follows the same pattern as used in the Sui implementation
 */
export async function getUserAuthorizationKey(clerkJwt: string): Promise<string> {
  const authResponse = await fetch('https://api.privy.io/v1/wallets/authenticate', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(
        `${process.env.PRIVY_APP_ID}:${process.env.PRIVY_APP_SECRET}`
      ).toString('base64')}`,
      'Content-Type': 'application/json',
      'privy-app-id': process.env.PRIVY_APP_ID!,
    },
    body: JSON.stringify({
      user_jwt: clerkJwt
    })
  });

  if (!authResponse.ok) {
    const authError = await authResponse.text();
    console.error('[Privy Auth] Authentication failed:', authError);
    throw new Error(`Failed to authenticate with Privy: ${authResponse.status} - ${authError}`);
  }

  const authData = await authResponse.json();
  const userKey = authData.authorization_key;

  if (!userKey) {
    throw new Error('No authorization key returned from Privy authentication');
  }

  console.log('[Privy Auth] Authorization key obtained successfully');
  return userKey;
}

/**
 * Create authorization context from Clerk JWT
 */
export async function createAuthorizationContext(clerkJwt: string): Promise<AuthorizationContext> {
  const authorizationKey = await getUserAuthorizationKey(clerkJwt);
  
  return {
    authorization_private_keys: [authorizationKey]
  };
}

/**
 * Validate authorization context
 */
export function validateAuthorizationContext(context: AuthorizationContext): boolean {
  return !!(
    context &&
    context.authorization_private_keys &&
    Array.isArray(context.authorization_private_keys) &&
    context.authorization_private_keys.length > 0 &&
    context.authorization_private_keys[0]
  );
}