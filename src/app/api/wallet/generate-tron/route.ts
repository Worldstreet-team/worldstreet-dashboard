import { NextRequest, NextResponse } from "next/server";

const EXTERNAL_API_BASE_URL = "https://trading.watchup.site";

/**
 * POST /api/wallet/generate-tron
 * 
 * Generates a Tron wallet by calling the external wallet generation service.
 * This is a backend proxy to keep the external API URL secure and handle errors properly.
 * 
 * Response:
 * {
 *   success: true,
 *   address: "TGPw4Fds75B5PaFGuU2WVcDHqYiH9212zD",
 *   privateKey: "7C6268EAC00F355BE22F0A3DF3FCDC8FA27050727FADAD24D083EB949CE627FB",
 *   hexAddress: "41467DD7F59CB76B1725D066AE81A2546AB67CF0BD",
 *   publicKey: "04B9AED5F6F987D1836A717A9F7BDE58D11126DB2035496205AA727704B91CA54B..."
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API] Generating Tron wallet via external service...');
    
    // Call external API to generate Tron wallet
    const response = await fetch(`${EXTERNAL_API_BASE_URL}/api/generate-wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chain: 'trc'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[API] External wallet generation failed:', errorData);
      
      return NextResponse.json(
        {
          success: false,
          message: errorData.message || errorData.error || `External API request failed with status ${response.status}`
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    if (!data.success) {
      console.error('[API] Wallet generation unsuccessful:', data);
      return NextResponse.json(
        {
          success: false,
          message: data.error || 'Wallet generation failed'
        },
        { status: 500 }
      );
    }

    console.log('[API] Tron wallet generated successfully');
    console.log('[API] Address:', data.address);

    // Return the wallet data
    return NextResponse.json({
      success: true,
      address: data.address,
      privateKey: data.privateKey,
      hexAddress: data.hexAddress,
      publicKey: data.publicKey,
      network: data.network
    });

  } catch (error) {
    console.error('[API] Tron wallet generation error:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to generate Tron wallet'
      },
      { status: 500 }
    );
  }
}
