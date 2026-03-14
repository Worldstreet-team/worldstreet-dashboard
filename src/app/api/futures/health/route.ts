import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/mongodb';
import { hyperliquid } from '@/lib/hyperliquid/simple';
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
      hyperliquid: {
        connected: false,
        masterBalance: 0,
        aboveThreshold: false
      },
      database: {
        connected: false,
        responseTimeMs: 0
      },
      timestamp: new Date()
    };
    
    // Check Hyperliquid connectivity and master wallet
    try {
      const masterAddress = process.env.HYPERLIQUID_MASTER_ADDRESS || "0x0000000000000000000000000000000000000000";
      const accountState = await hyperliquid.getAccount(masterAddress);
      
      const balance = parseFloat(accountState?.crossMarginSummary?.accountValue || "0");
      const aboveThreshold = balance >= 0.05;
      
      healthCheck.hyperliquid = {
        connected: true,
        masterBalance: balance,
        aboveThreshold
      };
      
      if (!aboveThreshold) {
        // healthCheck.healthy = false; // Not necessarily unhealthy if master is low, but worth noting
      }
    } catch (error) {
      healthCheck.healthy = false;
      healthCheck.hyperliquid.connected = false;
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
    
    const statusCode = healthCheck.healthy ? 200 : 503;
    return NextResponse.json(healthCheck, { status: statusCode });
  } catch (error) {
    return handleApiError(error);
  }
}
