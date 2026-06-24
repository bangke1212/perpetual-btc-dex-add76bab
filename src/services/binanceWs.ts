/**
 * Binance WebSocket Service — Real-time BTC/USDT market data
 * 
 * Provides:
 * - Real-time price ticker (mark price, 24h stats)
 * - Real-time kline/candlestick data for multiple timeframes
 * 
 * Binance public WebSocket — no API key required
 */

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export interface Candle {
  time: number;    // Open timestamp (ms)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isClosed: boolean; // true = candle sudah final, false = masih live
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

// Binance WebSocket endpoints
const WS_BASE = 'wss://stream.binance.com:9443/ws';
const REST_BASE = 'https://api.binance.com/api/v3';

// Interval mapping
const INTERVAL_MAP: Record<Timeframe, string> = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
};

let globalWs: WebSocket | null = null;
let isConnected = false;
const priceCallbacks: Set<PriceCallback> = new Set();
const klineCallbacks: Map<Timeframe, KlineCallback> = new Map();
const klineStreams: Map<Timeframe, string> = new Map();
const candleBuffers: Map<Timeframe, Candle[]> = new Map();

// Track last price direction
let lastPrice = 0;

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Subscribe to real-time price updates (24hr ticker + mark price)
 */
export function subscribePrice(cb: PriceCallback): () => void {
  priceCallbacks.add(cb);
  ensureConnection();
  return () => priceCallbacks.delete(cb);
}

/**
 * Subscribe to real-time kline/candlestick data for a given timeframe.
 * Returns the initial candle history via REST, then streams live updates.
 */
export function subscribeKlines(
  timeframe: Timeframe,
  cb: KlineCallback,
  limit: number = 100,
): () => void {
  klineCallbacks.set(timeframe, cb);
  candleBuffers.set(timeframe, []);

  // Fetch initial candle history
  fetchHistoricalKlines(timeframe, limit).then((candles) => {
    if (klineCallbacks.get(timeframe) === cb) {
      cb(candles);
    }
  });

  const streamName = `btcusdt@kline_${INTERVAL_MAP[timeframe]}`;
  klineStreams.set(timeframe, streamName);
  ensureConnection();

  return () => {
    klineCallbacks.delete(timeframe);
    klineStreams.delete(timeframe);
    candleBuffers.delete(timeframe);
    // Re-subscribe with updated streams
    subscribeToStreams();
  };
}

// ─── Connection Management ─────────────────────────────────────────────────

function ensureConnection() {
  if (globalWs && (globalWs.readyState === WebSocket.OPEN || globalWs.readyState === WebSocket.CONNECTING)) {
    // Update streams if already connected
    subscribeToStreams();
    return;
  }
  connect();
}

function connect() {
  if (globalWs) {
    try { globalWs.close(); } catch (_) { /* ignore */ }
  }

  globalWs = new WebSocket(WS_BASE);

  globalWs.onopen = () => {
    isConnected = true;
    subscribeToStreams();
  };

  globalWs.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      handleMessage(msg);
    } catch (_) { /* ignore malformed */ }
  };

  globalWs.onclose = () => {
    isConnected = false;
    // Reconnect after 2s
    setTimeout(connect, 2000);
  };

  globalWs.onerror = () => {
    globalWs?.close();
  };
}

function subscribeToStreams() {
  if (!globalWs || globalWs.readyState !== WebSocket.OPEN) return;

  const streams: string[] = [];

  // Always include ticker
  if (priceCallbacks.size > 0) {
    streams.push('btcusdt@ticker');
  }

  // Include all kline streams
  for (const streamName of klineStreams.values()) {
    if (!streams.includes(streamName)) {
      streams.push(streamName);
    }
  }

  if (streams.length === 0) return;

  const subMsg = JSON.stringify({
    method: 'SUBSCRIBE',
    params: streams,
    id: Date.now(),
  });

  globalWs.send(subMsg);
}

