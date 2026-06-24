import { useState, useRef, useEffect } from 'react';
import { useCoinPrice, Timeframe, CoinSymbol } from '../hooks/useBtcPrice';
import TradingHeader from '../components/TradingHeader';
import PriceChart from '../components/PriceChart';
import OrderBook from '../components/OrderBook';
import TradePanel from '../components/TradePanel';
import PositionsPanel from '../components/PositionsPanel';
import MarketTicker from '../components/MarketTicker';
import { Position } from '../components/TradePanel';
import { BarChart2, Book, Activity, Wifi, WifiOff, ChevronDown } from 'lucide-react';

const COINS: { sym: CoinSymbol; label: string; icon: string }[] = [
  { sym: 'BTC/USDT', label: 'BTC/USDT', icon: '₿' },
  { sym: 'ETH/USDT', label: 'ETH/USDT', icon: 'Ξ' },
  { sym: 'SOL/USDT', label: 'SOL/USDT', icon: 'S' },
];

const CHART_TABS = ['1m', '5m', '15m', '1h', '4h', '1D'] as const;
type ChartTab = typeof CHART_TABS[number];

function tabToTimeframe(tab: ChartTab): Timeframe {
  const map: Record<ChartTab, Timeframe> = {
    '1m': '1m', '5m': '5m', '15m': '15m',
    '1h': '1h', '4h': '4h', '1D': '1d',
  };
  return map[tab];
}

