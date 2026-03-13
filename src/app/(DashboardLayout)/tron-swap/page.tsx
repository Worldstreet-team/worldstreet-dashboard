"use client";

import React from "react";
import { Icon } from "@iconify/react";

const TronSwapPage = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark dark:text-white">
          Tron Chain Swap
        </h1>
        <p className="text-sm text-muted dark:text-darklink mt-1">
          Swap TRX and USDT on Tron network
        </p>
      </div>

      {/* Maintenance Notice */}
      <div className="max-w-lg mx-auto">
        <div className="bg-white dark:bg-black rounded-2xl border border-border dark:border-darkborder shadow-sm p-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center">
              <Icon icon="solar:settings-linear" className="h-8 w-8 text-warning" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-dark dark:text-white mb-2">
                Under Maintenance
              </h3>
              <p className="text-sm text-muted dark:text-darklink">
                The Tron swap feature is currently under maintenance. Please check back later.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TronSwapPage;
