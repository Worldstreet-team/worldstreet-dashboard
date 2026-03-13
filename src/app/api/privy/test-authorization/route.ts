import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createAuthorizationContext, validateAuthorizationContext } from '@/lib/privy/authorization';

/**
 * GET /api/privy/test-authorization
 * Test endpoint to verify Clerk JWT -> Privy authorization flow
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[Test Auth] Starting authorization test');

    // 1. Get Clerk authentication
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "No Clerk user authenticated" },
        { status: 401 }
      );
    }

    console.log('[Test Auth] Clerk user authenticated:', userId);

    // 2. Get Clerk JWT
    let clerkJwt: string | null = null;
    try {
      clerkJwt = await getToken();
      console.log('[Test Auth] Clerk JWT obtained:', clerkJwt ? '✓' : '✗');
    } catch (tokenError) {
      console.error('[Test Auth] Failed to get Clerk token:', tokenError);
      return NextResponse.json(
        { success: false, error: "Failed to get Clerk JWT" },
        { status: 401 }
      );
    }

    if (!clerkJwt) {
      return NextResponse.json(
        { success: false, error: "No Clerk JWT available" },
        { status: 401 }
      );
    }

    // 3. Test authorization context creation
    let authorizationContext;
    let authError = null;
    
    try {
      authorizationContext = await createAuthorizationContext(clerkJwt);
      console.log('[Test Auth] Authorization context created successfully');
    } catch (error) {
      authError = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Test Auth] Failed to create authorization context:', authError);
    }

    // 4. Validate authorization context if created
    let isValid = false;
    if (authorizationContext) {
      isValid = validateAuthorizationContext(authorizationContext);
      console.log('[Test Auth] Authorization context valid:', isValid);
    }

    // 5. Return test results
    return NextResponse.json({
      success: true,
      test_results: {
        clerk_auth: {
          user_id: userId,
          jwt_obtained: !!clerkJwt,
          jwt_length: clerkJwt?.length || 0
        },
        privy_auth: {
          context_created: !!authorizationContext,
          context_valid: isValid,
          keys_count: authorizationContext?.authorization_private_keys?.length || 0,
          error: authError
        },
        overall_status: !!authorizationContext && isValid ? 'SUCCESS' : 'FAILED'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("[Test Auth] Unexpected error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Test failed",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}