/**
 * PositionHistory Model - MongoDB Schema
 * Tracks all changes to positions (open, increase, reduce, close)
 */

import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IPositionHistory extends Document {
  positionId: Types.ObjectId;
  tradeId: Types.ObjectId;
  
  action: 'OPEN' | 'INCREASE' | 'REDUCE' | 'CLOSE';
  
  // Before state
  amountBefore: string;
  avgPriceBefore?: string;
  
  // After state
  amountAfter: string;
  avgPriceAfter: string;
  
  // Change
  amountDelta: string;
  realizedPnl?: string;
  
  createdAt: Date;
}

const PositionHistorySchema = new Schema<IPositionHistory>(
  {
    positionId: {
      type: Schema.Types.ObjectId,
      ref: 'SpotPosition',
      required: true,
      index: true,
    },
    tradeId: {
      type: Schema.Types.ObjectId,
      ref: 'SpotTrade',
      required: true,
    },
    
    action: {
      type: String,
      required: true,
      enum: ['OPEN', 'INCREASE', 'REDUCE', 'CLOSE'],
    },
    
    // Before state
    amountBefore: {
      type: String,
      required: true,
    },
    avgPriceBefore: String,
    
    // After state
    amountAfter: {
      type: String,
      required: true,
    },
    avgPriceAfter: {
      type: String,
      required: true,
    },
    
    // Change
    amountDelta: {
      type: String,
      required: true,
    },
    realizedPnl: String,
    
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false, // We only need createdAt
  }
);

// Index for efficient queries
PositionHistorySchema.index({ positionId: 1, createdAt: -1 });

// Prevent model recompilation in development
const PositionHistory: Model<IPositionHistory> =
  mongoose.models.PositionHistory || mongoose.model<IPositionHistory>('PositionHistory', PositionHistorySchema);

export default PositionHistory;
