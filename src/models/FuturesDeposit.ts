import mongoose from "mongoose";

const FuturesDepositSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    index: true
  },
  depositChain: {
    type: String,
    required: true,
    enum: ['ethereum', 'solana']
  },
  depositToken: {
    type: String,
    required: true,
    default: 'USDT'
  },
  depositAmount: {
    type: Number,
    required: true,
    min: 10 // Minimum 10 USDT for futures
  },
  futuresWalletAddress: {
    type: String,
    required: true
  },
  futuresWalletId: {
    type: String,
    required: true
  },
  depositFromAddress: {
    type: String,
    required: true
  },
  marginAmount: {
    type: Number,
    required: false // Set when deposit is completed
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'bridging', 'transferring', 'completed', 'failed'],
    default: 'pending'
  },
  txHash: {
    type: String,
    required: false // Transaction hash from admin backend
  },
  bridgeTxHash: {
    type: String,
    required: false // Bridge transaction hash
  },
  error: {
    type: String,
    required: false // Error message if failed
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date,
    required: false
  }
}, {
  timestamps: true // This automatically manages createdAt and updatedAt
});

// Indexes for efficient queries
FuturesDepositSchema.index({ userId: 1, status: 1 });
FuturesDepositSchema.index({ email: 1, createdAt: -1 });
FuturesDepositSchema.index({ status: 1, createdAt: -1 });

const FuturesDeposit = 
  mongoose.models.FuturesDeposit || 
  mongoose.model("FuturesDeposit", FuturesDepositSchema);

export default FuturesDeposit;