import mongoose, { Schema, Model, Document } from 'mongoose';

// ── Types ──────────────────────────────────────────────────────────────────

export interface IDriftSubaccount extends Document {
  userId: string;
  subaccountId: number;
  futuresWalletAddress: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────

const DriftSubaccountSchema = new Schema<IDriftSubaccount>(
  {
    userId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    subaccountId: {
      type: Number,
      required: true,
      unique: true,
      min: 0,
      max: 255,
      index: true
    },
    futuresWalletAddress: {
      type: String,
      required: true,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// ── Model ──────────────────────────────────────────────────────────────────

const DriftSubaccount: Model<IDriftSubaccount> =
  mongoose.models.DriftSubaccount ||
  mongoose.model<IDriftSubaccount>('DriftSubaccount', DriftSubaccountSchema);

export default DriftSubaccount;
