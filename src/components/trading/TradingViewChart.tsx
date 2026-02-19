"use client";

import React, { useEffect, useRef, memo } from 'react';

interface TradingViewChartProps {
    symbol: string;
    theme?: 'light' | 'dark';
}

const TradingViewChart = ({ symbol, theme = 'dark' }: TradingViewChartProps) => {
    const container = useRef<HTMLDivElement>(null);
    const widgetRef = useRef<any>(null);

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
        let tvSymbol = symbol.replace("/", "");
        if (!tvSymbol.includes(":")) {
            // Default to KUCOIN for crypto
            if (tvSymbol.includes("SOL")) tvSymbol = "KUCOIN:SOLUSDC";
            else if (tvSymbol.includes("BTC")) tvSymbol = "KUCOIN:BTCUSDC";
            else if (tvSymbol.includes("ETH")) tvSymbol = "KUCOIN:ETHUSDC";
            else if (tvSymbol.includes("XRP")) tvSymbol = "KUCOIN:XRPUSDC";
            else if (tvSymbol.includes("LINK")) tvSymbol = "KUCOIN:LINKUSDC";
            else tvSymbol = `KUCOIN:${tvSymbol}C`;
        }

        const config = {
            "autosize": true,
            "symbol": tvSymbol,
            "interval": "D",
            "timezone": "Etc/UTC",
            "theme": theme,
            "style": "1",
            "locale": "en",
            "enable_publishing": false,
            "backgroundColor": theme === "dark" ? "rgba(10, 10, 10, 1)" : "rgba(255, 255, 255, 1)",
            "gridColor": theme === "dark" ? "rgba(42, 46, 57, 0.05)" : "rgba(240, 243, 250, 0.05)",
            "withdateranges": false, // Disable for mobile performance
            "hide_side_toolbar": true, // Disable for mobile performance
            "allow_symbol_change": false, // Disable for mobile performance
            "save_image": false,
            "details": false, // Disable for mobile performance
            "hotlist": false, // Disable for mobile performance
            "calendar": false,
            "show_popup_button": true,
            "popup_width": "1000",
            "popup_height": "650",
            "support_host": "https://www.tradingview.com",
            "container_id": "tradingview_chart_container"
        };

        script.innerHTML = JSON.stringify(config);

        const widgetDiv = document.createElement("div");
        widgetDiv.id = "tradingview_chart_container";
        widgetDiv.className = "tradingview-widget-container__widget";
        widgetDiv.style.height = "100%";
        widgetDiv.style.width = "100%";

        currentContainer.appendChild(widgetDiv);
        currentContainer.appendChild(script);

        return () => {
            // Cleanup
            if (currentContainer) {
                while (currentContainer.firstChild) {
                    currentContainer.removeChild(currentContainer.firstChild);
                }
            }
        };

    }, [symbol, theme]);

    return (
        <div className="tradingview-widget-container h-full w-full relative overflow-hidden" ref={container}>
        </div>
    );
}

export default memo(TradingViewChart);
