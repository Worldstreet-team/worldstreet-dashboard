import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import crypto from 'crypto';
import { MasterWalletManager } from './MasterWalletManager';
import DriftSubaccount from '@/models/DriftSubaccount';
import DashboardProfile from '@/models/DashboardProfile';
import { UserClientData } from '@/types/drift-master-wallet';
import { NotFoundError, SystemError } from '@/lib/errors/drift-errors';

export class ClientManager {
  private activeClients: Map<string, UserClientData>;
  private masterWalletManager: MasterWalletManager;
  private cleanupInterval: NodeJS.Timeout | null;
  private connection: Connection;
  private inactivityTimeout: number;
  
  constructor(
    masterWalletManager: MasterWalletManager,
    rpcUrl: string
  ) {
    this.activeClients = new Map();
    this.masterWalletManager = masterWalletManager;
    this.cleanupInterval = null;
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.inactivityTimeout = parseInt(
      process.env.CLIENT_CLEANUP_TIMEOUT_MINUTES || '30'
    ) * 60 * 1000;
  }
  
  async getUserClient(userId: string): Promise<UserClientData> {
    // 1. Check cache
    const cached = this.activeClients.get(userId);
    if (cached) {
      cached.lastAccessed = Date.now();
      console.log(`[ClientManager] Cache hit for user ${userId}`);
      return cached;
    }
    
    console.log(`[ClientManager] Cache miss for user ${userId}, creating client`);
    
    // 2. Get subaccount info from database
    const subaccountInfo = await DriftSubaccount.findOne({ userId });
    
    if (!subaccountInfo) {
      throw new NotFoundError('Drift subaccount', userId);
    }
    
    // 3. Get user's encrypted private key
    const profile = await DashboardProfile.findOne({ authUserId: userId });
    
    if (!profile?.wallets?.solana?.encryptedPrivateKey) {
      throw new NotFoundError('User futures wallet', userId);
    }
    
    // 4. Decrypt private key
    const privateKey = this.decryptPrivateKey(
      profile.wallets.solana.encryptedPrivateKey
    );
    
    const keypair = Keypair.fromSecretKey(bs58.decode(privateKey));
    
    // 5. Create Drift client with gRPC subscription
    // Note: This requires @drift-labs/sdk to be installed
    // Install with: npm install @drift-labs/sdk
    const DRIFT_PROGRAM_ID = process.env.DRIFT_PROGRAM_ID || 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH';
    
    let driftClient: any;
    let wallet: any;
    
    try {
      // Dynamic import to handle missing SDK gracefully
      const { DriftClient, Wallet } = await import('@drift-labs/sdk');
      
      wallet = new Wallet(keypair as any);
      
      // Use type assertions to bypass version conflicts between @solana/web3.js versions
      driftClient = new DriftClient({
        connection: this.connection as any,
        wallet,
        programID: new PublicKey(DRIFT_PROGRAM_ID) as any,
        accountSubscription: {
          type: 'grpc',
          grpcConfigs: [{
            endpoint: process.env.YELLOWSTONE_GRPC_ENDPOINT || '',
            token: process.env.YELLOWSTONE_GRPC_TOKEN || undefined
          }] as any
        },
        subAccountIds: [subaccountInfo.subaccountId]
      } as any);
      
      // 6. Subscribe to updates
      await driftClient.subscribe();
    } catch (error) {
      console.error('[ClientManager] Drift SDK not available:', error);
      throw new SystemError(
        'Drift SDK not installed. Please run: npm install @drift-labs/sdk',
        error as Error
      );
    }
    
    console.log(`[ClientManager] Client created and subscribed for user ${userId}`);
    
    // 7. Cache client
    const clientData: UserClientData = {
      driftClient,
      wallet,
      connection: this.connection,
      subaccountId: subaccountInfo.subaccountId,
      lastAccessed: Date.now()
    };
    
    this.activeClients.set(userId, clientData);
    
    return clientData;
  }
  
  getMasterClient(): any {
    return this.masterWalletManager.getMasterClient();
  }
  
  async removeClient(userId: string): Promise<void> {
    const client = this.activeClients.get(userId);
    if (!client) return;
    
    try {
      await client.driftClient.unsubscribe();
      console.log(`[ClientManager] Client unsubscribed for user ${userId}`);
    } catch (error) {
      console.error(`[ClientManager] Error unsubscribing client:`, error);
    }
    
    this.activeClients.delete(userId);
  }
  
  startCleanup(intervalMs: number = 10 * 60 * 1000): void {
    if (this.cleanupInterval) {
      this.stopCleanup();
    }
    
    this.cleanupInterval = setInterval(() => {
      this.runCleanup();
    }, intervalMs);
    
    console.log(`[ClientManager] Cleanup task started (interval: ${intervalMs}ms)`);
  }
  
  stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('[ClientManager] Cleanup task stopped');
    }
  }
  
  private async runCleanup(): Promise<void> {
    const now = Date.now();
    const toRemove: string[] = [];
    
    for (const [userId, clientData] of this.activeClients.entries()) {
      const inactiveTime = now - clientData.lastAccessed;
      
      if (inactiveTime > this.inactivityTimeout) {
        toRemove.push(userId);
      }
    }
    
    if (toRemove.length > 0) {
      console.log(`[ClientManager] Cleaning up ${toRemove.length} inactive clients`);
      
      for (const userId of toRemove) {
        await this.removeClient(userId);
      }
    }
  }
  
  getStats() {
    return {
      activeClients: this.activeClients.size,
      totalAccesses: Array.from(this.activeClients.values())
        .reduce((sum) => sum + 1, 0)
    };
  }
  
  private decryptPrivateKey(encryptedKey: string): string {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.WALLET_ENCRYPTION_KEY!, 'hex');
    
    // Parse the encrypted data format: iv:authTag:encryptedData
    const parts = encryptedKey.split(':');
    if (parts.length !== 3) {
      throw new SystemError('Invalid encrypted key format');
    }
    
    const [ivHex, authTagHex, encryptedDataHex] = parts;
    
    const decipher = crypto.createDecipheriv(
      algorithm,
      key,
      Buffer.from(ivHex, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
    
    let decrypted = decipher.update(encryptedDataHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
