import { MasterWalletManager } from './MasterWalletManager';
import { ClientManager } from './ClientManager';
import { SubaccountManager } from './SubaccountManager';
import { DepositManager } from './DepositManager';
import { PositionManager } from './PositionManager';

// ── Singleton Instances ────────────────────────────────────────────────────

let masterWalletManager: MasterWalletManager | null = null;
let clientManager: ClientManager | null = null;
let subaccountManager: SubaccountManager | null = null;
let depositManager: DepositManager | null = null;
let positionManager: PositionManager | null = null;

let isInitialized = false;

// ── Initialization ─────────────────────────────────────────────────────────

export async function initializeDriftServices(): Promise<void> {
  if (isInitialized) {
    console.log('[DriftServices] Already initialized');
    return;
  }
  
  console.log('[DriftServices] Initializing...');
  
  const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  
  try {
    // 1. Initialize master wallet
    masterWalletManager = new MasterWalletManager(rpcUrl);
    await masterWalletManager.initialize();
    
    // 2. Initialize client manager
    clientManager = new ClientManager(masterWalletManager, rpcUrl);
    clientManager.startCleanup(); // Start automatic cleanup
    
    // 3. Initialize subaccount manager
    subaccountManager = new SubaccountManager(clientManager, masterWalletManager);
    
    // 4. Initialize deposit manager
    depositManager = new DepositManager(clientManager, masterWalletManager);
    
    // 5. Initialize position manager
    positionManager = new PositionManager(clientManager);
    
    isInitialized = true;
    console.log('[DriftServices] Initialization complete');
  } catch (error) {
    console.error('[DriftServices] Initialization failed:', error);
    throw error;
  }
}

// ── Getters ────────────────────────────────────────────────────────────────

export function getMasterWalletManager(): MasterWalletManager {
  if (!masterWalletManager) {
    throw new Error('Drift services not initialized. Call initializeDriftServices() first.');
  }
  return masterWalletManager;
}

export function getClientManager(): ClientManager {
  if (!clientManager) {
    throw new Error('Drift services not initialized. Call initializeDriftServices() first.');
  }
  return clientManager;
}

export function getSubaccountManager(): SubaccountManager {
  if (!subaccountManager) {
    throw new Error('Drift services not initialized. Call initializeDriftServices() first.');
  }
  return subaccountManager;
}

export function getDepositManager(): DepositManager {
  if (!depositManager) {
    throw new Error('Drift services not initialized. Call initializeDriftServices() first.');
  }
  return depositManager;
}

export function getPositionManager(): PositionManager {
  if (!positionManager) {
    throw new Error('Drift services not initialized. Call initializeDriftServices() first.');
  }
  return positionManager;
}

// ── Shutdown ───────────────────────────────────────────────────────────────

export async function shutdownDriftServices(): Promise<void> {
  console.log('[DriftServices] Shutting down...');
  
  if (clientManager) {
    clientManager.stopCleanup();
  }
  
  masterWalletManager = null;
  clientManager = null;
  subaccountManager = null;
  depositManager = null;
  positionManager = null;
  
  isInitialized = false;
  console.log('[DriftServices] Shutdown complete');
}

// ── Status ─────────────────────────────────────────────────────────────────

export function isDriftServicesInitialized(): boolean {
  return isInitialized;
}
