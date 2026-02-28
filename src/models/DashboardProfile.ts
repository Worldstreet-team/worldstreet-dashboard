import mongoose, { Schema, Document, Model } from "mongoose";

// ── Types ──────────────────────────────────────────────────────────────────

export interface IWalletData {
  address: string;
  encryptedPrivateKey: string;
}

export interface IWallets {
  solana?: IWalletData;
  ethereum?: IWalletData;
  bitcoin?: IWalletData;
  tron?: IWalletData;
}

export interface IDashboardProfile extends Document {
  authUserId: string; // external auth service userId
  email: string;

  // Social / display
  displayName: string;
  avatarUrl: string;
  bio: string;

  // ═══════════════════════════════════════════════════════════════════════════
  // WALLET SYSTEM (Self-Custodial)
  // ⚠️ WARNING: If user loses PIN, funds are LOST FOREVER. No recovery possible.
  // ═══════════════════════════════════════════════════════════════════════════
  wallets: IWallets;
  walletPinHash: string; // PBKDF2 hash of user's PIN
  walletsGenerated: boolean; // true once wallets have been created

  // Trading preferences
  preferredCurrency: string;
  watchlist: string[]; // e.g. ["BTC", "ETH", "GOLD"]
  defaultChartInterval: string; // e.g. "1H", "4H", "1D"
  notifications: {
    priceAlerts: boolean;
    tradeConfirmations: boolean;
    marketNews: boolean;
    email: boolean;
    push: boolean;
  };

  // Dashboard layout preferences
  theme: "light" | "dark" | "system";
  dashboardLayout: "vertical" | "horizontal";

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────

const DashboardProfileSchema = new Schema<IDashboardProfile>(
  {
    authUserId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
    },

    // Social / display
    displayName: { type: String, default: "" },
    avatarUrl: { type: String, default: "" },
    bio: { type: String, default: "", maxlength: 500 },

    // ═══════════════════════════════════════════════════════════════════════════
    // WALLET SYSTEM (Self-Custodial)
    // ⚠️ WARNING: If user loses PIN, funds are LOST FOREVER. No recovery possible.
    // ═══════════════════════════════════════════════════════════════════════════
    wallets: {
      solana: {
        address: { type: String, default: "" },
        encryptedPrivateKey: { type: String, default: "" },
      },
      ethereum: {
        address: { type: String, default: "" },
        encryptedPrivateKey: { type: String, default: "" },
      },
      bitcoin: {
        address: { type: String, default: "" },
        encryptedPrivateKey: { type: String, default: "" },
      },
      tron: {
        address: { type: String, default: "" },
        encryptedPrivateKey: { type: String, default: "" },
      },
    },
    walletPinHash: { type: String, default: "" },
    walletsGenerated: { type: Boolean, default: false },

    // Trading preferences
    preferredCurrency: { type: String, default: "USD" },
    watchlist: { type: [String], default: ["BTC", "ETH", "GOLD"] },
    defaultChartInterval: { type: String, default: "1H" },
    notifications: {
      priceAlerts: { type: Boolean, default: true },
      tradeConfirmations: { type: Boolean, default: true },
      marketNews: { type: Boolean, default: false },
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: false },
    },

    // Dashboard layout preferences
    theme: {
      type: String,
      enum: ["light", "dark", "system"],
      default: "light",
    },
    dashboardLayout: {
      type: String,
      enum: ["vertical", "horizontal"],
      default: "vertical",
    },
  },
  {
    timestamps: true, // auto createdAt + updatedAt
  }
);

// ── Model ──────────────────────────────────────────────────────────────────

// Prevent model re-compilation on hot reload
const DashboardProfile: Model<IDashboardProfile> =
  mongoose.models.DashboardProfile ||
  mongoose.model<IDashboardProfile>("DashboardProfile", DashboardProfileSchema);

export default DashboardProfile;
