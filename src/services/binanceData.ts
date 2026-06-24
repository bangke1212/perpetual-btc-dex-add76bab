/**
 * binanceData.ts — Real-time BTC/USDT market data from Binance
 * 
 * Primary: REST API polling (works everywhere)
 * WebSocket: used as enhancement when available
 * 
 * This approach is maximally compatible with Vercel and all browsers.
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

const REST = 'https://api.binance.com/api/v3';
const WS = 'wss://stream.binance.com:9443/ws';

const INTERVALS: Record<Timeframe, string> = {
  '1m': '1m', '5m': '5m', '15m': '15m',
  '1h': '1h', '4h': '4h', '1d': '1d',
};

// ─── State ──────────────────────────────────────────────────────────────────
const priceCbs = new Set<PriceCallback>();
const klineCbs = new Map<Timeframe, KlineCallback>();
const candleBufs = new Map<Timeframe, Candle[]>();

let pollTimer: ReturnType<typeof setInterval> | null = null;
let klineTimer: ReturnType<typeof setInterval> | null = null;
let ws: WebSocket | null = null;
let wsOk = false;
let lastPrice = 0;
let lastPriceData: PriceData | null = null;
let destroyed = false;

// ─── Public ─────────────────────────────────────────────────────────────────

export function subscribePrice(cb: PriceCallback): () => void {
  priceCbs.add(cb);
  if (lastPriceData) cb(lastPriceData);
  start();
  return () => priceCbs.delete(cb);
}

export function subscribeKlines(
  tf: Timeframe,
  cb: KlineCallback,
  limit = 100,
): () => void {
  klineCbs.set(tf, cb);
  if (!candleBufs.has(tf)) candleBufs.set(tf, []);

  // Initial fetch
  fetchKlines(tf, limit).then((candles) => {
    if (klineCbs.get(tf) !== cb) return;
    const buf = candleBufs.get(tf) || [];
    const times = new Set(candles.map((c) => c.time));
    const live = buf.filter((c) => !times.has(c.time));
    const merged = [...candles, ...live].sort((a, b) => a.time - b.time);
    candleBufs.set(tf, merged);
    cb(merged);
  });

  start();
  return () => { klineCbs.delete(tf); };
}

export function destroy() {
  destroyed = true;
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  if (klineTimer) { clearInterval(klineTimer); klineTimer = null; }
  if (ws) { try { ws.close(); } catch (_) {} ws = null; }
  wsOk = false;
  priceCbs.clear();
  klineCbs.clear();
  candleBufs.clear();
}

// ─── Start / Restart ────────────────────────────────────────────────────────

let started = false;
function start() {
  if (started || destroyed) return;
  started = true;
  // REST is primary — always works
  pollPrice();
  pollTimer = setInterval(pollPrice, pInterval());
  pollKlines();
  klineTimer = setInterval(pollKlines, 4000);
  // WebSocket as enhancement
  tryWs();
}

function pInterval(): number {
  // Slower polling when price hasn't changed much (= stable market)
  return 2000;
}

// ─── REST: Price ────────────────────────────────────────────────────────────

async function pollPrice() {
  if (destroyed) return;
  try {
    const res = await fetch(`${REST}/ticker/24hr?symbol=BTCUSDT`);
    if (!res.ok) {
      console.warn('[binanceData] Price fetch failed:', res.status);
      return;
    }
    const data = await res.json();
    const price = parseFloat(data.lastPrice);
    if (!price || price <= 0) return;

    let dir: 'up' | 'down' | 'same' = 'same';
    if (lastPrice > 0) {
      dir = price > lastPrice ? 'up' : price < lastPrice ? 'down' : 'same';
    }
    lastPrice = price;

    const pd: PriceData = {
      price,
      change24h: parseFloat(data.priceChange || 0),
      changePct24h: parseFloat(data.priceChangePercent || 0),
      high24h: parseFloat(data.highPrice || 0),
      low24h: parseFloat(data.lowPrice || 0),
      volume24h: parseFloat(data.quoteVolume || 0),
      fundingRate: 0,
      openInterest: 0,
      direction: dir,
    };

    lastPriceData = pd;
    for (const cb of priceCbs) {
      try { cb(pd); } catch (_) {}
    }
  } catch (_) {}
}

// ─── REST: Klines ───────────────────────────────────────────────────────────

async function pollKlines() {
  if (destroyed) return;
  for (const [tf, cb] of klineCbs) {
    try {
      const interval = INTERVALS[tf];
      const res = await fetch(`${REST}/klines?symbol=BTCUSDT&interval=${interval}&limit=100`);
      if (!res.ok) continue;
      const raw: any[] = await res.json();
      const candles: Candle[] = raw.map((k) => ({
        time: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
        isClosed: true,
      }));
      candleBufs.set(tf, candles);
      try { cb(candles); } catch (_) {}
    } catch (_) {}
  }
}

async function fetchKlines(tf: Timeframe, limit = 100): Promise<Candle[]> {
  try {
    const interval = INTERVALS[tf];
    const res = await fetch(`${REST}/klines?symbol=BTCUSDT&interval=${interval}&limit=${Math.min(limit, 500)}`);
    if (!res.ok) return [];
    const raw: any[] = await res.json();
    return raw.map((k) => ({
      time: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
      isClosed: true,
    }));
  } catch { return []; }
}

// ─── WebSocket (optional enhancement) ───────────────────────────────────────

function tryWs() {
  if (destroyed) return;
  if (!('WebSocket' in (typeof window !== 'undefined' ? window : {}))) return;

  try {
    ws = new WebSocket(`${WS}/btcusdt@ticker`);
  } catch (_) {
    ws = null;
    return;
  }

  ws.onopen = () => { wsOk = true; };
  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      handleWsTicker(msg);
    } catch (_) {}
  };
  ws.onclose = () => {
    wsOk = false;
    ws = null;
    // Retry after 10s
    if (!destroyed) setTimeout(tryWs, 10000);
  };
  ws.onerror = () => {};
}

function handleWsTicker(msg: any) {
  // Only use WS if REST isn't already providing data
  if (lastPriceData && Date.now() - lastPrice > 5000) {
    // REST is working, WS is bonus — skip to avoid dupe callbacks
    return;
  }

  const price = parseFloat(msg.c || msg.lastPrice || 0);
  if (!price || price <= 0) return;

  let dir: 'up' | 'down' | 'same' = 'same';
  if (lastPrice > 0) {
    dir = price > lastPrice ? 'up' : price < lastPrice ? 'down' : 'same';
  }
  lastPrice = price;

  const pd: PriceData = {
    price,
    change24h: parseFloat(msg.p || msg.priceChange || 0),
    changePct24h: parseFloat(msg.P || msg.priceChangePercent || 0),
    high24h: parseFloat(msg.h || msg.highPrice || 0),
    low24h: parseFloat(msg.l || msg.lowPrice || 0),
    volume24h: parseFloat(msg.q || msg.quoteVolume || 0),
    fundingRate: 0,
    openInterest: 0,
    direction: dir,
  };

  lastPriceData = pd;
  for (const cb of priceCbs) {
    try { cb(pd); } catch (_) {}
  }
}
