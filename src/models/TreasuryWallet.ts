import mongoose, { Schema, Document, Model } from "mongoose";

// ── Types ──────────────────────────────────────────────────────────────────

export interface ITreasuryWallet extends Document {
  /** Solana public address */
  address: string;

  /** AES-256-GCM encrypted private key (base64) */
  encryptedPrivateKey: string;

  /** AES-256-GCM initialization vector (base64) */
  iv: string;

  /** AES-256-GCM auth tag (base64) */
  authTag: string;

  /** Which network this treasury wallet is for */
  network: "solana" | "ethereum";

  /** Whether this wallet is the currently active treasury */
  isActive: boolean;

  /** Admin who created it */
  createdBy: string;

  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────

const TreasuryWalletSchema = new Schema<ITreasuryWallet>(
  {
    address: {
      type: String,
      required: true,
      unique: true,
    },
    encryptedPrivateKey: {
      type: String,
      required: true,
    },
    iv: {
      type: String,
      required: true,
    },
    authTag: {
      type: String,
      required: true,
    },
    network: {
      type: String,
      required: true,
      enum: ["solana", "ethereum"],
      default: "solana",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// ── Export ──────────────────────────────────────────────────────────────────

const TreasuryWallet: Model<ITreasuryWallet> =
  mongoose.models.TreasuryWallet ||
  mongoose.model<ITreasuryWallet>("TreasuryWallet", TreasuryWalletSchema);

export default TreasuryWallet;
