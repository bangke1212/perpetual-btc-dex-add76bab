/**
 * binanceWs.ts — Real-time BTC/USDT market data from Binance
 * 
 * Strategy:
 * 1. Try WebSocket first (fast, real-time)
 * 2. Fallback to REST polling if WS fails
 * 3. Auto-reconnect on WS disconnect
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
type StatusCallback = (connected: boolean) => void;

const WS_BASE = 'wss://stream.binance.com:9443/ws';
const REST_BASE = 'https://api.binance.com/api/v3';

const INTERVAL_MAP: Record<Timeframe, string> = {
  '1m': '1m', '5m': '5m', '15m': '15m',
  '1h': '1h', '4h': '4h', '1d': '1d',
};

// ─── State ──────────────────────────────────────────────────────────────────
let ws: WebSocket | null = null;
let wsConnected = false;
let usingFallback = false;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let fallbackTimer: ReturnType<typeof setInterval> | null = null;

const priceCbs = new Set<PriceCallback>();
const klineCbs = new Map<Timeframe, KlineCallback>();
const statusCbs = new Set<StatusCallback>();
const candleBuffers = new Map<Timeframe, Candle[]>();
const subscribedKlineTimeframes = new Set<Timeframe>();

let lastPrice = 0;
let lastPriceData: PriceData | null = null;

// ─── Public API ────────────────────────────────────────────────────────────

export function subscribePrice(cb: PriceCallback): () => void {
  priceCbs.add(cb);
  // Immediately send last known data if available
  if (lastPriceData) cb(lastPriceData);
  ensureConnection();
  return () => priceCbs.delete(cb);
}

export function subscribeKlines(
  timeframe: Timeframe,
  cb: KlineCallback,
  limit = 100,
): () => void {
  klineCbs.set(timeframe, cb);
  subscribedKlineTimeframes.add(timeframe);

  // Initialize buffer if needed
  if (!candleBuffers.has(timeframe)) {
    candleBuffers.set(timeframe, []);
  }

  // Fetch initial history
  fetchHistory(timeframe, limit).then((candles) => {
    if (klineCbs.get(timeframe) === cb) {
      const buffer = candleBuffers.get(timeframe) || [];
      const historicalTimes = new Set(candles.map((c) => c.time));
      const newerLive = buffer.filter((c) => !historicalTimes.has(c.time));
      const merged = [...candles, ...newerLive].sort((a, b) => a.time - b.time);
      candleBuffers.set(timeframe, merged);
      cb(merged);
    }
  });

  // Connect if needed (for live updates)
  ensureConnection();

  return () => {
    klineCbs.delete(timeframe);
    subscribedKlineTimeframes.delete(timeframe);
  };
}

export function subscribeStatus(cb: StatusCallback): () => void {
  statusCbs.add(cb);
  cb(wsConnected || usingFallback);
  return () => statusCbs.delete(cb);
}

export function disconnect() {
  if (ws) {
    try { ws.close(); } catch (_) { /* ignore */ }
    ws = null;
  }
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (fallbackTimer) { clearInterval(fallbackTimer); fallbackTimer = null; }
  wsConnected = false;
  usingFallback = false;
  notifyStatus();
}

// ─── Connection ─────────────────────────────────────────────────────────────

function ensureConnection() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    subscribeWsStreams();
    return;
  }
  connectWs();
}

function connectWs() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }

  try {
    ws = new WebSocket(WS_BASE);
  } catch (e) {
    // WebSocket not supported — fallback immediately
    startFallback();
    return;
  }

  ws.onopen = () => {
    wsConnected = true;
    usingFallback = false;
    if (fallbackTimer) { clearInterval(fallbackTimer); fallbackTimer = null; }
    subscribeWsStreams();
    notifyStatus();
  };

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      handleWsMessage(msg);
    } catch (_) { /* ignore */ }
  };

  ws.onclose = () => {
    wsConnected = false;
    if (!usingFallback) {
      startFallback();
    }
    notifyStatus();
    // Try reconnect after 3s
    reconnectTimer = setTimeout(connectWs, 3000);
  };

  ws.onerror = () => {
    // Will trigger onclose
  };
}

function subscribeWsStreams() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const streams: string[] = [];

  if (priceCbs.size > 0) {
    streams.push('btcusdt@ticker');
  }

  for (const tf of subscribedKlineTimeframes) {
    const stream = `btcusdt@kline_${INTERVAL_MAP[tf]}`;
    if (!streams.includes(stream)) streams.push(stream);
  }

  if (streams.length === 0) return;

  ws.send(JSON.stringify({
    method: 'SUBSCRIBE',
    params: streams,
    id: Date.now(),
  }));
}

// ─── REST Fallback ──────────────────────────────────────────────────────────

