import { useRef, useEffect, useMemo } from 'react';
import { Candle, Timeframe } from '../hooks/useBtcPrice';

interface Props {
  candles: Candle[];
  currentPrice: number;
  timeframe: Timeframe;
  isLoading: boolean;
}

const TIMEFRAME_LABEL: Record<Timeframe, string> = {
  '1m': '1 min',
  '5m': '5 min',
  '15m': '15 min',
  '1h': '1 hour',
  '4h': '4 hour',
  '1d': '1 day',
};

export default function PriceChart({ candles, currentPrice, timeframe, isLoading }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Pre-compute y-axis range across candles + current price
  const yRange = useMemo(() => {
    if (candles.length === 0) return { lo: currentPrice - 100, hi: currentPrice + 100 };
    const prices = candles.flatMap((c) => [c.high, c.low, c.open, c.close]);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const pRange = maxP - minP || 1;
    const padP = pRange * 0.08;
    return { lo: minP - padP, hi: maxP + padP };
  }, [candles]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const PADDING_LEFT = 8;
    const PADDING_RIGHT = 64;
    const PADDING_TOP = 16;
    const PADDING_BOTTOM = 36;
    const chartW = W - PADDING_LEFT - PADDING_RIGHT;
    const chartH = H - PADDING_TOP - PADDING_BOTTOM;

    // ─── Clear ─────────────────────────────────────────────────────────────
    ctx.clearRect(0, 0, W, H);

    // ─── Background ────────────────────────────────────────────────────────
    ctx.fillStyle = 'hsl(220, 20%, 7%)';
    ctx.fillRect(0, 0, W, H);

    if (candles.length === 0 && W > 0 && H > 0) {
      // Loading / empty state
      const statusText = isLoading ? 'Connecting to Binance...' : 'Waiting for data...';
      ctx.fillStyle = 'hsl(215, 15%, 50%)';
      ctx.font = '13px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(statusText, W / 2, H / 2 - 8);

      ctx.fillStyle = 'hsl(215, 10%, 30%)';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.fillText('BTC/USDT • Binance', W / 2, H / 2 + 12);
      return;
    }

    if (candles.length === 0) return;

    const { lo, hi } = yRange;
    const range = hi - lo;
    const toY = (p: number) => PADDING_TOP + chartH - ((p - lo) / range) * chartH;
    const candleW = Math.max(1.5, (chartW / candles.length) * 0.6);

    // ─── Grid lines (horizontal) ───────────────────────────────────────────
    const gridCount = 6;
    for (let i = 0; i <= gridCount; i++) {
      const y = PADDING_TOP + (i / gridCount) * chartH;
      const labelPrice = hi - (i / gridCount) * range;

      // Grid line
      ctx.strokeStyle = i === 0 || i === gridCount
        ? 'hsl(220, 15%, 18%)'
        : 'hsl(220, 15%, 12%)';
      ctx.lineWidth = 1;
      ctx.setLineDash(i === 0 || i === gridCount ? [] : [4, 8]);
      ctx.beginPath();
      ctx.moveTo(PADDING_LEFT, y);
      ctx.lineTo(W - PADDING_RIGHT, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price label
      ctx.fillStyle = 'hsl(215, 12%, 40%)';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      const priceStr =
        labelPrice >= 1000
          ? `$${labelPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
          : `$${labelPrice.toFixed(2)}`;
      ctx.fillText(priceStr, W - PADDING_RIGHT + 6, y + 4);
    }

    // ─── Time labels ───────────────────────────────────────────────────────
    const maxLabels = 6;
    const step = Math.max(1, Math.floor(candles.length / maxLabels));
    for (let i = 0; i < candles.length; i += step) {
      const c = candles[i];
      const x = PADDING_LEFT + (i / (candles.length - 1 || 1)) * chartW;
      if (x > W - PADDING_RIGHT) continue;

      const date = new Date(c.time);
      let label: string;
      if (timeframe === '1d' || timeframe === '4h') {
        label = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
      } else {
        label = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      }

      ctx.fillStyle = 'hsl(215, 10%, 38%)';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, H - 14);
    }

    // ─── Area under close line ─────────────────────────────────────────────
    const lastIsUp = candles[candles.length - 1].close >= (candles[0]?.close || candles[candles.length - 1].open);
    const areaGrad = ctx.createLinearGradient(0, PADDING_TOP, 0, PADDING_TOP + chartH);
    if (lastIsUp) {
      areaGrad.addColorStop(0, 'hsla(155, 65%, 48%, 0.18)');
      areaGrad.addColorStop(1, 'hsla(155, 65%, 48%, 0.0)');
    } else {
      areaGrad.addColorStop(0, 'hsla(0, 72%, 58%, 0.18)');
      areaGrad.addColorStop(1, 'hsla(0, 72%, 58%, 0.0)');
    }

    ctx.beginPath();
    candles.forEach((c, i) => {
      const x = PADDING_LEFT + (i / (candles.length - 1 || 1)) * chartW;
      if (c.close > 0) {
        if (i === 0) ctx.moveTo(x, toY(c.close));
        else ctx.lineTo(x, toY(c.close));
      }
    });
    // Close area to bottom
    const lastX = PADDING_LEFT + chartW;
    ctx.lineTo(lastX, PADDING_TOP + chartH);
    ctx.lineTo(PADDING_LEFT, PADDING_TOP + chartH);
    ctx.closePath();
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // ─── Close line ────────────────────────────────────────────────────────
    ctx.beginPath();
    ctx.strokeStyle = lastIsUp
      ? 'hsla(155, 65%, 48%, 0.7)'
      : 'hsla(0, 72%, 58%, 0.7)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    let pathStarted = false;
    candles.forEach((c, i) => {
      const x = PADDING_LEFT + (i / (candles.length - 1 || 1)) * chartW;
      if (c.close > 0) {
        if (!pathStarted) { ctx.moveTo(x, toY(c.close)); pathStarted = true; }
        else ctx.lineTo(x, toY(c.close));
      }
    });
    ctx.stroke();

    // ─── Candlesticks ──────────────────────────────────────────────────────
    candles.forEach((c, i) => {
      if (c.open <= 0 || c.close <= 0) return;
      const x = PADDING_LEFT + (i / (candles.length - 1 || 1)) * chartW;
      const isUp = c.close >= c.open;

      // Color: green for up, red for down, faded if still live
      const alpha = c.isClosed ? 0.9 : 0.5;
      const color = isUp
        ? `hsla(155, 65%, 48%, ${alpha})`
        : `hsla(0, 72%, 58%, ${alpha})`;

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, toY(c.high));
      ctx.lineTo(x, toY(c.low));
      ctx.stroke();

      // Body
      const bodyTop = toY(Math.max(c.open, c.close));
      const bodyH = Math.max(1, Math.abs(toY(c.open) - toY(c.close)));
      ctx.fillStyle = color;
      ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);

      // Border for body
      if (bodyH > 2) {
        ctx.strokeStyle = isUp
          ? 'hsla(155, 65%, 38%, 0.4)'
          : 'hsla(0, 72%, 48%, 0.4)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x - candleW / 2, bodyTop, candleW, bodyH);
      }
    });

    // ─── Current price line ────────────────────────────────────────────────
    if (currentPrice > 0) {
      const priceY = Math.max(PADDING_TOP, Math.min(PADDING_TOP + chartH, toY(currentPrice)));
      const lastCandle = candles[candles.length - 1];
      const lastIsUpNow = lastCandle ? lastCandle.close >= lastCandle.open : true;
      const priceColor = lastIsUpNow
        ? 'hsla(155, 65%, 48%, 0.8)'
        : 'hsla(0, 72%, 58%, 0.8)';

      // Dashed line
      ctx.strokeStyle = priceColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(PADDING_LEFT, priceY);
      ctx.lineTo(W - PADDING_RIGHT, priceY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price badge
      const pLabel = `$${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const badgeW = ctx.measureText(pLabel).width + 14;
      const badgeX = W - PADDING_RIGHT + 2;
      const badgeY = priceY - 10;

      // Badge background
      ctx.fillStyle = priceColor;
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, Math.min(badgeW, PADDING_RIGHT - 4), 20, 4);
      ctx.fill();

      // Badge text
      ctx.fillStyle = '#fff';
      ctx.font = '600 10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(pLabel, badgeX + Math.min(badgeW, PADDING_RIGHT - 4) / 2, badgeY + 14);
    }

    // ─── Timeframe indicator (bottom-left) ─────────────────────────────────
    ctx.fillStyle = 'hsl(215, 10%, 35%)';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(TIMEFRAME_LABEL[timeframe], PADDING_LEFT + 4, H - 4);

    // ─── Live indicator dot ────────────────────────────────────────────────
    if (!isLoading && candles.length > 0) {
      const dotX = PADDING_LEFT + 4 + ctx.measureText(TIMEFRAME_LABEL[timeframe]).width + 10;
      const dotY = H - 8;
      ctx.fillStyle = 'hsl(155, 65%, 48%)';
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
      ctx.fill();

      // Pulse ring
      ctx.strokeStyle = 'hsla(155, 65%, 48%, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'hsl(155, 65%, 48%, 0.8)';
      ctx.font = '9px JetBrains Mono, monospace';
      ctx.textAlign = 'left';
      ctx.fillText('LIVE', dotX + 8, dotY + 3);
    }
  }, [candles, currentPrice, yRange, timeframe, isLoading]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background: 'hsl(220 20% 7%)',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
}
