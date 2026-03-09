/**
 * Spot Trades API Route
 * Handles saving and retrieving spot swap trades
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { connectDB } from '@/lib/mongodb';
import SpotTrade from '@/models/SpotTrade';
import SpotPosition from '@/models/SpotPosition';
import PositionHistory from '@/models/PositionHistory';

// GET - Fetch trade history
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const pair = searchParams.get('pair');
    const limit = parseInt(searchParams.get('limit') || '50');

    const query: any = { userId: authUser.userId };
    if (pair) {
      query.pair = pair;
    }

    const trades = await SpotTrade.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return NextResponse.json({ trades });
  } catch (error) {
    console.error('[Spot Trades API] GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trades' },
      { status: 500 }
    );
  }
}

// POST - Save new trade and update position
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser();
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const body = await request.json();
    const {
      pair,
      side,
      txHash,
      chain,
      fromAmount,
      toAmount,
      executionPrice,
      fromToken,
      toToken,
      gasCost,
      feeCost,
    } = body;

    // Validate required fields
    if (!pair || !side || !txHash || !chain) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const [base, quote] = pair.split('-');

    // Create trade record
    const trade = await SpotTrade.create({
      userId: authUser.userId,
      txHash,
      chainId: chain === 'ethereum' ? 1 : 1151111081099710, // ETH or SOL
      pair,
      side: side.toUpperCase(),
      fromTokenAddress: fromToken?.address || '',
      fromTokenSymbol: fromToken?.symbol || (side === 'buy' ? quote : base),
      fromAmount: fromAmount || '0',
      toTokenAddress: toToken?.address || '',
      toTokenSymbol: toToken?.symbol || (side === 'buy' ? base : quote),
      toAmount: toAmount || '0',
      executionPrice: executionPrice || '0',
      slippagePercent: 0.5,
      gasUsed: gasCost?.amount || '0',
      totalFeeUsd: parseFloat(gasCost?.amountUSD || '0') + parseFloat(feeCost?.amountUSD || '0'),
      status: 'PENDING',
    });

    // Update or create position
    const position = await updatePosition({
      userId: authUser.userId,
      pair,
      side: side.toUpperCase(),
      chainId: chain === 'ethereum' ? 1 : 1151111081099710,
      baseToken: {
        address: side === 'buy' ? toToken?.address : fromToken?.address,
        symbol: base,
      },
      quoteToken: {
        address: side === 'buy' ? fromToken?.address : toToken?.address,
        symbol: quote,
      },
      amount: side === 'buy' ? toAmount : fromAmount,
      price: executionPrice,
      tradeId: trade._id,
    });

    return NextResponse.json({
      success: true,
      trade,
      position,
    });
  } catch (error) {
    console.error('[Spot Trades API] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to save trade' },
      { status: 500 }
    );
  }
}

/**
 * Update position based on trade
 */
