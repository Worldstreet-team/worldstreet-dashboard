import { useState, useEffect, useRef, useCallback } from 'react';
import { Trade } from './useTrades';

export interface PnLData {
  pnl: string;
  pnlPercentage: string;
  currentPrice: string;
  timestamp: number;
}

export interface UseTradePnLOptions {
  pollInterval?: number; // milliseconds
  enabled?: boolean;
}

export function useTradePnL(trade: Trade | null, options: UseTradePnLOptions = {}) {
  const { pollInterval = 5000, enabled = true } = options;
  
  const [pnlData, setPnlData] = useState<PnLData | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const workerRef = useRef<Worker | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isWorkerSupported = typeof Worker !== 'undefined';

  /**
   * Fallback polling function (if Web Worker not supported)
   */
  const pollPnL = useCallback(async () => {
    if (!trade || trade.status !== 'OPEN') return;

    try {
      // This would call a price endpoint - for now we'll skip implementation
      // In production, you'd fetch current price and calculate PnL here
      console.log('[PnL Fallback] Polling for trade:', trade.id);
    } catch (err) {
      console.error('[PnL Fallback] Error:', err);
      setError((err as Error).message);
    }
  }, [trade]);

  /**
   * Start tracking with Web Worker
   */
  const startWorkerTracking = useCallback(() => {
    if (!trade || trade.status !== 'OPEN' || !isWorkerSupported) return;

    try {
      // Create worker
      workerRef.current = new Worker('/workers/pnl-tracker.worker.js');

      // Handle messages from worker
      workerRef.current.onmessage = (e) => {
        const { type, data, error: workerError, tradeId } = e.data;

        switch (type) {
          case 'pnl_update':
            if (tradeId === trade.id) {
              setPnlData(data);
              setError(null);
            }
            break;

          case 'tracking_started':
            setIsTracking(true);
            console.log('[PnL Worker] Tracking started for trade:', tradeId);
            break;

          case 'tracking_stopped':
            setIsTracking(false);
            console.log('[PnL Worker] Tracking stopped');
            break;

          case 'error':
            console.error('[PnL Worker] Error:', workerError);
            setError(workerError);
            break;

          case 'pong':
            console.log('[PnL Worker] Pong received');
            break;
        }
      };

      // Handle worker errors
      workerRef.current.onerror = (error) => {
        console.error('[PnL Worker] Worker error:', error);
        setError('Worker error occurred');
        setIsTracking(false);
      };

      // Start tracking
      workerRef.current.postMessage({
        type: 'start',
        trade,
        pollInterval
      });
    } catch (err) {
      console.error('[PnL Worker] Failed to start worker:', err);
      setError('Failed to start PnL tracking');
    }
  }, [trade, pollInterval, isWorkerSupported]);

  /**
   * Stop tracking
   */
  const stopTracking = useCallback(() => {
    // Stop worker
    if (workerRef.current) {
      workerRef.current.postMessage({ type: 'stop' });
      workerRef.current.terminate();
      workerRef.current = null;
    }

    // Stop fallback
    if (fallbackIntervalRef.current) {
      clearInterval(fallbackIntervalRef.current);
      fallbackIntervalRef.current = null;
    }

    setIsTracking(false);
    setPnlData(null);
    setError(null);
  }, []);

  /**
   * Start tracking (worker or fallback)
   */
  const startTracking = useCallback(() => {
    if (!trade || trade.status !== 'OPEN' || !enabled) return;

    if (isWorkerSupported) {
      startWorkerTracking();
    } else {
      // Fallback to interval polling
      console.log('[PnL] Using fallback polling (Worker not supported)');
      fallbackIntervalRef.current = setInterval(pollPnL, pollInterval);
      setIsTracking(true);
    }
  }, [trade, enabled, isWorkerSupported, startWorkerTracking, pollPnL, pollInterval]);

  /**
   * Effect: Start/stop tracking based on trade status
   */
  useEffect(() => {
    if (trade && trade.status === 'OPEN' && enabled) {
      startTracking();
    } else {
      stopTracking();
    }

    // Cleanup on unmount
    return () => {
      stopTracking();
    };
  }, [trade, enabled, startTracking, stopTracking]);

  /**
   * Manual refresh
   */
  const refresh = useCallback(() => {
    if (workerRef.current && trade && trade.status === 'OPEN') {
      // Ping worker to trigger immediate update
      workerRef.current.postMessage({ type: 'ping' });
    } else if (fallbackIntervalRef.current) {
      pollPnL();
    }
  }, [trade, pollPnL]);

  return {
    pnlData,
    isTracking,
    error,
    refresh,
    startTracking,
    stopTracking
  };
}
