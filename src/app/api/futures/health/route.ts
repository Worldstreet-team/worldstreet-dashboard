import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/db';
import {
  getMasterWalletManager,
  getClientManager,
  initializeDriftServices,
  isDriftServicesInitialized
} from '@/services/drift';
import { handleApiError } from '@/lib/errors/apiErrorHandler';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const healthCheck: any = {
      healthy: true,
      masterWallet: {
        connected: false,
        balance: 0,
        aboveThreshold: false
      },
      database: {
        connected: false,
        responseTimeMs: 0
      },
      grpc: {
        connected: false
      },
      activeClients: 0,
      timestamp: new Date()
    };
    
    // Check if services are initialized
    if (!isDriftServicesInitialized()) {
      try {
        await initializeDriftServices();
      } catch (error) {
        healthCheck.healthy = false;
        return NextResponse.json(healthCheck, { status: 503 });
      }
    }
    
    // Check master wallet
    try {
      const masterWalletManager = getMasterWalletManager();
      const balance = await masterWalletManager.getBalance();
      const aboveThreshold = balance >= 0.05;
      
      healthCheck.masterWallet = {
        connected: true,
        balance,
        aboveThreshold
      };
      
      if (!aboveThreshold) {
        healthCheck.healthy = false;
      }
    } catch (error) {
      healthCheck.healthy = false;
      healthCheck.masterWallet.connected = false;
    }
    
    // Check database
    try {
      const dbStart = Date.now();
      await connectDB();
      const dbEnd = Date.now();
      
      healthCheck.database = {
        connected: true,
        responseTimeMs: dbEnd - dbStart
      };
    } catch (error) {
      healthCheck.healthy = false;
      healthCheck.database.connected = false;
    }
    
    // Check gRPC (placeholder)
    healthCheck.grpc.connected = true;
    
    // Get active clients count
    try {
      const clientManager = getClientManager();
      const stats = clientManager.getStats();
      healthCheck.activeClients = stats.activeClients;
    } catch (error) {
      // Non-critical
    }
    
    const statusCode = healthCheck.healthy ? 200 : 503;
    return NextResponse.json(healthCheck, { status: statusCode });
  } catch (error) {
    return handleApiError(error);
  }
}
