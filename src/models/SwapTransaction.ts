import mongoose, { Schema, Document, Model } from "mongoose";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ISwapToken {
  chainId: number;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export interface ISwapTransaction extends Document {
  // User reference
  userId: string; // authUserId from DashboardProfile

  // Transaction identifiers
  txHash: string;
  receivingTxHash?: string;

  // Chain information
  fromChain: string; // "ethereum" | "solana"
  toChain: string;
  fromChainId: number;
  toChainId: number;

  // Token information
  fromToken: ISwapToken;
  toToken: ISwapToken;

  // Amounts (stored as strings to preserve precision)
  fromAmount: string;
  toAmount: string;
  toAmountMin?: string;

  // Status
  status: "PENDING" | "DONE" | "FAILED" | "NOT_FOUND";
  substatus?: string;
  substatusMessage?: string;

  // Fees
  gasCostUSD?: string;
  feeCostUSD?: string;

  // Bridge/DEX used
  tool?: string;
  toolLogoURI?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────

const SwapTokenSchema = new Schema<ISwapToken>(
  {
    chainId: { type: Number, required: true },
    address: { type: String, required: true },
    symbol: { type: String, required: true },
    name: { type: String, required: true },
    decimals: { type: Number, required: true },
    logoURI: { type: String },
  },
  { _id: false }
);

const SwapTransactionSchema = new Schema<ISwapTransaction>(
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
    },
    receivingTxHash: {
      type: String,
      sparse: true,
    },

    // Chain info
    fromChain: {
      type: String,
      required: true,
      enum: ["ethereum", "solana"],
    },
    toChain: {
      type: String,
      required: true,
      enum: ["ethereum", "solana"],
    },
    fromChainId: {
      type: Number,
      required: true,
    },
    toChainId: {
      type: Number,
      required: true,
    },

    // Tokens
    fromToken: {
      type: SwapTokenSchema,
      required: true,
    },
    toToken: {
      type: SwapTokenSchema,
      required: true,
    },

    // Amounts
    fromAmount: {
      type: String,
      required: true,
    },
    toAmount: {
      type: String,
      required: true,
    },
    toAmountMin: {
      type: String,
    },

    // Status
    status: {
      type: String,
      required: true,
      enum: ["PENDING", "DONE", "FAILED", "NOT_FOUND"],
      default: "PENDING",
    },
    substatus: String,
    substatusMessage: String,

    // Fees
    gasCostUSD: String,
    feeCostUSD: String,

    // Tool used
    tool: String,
    toolLogoURI: String,

    // Completed timestamp
    completedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
SwapTransactionSchema.index({ userId: 1, createdAt: -1 });
SwapTransactionSchema.index({ userId: 1, status: 1 });

// ── Model ──────────────────────────────────────────────────────────────────

const SwapTransaction: Model<ISwapTransaction> =
  mongoose.models.SwapTransaction ||
  mongoose.model<ISwapTransaction>("SwapTransaction", SwapTransactionSchema);

export default SwapTransaction;
