/**
 * useBtcPrice — Real-time BTC/USDT price & candle hook
 * 
 * Powered by Binance public WebSocket & REST API.
 * No API key required.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  subscribePrice,
  subscribeKlines,
  disconnect,
  type PriceData,
  type Candle,
  type Timeframe,
} from '../services/binanceWs';

export type { PriceData, Candle, Timeframe };

// Fallback data while connecting
const FALLBACK_PRICE: PriceData = {
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
  const [priceData, setPriceData] = useState<PriceData>(FALLBACK_PRICE);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const prevPrice = useRef(0);

  // ─── Subscribe to real-time price ──────────────────────────────────────
  useEffect(() => {
    const unsub = subscribePrice((data) => {
      setIsConnected(true);
      setIsLoading(false);
      prevPrice.current = data.price;
      setPriceData(data);
    });

    return unsub;
  }, []);

  // ─── Subscribe to klines for the active timeframe ──────────────────────
  useEffect(() => {
    setIsLoading(true);
    setCandles([]);

    const unsub = subscribeKlines(timeframe, (newCandles) => {
      setIsLoading(false);
      setCandles(newCandles);
    });

    return unsub;
  }, [timeframe]);

  // ─── Cleanup on unmount ────────────────────────────────────────────────
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
