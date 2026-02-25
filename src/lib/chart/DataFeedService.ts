import { Candle } from './ChartEngine';

export type Interval = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

interface KlineResponse {
  symbol: string;
  interval: string;
  data: Array<{
    time: number;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
  }>;
}

interface WebSocketMessage {
  type: string;
  symbol?: string;
  interval?: string;
  time?: number;
  open?: string;
  high?: string;
  low?: string;
  close?: string;
  volume?: string;
}

export class DataFeedService {
  private ws: WebSocket | null = null;
  private symbol: string;
  private interval: Interval;
  private onUpdate: (candle: Candle) => void;
  private onError: (error: Error) => void;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isIntentionallyClosed: boolean = false;
  private baseUrl: string;
  private wsUrl: string;

  constructor(
    symbol: string,
    interval: Interval,
    onUpdate: (candle: Candle) => void,
    onError: (error: Error) => void,
    baseUrl: string = 'https://trading.watchup.site',
    wsUrl: string = 'wss://trading.watchup.site/ws'
  ) {
    this.symbol = symbol;
    this.interval = interval;
    this.onUpdate = onUpdate;
    this.onError = onError;
    this.baseUrl = baseUrl;
    this.wsUrl = wsUrl;
  }

  async fetchHistoricalData(): Promise<Candle[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/market/${this.symbol}/klines?type=${this.interval}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch historical data: ${response.statusText}`);
      }

      const data: KlineResponse = await response.json();

      return data.data.map((kline) => ({
        time: Math.floor(kline.time / 1000), // Convert to seconds
        open: parseFloat(kline.open),
        high: parseFloat(kline.high),
        low: parseFloat(kline.low),
        close: parseFloat(kline.close),
        volume: parseFloat(kline.volume),
      }));
    } catch (error) {
      console.error('Error fetching historical data:', error);
      this.onError(error as Error);
      return [];
    }
  }

  connectWebSocket(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return;
    }

    this.isIntentionallyClosed = false;

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.subscribe();
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.onError(new Error('WebSocket connection error'));
      };

      this.ws.onclose = () => {
        console.log('WebSocket closed');
        this.stopHeartbeat();

        if (!this.isIntentionallyClosed) {
          this.attemptReconnect();
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.onError(error as Error);
    }
  }

  private subscribe(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const subscribeMessage = {
      type: 'subscribe',
      symbol: this.symbol,
      interval: this.interval,
    };

    this.ws.send(JSON.stringify(subscribeMessage));
    console.log('Subscribed to:', subscribeMessage);
  }

  private unsubscribe(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const unsubscribeMessage = {
      type: 'unsubscribe',
      symbol: this.symbol,
      interval: this.interval,
    };

    this.ws.send(JSON.stringify(unsubscribeMessage));
    console.log('Unsubscribed from:', unsubscribeMessage);
  }

  private handleMessage(message: WebSocketMessage): void {
    if (message.type === 'kline' && message.time) {
      const candle: Candle = {
        time: Math.floor(message.time / 1000), // Convert to seconds
        open: parseFloat(message.open || '0'),
        high: parseFloat(message.high || '0'),
        low: parseFloat(message.low || '0'),
        close: parseFloat(message.close || '0'),
        volume: message.volume ? parseFloat(message.volume) : undefined,
      };

      this.onUpdate(candle);
    } else if (message.type === 'pong') {
      // Heartbeat response
      console.log('Received pong');
    }
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 20000); // 20 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      this.onError(new Error('Failed to reconnect to WebSocket'));
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);

    setTimeout(() => {
      if (!this.isIntentionallyClosed) {
        this.connectWebSocket();
      }
    }, delay);
  }

  updateSymbol(symbol: string): void {
    this.unsubscribe();
    this.symbol = symbol;
    this.subscribe();
  }

  updateInterval(interval: Interval): void {
    this.unsubscribe();
    this.interval = interval;
    this.subscribe();
  }

  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();

    if (this.ws) {
      this.unsubscribe();
      this.ws.close();
      this.ws = null;
    }
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}
