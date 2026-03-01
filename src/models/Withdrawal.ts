import mongoose, { Schema, Document, Model } from "mongoose";

// ── Types ──────────────────────────────────────────────────────────────────

export type WithdrawalStatus =
  | "pending"
  | "usdt_sent"
  | "tx_verified"
  | "processing"
  | "ngn_sent"
  | "completed"
  | "failed"
  | "cancelled";

export type WithdrawalChain = "solana" | "ethereum";

export interface IWithdrawalBankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface IWithdrawalAdminAction {
  action: string;
  adminEmail: string;
  note?: string;
  timestamp: Date;
}

export interface IWithdrawal extends Document {
  userId: string; // Clerk userId
  email: string;

  // Amounts
  usdtAmount: number;
  fiatAmount: number;
  fiatCurrency: string;
  exchangeRate: number;

  // Chain & addresses
  chain: WithdrawalChain;
  userWalletAddress: string;
  treasuryWalletAddress: string;

  // On-chain transaction (user → treasury)
  txHash?: string;
  txVerified: boolean;
  txVerifiedAt?: Date;

  // Bank details for fiat payout
  bankDetails: IWithdrawalBankDetails;

  // Status
  status: WithdrawalStatus;

  // Admin payout tracking
  payoutReference?: string;
  adminNote?: string;
  adminActions: IWithdrawalAdminAction[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────

const WithdrawalSchema = new Schema<IWithdrawal>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
    },

    // Amounts
    usdtAmount: {
      type: Number,
      required: true,
      min: 5,
      max: 5000,
    },
    fiatAmount: {
      type: Number,
      required: true,
    },
    fiatCurrency: {
      type: String,
      required: true,
      default: "NGN",
    },
    exchangeRate: {
      type: Number,
      required: true,
    },

    // Chain & addresses
    chain: {
      type: String,
      required: true,
      enum: ["solana", "ethereum"],
    },
    userWalletAddress: {
      type: String,
      required: true,
    },
    treasuryWalletAddress: {
      type: String,
      required: true,
    },

    // On-chain transaction
    txHash: {
      type: String,
      sparse: true,
    },
    txVerified: {
      type: Boolean,
      default: false,
    },
    txVerifiedAt: {
      type: Date,
    },

    // Bank details
    bankDetails: {
      bankName: { type: String, required: true },
      accountNumber: { type: String, required: true },
      accountName: { type: String, required: true },
    },

    // Status
    status: {
      type: String,
      required: true,
      enum: [
        "pending",
        "usdt_sent",
        "tx_verified",
        "processing",
        "ngn_sent",
        "completed",
        "failed",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },

    // Admin payout tracking
    payoutReference: {
      type: String,
    },
    adminNote: {
      type: String,
    },
    adminActions: [
      {
        action: { type: String, required: true },
        adminEmail: { type: String, required: true },
        note: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],

    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────

WithdrawalSchema.index({ userId: 1, createdAt: -1 });
WithdrawalSchema.index({ status: 1, createdAt: -1 });

// ── Export ──────────────────────────────────────────────────────────────────

const Withdrawal: Model<IWithdrawal> =
  mongoose.models.Withdrawal ||
  mongoose.model<IWithdrawal>("Withdrawal", WithdrawalSchema);

export default Withdrawal;
