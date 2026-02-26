import {
  createChart,
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData,
  Time,
  UTCTimestamp,
  CandlestickSeries,
  HistogramSeries,
} from 'lightweight-charts';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export class ChartEngine {
  private chart: IChartApi | null = null;
  private candleSeries: ISeriesApi<'Candlestick'> | null = null;
  private volumeSeries: ISeriesApi<'Histogram'> | null = null;
  private container: HTMLElement;
  private resizeObserver: ResizeObserver | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  initChart(isDarkMode: boolean = false): void {
    if (this.chart) {
      this.destroy();
    }

    this.chart = createChart(this.container, {
      width: this.container.clientWidth,
      height: this.container.clientHeight,
      layout: {
        background: { color: isDarkMode ? '#1a1a1a' : '#ffffff' },
        textColor: isDarkMode ? '#d1d4dc' : '#191919',
      },
      grid: {
        vertLines: { color: isDarkMode ? '#2a2e39' : '#e1e3eb' },
        horzLines: { color: isDarkMode ? '#2a2e39' : '#e1e3eb' },
      },
      crosshair: {
        mode: 1, // Normal crosshair
      },
      rightPriceScale: {
        borderColor: isDarkMode ? '#2a2e39' : '#e1e3eb',
      },
      timeScale: {
        borderColor: isDarkMode ? '#2a2e39' : '#e1e3eb',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Add candlestick series (v5 API)
    this.candleSeries = this.chart.addSeries(CandlestickSeries, {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Add volume series (v5 API)
    this.volumeSeries = this.chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // Set as overlay
    });

    this.volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8, // Highest point of volume will be 80% away from the top
        bottom: 0,
      },
    });

    // Setup resize observer
    this.setupResizeObserver();
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !this.chart) return;
      const { width, height } = entries[0].contentRect;
      this.chart.applyOptions({ width, height });
    });

    this.resizeObserver.observe(this.container);
  }

  setHistoricalData(candles: Candle[]): void {
    if (!this.candleSeries || !this.volumeSeries) {
      console.error('Chart not initialized');
      return;
    }

    // Transform and sort data
    const candleData: CandlestickData[] = candles
      .map((candle) => ({
        time: candle.time as UTCTimestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));

    const volumeData: HistogramData[] = candles
      .filter((candle) => candle.volume !== undefined)
      .map((candle) => ({
        time: candle.time as UTCTimestamp,
        value: candle.volume!,
        color: candle.close >= candle.open ? '#26a69a80' : '#ef535080',
      }))
      .sort((a, b) => (a.time as number) - (b.time as number));

    this.candleSeries.setData(candleData);
    this.volumeSeries.setData(volumeData);

    // Fit content
    this.chart?.timeScale().fitContent();
  }

  updateCandle(candle: Candle): void {
    if (!this.candleSeries || !this.volumeSeries) {
      console.error('Chart not initialized');
      return;
    }

    const candleData: CandlestickData = {
      time: candle.time as UTCTimestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    };

    this.candleSeries.update(candleData);

    if (candle.volume !== undefined) {
      const volumeData: HistogramData = {
        time: candle.time as UTCTimestamp,
        value: candle.volume,
        color: candle.close >= candle.open ? '#26a69a80' : '#ef535080',
      };
      this.volumeSeries.update(volumeData);
    }
  }

  updateTheme(isDarkMode: boolean): void {
    if (!this.chart) return;

    this.chart.applyOptions({
      layout: {
        background: { color: isDarkMode ? '#1a1a1a' : '#ffffff' },
        textColor: isDarkMode ? '#d1d4dc' : '#191919',
      },
      grid: {
        vertLines: { color: isDarkMode ? '#2a2e39' : '#e1e3eb' },
        horzLines: { color: isDarkMode ? '#2a2e39' : '#e1e3eb' },
      },
      rightPriceScale: {
        borderColor: isDarkMode ? '#2a2e39' : '#e1e3eb',
      },
      timeScale: {
        borderColor: isDarkMode ? '#2a2e39' : '#e1e3eb',
      },
    });
  }

  fitContent(): void {
    this.chart?.timeScale().fitContent();
  }

  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.chart) {
      this.chart.remove();
      this.chart = null;
    }

    this.candleSeries = null;
    this.volumeSeries = null;
  }

  getChart(): IChartApi | null {
    return this.chart;
  }
}
