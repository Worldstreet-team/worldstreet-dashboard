import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import bs58 from 'bs58';
import { SystemError } from '@/lib/errors/drift-errors';

export class MasterWalletManager {
  private masterKeypair: Keypair | null = null;
  private driftClient: any = null;
  private connection: Connection;
  
  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, 'confirmed');
  }
  
  async initialize(): Promise<void> {
    // 1. Try MASTER_KEY environment variable
    let privateKeyBase58 = process.env.MASTER_KEY;
    
    // 2. Fallback to secure vault (if configured)
    if (!privateKeyBase58 && process.env.VAULT_URL) {
      privateKeyBase58 = await this.loadFromVault();
    }
    
    // 3. Fail if no key found
    if (!privateKeyBase58) {
      throw new SystemError('Master key not found in environment or vault');
    }
    
    // 4. Create keypair and verify
    try {
      this.masterKeypair = Keypair.fromSecretKey(
        bs58.decode(privateKeyBase58)
      );
    } catch (error) {
      throw new SystemError('Invalid master key format', error as Error);
    }
    
    // 5. Initialize Drift client
    // Note: This requires @drift-labs/sdk to be installed
    // Install with: npm install @drift-labs/sdk
    const DRIFT_PROGRAM_ID = process.env.DRIFT_PROGRAM_ID || 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH';
    
    try {
      // Dynamic import to handle missing SDK gracefully
      const { DriftClient, Wallet } = await import('@drift-labs/sdk');
      
      // Use type assertions to bypass version conflicts between @solana/web3.js versions
      this.driftClient = new DriftClient({
        connection: this.connection as any,
        wallet: new Wallet(this.masterKeypair as any),
        programID: new PublicKey(DRIFT_PROGRAM_ID) as any,
        accountSubscription: {
          type: 'grpc',
          grpcConfigs: [{
            endpoint: process.env.YELLOWSTONE_GRPC_ENDPOINT || '',
            token: process.env.YELLOWSTONE_GRPC_TOKEN || undefined
          }] as any
        }
      } as any);
      
      await this.driftClient.subscribe();
    } catch (error) {
      console.error('[MasterWalletManager] Drift SDK not available:', error);
      throw new SystemError(
        'Drift SDK not installed. Please run: npm install @drift-labs/sdk',
        error as Error
      );
    }
    
    // 6. Verify minimum balance
    const balance = await this.getBalance();
    if (balance < 0.1) {
      console.warn(`[MasterWalletManager] Master wallet balance low: ${balance} SOL`);
    }
    
    console.log(`[MasterWalletManager] Master wallet initialized: ${this.getAddress()}`);
  }
  
  getMasterClient(): any {
    if (!this.driftClient) {
      throw new SystemError('Master wallet not initialized');
    }
    return this.driftClient;
  }
  
  async getBalance(): Promise<number> {
    if (!this.masterKeypair) {
      throw new SystemError('Master wallet not initialized');
    }
    
    const balance = await this.connection.getBalance(
      this.masterKeypair.publicKey
    );
    
    console.log(`[MasterWalletManager] Balance check: ${balance / LAMPORTS_PER_SOL} SOL`);
    return balance / LAMPORTS_PER_SOL;
  }
  
  async verifyBalance(minAmount: number): Promise<boolean> {
    const balance = await this.getBalance();
    const hasBalance = balance >= minAmount;
    
    console.log(`[MasterWalletManager] Balance verification: ${balance} SOL >= ${minAmount} SOL = ${hasBalance}`);
    return hasBalance;
  }
  
  getAddress(): string {
    if (!this.masterKeypair) {
      throw new SystemError('Master wallet not initialized');
    }
    return this.masterKeypair.publicKey.toBase58();
  }
  
  getKeypair(): Keypair {
    if (!this.masterKeypair) {
      throw new SystemError('Master wallet not initialized');
    }
    return this.masterKeypair;
  }
  
  private async loadFromVault(): Promise<string | undefined> {
    // Implementation for secure vault integration
    // Could use AWS Secrets Manager, HashiCorp Vault, etc.
    console.log('[MasterWalletManager] Vault integration not implemented');
    return undefined;
  }
}
