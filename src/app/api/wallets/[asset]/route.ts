import { NextRequest, NextResponse } from "next/server";
import { verifyClerkJWT } from "@/lib/auth/clerk";

/**
 * GET /api/wallets/[asset]
 * Get wallet information for a specific asset
 * Returns the authenticated user's Clerk ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { asset: string } }
) {
  try {
    // Verify Clerk authentication and get user ID
    const { userId, token } = await verifyClerkJWT(request);

    console.log('='.repeat(60));
    console.log('🔔 CLERK USER ID ALERT');
    console.log('='.repeat(60));
    console.log('Asset:', params.asset);
    console.log('Clerk User ID:', userId);
    console.log('Token:', token ? '✓ Present' : '✗ Not available');
    console.log('='.repeat(60));

    return NextResponse.json({
      success: true,
      message: 'User authenticated successfully',
      data: {
        clerkUserId: userId,
        asset: params.asset,
        hasToken: !!token
      }
    });
  } catch (error: any) {
    console.error('[Wallets API] Authentication error:', error);
    return NextResponse.json(
      { 
        error: 'Authentication failed',
        details: error.message 
      },
      { status: 401 }
    );
  }
}
