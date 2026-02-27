import mongoose, { Schema, Document, Model } from "mongoose";

// ── Types ──────────────────────────────────────────────────────────────────

export type DepositStatus =
  | "pending"              // Order created, awaiting GlobalPay payment
  | "awaiting_verification" // User clicked "I've Paid", verification queued
  | "verifying"            // Server is calling GlobalPay API to verify
  | "payment_confirmed"    // GlobalPay confirmed payment received
  | "sending_usdt"         // USDT transfer in progress from treasury
  | "completed"            // USDT delivered to user's wallet
  | "payment_failed"       // GlobalPay says payment failed or not found
  | "delivery_failed"      // Payment confirmed but USDT transfer failed
  | "cancelled";           // User or admin cancelled

export type FiatCurrency = "NGN" | "USD" | "GBP";

export interface IDepositTransaction extends Document {
  authUserId: string;
  email: string;

  // Amounts (locked at order creation)
  usdtAmount: number;
  fiatAmount: number;
  fiatCurrency: FiatCurrency;
  exchangeRate: number;      // Rate at time of order (1 USDT = X fiat, with markup)
  platformMarkup: number;    // Markup percentage applied (e.g. 5)

  // Wallet
  userSolanaAddress: string;

  // GlobalPay references
  merchantTransactionReference: string; // Unique ref sent to GlobalPay
  gatewayReference?: string;            // GlobalPay's payment reference (from verification)
  gatewayStatus?: string;               // Raw status from GlobalPay API

  // On-chain delivery
  txHash?: string;                      // Solana transaction hash for USDT transfer
  deliveryError?: string;               // Error message if USDT delivery fails

  // Status tracking
  status: DepositStatus;
  statusHistory: Array<{
    status: DepositStatus;
    timestamp: Date;
    note?: string;
  }>;

  // Admin
  adminNote?: string;

  // Timing
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────

const DepositTransactionSchema = new Schema<IDepositTransaction>(
  {
    authUserId: { type: String, required: true, index: true },
    email: { type: String, required: true },

    // Amounts
    usdtAmount: { type: Number, required: true },
    fiatAmount: { type: Number, required: true },
    fiatCurrency: {
      type: String,
      enum: ["NGN", "USD", "GBP"],
      required: true,
    },
    exchangeRate: { type: Number, required: true },
    platformMarkup: { type: Number, required: true },

    // Wallet
    userSolanaAddress: { type: String, required: true },

    // GlobalPay references
    merchantTransactionReference: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    gatewayReference: { type: String },
    gatewayStatus: { type: String },

    // On-chain delivery
    txHash: { type: String },
    deliveryError: { type: String },

    // Status
    status: {
      type: String,
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
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String },
      },
    ],

    // Admin
    adminNote: { type: String },

    // Timing
    completedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
DepositTransactionSchema.index({ status: 1, createdAt: -1 });
DepositTransactionSchema.index({ authUserId: 1, createdAt: -1 });
DepositTransactionSchema.index({ merchantTransactionReference: 1 });

// ── Model ──────────────────────────────────────────────────────────────────

const DepositTransaction: Model<IDepositTransaction> =
  mongoose.models.DepositTransaction ||
  mongoose.model<IDepositTransaction>("DepositTransaction", DepositTransactionSchema);

export default DepositTransaction;
