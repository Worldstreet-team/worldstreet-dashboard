import { create } from 'zustand';
import { Interval } from '@/lib/chart/DataFeedService';

interface ChartState {
  symbol: string;
  interval: Interval;
  currentPrice: number | null;
  priceChange24h: number | null;
  volume24h: number | null;
  isLoading: boolean;
  error: string | null;
  
  setSymbol: (symbol: string) => void;
  setInterval: (interval: Interval) => void;
  setCurrentPrice: (price: number) => void;
  setPriceChange24h: (change: number) => void;
  setVolume24h: (volume: number) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  symbol: 'BTC-USDT',
  interval: '1m' as Interval,
  currentPrice: null,
  priceChange24h: null,
  volume24h: null,
  isLoading: false,
  error: null,
};

export const useChartStore = create<ChartState>((set) => ({
  ...initialState,
  
  setSymbol: (symbol) => set({ symbol }),
  setInterval: (interval) => set({ interval }),
  setCurrentPrice: (price) => set({ currentPrice: price }),
  setPriceChange24h: (change) => set({ priceChange24h: change }),
  setVolume24h: (volume) => set({ volume24h: volume }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
