"use client";
import React, { useContext } from "react";
import { CustomizerContext } from "@/app/context/customizerContext";
import TradingViewChart from "./TradingViewChart";

interface TradingChartProps {
  pair: string;
}

const TradingChart = ({ pair }: TradingChartProps) => {
  const { activeMode } = useContext(CustomizerContext);
  const symbol = pair.split('/')[0];

  return (
    <div className="w-full h-full bg-white dark:bg-[#1a1a1a] flex flex-col">
      <div className="flex-1 min-h-0">
        <TradingViewChart
          symbol={symbol + "USDC"}
          theme={activeMode === "dark" ? "dark" : "light"}
        />
      </div>
    </div>
  );
};

export default TradingChart;
