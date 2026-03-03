import mongoose, { Schema, Model, Document } from 'mongoose';

// ── Types ──────────────────────────────────────────────────────────────────

export interface IFeeAuditLog extends Document {
  timestamp: Date;
  userId: string;
  operationType: 'deposit' | 'withdrawal' | 'trade';
  totalAmount: number;
  feeAmount: number;
  collateralAmount: number;
  feePercentage: number;
  feeSignature: string;
  depositSignature: string;
}

// ── Schema ─────────────────────────────────────────────────────────────────

const FeeAuditLogSchema = new Schema<IFeeAuditLog>(
  {
    timestamp: {
      type: Date,
      required: true,
      default: Date.now,
      index: true
    },
    userId: {
      type: String,
      required: true,
      index: true
    },
    operationType: {
      type: String,
      required: true,
      enum: ['deposit', 'withdrawal', 'trade'],
      index: true
    },
    totalAmount: {
      type: Number,
      required: true
    },
    feeAmount: {
      type: Number,
      required: true
    },
    collateralAmount: {
      type: Number,
      required: true
    },
    feePercentage: {
      type: Number,
      required: true
    },
    feeSignature: {
      type: String,
      required: true
    },
    depositSignature: {
      type: String,
      required: true
    }
  },
  {
    timestamps: false
  }
);

// Compound index for user queries
FeeAuditLogSchema.index({ userId: 1, timestamp: -1 });

// ── Model ──────────────────────────────────────────────────────────────────

const FeeAuditLog: Model<IFeeAuditLog> =
  mongoose.models.FeeAuditLog ||
  mongoose.model<IFeeAuditLog>('FeeAuditLog', FeeAuditLogSchema);

export default FeeAuditLog;
