import { NextRequest, NextResponse } from 'next/server';

// GET - Fetch spot wallets and balances
export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { userId } = params;

  try {
    // Fetch wallets
    const walletsResponse = await fetch(
      `https://trading.watchup.site/api/users/${userId}/wallets`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    if (!walletsResponse.ok) {
      const errorText = await walletsResponse.text();
      console.error('Wallets fetch failed:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch spot wallets' },
        { status: walletsResponse.status }
      );
    }

    const wallets = await walletsResponse.json();
    console.log('=== BACKEND WALLETS RESPONSE ===');
    console.log(JSON.stringify(wallets, null, 2));

    // Fetch balances
    const balancesResponse = await fetch(
      `https://trading.watchup.site/api/users/${userId}/balances`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    let balances = [];
    if (balancesResponse.ok) {
      balances = await balancesResponse.json();
      console.log('=== BACKEND BALANCES RESPONSE ===');
      console.log(JSON.stringify(balances, null, 2));
    }

    return NextResponse.json({
      wallets: wallets,
      balances: balances,
    });
  } catch (error) {
    console.error('Error fetching spot wallets:', error);
    return NextResponse.json(
      { error: 'Internal error', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST - Generate spot wallets
export async function POST(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const { userId } = params;

  try {
    // Check if wallets already exist
    const checkResponse = await fetch(
      `https://trading.watchup.site/api/users/${userId}/wallets`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    // If wallets exist, return them
    if (checkResponse.ok) {
      const existingWallets = await checkResponse.json();
      if (existingWallets && existingWallets.length > 0) {
        return NextResponse.json({
          message: 'Spot wallets already exist',
          userId,
          wallets: existingWallets,
        });
      }
    }

    // Wallets don't exist, create them via backend
    const response = await fetch(
      `https://trading.watchup.site/api/users/${userId}/wallets`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Backend generates wallets internally
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Wallet creation failed:', errorText);
      
      // Try to parse as JSON, fallback to text
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: 'Failed to create spot wallets', details: errorText };
      }

      return NextResponse.json(
        { error: errorData.error || 'Failed to create spot wallets' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      message: 'Spot wallets created successfully',
      userId,
      ...data,
    });
  } catch (error) {
    console.error('Error creating spot wallets:', error);
    return NextResponse.json(
      { error: 'Failed to create spot wallets', message: (error as Error).message },
      { status: 500 }
    );
  }
}
