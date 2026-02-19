import { useTradingStore } from '@/store/useTradingStore';

const BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';
const BINANCE_REST_URL = 'https://api.binance.com/api/v3';

class BinanceWSService {
    private ws: WebSocket | null = null;
    private symbol: string = '';
    private reconnectAttempts: number = 0;
    private maxReconnectAttempts: number = 5;
    private lastUpdateId: number = 0;
    private messageBuffer: any[] = [];
    private isSynchronized: boolean = false;

    constructor() { }

    async connect(symbol: string) {
        if (this.ws) {
            this.ws.close();
        }

        this.symbol = symbol.toLowerCase();
        this.ws = new WebSocket(`${BINANCE_WS_URL}/${this.symbol}@depth@100ms/${this.symbol}@trade/${this.symbol}@kline_1m`);

        this.ws.onopen = () => {
            console.log(`[BinanceWS] Connected to ${symbol}`);
            this.reconnectAttempts = 0;
            this.fetchSnapshot();
        };

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleMessage(data);
        };

        this.ws.onclose = () => {
            console.warn(`[BinanceWS] Connection closed for ${symbol}`);
            this.handleReconnect();
        };

        this.ws.onerror = (error) => {
            console.error(`[BinanceWS] Error:`, error);
        };
    }

    private async fetchSnapshot() {
        try {
            const response = await fetch(`${BINANCE_REST_URL}/depth?symbol=${this.symbol.toUpperCase()}&limit=100`);
            const data = await response.json();

            this.lastUpdateId = data.lastUpdateId;
            useTradingStore.getState().setOrderBook(data.bids, data.asks);

            this.isSynchronized = true;
            this.processBuffer();
        } catch (error) {
            console.error(`[BinanceWS] Failed to fetch snapshot:`, error);
            setTimeout(() => this.fetchSnapshot(), 5000);
        }
    }

    private handleMessage(data: any) {
        if (data.e === 'depthUpdate') {
            if (!this.isSynchronized) {
                this.messageBuffer.push(data);
                return;
            }
            this.processDepthUpdate(data);
        } else if (data.e === 'trade') {
            useTradingStore.getState().addTrade({
                id: data.t.toString(),
                price: data.p,
                amount: data.q,
                time: data.T,
                side: data.m ? 'sell' : 'buy' // m = isBuyerMaker (true if sell)
            });
        } else if (data.e === 'kline') {
            // Logic for live candle updates could be added here
            // For now we can expose it via a subscription or store
        }
    }

    private processDepthUpdate(data: any) {
        // Sequence check: drop old updates
        if (data.u <= this.lastUpdateId) return;

        // First update after snapshot must satisfy: U <= lastUpdateId + 1 AND u >= lastUpdateId + 1
        // (U is first update ID, u is last update ID in the message)

        useTradingStore.getState().updateOrderBook(data.b, data.a);
        this.lastUpdateId = data.u;
    }

    private processBuffer() {
        const validUpdates = this.messageBuffer.filter(u => u.u > this.lastUpdateId);
        validUpdates.forEach(update => this.processDepthUpdate(update));
        this.messageBuffer = [];
    }

    private handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
            console.log(`[BinanceWS] Reconnecting in ${delay}ms...`);
            setTimeout(() => this.connect(this.symbol), delay);
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

export const binanceWS = new BinanceWSService();
