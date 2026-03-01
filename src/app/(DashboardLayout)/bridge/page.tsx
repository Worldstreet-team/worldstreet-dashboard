"use client";

import React from "react";
import Footer from "@/components/dashboard/Footer";
import TronBridgeInterface from "@/components/bridge/TronBridgeInterface";

const BridgePage = () => {
  return (
    <div className="grid grid-cols-12 gap-5 lg:gap-6">
      {/* Page Header */}
      <div className="col-span-12">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-dark dark:text-white mb-2">
            Tron Bridge
          </h1>
          <p className="text-muted">
            Bridge your Tron assets to other chains using Symbiosis Protocol
          </p>
        </div>
      </div>

      {/* Bridge Interface */}
      <div className="col-span-12 lg:col-span-8 lg:col-start-3">
        <TronBridgeInterface />
      </div>

      <div className="col-span-12">
        <Footer />
      </div>
    </div>
  );
};

export default BridgePage;
