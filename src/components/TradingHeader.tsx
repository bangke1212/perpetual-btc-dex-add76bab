import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { PriceData } from '../hooks/useBtcPrice';
import { Activity, Zap, ChevronDown, Wifi } from 'lucide-react';

interface Props {
  priceData: PriceData;
  flashClass: string;
}

function fmt(n: number, decimals = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function fmtBig(n: number): string {
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  return `$${fmt(n)}`;
}

export default function TradingHeader({ priceData, flashClass }: Props) {
  const { setVisible } = useWalletModal();
  const { connected, publicKey, disconnect } = useWallet();

  const shortKey = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : null;

  const isPositive = priceData.changePct24h >= 0;

  return (
    <header
      style={{
        background: 'hsl(var(--bg-surface))',
        borderBottom: '1px solid hsl(var(--border-subtle))',
        display: 'flex',
        alignItems: 'center',
        height: 56,
        padding: '0 16px',
        gap: 0,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 24, flexShrink: 0 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: 'linear-gradient(135deg, hsl(217 91% 60%), hsl(155 65% 48%))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Zap size={14} color="#fff" fill="#fff" />
        </div>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 15,
          color: 'hsl(var(--text-primary))',
          letterSpacing: '-0.02em',
        }}>PerpDEX</span>
      </div>

      {/* Pair selector */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 10px', borderRadius: 6,
        background: 'hsl(var(--bg-card))',
        border: '1px solid hsl(var(--border-medium))',
        cursor: 'pointer', marginRight: 20, flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-primary))' }}>BTC/USDT</span>
        <span style={{
          fontSize: 10, padding: '1px 5px', borderRadius: 3,
          background: 'hsl(217 91% 60% / 0.2)', color: 'hsl(217 91% 70%)',
          fontWeight: 600,
        }}>PERP</span>
        <ChevronDown size={12} color="hsl(215,10%,45%)" />
      </div>

      {/* Price */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginRight: 28 }}>
        <span
          className={`font-mono ${flashClass}`}
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: isPositive ? 'hsl(155 65% 48%)' : 'hsl(0 72% 58%)',
            letterSpacing: '-0.03em',
            transition: 'color 0.2s',
          }}
        >
          ${fmt(priceData.price)}
        </span>
        <span style={{
          fontSize: 12, fontWeight: 500,
          color: isPositive ? 'hsl(155 65% 48%)' : 'hsl(0 72% 58%)',
        }}>
          {isPositive ? '+' : ''}{priceData.changePct24h.toFixed(2)}%
        </span>
      </div>

      {/* Stats row */}
      <div style={{
        display: 'flex', gap: 20, flex: 1,
        overflowX: 'auto', alignItems: 'center',
      }}>
        {[
          { label: '24h Change', value: `${isPositive ? '+' : ''}$${fmt(Math.abs(priceData.change24h))}`, color: isPositive ? 'hsl(155 65% 48%)' : 'hsl(0 72% 58%)' },
          { label: '24h High', value: `$${fmt(priceData.high24h)}`, color: 'hsl(var(--text-primary))' },
          { label: '24h Low', value: `$${fmt(priceData.low24h)}`, color: 'hsl(var(--text-primary))' },
          { label: '24h Volume', value: fmtBig(priceData.volume24h), color: 'hsl(var(--text-primary))' },
          { label: 'Open Interest', value: fmtBig(priceData.openInterest), color: 'hsl(var(--text-primary))' },
          { label: 'Funding Rate', value: `${priceData.fundingRate > 0 ? '+' : ''}${priceData.fundingRate.toFixed(4)}%`, color: priceData.fundingRate >= 0 ? 'hsl(155 65% 48%)' : 'hsl(0 72% 58%)' },
        ].map((s) => (
          <div key={s.label} style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: 'hsl(var(--text-muted))', marginBottom: 1 }}>{s.label}</div>
            <div className="font-mono" style={{ fontSize: 12, color: s.color, fontWeight: 500 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 16 }}>
        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div className="live-dot" />
          <span style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>LIVE</span>
        </div>

        {/* Network */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '4px 8px', borderRadius: 4,
          background: 'hsl(155 65% 48% / 0.1)',
          border: '1px solid hsl(155 65% 48% / 0.2)',
        }}>
          <Wifi size={11} color="hsl(155 65% 48%)" />
          <span style={{ fontSize: 11, color: 'hsl(155 65% 48%)', fontWeight: 500 }}>Devnet</span>
        </div>

        {/* Wallet */}
        {connected ? (
          <button
            onClick={() => disconnect()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 6,
              background: 'hsl(var(--bg-card))',
              border: '1px solid hsl(var(--border-medium))',
              color: 'hsl(var(--text-primary))',
              fontSize: 12, fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
            }}
          >
            <Activity size={12} color="hsl(155 65% 48%)" />
            {shortKey}
          </button>
        ) : (
          <button
            onClick={() => setVisible(true)}
            style={{
              padding: '6px 16px', borderRadius: 6,
              background: 'hsl(217 91% 60%)',
              border: 'none',
              color: '#fff',
              fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'hsl(217 91% 52%)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'hsl(217 91% 60%)')}
          >
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
}
