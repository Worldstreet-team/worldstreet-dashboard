/**
 * Privy Authorization Context Utilities
 *
 * Uses the PRIVY_AUTH_PRIVATE_KEY registered in the Privy Dashboard
 * to authorize wallet operations. The SDK expects the key in DER format
 * (base64 string, no PEM headers/footers). If the .env stores PEM format,
 * we strip the headers and whitespace to produce raw DER base64.
 */

export interface AuthorizationContext {
  authorization_private_keys: string[];
}

/**
 * Read the authorization private key from env and ensure it's in DER base64 format.
 * The Privy SDK's `authorization_private_keys` expects raw base64-encoded DER
 * (same format as `generateP256KeyPair()` returns — no PEM headers/footers).
 */
function getPrivyAuthKey(): string {
  const raw = process.env.PRIVY_AUTH_PRIVATE_KEY;
  if (!raw) {
    throw new Error("PRIVY_AUTH_PRIVATE_KEY is not set");
  }
  // .env may store literal \n — convert to real newlines first
  const normalized = raw.replace(/\\n/g, "\n");

  // If key is in PEM format, strip headers/footers/whitespace → raw DER base64
  if (normalized.includes("-----BEGIN")) {
    return normalized
      .replace(/-----BEGIN[^-]+-----/g, "")
      .replace(/-----END[^-]+-----/g, "")
      .replace(/\s+/g, "");
  }

  // Already in DER base64 format
  return normalized.trim();
}

/**
 * Create authorization context for Privy wallet operations.
 * Uses the app-level authorization private key (DER format).
 */
export function createAuthorizationContext(_clerkJwt?: string): AuthorizationContext {
  return {
    authorization_private_keys: [getPrivyAuthKey()],
  };
}

/**
 * Validate authorization context has the required key
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