function startFallback() {
  if (usingFallback) return;
  usingFallback = true;
  notifyStatus();

  // Poll price every 2 seconds
  const poll = async () => {
    try {
      const res = await fetch(`${REST_BASE}/ticker/24hr?symbol=BTCUSDT`);
      if (!res.ok) return;
      const data = await res.json();

      const price = parseFloat(data.lastPrice);
      if (price <= 0) return;

      let direction: 'up' | 'down' | 'same' = 'same';
      if (lastPrice > 0) {
        direction = price > lastPrice ? 'up' : price < lastPrice ? 'down' : 'same';
      }
      lastPrice = price;

      const priceData: PriceData = {
        price,
        change24h: parseFloat(data.priceChange || 0),
        changePct24h: parseFloat(data.priceChangePercent || 0),
        high24h: parseFloat(data.highPrice || 0),
        low24h: parseFloat(data.lowPrice || 0),
        volume24h: parseFloat(data.quoteVolume || 0),
        fundingRate: 0,
        openInterest: 0,
        direction,
      };

      lastPriceData = priceData;

      for (const cb of priceCbs) {
        try { cb(priceData); } catch (_) { /* ignore */ }
      }
    } catch (_) { /* ignore network errors */ }
  };

  poll(); // immediate
  fallbackTimer = setInterval(poll, 2000);

  // Also poll klines every 5s for each subscribed timeframe
  const pollKlines = async () => {
    for (const tf of subscribedKlineTimeframes) {
      try {
        const interval = INTERVAL_MAP[tf];
        const res = await fetch(`${REST_BASE}/klines?symbol=BTCUSDT&interval=${interval}&limit=100`);
        if (!res.ok) continue;
        const raw: any[] = await res.json();
        const candles: Candle[] = raw.map((k: any[]) => ({
          time: k[0],
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
          isClosed: true,
        }));

        candleBuffers.set(tf, candles);
        const cb = klineCbs.get(tf);
        if (cb) cb(candles);
      } catch (_) { /* ignore */ }
    }
  };

  pollKlines();
  setInterval(pollKlines, 5000);
}

// ─── WebSocket Message Handler ──────────────────────────────────────────────

function handleWsMessage(msg: any) {
  if (msg.result === null && msg.id) return; // sub confirmation

  const stream = msg.stream || msg.e;

  if (stream === 'btcusdt@ticker' || msg.e === '24hrTicker') {
    handleTicker(msg);
  }

  if (stream?.startsWith('btcusdt@kline_') || msg.e === 'kline') {
    handleKline(msg);
  }
}

function handleTicker(msg: any) {
  const price = parseFloat(msg.c || msg.lastPrice || 0);
  if (price <= 0) return;

  let direction: 'up' | 'down' | 'same' = 'same';
  if (lastPrice > 0) {
    direction = price > lastPrice ? 'up' : price < lastPrice ? 'down' : 'same';
  }
  lastPrice = price;

  const data: PriceData = {
    price,
    change24h: parseFloat(msg.p || msg.priceChange || 0),
    changePct24h: parseFloat(msg.P || msg.priceChangePercent || 0),
    high24h: parseFloat(msg.h || msg.highPrice || 0),
    low24h: parseFloat(msg.l || msg.lowPrice || 0),
    volume24h: parseFloat(msg.q || msg.quoteVolume || msg.totalTradedQuoteAssetVolume || 0),
    fundingRate: 0,
    openInterest: 0,
    direction,
  };

  lastPriceData = data;

  for (const cb of priceCbs) {
    try { cb(data); } catch (_) { /* ignore */ }
  }
}

function handleKline(msg: any) {
  const k = msg.k || msg;
  const interval = k.i || '';
  const isFinal = k.x !== undefined ? k.x : true;

  let timeframe: Timeframe | null = null;
  for (const [tf, tfInterval] of Object.entries(INTERVAL_MAP)) {
    if (tfInterval === interval) {
      timeframe = tf as Timeframe;
      break;
    }
  }
  if (!timeframe) return;

  const candle: Candle = {
    time: k.t || Date.now(),
    open: parseFloat(k.o || 0),
    high: parseFloat(k.h || 0),
    low: parseFloat(k.l || 0),
    close: parseFloat(k.c || 0),
    volume: parseFloat(k.v || 0),
    isClosed: isFinal,
  };

  const buffer = candleBuffers.get(timeframe) || [];
  const idx = buffer.findIndex((c) => c.time === candle.time);
  if (idx >= 0) {
    buffer[idx] = candle;
  } else {
    buffer.push(candle);
    while (buffer.length > 200) buffer.shift();
  }

  candleBuffers.set(timeframe, buffer);

  const cb = klineCbs.get(timeframe);
  if (cb) {
    try { cb([...buffer]); } catch (_) { /* ignore */ }
  }
}

// ─── REST: Fetch Historical Klines ─────────────────────────────────────────

async function fetchHistory(
  timeframe: Timeframe,
  limit = 100,
): Promise<Candle[]> {
  try {
    const interval = INTERVAL_MAP[timeframe];
    const url = `${REST_BASE}/klines?symbol=BTCUSDT&interval=${interval}&limit=${Math.min(limit, 500)}`;
    const res = await fetch(url);
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
  } catch {
    return [];
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function notifyStatus() {
  for (const cb of statusCbs) {
    try { cb(wsConnected || usingFallback); } catch (_) { /* ignore */ }
  }
}
