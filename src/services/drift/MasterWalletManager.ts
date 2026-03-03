import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { DriftClient, Wallet } from '@drift-labs/sdk';
import bs58 from 'bs58';
import { SystemError } from '@/lib/errors/drift-errors';

export class MasterWalletManager {
  private masterKeypair: Keypair | null = null;
  private driftClient: DriftClient | null = null;
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
    const DRIFT_PROGRAM_ID = process.env.DRIFT_PROGRAM_ID || 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH';
    
    this.driftClient = new DriftClient({
      connection: this.connection,
      wallet: new Wallet(this.masterKeypair),
      programID: new PublicKey(DRIFT_PROGRAM_ID),
      accountSubscription: {
        type: 'grpc',
        grpcConfigs: [{
          endpoint: process.env.YELLOWSTONE_GRPC_ENDPOINT || '',
          token: process.env.YELLOWSTONE_GRPC_TOKEN
        }]
      }
    });
    
    await this.driftClient.subscribe();
    
    // 6. Verify minimum balance
    const balance = await this.getBalance();
    if (balance < 0.1) {
      console.warn(`[MasterWalletManager] Master wallet balance low: ${balance} SOL`);
    }
    
    console.log(`[MasterWalletManager] Master wallet initialized: ${this.getAddress()}`);
  }
  
  getMasterClient(): DriftClient {
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
  
  private async loadFromVault(): Promise<string | null> {
    // Implementation for secure vault integration
    // Could use AWS Secrets Manager, HashiCorp Vault, etc.
    console.log('[MasterWalletManager] Vault integration not implemented');
    return null;
  }
}
