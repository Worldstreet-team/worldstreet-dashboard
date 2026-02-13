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

        // TradingView uses pairs like BINANCE:BTCUSDT
        // Map our symbols if necessary. 
        // Most common: BTC/USD -> BITSTAMP:BTCUSD or BINANCE:BTCUSDT
        let tvSymbol = symbol.replace("/", "");
        if (!tvSymbol.includes(":")) {
            // Default to Binance for crypto pairs if no exchange specified
            tvSymbol = `BINANCE:${tvSymbol}`;
            // If it's something like BTCUSDC, it should be fine. 
            // If it's BTC/USD, it became BTCUSD.
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
            "allow_symbol_change": false,
            "calendar": false,
            "support_host": "https://www.tradingview.com",
            "hide_top_toolbar": false,
            "save_image": false,
            "container_id": "tradingview_chart_container"
        });

        const widgetDiv = document.createElement("div");
        widgetDiv.id = "tradingview_chart_container";
        widgetDiv.style.height = "100%";
        widgetDiv.style.width = "100%";

        currentContainer.appendChild(widgetDiv);
        currentContainer.appendChild(script);

        return () => {
            // Cleanup happens on next effect run
        };
    }, [symbol, theme]);

    return (
        <div className="tradingview-widget-container" ref={container} style={{ height: "800px", width: "100%" }}>
        </div>
    );
}

export default memo(TradingViewChart);
