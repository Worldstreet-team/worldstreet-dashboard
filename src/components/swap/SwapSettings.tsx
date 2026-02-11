"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { Popover } from "flowbite-react";
import { useSwap } from "@/app/context/swapContext";

const PRESET_SLIPPAGES = [0.1, 0.5, 1.0, 3.0];

export function SwapSettings() {
  const { slippage, setSlippage } = useSwap();
  const [customSlippage, setCustomSlippage] = useState("");
  const [isCustom, setIsCustom] = useState(false);

  const handlePresetClick = (value: number) => {
    setSlippage(value);
    setIsCustom(false);
    setCustomSlippage("");
  };

  const handleCustomChange = (value: string) => {
    setCustomSlippage(value);
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 50) {
      setSlippage(parsed);
      setIsCustom(true);
    }
  };

  const isHighSlippage = slippage > 1;
  const isLowSlippage = slippage < 0.1;

  const content = (
    <div className="p-4 w-72">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-dark dark:text-white">Swap Settings</h4>
      </div>

      {/* Slippage Tolerance */}
      <div className="mb-4">
        <div className="flex items-center gap-1.5 mb-2">
          <span className="text-sm text-muted">Slippage Tolerance</span>
          <div className="group relative">
            <Icon icon="ph:info" className="text-muted cursor-help" width={14} />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
              <div className="bg-dark text-white text-xs p-2 rounded-lg shadow-lg w-48">
                Your transaction will revert if the price changes unfavorably by more than this percentage.
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-2">
          {PRESET_SLIPPAGES.map((value) => (
            <button
              key={value}
              onClick={() => handlePresetClick(value)}
              className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                slippage === value && !isCustom
                  ? "bg-primary text-white"
                  : "bg-lightgray dark:bg-darkborder text-dark dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              {value}%
            </button>
          ))}
        </div>

        <div className="relative">
          <input
            type="number"
            step="0.1"
            min="0.01"
            max="50"
            placeholder="Custom"
            value={customSlippage}
            onChange={(e) => handleCustomChange(e.target.value)}
            className={`w-full px-3 py-2 pr-8 bg-lightgray dark:bg-darkborder border-0 rounded-lg text-dark dark:text-white placeholder:text-muted focus:ring-2 focus:ring-primary ${
              isCustom ? "ring-2 ring-primary" : ""
            }`}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">%</span>
        </div>

        {/* Warnings */}
        {isHighSlippage && (
          <div className="mt-2 flex items-center gap-2 text-warning text-xs">
            <Icon icon="ph:warning" width={14} />
            <span>High slippage. Your transaction may be frontrun.</span>
          </div>
        )}
        {isLowSlippage && (
          <div className="mt-2 flex items-center gap-2 text-amber-500 text-xs">
            <Icon icon="ph:warning" width={14} />
            <span>Very low slippage. Transaction may fail.</span>
          </div>
        )}
      </div>

      {/* Current setting display */}
      <div className="pt-3 border-t border-border dark:border-darkborder">
        <div className="flex justify-between text-sm">
          <span className="text-muted">Current slippage</span>
          <span className="font-medium text-dark dark:text-white">{slippage}%</span>
        </div>
      </div>
    </div>
  );

  return (
    <Popover content={content} trigger="click" placement="bottom-end">
      <button className="p-2 rounded-lg hover:bg-lightgray dark:hover:bg-darkborder transition-colors group">
        <Icon
          icon="ph:gear"
          width={20}
          className="text-muted group-hover:text-dark dark:group-hover:text-white transition-colors"
        />
      </button>
    </Popover>
  );
}

export default SwapSettings;
