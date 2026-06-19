import { useOrderBook } from '../hooks/useOrderBook';

interface Props {
  currentPrice: number;
  direction: 'up' | 'down' | 'same';
}

function fmt(n: number, d = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default function OrderBook({ currentPrice, direction }: Props) {
  const book = useOrderBook(currentPrice);

  const maxAskTotal = book.asks[0]?.total || 1;
  const maxBidTotal = book.bids[book.bids.length - 1]?.total || 1;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'hsl(var(--bg-panel))',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        padding: '10px 12px 8px',
        borderBottom: '1px solid hsl(var(--border-subtle))',
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-primary))' }}>Order Book</span>
      </div>

      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        padding: '6px 12px',
        flexShrink: 0,
      }}>
        {['Price (USDT)', 'Size (BTC)', 'Total'].map((h) => (
          <span key={h} style={{
            fontSize: 10,
            color: 'hsl(var(--text-muted))',
            textAlign: h === 'Total' ? 'right' : 'left',
          }}>{h}</span>
        ))}
      </div>

      {/* Asks */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column-reverse' }}>
        {book.asks.map((a, i) => {
          const depthPct = (a.size / (maxAskTotal / book.asks.length)) * 100;
          return (
            <div
              key={i}
              className="ob-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                padding: '2px 12px',
                position: 'relative',
                cursor: 'pointer',
              }}
            >
              <div
                className="ob-depth-bar"
                style={{ background: 'hsl(0 72% 58%)', width: `${Math.min(depthPct, 80)}%` }}
              />
              <span className="font-mono text-short" style={{ fontSize: 11, position: 'relative', zIndex: 1 }}>
                {fmt(a.price)}
              </span>
              <span className="font-mono" style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', position: 'relative', zIndex: 1 }}>
                {a.size.toFixed(4)}
              </span>
              <span className="font-mono" style={{ fontSize: 11, color: 'hsl(var(--text-muted))', textAlign: 'right', position: 'relative', zIndex: 1 }}>
                {a.total.toFixed(3)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Spread / current price */}
      <div style={{
        padding: '6px 12px',
        background: 'hsl(var(--bg-card))',
        borderTop: '1px solid hsl(var(--border-subtle))',
        borderBottom: '1px solid hsl(var(--border-subtle))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <span
          className="font-mono"
          style={{
            fontSize: 14,
            fontWeight: 600,
            color: direction === 'up' ? 'hsl(155 65% 48%)' : direction === 'down' ? 'hsl(0 72% 58%)' : 'hsl(var(--text-primary))',
          }}
        >
          ${fmt(currentPrice)}
        </span>
        <span style={{ fontSize: 10, color: 'hsl(var(--text-muted))' }}>
          Spread: ${(book.asks[book.asks.length - 1]?.price - book.bids[0]?.price || 0).toFixed(2)}
        </span>
      </div>

      {/* Bids */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {book.bids.map((b, i) => {
          const depthPct = (b.size / (maxBidTotal / book.bids.length)) * 100;
          return (
            <div
              key={i}
              className="ob-row"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                padding: '2px 12px',
                position: 'relative',
                cursor: 'pointer',
              }}
            >
              <div
                className="ob-depth-bar"
                style={{ background: 'hsl(155 65% 48%)', width: `${Math.min(depthPct, 80)}%` }}
              />
              <span className="font-mono text-long" style={{ fontSize: 11, position: 'relative', zIndex: 1 }}>
                {fmt(b.price)}
              </span>
              <span className="font-mono" style={{ fontSize: 11, color: 'hsl(var(--text-secondary))', position: 'relative', zIndex: 1 }}>
                {b.size.toFixed(4)}
              </span>
              <span className="font-mono" style={{ fontSize: 11, color: 'hsl(var(--text-muted))', textAlign: 'right', position: 'relative', zIndex: 1 }}>
                {b.total.toFixed(3)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
