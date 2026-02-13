"use client";

import React, { useEffect, useRef, memo } from 'react';

interface TradingViewChartProps {
    symbol: string;
    theme?: 'light' | 'dark';
}

const TradingViewChart = ({ symbol, theme = 'dark' }: TradingViewChartProps) => {
    const container = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!container.current) return;

        // Clean up previous widget
        const currentContainer = container.current;
        while (currentContainer.firstChild) {
            currentContainer.removeChild(currentContainer.firstChild);
        }

        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
        script.type = "text/javascript";
        script.async = true;

        // Map our symbols to TradingView symbols
        // Default to BINANCE:SYMBOLUSDT which is common
        let tvSymbol = symbol.replace("/", "");
        if (!tvSymbol.includes(":")) {
            tvSymbol = `BINANCE:${tvSymbol}T`; // e.g. BTCUSDC -> BTCUSDCT
            // More common mapping
            if (tvSymbol === "BINANCE:SOLUSDC") tvSymbol = "BINANCE:SOLUSDT";
            if (tvSymbol === "BINANCE:BTCUSDC") tvSymbol = "BINANCE:BTCUSDT";
            if (tvSymbol === "BINANCE:ETHUSDC") tvSymbol = "BINANCE:ETHUSDT";
        }

        script.innerHTML = JSON.stringify({
            "autosize": true,
            "symbol": tvSymbol,
            "interval": "D",
            "timezone": "Etc/UTC",
            "theme": theme,
            "style": "1", // 1 is Candlesticks
            "locale": "en",
            "enable_publishing": false,
            "backgroundColor": theme === "dark" ? "rgba(26, 26, 26, 1)" : "rgba(255, 255, 255, 1)",
            "gridColor": theme === "dark" ? "rgba(42, 46, 57, 0.06)" : "rgba(240, 243, 250, 0.06)",
            "withdateranges": true,
            "hide_side_toolbar": false,
            "allow_symbol_change": true,
            "save_image": false,
            "details": true,
            "hotlist": true,
            "calendar": false,
            "support_host": "https://www.tradingview.com",
            "container_id": "tradingview_chart_container"
        });

        const widgetDiv = document.createElement("div");
        widgetDiv.id = "tradingview_chart_container";
        widgetDiv.style.height = "100%";
        widgetDiv.style.width = "100%";

        currentContainer.appendChild(widgetDiv);
        currentContainer.appendChild(script);

    }, [symbol, theme]);

    return (
        <div className="tradingview-widget-container h-full w-full" ref={container}>
        </div>
    );
}

export default memo(TradingViewChart);
