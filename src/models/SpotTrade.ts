/**
 * SpotTrade Model - MongoDB Schema
 * Tracks all executed spot swaps via LI.FI
 */

import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ISpotTrade extends Document {
  userId: string;
  txHash: string;
  chainId: number;
  pair: string;
  side: 'BUY' | 'SELL';
  
  // Token details
  fromTokenAddress: string;
  fromTokenSymbol: string;
  fromAmount: string; // Store as string to preserve precision
  
  toTokenAddress: string;
  toTokenSymbol: string;
  toAmount: string;
  
  // Pricing
  executionPrice: string; // Stored as string for precision
  slippagePercent: number;
  
  // Gas & fees
  gasUsed?: string;
  gasPriceGwei?: string;
  totalFeeUsd?: number;
  
  // Status
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  
  // Timestamps
  createdAt: Date;
  confirmedAt?: Date;
}

const SpotTradeSchema = new Schema<ISpotTrade>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    txHash: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    chainId: {
      type: Number,
      required: true,
    },
    pair: {
      type: String,
      required: true,
      index: true,
    },
    side: {
      type: String,
      required: true,
      enum: ['BUY', 'SELL'],
    },
    
    // Token details
    fromTokenAddress: {
      type: String,
      required: true,
    },
    fromTokenSymbol: {
      type: String,
      required: true,
    },
    fromAmount: {
      type: String,
      required: true,
    },
    
    toTokenAddress: {
      type: String,
      required: true,
    },
    toTokenSymbol: {
      type: String,
      required: true,
    },
    toAmount: {
      type: String,
      required: true,
    },
    
    // Pricing
    executionPrice: {
      type: String,
      required: true,
    },
    slippagePercent: {
      type: Number,
      required: true,
    },
    
    // Gas & fees
    gasUsed: String,
    gasPriceGwei: String,
    totalFeeUsd: Number,
    
    // Status
    status: {
      type: String,
      required: true,
      enum: ['PENDING', 'CONFIRMED', 'FAILED'],
      default: 'PENDING',
    },
    
    confirmedAt: Date,
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt
  }
);

// Compound indexes for efficient queries
SpotTradeSchema.index({ userId: 1, createdAt: -1 });
SpotTradeSchema.index({ pair: 1, createdAt: -1 });
SpotTradeSchema.index({ userId: 1, pair: 1, createdAt: -1 });

// Prevent model recompilation in development
const SpotTrade: Model<ISpotTrade> =
  mongoose.models.SpotTrade || mongoose.model<ISpotTrade>('SpotTrade', SpotTradeSchema);

export default SpotTrade;
