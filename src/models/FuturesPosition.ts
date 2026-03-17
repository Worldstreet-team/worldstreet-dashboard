import mongoose from "mongoose";

const FuturesPositionSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  market: {
    type: String,
    required: true,
    index: true // e.g., "BTC-USD", "ETH-USD"
  },
  side: {
    type: String,
    required: true,
    enum: ['LONG', 'SHORT']
  },
  size: {
    type: String,
    required: true // Position size as string to maintain precision
  },
  leverage: {
    type: Number,
    required: true,
    min: 1,
    max: 100
  },
  entryPrice: {
    type: String,
    required: false // Entry price as string to maintain precision
  },
  liquidationPrice: {
    type: String,
    required: false // Liquidation price as string
  },
  margin: {
    type: String,
    required: false // Margin used as string
  },
  unrealizedPnL: {
    type: String,
    required: false // Current unrealized PnL
  },
  realizedPnL: {
    type: String,
    required: false // Realized PnL when closed
  },
  status: {
    type: String,
    required: true,
    enum: ['OPEN', 'CLOSED', 'LIQUIDATED'],
    default: 'OPEN'
  },
  txHash: {
    type: String,
    required: false // Opening transaction hash
  },
  closeTxHash: {
    type: String,
    required: false // Closing transaction hash
  },
  positionId: {
    type: String,
    required: false // External position ID from Hyperliquid
  },
  closePrice: {
    type: String,
    required: false // Price at which position was closed
  },
  pnl: {
    type: String,
    required: false // Final PnL when position is closed
  },
  openedAt: {
    type: Date,
    default: Date.now
  },
  closedAt: {
    type: Date,
    required: false
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true // This automatically manages createdAt and updatedAt
});

// Indexes for efficient queries
FuturesPositionSchema.index({ userId: 1, status: 1 });
FuturesPositionSchema.index({ userId: 1, market: 1, status: 1 });
FuturesPositionSchema.index({ market: 1, status: 1 });
FuturesPositionSchema.index({ status: 1, openedAt: -1 });

// Compound index for finding open positions by user and market
FuturesPositionSchema.index({ userId: 1, market: 1, status: 1 });

export const FuturesPosition = 
  mongoose.models.FuturesPosition || 
  mongoose.model("FuturesPosition", FuturesPositionSchema);