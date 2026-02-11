import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUserToken extends Document {
  userId: string;
  chain: "ethereum" | "solana";
  address: string; // Contract address
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  coingeckoId?: string;
  isHidden: boolean;
  addedAt: Date;
  updatedAt: Date;
}

const UserTokenSchema = new Schema<IUserToken>(
  {
    userId: {
      type: String,
      required: true,
      index: true,
    },
    chain: {
      type: String,
      enum: ["ethereum", "solana"],
      required: true,
    },
    address: {
      type: String,
      required: true,
    },
    symbol: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    decimals: {
      type: Number,
      required: true,
    },
    logoURI: {
      type: String,
      default: "",
    },
    coingeckoId: {
      type: String,
      default: "",
    },
    isHidden: {
      type: Boolean,
      default: false,
    },
    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for unique token per user per chain
UserTokenSchema.index({ userId: 1, chain: 1, address: 1 }, { unique: true });

// Check if model exists before creating (for hot reload)
const UserToken: Model<IUserToken> =
  mongoose.models.UserToken ||
  mongoose.model<IUserToken>("UserToken", UserTokenSchema);

export default UserToken;
