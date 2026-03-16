"use client";

import React, { useEffect, useRef, memo } from 'react';

interface TradingViewChartProps {
    symbol: string;
    theme?: 'light' | 'dark';
}

function toHyperliquidSymbol(raw: string): string {
    // Strip common suffixes and separators to get the base asset
    const base = raw
        .replace(/[\/\-_]/g, '')
        .replace(/(USDC|USDT|USD|USDH)$/i, '')
        .toUpperCase();
    return `HYPERLIQUID:${base}USDH`;
}

const TradingViewChart = ({ symbol, theme = 'dark' }: TradingViewChartProps) => {
    const container = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!container.current) return;

        const currentContainer = container.current;
        while (currentContainer.firstChild) {
            currentContainer.removeChild(currentContainer.firstChild);
        }

        const script = document.createElement("script");
        script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
        script.type = "text/javascript";
        script.async = true;

        const tvSymbol = symbol.includes(":") ? symbol : toHyperliquidSymbol(symbol);

        const config = {
            "autosize": true,
            "symbol": tvSymbol,
            "interval": "30",
            "timezone": "Etc/UTC",
            "theme": theme,
            "style": "1",
            "locale": "en",
            "enable_publishing": false,
            "backgroundColor": theme === "dark" ? "rgba(11, 14, 17, 1)" : "rgba(255, 255, 255, 1)",
            "gridColor": theme === "dark" ? "rgba(42, 46, 57, 0.06)" : "rgba(240, 243, 250, 0.06)",
            "withdateranges": true,
            "hide_side_toolbar": false,
            "allow_symbol_change": false,
            "save_image": false,
            "details": true,
            "hotlist": false,
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
