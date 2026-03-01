import mongoose, { Schema, Document, Model } from "mongoose";

// ── Types ──────────────────────────────────────────────────────────────────

export type DepositStatus =
  | "pending"
  | "awaiting_verification"
  | "verifying"
  | "payment_confirmed"
  | "sending_usdt"
  | "completed"
  | "payment_failed"
  | "delivery_failed"
  | "cancelled";

export interface IDeposit extends Document {
  userId: string; // Clerk userId
  email: string;

  // Amounts
  usdtAmount: number;
  fiatAmount: number;
  fiatCurrency: string;
  exchangeRate: number;

  // GlobalPay references
  merchantTransactionReference: string;
  globalPayTransactionReference?: string;
  checkoutUrl?: string;

  // User wallet
  userSolanaAddress: string;

  // Status
  status: DepositStatus;

  // On-chain delivery
  txHash?: string;
  deliveryError?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────

const DepositSchema = new Schema<IDeposit>(
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

    merchantTransactionReference: {
      type: String,
      required: true,
      unique: true,
    },
    globalPayTransactionReference: {
      type: String,
      sparse: true,
    },
    checkoutUrl: {
      type: String,
    },

    userSolanaAddress: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      required: true,
      enum: [
        "pending",
        "awaiting_verification",
        "verifying",
        "payment_confirmed",
        "sending_usdt",
        "completed",
        "payment_failed",
        "delivery_failed",
        "cancelled",
      ],
      default: "pending",
      index: true,
    },

    txHash: {
      type: String,
      sparse: true,
    },
    deliveryError: {
      type: String,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// ── Indexes ────────────────────────────────────────────────────────────────

DepositSchema.index({ userId: 1, createdAt: -1 });
DepositSchema.index({ merchantTransactionReference: 1 });

// ── Export ──────────────────────────────────────────────────────────────────

const Deposit: Model<IDeposit> =
  mongoose.models.Deposit || mongoose.model<IDeposit>("Deposit", DepositSchema);

export default Deposit;
