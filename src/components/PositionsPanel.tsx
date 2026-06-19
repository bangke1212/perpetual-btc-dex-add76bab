import { useState } from 'react';
import { X, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { Position } from './TradePanel';

interface Props {
  positions: Position[];
  currentPrice: number;
  onClose: (id: string) => void;
}

function fmt(n: number, d = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function timeAgo(ts: number) {
  const secs = Math.floor((Date.now() - ts) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

const TABS = ['Positions', 'Orders', 'History', 'Assets'] as const;
type Tab = typeof TABS[number];

export default function PositionsPanel({ positions, currentPrice, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('Positions');

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'hsl(var(--bg-panel))',
    }}>
      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid hsl(var(--border-subtle))',
        flexShrink: 0,
        paddingLeft: 12,
      }}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 14px',
              background: 'none',
              border: 'none',
              borderBottom: tab === t ? '2px solid hsl(217 91% 60%)' : '2px solid transparent',
              color: tab === t ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
              fontSize: 12,
              fontWeight: tab === t ? 600 : 400,
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              marginBottom: -1,
              transition: 'all 0.15s',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            {t}
            {t === 'Positions' && positions.length > 0 && (
              <span style={{
                background: 'hsl(217 91% 60%)',
                color: '#fff',
                borderRadius: 10,
                padding: '0 5px',
                fontSize: 10,
                fontWeight: 700,
              }}>{positions.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {tab === 'Positions' && (
          <>
            {positions.length === 0 ? (
              <div style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                height: '100%', gap: 8,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'hsl(var(--bg-card))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <TrendingUp size={18} color="hsl(var(--text-muted))" />
                </div>
                <span style={{ fontSize: 13, color: 'hsl(var(--text-muted))' }}>No open positions</span>
                <span style={{ fontSize: 11, color: 'hsl(var(--text-disabled))' }}>Open a trade to see it here</span>
              </div>
            ) : (
              <div>
                {/* Column headers */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '90px 70px 90px 90px 90px 90px 90px 80px 60px',
                  padding: '8px 12px',
                  borderBottom: '1px solid hsl(var(--border-subtle))',
                  position: 'sticky', top: 0,
                  background: 'hsl(var(--bg-panel))',
                  zIndex: 1,
                }}>
                  {['Symbol', 'Side', 'Size', 'Entry Price', 'Mark Price', 'Liq Price', 'PnL (USDT)', 'Opened', ''].map((h) => (
                    <span key={h} style={{ fontSize: 10, color: 'hsl(var(--text-muted))', fontWeight: 500 }}>{h}</span>
                  ))}
                </div>

                {positions.map((pos) => {
                  const priceDiff = currentPrice - pos.entryPrice;
                  const pnl = pos.side === 'Long'
                    ? priceDiff * pos.size
                    : -priceDiff * pos.size;
                  const pnlPct = (pnl / pos.margin) * 100;
                  const isPos = pnl >= 0;

                  return (
                    <div
                      key={pos.id}
                      className="animate-fade-in-up"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '90px 70px 90px 90px 90px 90px 90px 80px 60px',
                        padding: '10px 12px',
                        borderBottom: '1px solid hsl(var(--border-subtle))',
                        alignItems: 'center',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'hsl(var(--bg-hover))')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(var(--text-primary))' }}>BTC/USDT</span>
                        <span style={{
                          fontSize: 9, padding: '1px 4px', borderRadius: 2,
                          background: 'hsl(217 91% 60% / 0.15)', color: 'hsl(217 91% 65%)',
                          fontWeight: 600,
                        }}>
                          {pos.leverage}×
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {pos.side === 'Long'
                          ? <TrendingUp size={11} color="hsl(155 65% 48%)" />
                          : <TrendingDown size={11} color="hsl(0 72% 58%)" />
                        }
                        <span style={{
                          fontSize: 12, fontWeight: 600,
                          color: pos.side === 'Long' ? 'hsl(155 65% 48%)' : 'hsl(0 72% 58%)',
                        }}>
                          {pos.side}
                        </span>
                      </div>

                      <span className="font-mono" style={{ fontSize: 11, color: 'hsl(var(--text-secondary))' }}>
                        {pos.size.toFixed(5)} BTC
                      </span>
                      <span className="font-mono" style={{ fontSize: 11, color: 'hsl(var(--text-secondary))' }}>
                        ${fmt(pos.entryPrice)}
                      </span>
                      <span className="font-mono" style={{ fontSize: 11, color: 'hsl(var(--text-primary))' }}>
                        ${fmt(currentPrice)}
                      </span>
                      <span className="font-mono" style={{ fontSize: 11, color: 'hsl(0 72% 58%)' }}>
                        ${fmt(pos.liquidationPrice)}
                      </span>

                      <div>
                        <div className="font-mono" style={{
                          fontSize: 12, fontWeight: 600,
                          color: isPos ? 'hsl(155 65% 48%)' : 'hsl(0 72% 58%)',
                        }}>
                          {isPos ? '+' : ''}{pnl.toFixed(2)}
                        </div>
                        <div className="font-mono" style={{
                          fontSize: 10,
                          color: isPos ? 'hsl(155 65% 48%)' : 'hsl(0 72% 58%)',
                          opacity: 0.8,
                        }}>
                          {isPos ? '+' : ''}{pnlPct.toFixed(2)}%
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Clock size={10} color="hsl(var(--text-muted))" />
                        <span style={{ fontSize: 10, color: 'hsl(var(--text-muted))' }}>{timeAgo(pos.openedAt)}</span>
                      </div>

                      <button
                        onClick={() => onClose(pos.id)}
                        style={{
                          padding: '4px 8px',
                          background: 'hsl(0 72% 58% / 0.12)',
                          border: '1px solid hsl(0 72% 58% / 0.3)',
                          borderRadius: 4,
                          color: 'hsl(0 72% 58%)',
                          fontSize: 11, fontWeight: 500,
                          cursor: 'pointer',
                          fontFamily: 'var(--font-display)',
                          display: 'flex', alignItems: 'center', gap: 3,
                        }}
                      >
                        <X size={10} /> Close
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === 'Orders' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 6 }}>
            <span style={{ fontSize: 13, color: 'hsl(var(--text-muted))' }}>No open orders</span>
          </div>
        )}

        {tab === 'History' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 6 }}>
            <span style={{ fontSize: 13, color: 'hsl(var(--text-muted))' }}>Trade history will appear here</span>
          </div>
        )}

        {tab === 'Assets' && (
          <div style={{ padding: 16 }}>
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              gap: 12,
            }}>
              {[
                { token: 'USDT', balance: '5,000.00', value: '$5,000.00' },
                { token: 'BTC', balance: '0.00000', value: '$0.00' },
                { token: 'SOL', balance: '0.00', value: '$0.00' },
              ].map((a) => (
                <div key={a.token} style={{
                  background: 'hsl(var(--bg-card))',
                  border: '1px solid hsl(var(--border-subtle))',
                  borderRadius: 8, padding: 12,
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-primary))', marginBottom: 4 }}>{a.token}</div>
                  <div className="font-mono" style={{ fontSize: 12, color: 'hsl(var(--text-secondary))' }}>{a.balance}</div>
                  <div className="font-mono" style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>{a.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
