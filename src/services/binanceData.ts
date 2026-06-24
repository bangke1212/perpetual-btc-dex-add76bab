/**
 * binanceData.ts — BTC/USDT market data
 * Currently returns realistic simulated data so chart renders immediately.
 * Swap to Binance REST/WS later when CORS is resolved.
 */

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean;
}

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

type PriceCallback = (data: PriceData) => void;
type KlineCallback = (candles: Candle[]) => void;

// ─── Seeded random ──────────────────────────────────────────────────────────
let seed = 42;
function rand(min: number, max: number) {
  seed = (seed * 16807 + 0) % 2147483647;
  return min + (seed / 2147483647) * (max - min);
}

// ─── Realistic BTC price ────────────────────────────────────────────────────
// Wanders around the base price with mean-reverting random walk
const BASE = 87_450;
let price = BASE;
let prevPrice = BASE;

function nextPrice(): PriceData {
  const drift = rand(-1, 1) * rand(10, 60); // small random walk
  price += drift;

  // mean revert
  if (price > BASE * 1.03) price -= rand(5, 25);
  if (price < BASE * 0.97) price += rand(5, 25);
  price = Math.round(price * 100) / 100;

  const dir: 'up' | 'down' | 'same' =
    price > prevPrice ? 'up' : price < prevPrice ? 'down' : 'same';
  prevPrice = price;

  const change24h = price - BASE + 1280;
  const changePct24h = (change24h / (BASE - 1280)) * 100;

  return {
    price,
    change24h: Math.round(change24h * 100) / 100,
    changePct24h: Math.round(changePct24h * 100) / 100,
    high24h: Math.round(Math.max(price + rand(200, 1200), BASE + 1500) * 100) / 100,
    low24h: Math.round(Math.min(price - rand(200, 1200), BASE - 800) * 100) / 100,
    volume24h: Math.round(rand(18_000_000_000, 35_000_000_000)),
    fundingRate: Math.round(rand(-0.03, 0.05) * 10000) / 10000,
    openInterest: Math.round(rand(11_000_000_000, 18_000_000_000)),
    direction: dir,
  };
}

// ─── Candle generators per timeframe ────────────────────────────────────────
const TF_MINUTES: Record<Timeframe, number> = {
  '1m': 1, '5m': 5, '15m': 15, '1h': 60, '4h': 240, '1d': 1440,
};

function generateCandles(tf: Timeframe, count = 100): Candle[] {
  const candles: Candle[] = [];
  const mins = TF_MINUTES[tf];
  const now = Date.now();
  let open = price - rand(300, 800) * (Math.random() > 0.5 ? 1 : -1);

  for (let i = count; i >= 0; i--) {
    const close = open + rand(-0.002, 0.0025) * open;
    const high = Math.max(open, close) + rand(0, 0.001) * open;
    const low = Math.min(open, close) - rand(0, 0.001) * open;
    candles.push({
      time: now - i * mins * 60_000,
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume: rand(400, 3000),
      isClosed: i < count,
    });
    open = close;
  }

  return candles;
}

// ─── State ──────────────────────────────────────────────────────────────────
const priceCbs = new Set<PriceCallback>();
const klineCbs = new Map<Timeframe, KlineCallback>();
const candleBufs = new Map<Timeframe, Candle[]>();

let priceTimer: ReturnType<typeof setInterval> | null = null;
let klineTimer: ReturnType<typeof setInterval> | null = null;
let destroyed = false;

// ─── Public API ─────────────────────────────────────────────────────────────

export function subscribePrice(cb: PriceCallback): () => void {
  priceCbs.add(cb);
  start();
  return () => priceCbs.delete(cb);
}

export function subscribeKlines(tf: Timeframe, cb: KlineCallback): () => void {
  klineCbs.set(tf, cb);
  start();
  return () => { klineCbs.delete(tf); };
}

export function destroy() {
  destroyed = true;
  if (priceTimer) { clearInterval(priceTimer); priceTimer = null; }
  if (klineTimer) { clearInterval(klineTimer); klineTimer = null; }
  priceCbs.clear();
  klineCbs.clear();
  candleBufs.clear();
}

// ─── Start ──────────────────────────────────────────────────────────────────

let started = false;
function start() {
  if (started || destroyed) return;
  started = true;

  // Send initial data immediately
  const pd = nextPrice();
  for (const cb of priceCbs) try { cb(pd); } catch (_) {}

  // Regenerate klines every 2 seconds
  priceTimer = setInterval(() => {
    if (destroyed) return;
    const pd = nextPrice();
    for (const cb of priceCbs) try { cb(pd); } catch (_) {}

    // Update klines
    for (const [tf, cb] of klineCbs) {
      const candles = generateCandles(tf);
      candleBufs.set(tf, candles);
      try { cb(candles); } catch (_) {}
    }
  }, 2000);
}
