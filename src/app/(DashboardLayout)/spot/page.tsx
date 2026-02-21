"use client";

import React, { useState } from "react";
import { Icon } from "@iconify/react";
import Footer from "@/components/dashboard/Footer";
import { MarketTicker, LiveChart } from "@/components/spot";

export default function SpotTradingPage() {
  const [selectedPair, setSelectedPair] = useState('BTC-USDT');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');

  const handleUpdateLevels = (sl: string, tp: string) => {
    setStopLoss(sl);
    setTakeProfit(tp);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark dark:text-white">Spot Trading</h1>
        <p className="text-muted text-sm mt-1">
          Trade cryptocurrencies with real-time charts and market data
        </p>
      </div>

      {/* Market Ticker */}
      <MarketTicker 
        selectedPair={selectedPair} 
        onSelectPair={setSelectedPair} 
      />

      {/* Main Trading Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Chart - Takes 2 columns */}
        <div className="lg:col-span-2">
          <LiveChart 
            symbol={selectedPair}
            stopLoss={stopLoss}
            takeProfit={takeProfit}
            onUpdateLevels={handleUpdateLevels}
          />
        </div>

        {/* Trading Panel */}
        <div className="space-y-6">
          {/* Order Form */}
          <div className="bg-white dark:bg-black rounded-2xl border border-border dark:border-darkborder p-6">
            <div className="flex items-center gap-2 mb-4">
              <Icon icon="ph:currency-circle-dollar" className="text-primary" width={20} />
              <h3 className="font-semibold text-dark dark:text-white">Place Order</h3>
            </div>

            {/* Buy/Sell Tabs */}
            <div className="flex gap-2 mb-4">
              <button className="flex-1 py-2 bg-success/10 text-success font-semibold rounded-lg hover:bg-success/20 transition-colors">
                Buy
              </button>
              <button className="flex-1 py-2 bg-error/10 text-error font-semibold rounded-lg hover:bg-error/20 transition-colors">
                Sell
              </button>
            </div>

            {/* Order Type */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-muted mb-2">Order Type</label>
              <select className="w-full px-3 py-2 bg-muted/10 border border-border dark:border-darkborder rounded-lg text-sm text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary">
                <option>Limit</option>
                <option>Market</option>
                <option>Stop-Limit</option>
              </select>
            </div>

            {/* Price */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-muted mb-2">Price (USDT)</label>
              <input
                type="number"
                placeholder="0.00"
                className="w-full px-3 py-2 bg-white dark:bg-darkgray border border-border dark:border-darkborder rounded-lg text-sm text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Amount */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-muted mb-2">Amount ({selectedPair.split('-')[0]})</label>
              <input
                type="number"
                placeholder="0.00"
                className="w-full px-3 py-2 bg-white dark:bg-darkgray border border-border dark:border-darkborder rounded-lg text-sm text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Percentage Buttons */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {['25%', '50%', '75%', '100%'].map(pct => (
                <button
                  key={pct}
                  className="py-1.5 bg-muted/10 hover:bg-muted/20 text-dark dark:text-white text-xs font-medium rounded-lg transition-colors"
                >
                  {pct}
                </button>
              ))}
            </div>

            {/* Total */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-muted mb-2">Total (USDT)</label>
              <input
                type="number"
                placeholder="0.00"
                className="w-full px-3 py-2 bg-white dark:bg-darkgray border border-border dark:border-darkborder rounded-lg text-sm text-dark dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Submit Button */}
            <button className="w-full py-3 bg-success hover:bg-success/90 text-white font-semibold rounded-lg transition-colors">
              Buy {selectedPair.split('-')[0]}
            </button>

            {/* Balance Info */}
            <div className="mt-4 pt-4 border-t border-border dark:border-darkborder">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-muted">Available:</span>
                <span className="text-dark dark:text-white font-semibold">0.00 USDT</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted">Balance:</span>
                <span className="text-dark dark:text-white font-semibold">0.00 {selectedPair.split('-')[0]}</span>
              </div>
            </div>
          </div>

          {/* Market Info */}
          <div className="bg-gradient-to-br from-primary/5 to-secondary/5 rounded-2xl border border-border dark:border-darkborder p-6">
            <h3 className="font-semibold text-dark dark:text-white mb-3">Market Info</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted">24h Change:</span>
                <span className="text-success font-semibold">+5.23%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">24h High:</span>
                <span className="text-dark dark:text-white font-semibold">$45,234.56</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">24h Low:</span>
                <span className="text-dark dark:text-white font-semibold">$42,123.45</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">24h Volume:</span>
                <span className="text-dark dark:text-white font-semibold">$1.2B</span>
              </div>
            </div>
          </div>

          {/* Trading Tips */}
          <div className="bg-white dark:bg-black rounded-2xl border border-border dark:border-darkborder p-6">
            <div className="flex items-center gap-2 mb-3">
              <Icon icon="ph:lightbulb" className="text-warning" width={18} />
              <h3 className="font-semibold text-dark dark:text-white text-sm">Trading Tips</h3>
            </div>
            
            <ul className="space-y-2 text-xs text-muted">
              <li className="flex gap-2">
                <Icon icon="ph:check-circle" className="text-success shrink-0 mt-0.5" width={14} />
                <span>Set stop-loss to manage risk</span>
              </li>
              <li className="flex gap-2">
                <Icon icon="ph:check-circle" className="text-success shrink-0 mt-0.5" width={14} />
                <span>Use limit orders for better prices</span>
              </li>
              <li className="flex gap-2">
                <Icon icon="ph:check-circle" className="text-success shrink-0 mt-0.5" width={14} />
                <span>Monitor market trends before trading</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white dark:bg-black rounded-2xl border border-border dark:border-darkborder overflow-hidden">
        <div className="p-4 border-b border-border dark:border-darkborder">
          <div className="flex items-center gap-2">
            <Icon icon="ph:clock-clockwise" className="text-primary" width={20} />
            <h3 className="font-semibold text-dark dark:text-white">Recent Orders</h3>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/5">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted">Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted">Pair</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted">Type</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted">Price</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted">Amount</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted">Total</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-muted">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted">
                  No recent orders
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <Footer />
    </div>
  );
}
