import { create } from 'zustand';

export interface OrderLevel {
    price: string;
    amount: string;
    total: number;
    percentage: number;
}

export interface Trade {
    id: string;
    price: string;
    amount: string;
    time: number;
    side: 'buy' | 'sell';
}

export interface Candle {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface TradingState {
    symbol: string;
    bids: OrderLevel[];
    asks: OrderLevel[];
    recentTrades: Trade[];
    lastPrice: string;
    priceDirection: 'up' | 'down' | 'neutral';

    // Actions
    setSymbol: (symbol: string) => void;
    setOrderBook: (bids: [string, string][], asks: [string, string][]) => void;
    updateOrderBook: (bids: [string, string][], asks: [string, string][]) => void;
    addTrade: (trade: Trade) => void;
    setRecentTrades: (trades: Trade[]) => void;
}

export const useTradingStore = create<TradingState>((set, get) => ({
    symbol: 'BTCUSDC',
    bids: [],
    asks: [],
    recentTrades: [],
    lastPrice: '0',
    priceDirection: 'neutral',

    setSymbol: (symbol) => set({ symbol, bids: [], asks: [], recentTrades: [] }),

    setOrderBook: (rawBids, rawAsks) => {
        const processedBids = processLevels(rawBids, 'buy');
        const processedAsks = processLevels(rawAsks, 'sell');
        set({ bids: processedBids, asks: processedAsks });
    },

    updateOrderBook: (deltaBids, deltaAsks) => {
        // Logic for incremental updates
        const currentBids = [...get().bids];
        const currentAsks = [...get().asks];

        const updatedBids = applyDeltas(currentBids, deltaBids, 'buy');
        const updatedAsks = applyDeltas(currentAsks, deltaAsks, 'sell');

        set({ bids: updatedBids, asks: updatedAsks });
    },

    addTrade: (trade) => set((state) => {
        const direction = parseFloat(trade.price) > parseFloat(state.lastPrice) ? 'up' :
            parseFloat(trade.price) < parseFloat(state.lastPrice) ? 'down' : 'neutral';

        return {
            recentTrades: [trade, ...state.recentTrades].slice(0, 100),
            lastPrice: trade.price,
            priceDirection: direction
        };
    }),

    setRecentTrades: (trades) => set({ recentTrades: trades }),
}));

// Helper functions for order book processing
function processLevels(levels: [string, string][], side: 'buy' | 'sell'): OrderLevel[] {
    let cumTotal = 0;
    const processed = levels.map(([price, amount]) => {
        const amt = parseFloat(amount);
        cumTotal += amt;
        return { price, amount, total: cumTotal, percentage: 0 };
    });

    // Calculate percentages for depth visualization
    const maxTotal = cumTotal || 1;
    processed.forEach(l => l.percentage = (l.total / maxTotal) * 100);

    return processed;
}

function applyDeltas(current: OrderLevel[], deltas: [string, string][], side: 'buy' | 'sell'): OrderLevel[] {
    const map = new Map(current.map(l => [l.price, l.amount]));

    for (const [price, amount] of deltas) {
        if (parseFloat(amount) === 0) {
            map.delete(price);
        } else {
            map.set(price, amount);
        }
    }

    const sortedPrices = Array.from(map.keys()).sort((a, b) =>
        side === 'buy' ? parseFloat(b) - parseFloat(a) : parseFloat(a) - parseFloat(b)
    );

    let cumTotal = 0;
    const result = sortedPrices.slice(0, 50).map(price => {
        const amount = map.get(price)!;
        cumTotal += parseFloat(amount);
        return { price, amount, total: cumTotal, percentage: 0 };
    });

    const maxTotal = cumTotal || 1;
    result.forEach(l => l.percentage = (l.total / maxTotal) * 100);

    return result;
}
