"use client";

import React from "react";
import Footer from "@/components/dashboard/Footer";

export default function SpotTradingPage() {
    return (
        <div className="min-h-[calc(100-vh-100px)] flex flex-col justify-center items-center py-20 px-4">
            <div className="text-center">
                <h1 className="text-2xl font-bold mb-4">Spot Trading</h1>
                <p className="text-muted">The spot trading system is currently being updated. Please check back later.</p>
            </div>
            <div className="mt-auto w-full pt-10">
                <Footer />
            </div>
        </div>
    );
}