export default function Index() {
  const [activeCoin, setActiveCoin] = useState<CoinSymbol>('BTC/USDT');
  const [activeChartTab, setActiveChartTab] = useState<ChartTab>('1m');
  const timeframe = tabToTimeframe(activeChartTab);

  const { priceData, candles, isConnected, isLoading } = useCoinPrice(activeCoin, timeframe);

  const [positions, setPositions] = useState<Position[]>([]);
  const [flashClass, setFlashClass] = useState('');
  const [rightTab, setRightTab] = useState<'book' | 'info'>('book');
  const prevDir = useRef(priceData.direction);

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
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: 'hsl(var(--bg-base))', overflow: 'hidden',
    }}>
      <TradingHeader priceData={priceData} flashClass={flashClass} />

      <MarketTicker />

      <div style={{
        flex: 1, display: 'grid',
        gridTemplateColumns: '1fr 220px 280px',
        gridTemplateRows: '1fr 200px',
        gap: 0, overflow: 'hidden', minHeight: 0,
      }}>
        {/* Chart area */}
        <div style={{
          gridRow: '1', gridColumn: '1',
          display: 'flex', flexDirection: 'column',
          borderRight: '1px solid hsl(var(--border-subtle))',
          borderBottom: '1px solid hsl(var(--border-subtle))',
          overflow: 'hidden',
        }}>
          {/* Toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center',
            padding: '4px 10px', gap: 8,
            borderBottom: '1px solid hsl(var(--border-subtle))',
            background: 'hsl(var(--bg-surface))',
            flexShrink: 0, height: 38,
          }}>
            {/* Coin selector */}
            <div style={{ position: 'relative', display: 'flex', gap: 4 }}>
              {COINS.map((c) => (
                <button
                  key={c.sym}
                  onClick={() => setActiveCoin(c.sym)}
                  style={{
                    padding: '3px 10px', borderRadius: 4,
                    background: activeCoin === c.sym ? 'hsl(var(--bg-card))' : 'transparent',
                    border: `1px solid ${activeCoin === c.sym ? 'hsl(var(--border-medium))' : 'transparent'}`,
                    color: activeCoin === c.sym ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
                    fontSize: 11, fontWeight: activeCoin === c.sym ? 600 : 400,
                    cursor: 'pointer', fontFamily: 'var(--font-display)',
                  }}
                >
                  <span style={{ marginRight: 4 }}>{c.icon}</span>
                  {c.label}
                </button>
              ))}
            </div>

            <div style={{ width: 1, height: 16, background: 'hsl(var(--border-subtle))' }} />

            {/* Timeframe tabs */}
            {CHART_TABS.map((t) => (
              <button
                key={t}
                onClick={() => setActiveChartTab(t)}
                style={{
                  padding: '3px 8px', borderRadius: 4,
                  background: activeChartTab === t ? 'hsl(var(--bg-card))' : 'transparent',
                  border: `1px solid ${activeChartTab === t ? 'hsl(var(--border-medium))' : 'transparent'}`,
                  color: activeChartTab === t ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
                  fontSize: 11, fontWeight: activeChartTab === t ? 600 : 400,
                  cursor: 'pointer', fontFamily: 'var(--font-display)',
                }}
              >
                {t}
              </button>
            ))}

            <div style={{ width: 1, height: 16, background: 'hsl(var(--border-subtle))' }} />

            {[{ icon: <BarChart2 size={13} />, label: 'Candles' }, { icon: <Activity size={13} />, label: 'Line' }].map(({ icon, label }) => (
              <button
                key={label}
                style={{
                  background: label === 'Candles' ? 'hsl(var(--bg-card))' : 'transparent',
                  border: `1px solid ${label === 'Candles' ? 'hsl(var(--border-medium))' : 'transparent'}`,
                  borderRadius: 4, padding: '3px 7px',
                  color: label === 'Candles' ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 11, fontFamily: 'var(--font-display)',
                }}
              >
                {icon} <span>{label}</span>
              </button>
            ))}

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
              {isConnected ? (
                <><Wifi size={12} style={{ color: 'hsl(155, 65%, 48%)' }} /><span style={{ fontSize: 10, color: 'hsl(155, 65%, 48%)' }}>LIVE</span></>
              ) : (
                <><WifiOff size={12} style={{ color: 'hsl(0, 72%, 58%)' }} /><span style={{ fontSize: 10, color: 'hsl(0, 72%, 58%)' }}>{isLoading ? 'Loading...' : 'Offline'}</span></>
              )}
            </div>
          </div>

          <div style={{ flex: 1, minHeight: 0 }}>
            <PriceChart candles={candles} currentPrice={priceData.price} timeframe={timeframe} isLoading={isLoading} />
          </div>
        </div>

        {/* Order book */}
        <div style={{
          gridRow: '1', gridColumn: '2',
          borderRight: '1px solid hsl(var(--border-subtle))',
          borderBottom: '1px solid hsl(var(--border-subtle))',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <div style={{ display: 'flex', borderBottom: '1px solid hsl(var(--border-subtle))', flexShrink: 0 }}>
            {[{ key: 'book', label: 'Book', icon: <Book size={11} /> }, { key: 'info', label: 'Trades', icon: <Activity size={11} /> }].map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => setRightTab(key as 'book' | 'info')}
                style={{
                  flex: 1, padding: '9px 0', background: 'none', border: 'none',
                  borderBottom: rightTab === key ? '2px solid hsl(217 91% 60%)' : '2px solid transparent',
                  color: rightTab === key ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
                  fontSize: 11, fontWeight: rightTab === key ? 600 : 400,
                  cursor: 'pointer', fontFamily: 'var(--font-display)', marginBottom: -1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}
              >
                {icon} {label}
              </button>
            ))}
          </div>
          {rightTab === 'book' && (
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <OrderBook currentPrice={priceData.price} direction={priceData.direction} />
            </div>
          )}
          {rightTab === 'info' && <RecentTrades price={priceData.price} />}
        </div>

        {/* Trade panel */}
        <div style={{ gridRow: '1 / 3', gridColumn: '3', borderLeft: '1px solid hsl(var(--border-subtle))', overflow: 'hidden' }}>
          <TradePanel priceData={priceData} onOpenPosition={handleOpenPosition} />
        </div>

        {/* Positions */}
        <div style={{ gridRow: '2', gridColumn: '1 / 3', borderTop: '1px solid hsl(var(--border-subtle))', overflow: 'hidden' }}>
          <PositionsPanel positions={positions} currentPrice={priceData.price} onClose={handleClosePosition} />
        </div>
      </div>
    </div>
  );
}

function RecentTrades({ price }: { price: number }) {
  const [trades, setTrades] = useState(() => generateTrades(price, 20));
  useEffect(() => {
    const interval = setInterval(() => {
      setTrades((prev) => {
        const side = Math.random() > 0.5 ? 'buy' : 'sell';
        const drift = (Math.random() - 0.48) * 25;
        const tradePrice = +(price + drift).toFixed(2);
        const size = +(Math.random() * 2 + 0.01).toFixed(4);
        return [{ id: Math.random().toString(36).slice(2), side, price: tradePrice, size, time: new Date().toLocaleTimeString('en-US', { hour12: false }) }, ...prev.slice(0, 24)];
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
        <div key={t.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: '2px 12px' }}>
          <span className="font-mono" style={{ fontSize: 11, color: t.side === 'buy' ? 'hsl(155 65% 48%)' : 'hsl(0 72% 58%)' }}>{t.price.toFixed(2)}</span>
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