async function updatePosition(params: {
  userId: string;
  pair: string;
  side: string;
  chainId: number;
  baseToken: { address: string; symbol: string };
  quoteToken: { address: string; symbol: string };
  amount: string;
  price: string;
  tradeId: any;
}) {
  const {
    userId,
    pair,
    side,
    chainId,
    baseToken,
    quoteToken,
    amount,
    price,
    tradeId,
  } = params;

  // Find existing open position
  const existingPosition = await SpotPosition.findOne({
    userId,
    pair,
    chainId,
    status: 'OPEN',
  });

  if (side === 'BUY') {
    // BUY: Increase or open position
    if (existingPosition) {
      // Increase existing position
      const oldAmount = BigInt(existingPosition.totalAmount);
      const oldCost = BigInt(existingPosition.totalCost);
      const newAmount = BigInt(amount);
      const newCost = BigInt((parseFloat(amount) * parseFloat(price)).toFixed(0));

      const totalAmount = oldAmount + newAmount;
      const totalCost = oldCost + newCost;

      // Calculate new average price
      const avgPrice = (Number(totalCost) / Number(totalAmount)).toFixed(6);

      existingPosition.totalAmount = totalAmount.toString();
      existingPosition.totalCost = totalCost.toString();
      existingPosition.averageEntryPrice = avgPrice;
      existingPosition.updatedAt = new Date();

      await existingPosition.save();

      // Record history
      await PositionHistory.create({
        positionId: existingPosition._id,
        tradeId,
        action: 'INCREASE',
        amountBefore: oldAmount.toString(),
        avgPriceBefore: existingPosition.averageEntryPrice,
        amountAfter: totalAmount.toString(),
        avgPriceAfter: avgPrice,
        amountDelta: newAmount.toString(),
      });

      return existingPosition;
    } else {
      // Open new position
      const newPosition = await SpotPosition.create({
        userId,
        pair,
        chainId,
        baseTokenAddress: baseToken.address,
        baseTokenSymbol: baseToken.symbol,
        quoteTokenAddress: quoteToken.address,
        quoteTokenSymbol: quoteToken.symbol,
        totalAmount: amount,
        averageEntryPrice: price,
        totalCost: (parseFloat(amount) * parseFloat(price)).toFixed(0),
        realizedPnl: '0',
        status: 'OPEN',
        openedAt: new Date(),
      });

      // Record history
      await PositionHistory.create({
        positionId: newPosition._id,
        tradeId,
        action: 'OPEN',
        amountBefore: '0',
        amountAfter: amount,
        avgPriceAfter: price,
        amountDelta: amount,
      });

      return newPosition;
    }
  } else {
    // SELL: Reduce or close position
    if (!existingPosition) {
      // No position to sell from - this shouldn't happen
      console.warn('[Position] SELL without open position');
      return null;
    }

    const positionAmount = BigInt(existingPosition.totalAmount);
    const sellAmount = BigInt(amount);

    if (sellAmount >= positionAmount) {
      // Close position completely
      const realizedPnl = (
        (parseFloat(price) - parseFloat(existingPosition.averageEntryPrice)) *
        parseFloat(existingPosition.totalAmount)
      ).toFixed(6);

      existingPosition.status = 'CLOSED';
      existingPosition.closedAt = new Date();
      existingPosition.realizedPnl = (
        parseFloat(existingPosition.realizedPnl) + parseFloat(realizedPnl)
      ).toString();
      existingPosition.totalAmount = '0';

      await existingPosition.save();

      // Record history
      await PositionHistory.create({
        positionId: existingPosition._id,
        tradeId,
        action: 'CLOSE',
        amountBefore: positionAmount.toString(),
        avgPriceBefore: existingPosition.averageEntryPrice,
        amountAfter: '0',
        avgPriceAfter: price,
        amountDelta: sellAmount.toString(),
        realizedPnl,
      });

      return existingPosition;
    } else {
      // Partial close
      const remainingAmount = positionAmount - sellAmount;
      const realizedPnl = (
        (parseFloat(price) - parseFloat(existingPosition.averageEntryPrice)) *
        parseFloat(amount)
      ).toFixed(6);

      existingPosition.totalAmount = remainingAmount.toString();
      existingPosition.realizedPnl = (
        parseFloat(existingPosition.realizedPnl) + parseFloat(realizedPnl)
      ).toString();
      existingPosition.updatedAt = new Date();

      await existingPosition.save();

      // Record history
      await PositionHistory.create({
        positionId: existingPosition._id,
        tradeId,
        action: 'REDUCE',
        amountBefore: positionAmount.toString(),
        avgPriceBefore: existingPosition.averageEntryPrice,
        amountAfter: remainingAmount.toString(),
        avgPriceAfter: existingPosition.averageEntryPrice,
        amountDelta: sellAmount.toString(),
        realizedPnl,
      });

      return existingPosition;
    }
  }
}
