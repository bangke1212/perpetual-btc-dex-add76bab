import { useState, useEffect, useRef } from 'react';

export interface PriceData {
  price: number;
  change24h: number;
  changePct24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  fundingRate: number;
  openInterest: number;
  direction: 'up' | 'down' | 'same';
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

const BASE_PRICE = 67_450;

function randBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function generateCandles(count: number, startPrice: number): Candle[] {
  const candles: Candle[] = [];
  let price = startPrice;
  const now = Date.now();
  for (let i = count; i >= 0; i--) {
    const open = price;
    const change = randBetween(-0.008, 0.009) * price;
    const close = open + change;
    const high = Math.max(open, close) + randBetween(0, 0.003) * price;
    const low = Math.min(open, close) - randBetween(0, 0.003) * price;
    const volume = randBetween(800, 3000);
    candles.push({
      time: now - i * 60_000,
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
      volume: +volume.toFixed(2),
    });
    price = close;
  }
  return candles;
}

export function useBtcPrice() {
  const [priceData, setPriceData] = useState<PriceData>({
    price: BASE_PRICE,
    change24h: 1_280,
    changePct24h: 1.93,
    high24h: 68_900,
    low24h: 65_800,
    volume24h: 2_847_000_000,
    fundingRate: 0.0112,
    openInterest: 14_230_000_000,
    direction: 'same',
  });

  const [candles, setCandles] = useState<Candle[]>(() => generateCandles(80, BASE_PRICE));
  const prevPrice = useRef(BASE_PRICE);

  useEffect(() => {
    const interval = setInterval(() => {
      setPriceData((prev) => {
        const drift = randBetween(-0.0018, 0.0019) * prev.price;
        const newPrice = +(prev.price + drift).toFixed(2);
        const direction = newPrice > prevPrice.current ? 'up' : newPrice < prevPrice.current ? 'down' : 'same';
        prevPrice.current = newPrice;

        // update last candle or create new one every ~30 ticks
        setCandles((c) => {
          const last = c[c.length - 1];
          const now = Date.now();
          if (now - last.time < 60_000) {
            const updated = {
              ...last,
              close: newPrice,
              high: Math.max(last.high, newPrice),
              low: Math.min(last.low, newPrice),
              volume: last.volume + randBetween(10, 80),
            };
            return [...c.slice(0, -1), updated];
          } else {
            const newCandle: Candle = {
              time: now,
              open: last.close,
              high: Math.max(last.close, newPrice),
              low: Math.min(last.close, newPrice),
              close: newPrice,
              volume: randBetween(100, 400),
            };
            return [...c.slice(1), newCandle];
          }
        });

        return {
          ...prev,
          price: newPrice,
          change24h: +(newPrice - (BASE_PRICE - 1_280)).toFixed(2),
          changePct24h: +(((newPrice - (BASE_PRICE - 1_280)) / (BASE_PRICE - 1_280)) * 100).toFixed(2),
          high24h: Math.max(prev.high24h, newPrice),
          low24h: Math.min(prev.low24h, newPrice),
          volume24h: prev.volume24h + randBetween(10_000, 100_000),
          fundingRate: +(prev.fundingRate + randBetween(-0.0002, 0.0002)).toFixed(4),
          direction,
        };
      });
    }, 600);

    return () => clearInterval(interval);
  }, []);

  return { priceData, candles };
}
