import { useState, useEffect } from 'react';

export interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

export interface OrderBook {
  asks: OrderBookEntry[];
  bids: OrderBookEntry[];
}

function generateOrders(basePrice: number, side: 'ask' | 'bid', count = 14): OrderBookEntry[] {
  const entries: OrderBookEntry[] = [];
  let total = 0;
  for (let i = 0; i < count; i++) {
    const spread = side === 'ask' ? 1 + i : -(1 + i);
    const price = +(basePrice + spread * (2 + Math.random() * 3)).toFixed(2);
    const size = +(Math.random() * 3.8 + 0.05).toFixed(4);
    total += size;
    entries.push({ price, size, total: +total.toFixed(4) });
  }
  return side === 'ask' ? entries.reverse() : entries;
}

export function useOrderBook(currentPrice: number) {
  const [book, setBook] = useState<OrderBook>(() => ({
    asks: generateOrders(currentPrice, 'ask'),
    bids: generateOrders(currentPrice, 'bid'),
  }));

  useEffect(() => {
    const interval = setInterval(() => {
      setBook({
        asks: generateOrders(currentPrice, 'ask'),
        bids: generateOrders(currentPrice, 'bid'),
      });
    }, 400);
    return () => clearInterval(interval);
  }, [currentPrice]);

  return book;
}
