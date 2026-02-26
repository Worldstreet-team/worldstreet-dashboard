"use client";

import React, { memo } from "react";
import DashboardChart from "./DashboardChart";

interface TradingChartProps {
  /** Short symbol, e.g. "BTC" */
  symbol?: string;
}

const TradingChart = ({ symbol = "BTC" }: TradingChartProps) => {
  return (
    <div className="w-full h-[520px]">
      <DashboardChart symbol={symbol} />
    </div>
  );
};

export default memo(TradingChart);
