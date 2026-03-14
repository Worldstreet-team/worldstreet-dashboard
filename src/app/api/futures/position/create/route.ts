import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { connectDB } from '@/lib/mongodb';
import { handleApiError } from '@/lib/errors/apiErrorHandler';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    
    await connectDB();
    
    // Proxy to the existing Hyperliquid order endpoint
    // We fetch locally to avoid extra latency and simplify logic
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/hyperliquid/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Pass essential headers or authentication context if needed
      },
      body: JSON.stringify({
        ...body,
        userId // Ensure the userId is passed
      })
    });
    
    const result = await response.json();
    
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}
