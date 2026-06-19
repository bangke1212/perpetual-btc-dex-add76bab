interface TickerItem {
  symbol: string;
  price: string;
  change: string;
  positive: boolean;
}

const TICKERS: TickerItem[] = [
  { symbol: 'ETH/USDT', price: '3,512.40', change: '+2.14%', positive: true },
  { symbol: 'SOL/USDT', price: '178.82', change: '+4.67%', positive: true },
  { symbol: 'BNB/USDT', price: '612.30', change: '-0.88%', positive: false },
  { symbol: 'ARB/USDT', price: '1.2840', change: '+1.22%', positive: true },
  { symbol: 'AVAX/USDT', price: '41.20', change: '-1.44%', positive: false },
  { symbol: 'LINK/USDT', price: '18.54', change: '+3.01%', positive: true },
  { symbol: 'OP/USDT', price: '2.8160', change: '+0.77%', positive: true },
  { symbol: 'DOGE/USDT', price: '0.1820', change: '-2.11%', positive: false },
  { symbol: 'MATIC/USDT', price: '0.9340', change: '+1.55%', positive: true },
  { symbol: 'ADA/USDT', price: '0.5260', change: '-0.32%', positive: false },
];

export default function MarketTicker() {
  const doubled = [...TICKERS, ...TICKERS];

  return (
    <div style={{
      background: 'hsl(var(--bg-surface))',
      borderBottom: '1px solid hsl(var(--border-subtle))',
      overflow: 'hidden',
      height: 32,
      display: 'flex',
      alignItems: 'center',
    }}>
      <div style={{
        display: 'flex',
        width: 'max-content',
        animation: 'ticker-scroll 40s linear infinite',
        gap: 0,
      }}>
        {doubled.map((t, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '0 20px',
            borderRight: '1px solid hsl(var(--border-subtle))',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'hsl(var(--text-secondary))' }}>{t.symbol}</span>
            <span className="font-mono" style={{ fontSize: 11, color: 'hsl(var(--text-primary))' }}>${t.price}</span>
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: t.positive ? 'hsl(155 65% 48%)' : 'hsl(0 72% 58%)',
            }}>{t.change}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
