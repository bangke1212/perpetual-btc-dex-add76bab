/**
 * binanceData.ts — Multi-coin market data (BTC, SOL, ETH)
 * Returns realistic simulated data so chart renders immediately.
 */

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';
export type CoinSymbol = 'BTC/USDT' | 'SOL/USDT' | 'ETH/USDT';

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
  symbol: CoinSymbol;
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

// ─── Coin configs ───────────────────────────────────────────────────────────
interface CoinConfig {
  symbol: CoinSymbol;
  base: number;
  precision: number;    // decimal places for price
  volScale: number;     // 24h volume scale
  oiScale: number;      // open interest scale
}

const COINS: Record<CoinSymbol, CoinConfig> = {
  'BTC/USDT': { symbol: 'BTC/USDT', base: 62_000, precision: 2, volScale: 25_000_000_000, oiScale: 15_000_000_000 },
  'SOL/USDT': { symbol: 'SOL/USDT', base: 67,     precision: 2, volScale: 2_500_000_000,  oiScale: 1_500_000_000 },
  'ETH/USDT': { symbol: 'ETH/USDT', base: 1_600,   precision: 2, volScale: 12_000_000_000, oiScale: 8_000_000_000 },
};

// ─── Seeded random ──────────────────────────────────────────────────────────
let seed = 42;
function rand(min: number, max: number) {
  seed = (seed * 16807 + 0) % 2147483647;
  return min + (seed / 2147483647) * (max - min);
}

// ─── Per-coin state ─────────────────────────────────────────────────────────
interface CoinState {
  config: CoinConfig;
  price: number;
  prevPrice: number;
}

const states = new Map<CoinSymbol, CoinState>();

function getState(sym: CoinSymbol): CoinState {
  let s = states.get(sym);
  if (!s) {
    const c = COINS[sym];
    s = { config: c, price: c.base, prevPrice: c.base };
    states.set(sym, s);
  }
  return s;
}

// ─── Price generator ────────────────────────────────────────────────────────
function nextPrice(sym: CoinSymbol): PriceData {
  const st = getState(sym);
  const { base, precision, volScale, oiScale } = st.config;

  const pctDrift = rand(-1, 1) * rand(0.0001, 0.0012);
  st.price += st.price * pctDrift;

  // mean revert
  if (st.price > base * 1.03) st.price -= st.price * rand(0.0001, 0.0005);
  if (st.price < base * 0.97) st.price += st.price * rand(0.0001, 0.0005);

  st.price = Math.round(st.price * Math.pow(10, precision)) / Math.pow(10, precision);
  if (st.price <= 0) st.price = base;

  const dir: 'up' | 'down' | 'same' =
    st.price > st.prevPrice ? 'up' : st.price < st.prevPrice ? 'down' : 'same';
  st.prevPrice = st.price;

  const change24h = st.price - base + (base * 0.008);
  const changePct24h = (change24h / (base * 0.992)) * 100;

  const priceRange = base * 0.0015;

  return {
    symbol: sym,
    price: st.price,
    change24h: Math.round(change24h * 100) / 100,
    changePct24h: Math.round(changePct24h * 100) / 100,
    high24h: Math.round(Math.max(st.price + rand(0, priceRange), base * 1.015) * 100) / 100,
    low24h: Math.round(Math.min(st.price - rand(0, priceRange), base * 0.985) * 100) / 100,
    volume24h: Math.round(rand(volScale * 0.7, volScale * 1.4)),
    fundingRate: Math.round(rand(-0.03, 0.05) * 10000) / 10000,
    openInterest: Math.round(rand(oiScale * 0.7, oiScale * 1.3)),
    direction: dir,
  };
}

// ─── Candle generator ───────────────────────────────────────────────────────
const TF_MINUTES: Record<Timeframe, number> = {
  '1m': 1, '5m': 5, '15m': 15, '1h': 60, '4h': 240, '1d': 1440,
};

function generateCandles(sym: CoinSymbol, tf: Timeframe, count = 100): Candle[] {
  const st = getState(sym);
  const candles: Candle[] = [];
  const mins = TF_MINUTES[tf];
  const now = Date.now();
  let open = st.price - st.price * rand(0.003, 0.01) * (Math.random() > 0.5 ? 1 : -1);

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
const priceCbs = new Map<CoinSymbol, Set<PriceCallback>>();
const klineCbs = new Map<CoinSymbol, Map<Timeframe, KlineCallback>>();
const candleBufs = new Map<string, Candle[]>();

let priceTimer: ReturnType<typeof setInterval> | null = null;
let destroyed = false;

function getPriceCbs(sym: CoinSymbol): Set<PriceCallback> {
  let s = priceCbs.get(sym);
  if (!s) { s = new Set(); priceCbs.set(sym, s); }
  return s;
}

function getKlineCbs(sym: CoinSymbol): Map<Timeframe, KlineCallback> {
  let m = klineCbs.get(sym);
  if (!m) { m = new Map(); klineCbs.set(sym, m); }
  return m;
}

function bufKey(sym: CoinSymbol, tf: Timeframe) { return `${sym}::${tf}`; }

// ─── Public API ─────────────────────────────────────────────────────────────

export function subscribePrice(sym: CoinSymbol, cb: PriceCallback): () => void {
  getPriceCbs(sym).add(cb);
  start();
  return () => getPriceCbs(sym).delete(cb);
}

export function subscribeKlines(sym: CoinSymbol, tf: Timeframe, cb: KlineCallback): () => void {
  getKlineCbs(sym).set(tf, cb);
  start();
  return () => { getKlineCbs(sym).delete(tf); };
}

export function destroy() {
  destroyed = true;
  if (priceTimer) { clearInterval(priceTimer); priceTimer = null; }
  priceCbs.clear();
  klineCbs.clear();
  candleBufs.clear();
}

// ─── Start ──────────────────────────────────────────────────────────────────

let started = false;
function start() {
  if (started || destroyed) return;
  started = true;

  // Send initial
  for (const sym of Object.keys(COINS) as CoinSymbol[]) {
    const pd = nextPrice(sym);
    for (const cb of getPriceCbs(sym)) try { cb(pd); } catch (_) {}
  }

  priceTimer = setInterval(() => {
    if (destroyed) return;

    for (const sym of Object.keys(COINS) as CoinSymbol[]) {
      const pd = nextPrice(sym);
      for (const cb of getPriceCbs(sym)) try { cb(pd); } catch (_) {}

      for (const [tf, cb] of getKlineCbs(sym)) {
        const candles = generateCandles(sym, tf);
        candleBufs.set(bufKey(sym, tf), candles);
        try { cb(candles); } catch (_) {}
      }
    }
  }, 2000);
}