// ─── Message Handler ───────────────────────────────────────────────────────

function handleMessage(msg: any) {
  // Ignore subscription confirmations
  if (msg.result === null && msg.id) return;

  const stream = msg.stream || msg.e;

  // 24hr ticker
  if (stream === 'btcusdt@ticker' || msg.e === '24hrTicker') {
    handleTicker(msg);
  }

  // Kline
  if (stream?.startsWith('btcusdt@kline_') || msg.e === 'kline') {
    handleKline(msg);
  }
}

function handleTicker(msg: any) {
  const price = parseFloat(msg.c || msg.currentClose || 0);
  if (price === 0) return;

  // Determine direction
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
    fundingRate: 0,    // Binance ticker doesn't include funding rate
    openInterest: 0,    // Binance ticker doesn't include open interest
    direction,
  };

  for (const cb of priceCallbacks) {
    try { cb(data); } catch (_) { /* ignore */ }
  }
}

function handleKline(msg: any) {
  const k = msg.k || msg;
  const interval = k.i || '';
  const isFinal = k.x !== undefined ? k.x : true;

  // Find matching timeframe
  let timeframe: Timeframe | null = null;
  for (const [tf, streamName] of klineStreams.entries()) {
    if (streamName.endsWith(`kline_${interval}`)) {
      timeframe = tf;
      break;
    }
  }
  if (!timeframe) return;

  const candle: Candle = {
    time: k.t || k.startTime || Date.now(),
    open: parseFloat(k.o || k.open || 0),
    high: parseFloat(k.h || k.high || 0),
    low: parseFloat(k.l || k.low || 0),
    close: parseFloat(k.c || k.close || 0),
    volume: parseFloat(k.v || k.volume || 0),
    isClosed: isFinal,
  };

  const buffer = candleBuffers.get(timeframe) || [];
  
  // Update or append
  const idx = buffer.findIndex((c) => c.time === candle.time);
  if (idx >= 0) {
    buffer[idx] = candle;
  } else {
    buffer.push(candle);
    // Keep buffer size reasonable
    while (buffer.length > 200) buffer.shift();
  }

  candleBuffers.set(timeframe, buffer);

  const cb = klineCallbacks.get(timeframe);
  if (cb) {
    try { cb([...buffer]); } catch (_) { /* ignore */ }
  }
}

// ─── REST: Fetch Historical Klines ─────────────────────────────────────────

async function fetchHistoricalKlines(
  timeframe: Timeframe,
  limit: number = 100,
): Promise<Candle[]> {
  try {
    const interval = INTERVAL_MAP[timeframe];
    const url = `${REST_BASE}/klines?symbol=BTCUSDT&interval=${interval}&limit=${Math.min(limit, 500)}`;
    
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    
    const raw: any[] = await res.json();
    
    const candles: Candle[] = raw.map((k) => ({
      time: k[0],        // Open time
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
      isClosed: true,     // Historical candles are always closed
    }));

    // Initialize buffer
    const existing = candleBuffers.get(timeframe);
    if (existing) {
      // Merge: keep historical + any newer live ones
      const historicalTimes = new Set(candles.map((c) => c.time));
      const newerLive = existing.filter((c) => !historicalTimes.has(c.time));
      const merged = [...candles, ...newerLive].sort((a, b) => a.time - b.time);
      candleBuffers.set(timeframe, merged);
      return merged;
    }

    candleBuffers.set(timeframe, candles);
    return candles;
  } catch (err) {
    console.error(`[binanceWs] Failed to fetch historical klines:`, err);
    return [];
  }
}

// ─── Cleanup ───────────────────────────────────────────────────────────────

export function disconnect() {
  if (globalWs) {
    try { globalWs.close(); } catch (_) { /* ignore */ }
    globalWs = null;
  }
  isConnected = false;
  priceCallbacks.clear();
  klineCallbacks.clear();
  klineStreams.clear();
  candleBuffers.clear();
}
