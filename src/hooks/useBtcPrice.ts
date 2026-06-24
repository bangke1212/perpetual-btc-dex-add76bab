import { useState, useEffect, useRef } from 'react';
import {
  subscribePrice,
  subscribeKlines,
  destroy,
  type PriceData,
  type Candle,
  type Timeframe,
  type CoinSymbol,
} from '../services/binanceData';

export type { PriceData, Candle, Timeframe, CoinSymbol };

const EMPTY: PriceData = {
  symbol: 'BTC/USDT',
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

export function useCoinPrice(symbol: CoinSymbol, timeframe: Timeframe = '1m') {
  const [priceData, setPriceData] = useState<PriceData>({ ...EMPTY, symbol });
  const [candles, setCandles] = useState<Candle[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const hasPrice = useRef(false);
  const hasCandles = useRef(false);
  const tPrice = useRef<ReturnType<typeof setTimeout>>();
  const tCandles = useRef<ReturnType<typeof setTimeout>>();

  // ─── Price ──────────────────────────────────────────────────────────────
  useEffect(() => {
    hasPrice.current = false;

    const unsub = subscribePrice(symbol, (data) => {
      if (!hasPrice.current) {
        hasPrice.current = true;
        setIsConnected(true);
        if (hasCandles.current) setIsLoading(false);
        if (tPrice.current) clearTimeout(tPrice.current);
      }
      setPriceData(data);
    });

    tPrice.current = setTimeout(() => {
      if (!hasPrice.current) {
        hasPrice.current = true;
        setIsLoading(false);
      }
    }, 3000);

    return () => {
      unsub();
      if (tPrice.current) clearTimeout(tPrice.current);
    };
  }, [symbol]);

  // ─── Klines ─────────────────────────────────────────────────────────────
  useEffect(() => {
    hasCandles.current = false;
    setIsLoading(true);
    setCandles([]);

    const unsub = subscribeKlines(symbol, timeframe, (newCandles) => {
      if (!hasCandles.current) {
        hasCandles.current = true;
        if (hasPrice.current) setIsLoading(false);
        if (tCandles.current) clearTimeout(tCandles.current);
      }
      setCandles(newCandles);
    });

    tCandles.current = setTimeout(() => {
      if (!hasCandles.current) {
        hasCandles.current = true;
        setIsLoading(false);
      }
    }, 3000);

    return () => {
      unsub();
      if (tCandles.current) clearTimeout(tCandles.current);
    };
  }, [symbol, timeframe]);

  // ─── Cleanup ────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => { destroy(); };
  }, []);

  return { priceData, candles, isConnected, isLoading };
}
