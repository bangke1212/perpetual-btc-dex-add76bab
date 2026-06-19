import { useState, useRef, useEffect } from 'react';
import { useBtcPrice } from '../hooks/useBtcPrice';
import TradingHeader from '../components/TradingHeader';
import PriceChart from '../components/PriceChart';
import OrderBook from '../components/OrderBook';
import TradePanel from '../components/TradePanel';
import PositionsPanel from '../components/PositionsPanel';
import MarketTicker from '../components/MarketTicker';
import { Position } from '../components/TradePanel';
import { BarChart2, Book, Activity } from 'lucide-react';

const CHART_TABS = ['1m', '5m', '15m', '1h', '4h', '1D'] as const;
type ChartTab = typeof CHART_TABS[number];

export default function Index() {
  const { priceData, candles } = useBtcPrice();
  const [positions, setPositions] = useState<Position[]>([]);
  const [flashClass, setFlashClass] = useState('');
  const [activeChartTab, setActiveChartTab] = useState<ChartTab>('1m');
  const [rightTab, setRightTab] = useState<'book' | 'info'>('book');
  const prevDir = useRef(priceData.direction);

  // Flash effect on price change
  useEffect(() => {
    if (priceData.direction !== 'same' && priceData.direction !== prevDir.current) {
      setFlashClass(priceData.direction === 'up' ? 'flash-up' : 'flash-down');
      const t = setTimeout(() => setFlashClass(''), 400);
      prevDir.current = priceData.direction;
      return () => clearTimeout(t);
    }
  }, [priceData.direction, priceData.price]);

  const handleOpenPosition = (pos: Position) => {
    setPositions((prev) => [pos, ...prev]);
  };

  const handleClosePosition = (id: string) => {
    setPositions((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'hsl(var(--bg-base))',
      overflow: 'hidden',
    }}>
      {/* Top header */}
      <TradingHeader priceData={priceData} flashClass={flashClass} />

      {/* Market ticker */}
      <MarketTicker />

      {/* Main trading area */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 220px 280px',
        gridTemplateRows: '1fr 200px',
        gap: 0,
        overflow: 'hidden',
        minHeight: 0,
      }}>
        {/* Chart */}
        <div style={{
          gridRow: '1',
          gridColumn: '1',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid hsl(var(--border-subtle))',
          borderBottom: '1px solid hsl(var(--border-subtle))',
          overflow: 'hidden',
        }}>
          {/* Chart toolbar */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '6px 12px',
            gap: 12,
            borderBottom: '1px solid hsl(var(--border-subtle))',
            background: 'hsl(var(--bg-surface))',
            flexShrink: 0,
            height: 38,
          }}>
            {/* Timeframe tabs */}
            <div style={{ display: 'flex', gap: 2 }}>
              {CHART_TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setActiveChartTab(t)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: 4,
                    background: activeChartTab === t ? 'hsl(var(--bg-card))' : 'transparent',
                    border: `1px solid ${activeChartTab === t ? 'hsl(var(--border-medium))' : 'transparent'}`,
                    color: activeChartTab === t ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
                    fontSize: 11, fontWeight: activeChartTab === t ? 600 : 400,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-display)',
                    transition: 'all 0.15s',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            <div style={{ width: 1, height: 16, background: 'hsl(var(--border-subtle))' }} />

            {/* Chart type icons */}
            {[
              { icon: <BarChart2 size={13} />, label: 'Candles' },
              { icon: <Activity size={13} />, label: 'Line' },
            ].map(({ icon, label }) => (
              <button
                key={label}
                style={{
                  background: label === 'Candles' ? 'hsl(var(--bg-card))' : 'transparent',
                  border: `1px solid ${label === 'Candles' ? 'hsl(var(--border-medium))' : 'transparent'}`,
                  borderRadius: 4, padding: '3px 7px',
                  color: label === 'Candles' ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontFamily: 'var(--font-display)',
                }}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}

            {/* Indicators */}
            <button style={{
              background: 'transparent', border: 'none',
              color: 'hsl(var(--text-muted))', fontSize: 11,
              cursor: 'pointer', fontFamily: 'var(--font-display)',
            }}>
              + Indicators
            </button>
          </div>

          {/* Canvas chart */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <PriceChart candles={candles} currentPrice={priceData.price} />
          </div>
        </div>

        {/* Order Book / Market Info */}
        <div style={{
          gridRow: '1',
          gridColumn: '2',
          borderRight: '1px solid hsl(var(--border-subtle))',
          borderBottom: '1px solid hsl(var(--border-subtle))',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Tab switcher */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid hsl(var(--border-subtle))',
            flexShrink: 0,
          }}>
            {[
              { key: 'book', label: 'Book', icon: <Book size={11} /> },
              { key: 'info', label: 'Trades', icon: <Activity size={11} /> },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setRightTab(key as 'book' | 'info')}
                style={{
                  flex: 1, padding: '9px 0',
                  background: 'none', border: 'none',
                  borderBottom: rightTab === key ? '2px solid hsl(217 91% 60%)' : '2px solid transparent',
                  color: rightTab === key ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
                  fontSize: 11, fontWeight: rightTab === key ? 600 : 400,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-display)',
                  marginBottom: -1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Order book */}
          {rightTab === 'book' && (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <OrderBook currentPrice={priceData.price} direction={priceData.direction} />
            </div>
          )}

          {/* Recent trades */}
          {rightTab === 'info' && (
            <RecentTrades price={priceData.price} />
          )}
        </div>

        {/* Trade panel */}
        <div style={{
          gridRow: '1 / 3',
          gridColumn: '3',
          borderLeft: '1px solid hsl(var(--border-subtle))',
          overflow: 'hidden',
        }}>
          <TradePanel priceData={priceData} onOpenPosition={handleOpenPosition} />
        </div>

        {/* Positions panel */}
        <div style={{
          gridRow: '2',
          gridColumn: '1 / 3',
          borderTop: '1px solid hsl(var(--border-subtle))',
          overflow: 'hidden',
        }}>
          <PositionsPanel
            positions={positions}
            currentPrice={priceData.price}
            onClose={handleClosePosition}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Inline recent trades component ─────────────────────────────────────────

function RecentTrades({ price }: { price: number }) {
  const [trades, setTrades] = useState(() => generateTrades(price, 20));

  useEffect(() => {
    const interval = setInterval(() => {
      setTrades((prev) => {
        const side = Math.random() > 0.5 ? 'buy' : 'sell';
        const drift = (Math.random() - 0.48) * 25;
        const tradePrice = +(price + drift).toFixed(2);
        const size = +(Math.random() * 2 + 0.01).toFixed(4);
        const newTrade = {
          id: Math.random().toString(36).slice(2),
          side,
          price: tradePrice,
          size,
          time: new Date().toLocaleTimeString('en-US', { hour12: false }),
        };
        return [newTrade, ...prev.slice(0, 24)];
      });
    }, 500);
    return () => clearInterval(interval);
  }, [price]);

  return (
    <div style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '6px 12px' }}>
        {['Price', 'Size', 'Time'].map((h) => (
          <span key={h} style={{ fontSize: 10, color: 'hsl(var(--text-muted))' }}>{h}</span>
        ))}
      </div>
      {trades.map((t) => (
        <div key={t.id} style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          padding: '2px 12px', transition: 'opacity 0.2s',
        }}>
          <span className="font-mono" style={{ fontSize: 11, color: t.side === 'buy' ? 'hsl(155 65% 48%)' : 'hsl(0 72% 58%)' }}>
            {t.price.toFixed(2)}
          </span>
          <span className="font-mono" style={{ fontSize: 11, color: 'hsl(var(--text-secondary))' }}>{t.size}</span>
          <span className="font-mono" style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>{t.time}</span>
        </div>
      ))}
    </div>
  );
}

function generateTrades(price: number, count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `init-${i}`,
    side: Math.random() > 0.5 ? 'buy' : 'sell',
    price: +(price + (Math.random() - 0.5) * 50).toFixed(2),
    size: +(Math.random() * 2 + 0.01).toFixed(4),
    time: new Date(Date.now() - i * 1000).toLocaleTimeString('en-US', { hour12: false }),
  }));
}
