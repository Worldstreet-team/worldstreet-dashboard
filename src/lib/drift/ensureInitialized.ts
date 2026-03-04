import { initializeDriftServices, isDriftServicesInitialized } from '@/services/drift';

let initializationPromise: Promise<void> | null = null;

/**
 * Ensures Drift services are initialized before processing requests.
 * Uses a singleton pattern to prevent multiple concurrent initializations.
 */
export async function ensureDriftServicesInitialized(): Promise<void> {
  // If already initialized, return immediately
  if (isDriftServicesInitialized()) {
    return;
  }
  
  // If initialization is in progress, wait for it
  if (initializationPromise) {
    return initializationPromise;
  }
  
  // Start initialization
  initializationPromise = initializeDriftServices()
    .then(() => {
      console.log('[ensureDriftServicesInitialized] Services initialized successfully');
    })
    .catch((error) => {
      console.error('[ensureDriftServicesInitialized] Initialization failed:', error);
      // Reset promise so it can be retried
      initializationPromise = null;
      throw error;
    });
  
  return initializationPromise;
}

/**
 * Middleware helper to ensure services are initialized before handling API requests
 */
export function withDriftServices<T>(
  handler: () => Promise<T>
): () => Promise<T> {
  return async () => {
    await ensureDriftServicesInitialized();
    return handler();
  };
}
