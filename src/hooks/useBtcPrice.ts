import { useState, useEffect, useRef } from 'react';
import {
  subscribePrice,
  subscribeKlines,
  subscribeStatus,
  disconnect,
  type PriceData,
  type Candle,
  type Timeframe,
} from '../services/binanceWs';

export type { PriceData, Candle, Timeframe };

const EMPTY_PRICE: PriceData = {
  price: 0,
  change24h: 0,
  changePct24h: 0,
  high24h: 0,
  low24h: 0,
  volume24h: 0,
  fundingRate: 0,
  openInterest: 0,
  direction: 'same',
};

export function useBtcPrice(timeframe: Timeframe = '1m') {
  const [priceData, setPriceData] = useState<PriceData>(EMPTY_PRICE);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Track whether we've received first data
  const hasReceivedPrice = useRef(false);
  const hasReceivedCandles = useRef(false);

  // ─── Connection status ──────────────────────────────────────────────────
  useEffect(() => {
    const unsub = subscribeStatus((connected) => {
      setIsConnected(connected);
    });
    return unsub;
  }, []);

  // ─── Real-time price ────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = subscribePrice((data) => {
      hasReceivedPrice.current = true;
      setPriceData(data);
      // Stop loading once we have both price and candles
      if (hasReceivedCandles.current) {
        setIsLoading(false);
      }
    });

    // Timeout: if no data after 8s, stop loading anyway
    const timeout = setTimeout(() => {
      if (!hasReceivedPrice.current) {
        setIsLoading(false);
      }
    }, 8000);

    return () => {
      unsub();
      clearTimeout(timeout);
    };
  }, []);

  // ─── Klines for active timeframe ────────────────────────────────────────
  useEffect(() => {
    hasReceivedCandles.current = false;
    setIsLoading(true);
    setCandles([]);

    const unsub = subscribeKlines(timeframe, (newCandles) => {
      hasReceivedCandles.current = true;
      setCandles(newCandles);
      if (hasReceivedPrice.current) {
        setIsLoading(false);
      }
    });

    // Timeout fallback
    const timeout = setTimeout(() => {
      if (!hasReceivedCandles.current) {
        setIsLoading(false);
      }
    }, 12000);

    return () => {
      unsub();
      clearTimeout(timeout);
    };
  }, [timeframe]);

  // ─── Cleanup on unmount ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    priceData,
    candles,
    isConnected,
    isLoading,
  };
}
