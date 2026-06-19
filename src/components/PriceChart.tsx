import { useRef, useEffect } from 'react';
import { Candle } from '../hooks/useBtcPrice';

interface Props {
  candles: Candle[];
  currentPrice: number;
}

export default function PriceChart({ candles, currentPrice }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    const PADDING_LEFT = 0;
    const PADDING_RIGHT = 60;
    const PADDING_TOP = 20;
    const PADDING_BOTTOM = 40;
    const chartW = W - PADDING_LEFT - PADDING_RIGHT;
    const chartH = H - PADDING_TOP - PADDING_BOTTOM;

    if (candles.length === 0) return;

    const prices = candles.flatMap((c) => [c.high, c.low]);
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const pRange = maxP - minP || 1;
    const padP = pRange * 0.05;
    const lo = minP - padP;
    const hi = maxP + padP;
    const range = hi - lo;

    const toY = (p: number) => PADDING_TOP + chartH - ((p - lo) / range) * chartH;
    const candleW = Math.max(2, (chartW / candles.length) * 0.65);

    // Background
    ctx.fillStyle = 'hsl(220, 20%, 7%)';
    ctx.fillRect(0, 0, W, H);

    // Grid lines
    const gridCount = 5;
    ctx.strokeStyle = 'hsl(220, 15%, 15%)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridCount; i++) {
      const y = PADDING_TOP + (i / gridCount) * chartH;
      ctx.setLineDash([4, 6]);
      ctx.beginPath();
      ctx.moveTo(PADDING_LEFT, y);
      ctx.lineTo(W - PADDING_RIGHT, y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price labels
      const labelPrice = hi - (i / gridCount) * range;
      ctx.fillStyle = 'hsl(215, 10%, 45%)';
      ctx.font = `10px JetBrains Mono, monospace`;
      ctx.textAlign = 'left';
      ctx.fillText(`$${labelPrice.toFixed(0)}`, W - PADDING_RIGHT + 6, y + 3);
    }

    // Time labels
    const step = Math.floor(candles.length / 6);
    for (let i = 0; i < candles.length; i += step) {
      const c = candles[i];
      const x = PADDING_LEFT + (i / (candles.length - 1)) * chartW;
      const date = new Date(c.time);
      const label = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      ctx.fillStyle = 'hsl(215, 10%, 40%)';
      ctx.font = '10px JetBrains Mono, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(label, x, H - 10);
    }

    // Area under close line
    const areaGrad = ctx.createLinearGradient(0, PADDING_TOP, 0, PADDING_TOP + chartH);
    const lastIsUp = candles[candles.length - 1].close >= candles[0].open;
    if (lastIsUp) {
      areaGrad.addColorStop(0, 'hsl(155, 65%, 48%, 0.2)');
      areaGrad.addColorStop(1, 'hsl(155, 65%, 48%, 0)');
    } else {
      areaGrad.addColorStop(0, 'hsl(0, 72%, 58%, 0.2)');
      areaGrad.addColorStop(1, 'hsl(0, 72%, 58%, 0)');
    }

    ctx.beginPath();
    candles.forEach((c, i) => {
      const x = PADDING_LEFT + (i / (candles.length - 1)) * chartW;
      const y = toY(c.close);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(PADDING_LEFT + chartW, PADDING_TOP + chartH);
    ctx.lineTo(PADDING_LEFT, PADDING_TOP + chartH);
    ctx.closePath();
    ctx.fillStyle = areaGrad;
    ctx.fill();

    // Candles
    candles.forEach((c, i) => {
      const x = PADDING_LEFT + (i / (candles.length - 1)) * chartW;
      const isUp = c.close >= c.open;
      const color = isUp ? 'hsl(155, 65%, 48%)' : 'hsl(0, 72%, 58%)';

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
    });

    // Current price line
    const priceY = toY(currentPrice);
    const lastIsUpNow = candles[candles.length - 1].close >= candles[candles.length - 1].open;
    const priceColor = lastIsUpNow ? 'hsl(155, 65%, 48%)' : 'hsl(0, 72%, 58%)';

    ctx.strokeStyle = priceColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(PADDING_LEFT, priceY);
    ctx.lineTo(W - PADDING_RIGHT, priceY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price label box
    const pLabel = `$${currentPrice.toFixed(2)}`;
    ctx.fillStyle = priceColor;
    ctx.fillRect(W - PADDING_RIGHT + 2, priceY - 9, PADDING_RIGHT - 4, 18);
    ctx.fillStyle = '#fff';
    ctx.font = '600 10px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(pLabel, W - PADDING_RIGHT / 2, priceY + 3);
  }, [candles, currentPrice]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: 'hsl(220 20% 7%)' }}>
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
    </div>
  );
}
