/**
 * SpotPosition Model - MongoDB Schema
 * Tracks open and closed positions for spot trading
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISpotPosition extends Document {
  userId: string;
  pair: string;
  chainId: number;
  
  // Token details
  baseTokenAddress: string;
  baseTokenSymbol: string;
  quoteTokenAddress: string;
  quoteTokenSymbol: string;
  
  // Position size
  totalAmount: string; // In smallest unit (bigint as string)
  
  // Cost basis
  averageEntryPrice: string; // Stored as string for precision
  totalCost: string; // Total quote token spent (bigint as string)
  
  // PnL tracking
  realizedPnl: string; // Cumulative realized PnL (bigint as string)
  
  // Risk management
  takeProfitPrice?: string;
  stopLossPrice?: string;
  
  // Status
  status: 'OPEN' | 'CLOSED';
  
  // Timestamps
  openedAt: Date;
  closedAt?: Date;
  updatedAt: Date;
}

const SpotPositionSchema = new Schema<ISpotPosition>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    pair: {
      type: String,
      required: true,
      index: true,
    },
    chainId: {
      type: Number,
      required: true,
    },
    
    // Token details
    baseTokenAddress: {
      type: String,
      required: true,
    },
    baseTokenSymbol: {
      type: String,
      required: true,
    },
    quoteTokenAddress: {
      type: String,
      required: true,
    },
    quoteTokenSymbol: {
      type: String,
      required: true,
    },
    
    // Position size
    totalAmount: {
      type: String,
      required: true,
    },
    
    // Cost basis
    averageEntryPrice: {
      type: String,
      required: true,
    },
    totalCost: {
      type: String,
      required: true,
    },
    
    // PnL tracking
    realizedPnl: {
      type: String,
      default: '0',
    },
    
    // Risk management
    takeProfitPrice: String,
    stopLossPrice: String,
    
    // Status
    status: {
      type: String,
      required: true,
      enum: ['OPEN', 'CLOSED'],
      default: 'OPEN',
    },
    
    // Timestamps
    openedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    closedAt: Date,
  },
  {
    timestamps: true, // Adds createdAt and updatedAt
  }
);

// Compound indexes for efficient queries
SpotPositionSchema.index({ userId: 1, status: 1 });
SpotPositionSchema.index({ pair: 1, status: 1 });
SpotPositionSchema.index({ userId: 1, pair: 1, chainId: 1, status: 1 }, { unique: true });

// Prevent model recompilation in development
const SpotPosition: Model<ISpotPosition> =
  mongoose.models.SpotPosition || mongoose.model<ISpotPosition>('SpotPosition', SpotPositionSchema);

export default SpotPosition;
