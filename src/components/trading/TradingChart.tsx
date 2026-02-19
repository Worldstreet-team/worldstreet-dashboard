"use client";

import React, { memo } from "react";
import TradingViewChart from "./TradingViewChart";

interface TradingChartProps {
  pair?: string;
}

const TradingChart = ({ pair = "BTC/USDC" }: TradingChartProps) => {
  return (
    <div className="w-full h-full bg-[#0b0e11] flex flex-col">
      <TradingViewChart symbol={pair} theme="dark" />
    </div>
  );
};

export default memo(TradingChart);
