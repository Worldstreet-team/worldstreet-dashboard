import mongoose, { Schema, Document, Model } from "mongoose";

// ── Types ──────────────────────────────────────────────────────────────────

export type P2POrderType = "buy" | "sell";
export type P2POrderStatus =
  | "pending"        // Order created, awaiting user action
  | "awaiting_payment" // Buy: user needs to send fiat. Sell: USDT transfer pending
  | "payment_sent"   // Buy: user claims they sent fiat. Sell: USDT sent to platform
  | "completed"      // Admin confirmed, USDT/fiat released
  | "cancelled"      // User or admin cancelled
  | "expired";       // Order timed out

export type FiatCurrency = "NGN" | "USD" | "GBP";

export interface IBankDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
  sortCode?: string;     // For GBP
  routingNumber?: string; // For USD
}

export interface IP2POrder extends Document {
  authUserId: string;
  email: string;
  orderType: P2POrderType;

  // Amounts
  usdtAmount: number;        // USDT amount
  fiatAmount: number;        // Fiat amount (calculated from rate)
  fiatCurrency: FiatCurrency;
  exchangeRate: number;      // Rate at time of order (1 USDT = X fiat)
  platformMarkup: number;    // Markup percentage applied (e.g. 5)

  // Wallet addresses
  userSolanaAddress: string; // User's Solana wallet address

  // Bank details (for sell orders: user's bank; stored for payout)
  userBankDetails?: IBankDetails;

  // Status tracking
  status: P2POrderStatus;
  statusHistory: Array<{
    status: P2POrderStatus;
    timestamp: Date;
    note?: string;
  }>;

  // Transaction reference
  paymentReference?: string;  // User's fiat payment reference
  txHash?: string;            // On-chain USDT transaction hash
  adminNote?: string;         // Admin notes

  // Timing
  expiresAt: Date;
  completedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────

const P2POrderSchema = new Schema<IP2POrder>(
  {
    authUserId: {
      type: String,
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
    },
    orderType: {
      type: String,
      enum: ["buy", "sell"],
      required: true,
    },

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

    // Bank details
    userBankDetails: {
      bankName: { type: String },
      accountNumber: { type: String },
      accountName: { type: String },
      sortCode: { type: String },
      routingNumber: { type: String },
    },

    // Status
    status: {
      type: String,
      enum: ["pending", "awaiting_payment", "payment_sent", "completed", "cancelled", "expired"],
      default: "pending",
    },
    statusHistory: [
      {
        status: { type: String, required: true },
        timestamp: { type: Date, default: Date.now },
        note: { type: String },
      },
    ],

    // References
    paymentReference: { type: String },
    txHash: { type: String },
    adminNote: { type: String },

    // Timing
    expiresAt: { type: Date, required: true },
    completedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

// Indexes for efficient queries
P2POrderSchema.index({ status: 1, createdAt: -1 });
P2POrderSchema.index({ authUserId: 1, createdAt: -1 });

// ── Model ──────────────────────────────────────────────────────────────────

const P2POrder: Model<IP2POrder> =
  mongoose.models.P2POrder ||
  mongoose.model<IP2POrder>("P2POrder", P2POrderSchema);

export default P2POrder;
