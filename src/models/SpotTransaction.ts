import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISpotTransaction extends Document {
    userId: string;
    symbol: string;
    side: "buy" | "sell";
    type: "market" | "limit";
    price: number;
    amount: number;
    total: number;
    stopLoss?: number;
    takeProfit?: number;
    exitPrice?: number;
    fee: number;
    pnl?: number;
    status: "PENDING" | "OPEN" | "CLOSED" | "FAILED" | "CANCELED";
    txHash?: string;
    createdAt: Date;
    updatedAt: Date;
}

const SpotTransactionSchema = new Schema<ISpotTransaction>(
    {
        userId: {
            type: String,
            required: true,
            index: true,
        },
        symbol: {
            type: String,
            required: true,
            index: true,
        },
        side: {
            type: String,
            required: true,
            enum: ["buy", "sell"],
        },
        type: {
            type: String,
            required: true,
            enum: ["market", "limit"],
        },
        price: {
            type: Number,
            required: true,
        },
        amount: {
            type: Number,
            required: true,
        },
        total: {
            type: Number,
            required: true,
        },
        stopLoss: {
            type: Number,
        },
        takeProfit: {
            type: Number,
        },
        exitPrice: {
            type: Number,
        },
        fee: {
            type: Number,
            default: 0,
        },
        pnl: {
            type: Number,
        },
        status: {
            type: String,
            required: true,
            enum: ["PENDING", "OPEN", "CLOSED", "FAILED", "CANCELED"],
            default: "PENDING",
        },
        txHash: {
            type: String,
            sparse: true,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for efficient querying
SpotTransactionSchema.index({ userId: 1, symbol: 1, createdAt: -1 });
SpotTransactionSchema.index({ userId: 1, status: 1 });

const SpotTransaction: Model<ISpotTransaction> =
    mongoose.models.SpotTransaction ||
    mongoose.model<ISpotTransaction>("SpotTransaction", SpotTransactionSchema);

export default SpotTransaction;
