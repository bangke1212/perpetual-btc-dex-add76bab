import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Info, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { PriceData } from '../hooks/useBtcPrice';

interface Props {
  priceData: PriceData;
  onOpenPosition: (pos: Position) => void;
}

export interface Position {
  id: string;
  side: 'Long' | 'Short';
  size: number;
  leverage: number;
  entryPrice: number;
  liquidationPrice: number;
  margin: number;
  openedAt: number;
}

const LEVERAGE_PRESETS = [2, 5, 10, 25, 50, 75, 100];

function fmt(n: number, d = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

export default function TradePanel({ priceData, onOpenPosition }: Props) {
  const { connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [side, setSide] = useState<'Long' | 'Short'>('Long');
  const [orderType, setOrderType] = useState<'Market' | 'Limit' | 'Stop'>('Market');
  const [leverage, setLeverage] = useState(10);
  const [sizeUSDT, setSizeUSDT] = useState('1000');
  const [limitPrice, setLimitPrice] = useState('');
  const [tpEnabled, setTpEnabled] = useState(false);
  const [slEnabled, setSlEnabled] = useState(false);
  const [tp, setTp] = useState('');
  const [sl, setSl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const size = parseFloat(sizeUSDT) || 0;
  const margin = size; // size IS the margin/collateral
  const positionValue = size * leverage;
  const btcSize = positionValue / priceData.price;
  const liquidationPrice =
    side === 'Long'
      ? priceData.price * (1 - 1 / leverage + 0.005)
      : priceData.price * (1 + 1 / leverage - 0.005);
  const fee = positionValue * 0.0006;
  const pnlPer1 = side === 'Long' ? leverage : -leverage;

  const handleOpen = useCallback(async () => {
    if (!connected) { setVisible(true); return; }
    if (size <= 0) return;

    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 900));

    const pos: Position = {
      id: Math.random().toString(36).slice(2, 9),
      side,
      size: btcSize,
      leverage,
      entryPrice: priceData.price,
      liquidationPrice: +liquidationPrice.toFixed(2),
      margin,
      openedAt: Date.now(),
    };
    onOpenPosition(pos);
    setSubmitting(false);
  }, [connected, size, side, leverage, priceData.price, btcSize, liquidationPrice, margin, onOpenPosition, setVisible]);

  const isLong = side === 'Long';
  const accentColor = isLong ? 'hsl(155 65% 48%)' : 'hsl(0 72% 58%)';
  const accentDim = isLong ? 'hsl(155 65% 48% / 0.12)' : 'hsl(0 72% 58% / 0.12)';
  const accentBorder = isLong ? 'hsl(155 65% 48% / 0.3)' : 'hsl(0 72% 58% / 0.3)';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'hsl(var(--bg-panel))',
      overflow: 'hidden',
    }}>
      {/* Long/Short Toggle */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        margin: '12px 12px 0',
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid hsl(var(--border-medium))',
        flexShrink: 0,
      }}>
        {(['Long', 'Short'] as const).map((s) => {
          const active = side === s;
          const bg = active ? (s === 'Long' ? 'hsl(155 65% 48% / 0.2)' : 'hsl(0 72% 58% / 0.2)') : 'transparent';
          const color = active ? (s === 'Long' ? 'hsl(155 65% 48%)' : 'hsl(0 72% 58%)') : 'hsl(var(--text-muted))';
          return (
            <button
              key={s}
              onClick={() => setSide(s)}
              style={{
                padding: '9px 0',
                background: bg,
                border: 'none',
                color,
                fontFamily: 'var(--font-display)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                transition: 'all 0.2s',
              }}
            >
              {s === 'Long' ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
              {s}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {/* Order Type */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
          {(['Market', 'Limit', 'Stop'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              style={{
                padding: '5px 12px',
                borderRadius: 4,
                background: orderType === t ? 'hsl(var(--bg-card))' : 'transparent',
                border: `1px solid ${orderType === t ? 'hsl(var(--border-medium))' : 'transparent'}`,
                color: orderType === t ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'var(--font-display)',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Limit price input */}
        {orderType !== 'Market' && (
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: 'hsl(var(--text-muted))', display: 'block', marginBottom: 4 }}>
              {orderType} Price (USDT)
            </label>
            <div style={{
              display: 'flex', alignItems: 'center',
              background: 'hsl(var(--bg-input))',
              border: '1px solid hsl(var(--border-medium))',
              borderRadius: 6, padding: '0 10px',
            }}>
              <input
                type="number"
                value={limitPrice}
                onChange={(e) => setLimitPrice(e.target.value)}
                placeholder={fmt(priceData.price)}
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: 'hsl(var(--text-primary))', fontSize: 13, fontFamily: 'var(--font-mono)',
                  padding: '8px 0',
                }}
              />
              <span style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>USDT</span>
            </div>
          </div>
        )}

        {/* Size */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <label style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>Collateral (USDT)</label>
            <span style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>
              ≈ {btcSize.toFixed(5)} BTC
            </span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center',
            background: 'hsl(var(--bg-input))',
            border: `1px solid hsl(var(--border-medium))`,
            borderRadius: 6, padding: '0 10px',
          }}>
            <input
              type="number"
              value={sizeUSDT}
              onChange={(e) => setSizeUSDT(e.target.value)}
              placeholder="0.00"
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: 'hsl(var(--text-primary))', fontSize: 14, fontFamily: 'var(--font-mono)',
                fontWeight: 500,
                padding: '8px 0',
              }}
            />
            <span style={{ fontSize: 12, color: 'hsl(var(--text-muted))', marginLeft: 6 }}>USDT</span>
          </div>

          {/* Quick size buttons */}
          <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
            {['25%', '50%', '75%', 'Max'].map((p) => (
              <button
                key={p}
                onClick={() => {
                  const pct = p === 'Max' ? 1 : parseInt(p) / 100;
                  setSizeUSDT((5000 * pct).toFixed(0));
                }}
                style={{
                  flex: 1, padding: '4px 0',
                  background: 'hsl(var(--bg-card))',
                  border: '1px solid hsl(var(--border-subtle))',
                  borderRadius: 4,
                  color: 'hsl(var(--text-muted))',
                  fontSize: 10, fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Leverage */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <label style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>Leverage</label>
            <span style={{
              fontSize: 13, fontWeight: 700, color: accentColor,
              fontFamily: 'var(--font-mono)',
            }}>{leverage}×</span>
          </div>

          {/* Slider */}
          <div className="leverage-slider" style={{ marginBottom: 8 }}>
            <input
              type="range"
              min={1}
              max={100}
              value={leverage}
              onChange={(e) => setLeverage(parseInt(e.target.value))}
              style={{
                width: '100%',
                accentColor,
              }}
            />
          </div>

          {/* Presets */}
          <div style={{ display: 'flex', gap: 4 }}>
            {LEVERAGE_PRESETS.map((lv) => (
              <button
                key={lv}
                onClick={() => setLeverage(lv)}
                style={{
                  flex: 1, padding: '4px 0',
                  background: leverage === lv ? accentDim : 'hsl(var(--bg-card))',
                  border: `1px solid ${leverage === lv ? accentBorder : 'hsl(var(--border-subtle))'}`,
                  borderRadius: 4,
                  color: leverage === lv ? accentColor : 'hsl(var(--text-muted))',
                  fontSize: 10, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'var(--font-display)',
                  transition: 'all 0.15s',
                }}
              >
                {lv}×
              </button>
            ))}
          </div>
        </div>

        {/* TP/SL */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {[
              { label: 'Take Profit', active: tpEnabled, toggle: () => setTpEnabled(!tpEnabled) },
              { label: 'Stop Loss', active: slEnabled, toggle: () => setSlEnabled(!slEnabled) },
            ].map(({ label, active, toggle }) => (
              <button
                key={label}
                onClick={toggle}
                style={{
                  flex: 1, padding: '5px 8px',
                  background: active ? 'hsl(var(--bg-card))' : 'transparent',
                  border: `1px solid ${active ? 'hsl(var(--border-medium))' : 'hsl(var(--border-subtle))'}`,
                  borderRadius: 4,
                  color: active ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
                  fontSize: 11, fontWeight: 500, cursor: 'pointer',
                  fontFamily: 'var(--font-display)',
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {tpEnabled && (
            <div style={{ marginBottom: 6 }}>
              <input
                type="number"
                value={tp}
                onChange={(e) => setTp(e.target.value)}
                placeholder={`TP Price (e.g. ${(priceData.price * 1.05).toFixed(0)})`}
                style={{
                  width: '100%', padding: '7px 10px',
                  background: 'hsl(var(--bg-input))',
                  border: '1px solid hsl(155 65% 48% / 0.4)',
                  borderRadius: 6, outline: 'none',
                  color: 'hsl(155 65% 48%)',
                  fontSize: 12, fontFamily: 'var(--font-mono)',
                }}
              />
            </div>
          )}

          {slEnabled && (
            <div>
              <input
                type="number"
                value={sl}
                onChange={(e) => setSl(e.target.value)}
                placeholder={`SL Price (e.g. ${(priceData.price * 0.95).toFixed(0)})`}
                style={{
                  width: '100%', padding: '7px 10px',
                  background: 'hsl(var(--bg-input))',
                  border: '1px solid hsl(0 72% 58% / 0.4)',
                  borderRadius: 6, outline: 'none',
                  color: 'hsl(0 72% 58%)',
                  fontSize: 12, fontFamily: 'var(--font-mono)',
                }}
              />
            </div>
          )}
        </div>

        {/* Info panel */}
        <div style={{
          background: 'hsl(var(--bg-card))',
          border: '1px solid hsl(var(--border-subtle))',
          borderRadius: 6,
          padding: '10px 12px',
          marginBottom: 14,
        }}>
          {[
            { label: 'Entry Price', value: orderType === 'Market' ? `$${fmt(priceData.price)}` : (limitPrice ? `$${fmt(parseFloat(limitPrice))}` : '—') },
            { label: 'Position Size', value: `$${fmt(positionValue)}` },
            { label: 'Margin', value: `$${fmt(margin)}` },
            { label: 'Liquidation Price', value: `$${fmt(liquidationPrice)}`, color: 'hsl(0 72% 58%)' },
            { label: 'Taker Fee (0.06%)', value: `$${fee.toFixed(2)}` },
            { label: 'PnL per 1% move', value: `${pnlPer1 > 0 ? '+' : ''}${pnlPer1.toFixed(1)}%`, color: isLong ? 'hsl(155 65% 48%)' : 'hsl(0 72% 58%)' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>{label}</span>
              <span className="font-mono" style={{ fontSize: 11, color: color || 'hsl(var(--text-primary))', fontWeight: 500 }}>{value}</span>
            </div>
          ))}
        </div>

        {/* Liquidation warning */}
        {leverage >= 50 && (
          <div style={{
            display: 'flex', gap: 6, alignItems: 'flex-start',
            background: 'hsl(38 95% 56% / 0.1)',
            border: '1px solid hsl(38 95% 56% / 0.3)',
            borderRadius: 6, padding: '8px 10px',
            marginBottom: 12,
          }}>
            <AlertTriangle size={13} color="hsl(38 95% 56%)" style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ fontSize: 11, color: 'hsl(38 95% 56%)', lineHeight: 1.4 }}>
              High leverage ({leverage}×). A <strong>{(100 / leverage).toFixed(1)}%</strong> adverse move will liquidate this position.
            </span>
          </div>
        )}

        {/* Submit button */}
        <button
          onClick={handleOpen}
          disabled={submitting}
          style={{
            width: '100%',
            padding: '12px 0',
            borderRadius: 7,
            border: 'none',
            background: submitting ? 'hsl(var(--bg-card))' : isLong ? 'hsl(155 65% 48%)' : 'hsl(0 72% 58%)',
            color: submitting ? 'hsl(var(--text-muted))' : '#fff',
            fontSize: 14,
            fontWeight: 700,
            cursor: submitting ? 'wait' : 'pointer',
            fontFamily: 'var(--font-display)',
            letterSpacing: '0.02em',
            transition: 'all 0.2s',
            boxShadow: !submitting ? `0 0 24px ${isLong ? 'hsl(155 65% 48% / 0.35)' : 'hsl(0 72% 58% / 0.35)'}` : 'none',
          }}
        >
          {submitting ? 'Opening Position…' : connected ? `Open ${side} ${leverage}×` : 'Connect Wallet to Trade'}
        </button>

        {/* Disclaimer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8 }}>
          <Info size={10} color="hsl(var(--text-muted))" />
          <span style={{ fontSize: 10, color: 'hsl(var(--text-muted))' }}>
            Demo platform. No real funds involved.
          </span>
        </div>
      </div>
    </div>
  );
}
