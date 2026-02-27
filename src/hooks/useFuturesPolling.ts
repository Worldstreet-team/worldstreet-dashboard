import { useEffect, useRef, useCallback, useState } from 'react';

interface PollingConfig {
  interval: number;
  enabled: boolean;
  onPoll: () => Promise<void>;
  dependencies?: any[];
}

interface PostActionPollingConfig {
  checkCondition: () => Promise<boolean>;
  onSuccess?: () => void;
  onTimeout?: () => void;
  maxAttempts?: number;
  interval?: number;
}

/**
 * Centralized polling hook for futures trading data
 * Prevents overlapping requests and manages cleanup
 */
export function useFuturesPolling(config: PollingConfig) {
  const { interval, enabled, onPoll, dependencies = [] } = config;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);
  const mountedRef = useRef(true);

  const poll = useCallback(async () => {
    // Prevent overlapping requests
    if (isPollingRef.current || !mountedRef.current) return;

    isPollingRef.current = true;
    try {
      await onPoll();
    } catch (error) {
      console.error('[Polling] Error:', error);
    } finally {
      isPollingRef.current = false;
    }
  }, [onPoll]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) return;

    // Initial poll
    poll();

    // Set up interval
    intervalRef.current = setInterval(poll, interval);
  }, [poll, interval]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Start/stop based on enabled flag
  useEffect(() => {
    if (enabled) {
      startPolling();
    } else {
      stopPolling();
    }

    return stopPolling;
  }, [enabled, startPolling, stopPolling, ...dependencies]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      stopPolling();
    };
  }, [stopPolling]);

  return { poll, startPolling, stopPolling };
}

/**
 * Post-action polling hook
 * Polls rapidly after an action until condition is met or timeout
 */
export function usePostActionPolling() {
  const [isPolling, setIsPolling] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const startPostActionPolling = useCallback(async (config: PostActionPollingConfig) => {
    const {
      checkCondition,
      onSuccess,
      onTimeout,
      maxAttempts = 20, // 20 attempts = 20 seconds with 1s interval
      interval = 1000, // 1 second
    } = config;

    setIsPolling(true);
    setAttempts(0);

    const poll = async (attemptCount: number) => {
      if (!mountedRef.current) return;

      try {
        const conditionMet = await checkCondition();

        if (conditionMet) {
          setIsPolling(false);
          setAttempts(0);
          onSuccess?.();
          return;
        }

        if (attemptCount >= maxAttempts) {
          setIsPolling(false);
          setAttempts(0);
          onTimeout?.();
          return;
        }

        setAttempts(attemptCount + 1);
        timeoutRef.current = setTimeout(() => poll(attemptCount + 1), interval);
      } catch (error) {
        console.error('[Post-Action Polling] Error:', error);
        setIsPolling(false);
        setAttempts(0);
      }
    };

    poll(0);
  }, []);

  const stopPostActionPolling = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsPolling(false);
    setAttempts(0);
  }, []);

  return {
    isPolling,
    attempts,
    startPostActionPolling,
    stopPostActionPolling,
  };
}

/**
 * Debounced value hook
 * Prevents excessive API calls during rapid input changes
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
