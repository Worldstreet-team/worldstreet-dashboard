"use client";

import React, { useEffect } from "react";
import BinanceSpotPage from "./binance-page";

export default function SpotTradingPage() {
  // Force dark background immediately on mount
  useEffect(() => {
    document.body.style.backgroundColor = '#181a20';
    document.documentElement.setAttribute('data-page', 'spot');
    return () => {
      document.body.style.backgroundColor = '';
      document.documentElement.removeAttribute('data-page');
    };
  }, []);

  return <BinanceSpotPage />;
}


