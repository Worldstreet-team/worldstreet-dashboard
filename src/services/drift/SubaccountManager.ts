import { ClientManager } from './ClientManager';
import { MasterWalletManager } from './MasterWalletManager';
import DriftSubaccount from '@/models/DriftSubaccount';
import DashboardProfile from '@/models/DashboardProfile';
import { SubaccountInfo } from '@/types/drift-master-wallet';
import {
  ValidationError,
  NotFoundError,
  ResourceExhaustedError,
  SystemError
} from '@/lib/errors/drift-errors';

export class SubaccountManager {
  private clientManager: ClientManager;
  private masterWalletManager: MasterWalletManager;
  private futuresWalletCache: Map<string, { address: string; timestamp: number }>;
  
  constructor(
    clientManager: ClientManager,
    masterWalletManager: MasterWalletManager
  ) {
    this.clientManager = clientManager;
    this.masterWalletManager = masterWalletManager;
    this.futuresWalletCache = new Map();
  }
  
  async initializeSubaccount(userId: string): Promise<SubaccountInfo> {
    console.log(`[SubaccountManager] Initializing subaccount for user ${userId}`);
    
    // 1. Verify user has futures wallet
    const futuresWallet = await this.getFuturesWallet(userId);
    if (!futuresWallet) {
      throw new ValidationError('Futures wallet required. Please create one first.');
    }
    
    // 2. Check if subaccount already exists
    const existing = await this.getSubaccountInfo(userId);
    if (existing) {
      throw new ResourceExhaustedError('Subaccount already exists for this user');
    }
    
    // 3. Verify master wallet balance
    const hasBalance = await this.masterWalletManager.verifyBalance(0.05);
    if (!hasBalance) {
      throw new SystemError('Insufficient platform funds for initialization');
    }
    
    // 4. Allocate subaccount ID
    const subaccountId = await this.findLowestAvailableId();
    
    if (subaccountId === -1) {
      throw new ResourceExhaustedError('No available subaccount slots (0-255 all allocated)');
    }
    
    console.log(`[SubaccountManager] Allocated subaccount ID ${subaccountId} for user ${userId}`);
    
    // 5. Initialize on-chain (using master wallet to pay for initialization)
    try {
      const masterClient = this.masterWalletManager.getMasterClient();
      
      // Note: Actual Drift initialization would happen here
      // For now, we'll just create the database record
      console.log(`[SubaccountManager] On-chain initialization would happen here`);
      
    } catch (error) {
      console.error('[SubaccountManager] On-chain initialization failed:', error);
      throw new SystemError('Failed to initialize subaccount on-chain', error as Error);
    }
    
    // 6. Insert record into database
    try {
      await DriftSubaccount.create({
        userId,
        subaccountId,
        futuresWalletAddress: futuresWallet.address
      });
      
      console.log(`[SubaccountManager] Subaccount record created in database`);
    } catch (error) {
      console.error('[SubaccountManager] Database insert failed:', error);
      throw new SystemError('Failed to save subaccount to database', error as Error);
    }
    
    return (await this.getSubaccountInfo(userId))!;
  }
  
  async getSubaccountInfo(userId: string): Promise<SubaccountInfo | null> {
    const doc = await DriftSubaccount.findOne({ userId });
    
    if (!doc) return null;
    
    return {
      userId: doc.userId,
      subaccountId: doc.subaccountId,
      futuresWalletAddress: doc.futuresWalletAddress,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt
    };
  }
  
  async allocateSubaccountId(): Promise<number> {
    return this.findLowestAvailableId();
  }
  
  private async findLowestAvailableId(): Promise<number> {
    // Get all allocated IDs
    const allocated = await DriftSubaccount.find({}, { subaccountId: 1 });
    
    const allocatedSet = new Set(allocated.map(doc => doc.subaccountId));
    
    // Find lowest available (0-255)
    for (let id = 0; id <= 255; id++) {
      if (!allocatedSet.has(id)) {
        return id;
      }
    }
    
    return -1; // All allocated
  }
  
  private async getFuturesWallet(userId: string): Promise<{ address: string } | null> {
    // Check cache (5 minute TTL)
    const cached = this.futuresWalletCache.get(userId);
    if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
      return { address: cached.address };
    }
    
    // Query database
    const profile = await DashboardProfile.findOne(
      { authUserId: userId },
      { 'wallets.solana.address': 1 }
    );
    
    if (!profile?.wallets?.solana?.address) {
      return null;
    }
    
    // Cache result
    this.futuresWalletCache.set(userId, {
      address: profile.wallets.solana.address,
      timestamp: Date.now()
    });
    
    return { address: profile.wallets.solana.address };
  }
}
