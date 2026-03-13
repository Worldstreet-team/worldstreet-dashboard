import { privyClient } from "./client";
import { createAuthorizationContext } from "./authorization";

/**
 * Sign an arbitrary message with Ethereum wallet
 */
export async function signEthereumMessage(
  walletId: string,
  message: string,
  clerkJwt: string
) {
  const authContext = createAuthorizationContext(clerkJwt);

  const signature = await privyClient.wallets
    .ethereum(walletId)
    .signMessage({ message }, { authorizationContext: authContext });

  return signature;
}

/**
 * Sign an arbitrary message with Solana wallet
 */
export async function signSolanaMessage(
  walletId: string,
  message: string,
  clerkJwt: string
) {
  const authContext = createAuthorizationContext(clerkJwt);

  const signature = await privyClient.wallets
    .solana(walletId)
    .signMessage({ message }, { authorizationContext: authContext });

  return signature;
}

/**
 * Sign typed data (EIP-712) with Ethereum wallet
 */
export async function signTypedData(
  walletId: string,
  typedData: any,
  clerkJwt: string
) {
  const authContext = createAuthorizationContext(clerkJwt);

  const signature = await privyClient.wallets
    .ethereum(walletId)
    .signTypedData(typedData, { authorizationContext: authContext });

  return signature;
}
