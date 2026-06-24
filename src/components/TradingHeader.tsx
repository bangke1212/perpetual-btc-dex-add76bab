import { useState, useEffect, useCallback } from 'react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { Link } from 'react-router-dom';
import { PriceData } from '../hooks/useBtcPrice';
import { getEVM, onAccountsChanged, onDisconnect } from '../services/evmWallet';
import { Activity, Zap, ChevronDown, Wifi, Droplets } from 'lucide-react';

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

// ─── MetaMask Fox Icon (inline SVG) ─────────────────────────────────────────
function MetaMaskIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 318.6 318.6" fill="none">
      <polygon fill="#E2761B" points="274.1,35.5 174.6,109.4 193,65.8" />
      <polygon fill="#E4761B" points="44.4,35.5 143.1,110.1 125.6,65.8" />
      <polygon fill="#E4761B" points="238.3,206.8 211.8,247.4 268.5,263 284.8,207.7" />
      <polygon fill="#E4761B" points="33.9,207.7 50.1,263 106.8,247.4 80.3,206.8" />
      <polygon fill="#F6851B" points="103.6,138.2 87.8,162.1 144.1,164.6 142.1,104.1" />
      <polygon fill="#F6851B" points="214.9,138.2 175.9,103.4 174.6,164.6 230.8,162.1" />
      <polygon fill="#D7C1B3" points="106.8,247.4 140.6,230.9 111.4,208.1" />
      <polygon fill="#D7C1B3" points="177.9,230.9 211.8,247.4 207.1,208.1" />
      <polygon fill="#2F343B" points="211.8,247.4 177.9,230.9 180.6,253 180.3,262.3" />
      <polygon fill="#2F343B" points="106.8,247.4 138.3,262.3 138.1,253 140.6,230.9" />
      <polygon fill="#D7C1B3" points="138.8,193.5 110.6,185.2 130.5,176.1" />
      <polygon fill="#D7C1B3" points="179.7,193.5 188,176.1 208,185.2" />
      <polygon fill="#233447" points="106.8,247.4 111.6,206.8 80.3,207.7" />
      <polygon fill="#233447" points="207.1,206.8 211.8,247.4 238.3,207.7" />
      <polygon fill="#E2761B" points="230.8,162.1 174.6,164.6 179.8,193.5 188.1,176.1 208.1,185.2" />
      <polygon fill="#E2761B" points="87.8,162.1 110.6,185.2 130.6,176.1 138.8,193.5 144.1,164.6" />
      <polygon fill="#E2761B" points="144.1,164.6 138.8,193.5 145.4,227.6 146.9,182.7" />
      <polygon fill="#E2761B" points="174.6,164.6 173.3,182.6 174,227.6 179.8,193.5" />
      <polygon fill="#F6851B" points="179.8,193.5 174,227.6 177.9,230.9 207.1,208.1 208.1,185.2" />
      <polygon fill="#F6851B" points="110.6,185.2 111.4,208.1 140.6,230.9 138.8,193.5 145.4,227.6" />
      <polygon fill="#E4761B" points="180.3,262.3 180.6,253 178.1,250.8 140.4,250.8 138.1,253 138.3,262.3 106.8,247.4 117.8,256.4 140.1,271.9 178.4,271.9 200.8,256.4 211.8,247.4" />
      <polygon fill="#F6851B" points="178.4,271.9 140.1,271.9 117.8,256.4 106.8,247.4" />
      <polygon fill="#C0AD9E" points="178.4,271.9 200.8,256.4 211.8,247.4 238.3,207.7" />
      <polygon fill="#CD6116" points="238.3,207.7 211.8,247.4 207.1,208.1" />
      <polygon fill="#F6851B" points="211.8,247.4 106.8,247.4 117.8,256.4" />
      <polygon fill="#C0AD9E" points="140.1,271.9 117.8,256.4 106.8,247.4 80.3,207.7" />
      <polygon fill="#CD6116" points="80.3,207.7 106.8,247.4 111.4,208.1" />
      <polygon fill="#F6851B" points="178.4,271.9 200.8,256.4 117.8,256.4 140.1,271.9" />
      <polygon fill="#233447" points="117.8,256.4 200.8,256.4 211.8,247.4 106.8,247.4" />
      <polygon fill="#C0AD9E" points="178.4,271.9 200.8,256.4 211.8,247.4" />
    </svg>
  );
}

// ─── Phantom Icon ───────────────────────────────────────────────────────────
function PhantomIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="none">
      <circle cx="64" cy="64" r="64" fill="url(#ph-grad)" />
      <path d="M110.32 59.84C108.48 42.56 93.76 28.8 75.2 28.8H52.8c-17.92 0-32.64 13.76-34.4 31.04C16.48 63.84 16 68.96 16 74.72c0 14.08 8.32 25.6 20.8 28.48h.16c7.68 1.76 15.36-1.6 19.84-8.16 2.56 6.56 8.8 10.88 16.16 10.88 4.8 0 9.28-1.76 12.8-4.96 3.52 3.2 7.84 4.96 12.64 4.96 10.56 0 19.04-8.48 19.04-18.88 0-10.4-8.48-18.88-19.04-18.88h-19.84c-3.84 0-7.04 3.2-7.04 7.04 0 3.84 3.2 7.04 7.04 7.04h12.8v4.8h-12.8c-6.56 0-11.84-5.28-11.84-11.84s5.28-11.84 11.84-11.84h19.84c7.04 0 12.8 5.76 12.8 12.64 0 6.88-5.76 12.64-12.8 12.64h-3.2c-1.28 0-2.56-1.12-2.56-2.56s1.28-2.56 2.56-2.56h3.2c4.32 0 7.84-3.36 7.84-7.52 0-4.16-3.52-7.52-7.84-7.52H82.4c-3.84 0-7.04-3.2-7.04-7.04V56h-1.28c0 3.84-3.2 7.04-7.04 7.04s-7.04-3.2-7.04-7.04v-7.04h1.28v7.04c0 3.2 2.56 5.76 5.76 5.76s5.76-2.56 5.76-5.76V48.96h1.28v7.04c0 3.84 3.2 7.04 7.04 7.04 3.84 0 7.04-3.2 7.04-7.04 0-12.32-9.92-22.24-22.24-22.24H52.8c-12.32 0-22.24 9.92-22.24 22.24 0 3.84-3.2 7.04-7.04 7.04s-7.04-3.2-7.04-7.04c0-3.84 3.2-7.04 7.04-7.04 3.84 0 7.04 3.2 7.04 7.04 0 4.48 3.52 8 8 8s8-3.52 8-8c0-11.68 9.6-21.12 21.12-21.12H80c9.12 0 16.96 5.76 19.84 13.76-1.28-.16-2.56-.16-3.84-.16h-8.96v4.64z" fill="#fff"/>
      <defs>
        <linearGradient id="ph-grad" x1="0" y1="0" x2="128" y2="128">
          <stop offset="0%" stopColor="#534BB1"/>
          <stop offset="100%" stopColor="#551BF9"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function TradingHeader({ priceData, flashClass }: Props) {
  const { setVisible } = useWalletModal();
  const { connected: solConnected, publicKey, disconnect: solDisconnect } = useWallet();

  // ─── EVM State ──────────────────────────────────────────────────────────
  const [evmAddress, setEvmAddress] = useState<string | null>(null);
  const [evmConnecting, setEvmConnecting] = useState(false);

  // Check if already connected on mount
  useEffect(() => {
    getEVM().isConnected().then((yes) => {
      if (yes) {
        getEVM().getAccounts().then((accs) => {
          if (accs.length > 0) setEvmAddress(accs[0]);
        });
      }
    });

    const unsub1 = onAccountsChanged((accounts) => {
      if (accounts.length === 0) setEvmAddress(null);
      else setEvmAddress(accounts[0]);
    });
    const unsub2 = onDisconnect(() => setEvmAddress(null));

    return () => { unsub1(); unsub2(); };
  }, []);

  const handleEVMConnect = useCallback(async () => {
    setEvmConnecting(true);
    try {
      const { address } = await getEVM().connect();
      setEvmAddress(address);
    } catch (err: any) {
      console.warn('[EVM] Connect failed:', err.message);
    } finally {
      setEvmConnecting(false);
    }
  }, []);

  const handleEVMDisconnect = useCallback(() => {
    setEvmAddress(null);
  }, []);

  // ─── Derived ──────────────────────────────────────────────────────────────
  const solShort = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : null;
  const evmShort = evmAddress
    ? `${evmAddress.slice(0, 6)}...${evmAddress.slice(-4)}`
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
          background: 'linear-gradient(135deg, hsl(220 80% 45%), hsl(195 75% 40%))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Zap size={16} color="#fff" fill="rgba(255,255,255,0.9)" strokeWidth={1.5} />
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
        <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-primary))' }}>{priceData.symbol}</span>
        <span style={{
          fontSize: 10, padding: '1px 5px', borderRadius: 3,
          background: 'hsl(220 80% 45% / 0.2)', color: 'hsl(220 80% 30%)',
          fontWeight: 600,
        }}>PERP</span>
        <ChevronDown size={12} color="hsl(200,10%,30%)" />
      </div>

      {/* Price */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginRight: 28 }}>
        <span
          className={`font-mono ${flashClass}`}
          style={{
            fontSize: 20,
            fontWeight: 600,
            color: isPositive ? 'hsl(145 65% 30%)' : 'hsl(0 72% 40%)',
            letterSpacing: '-0.03em',
            transition: 'color 0.2s',
          }}
        >
          ${fmt(priceData.price)}
        </span>
        <span style={{
          fontSize: 12, fontWeight: 500,
          color: isPositive ? 'hsl(145 65% 30%)' : 'hsl(0 72% 40%)',
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
          { label: '24h Change', value: `${isPositive ? '+' : ''}$${fmt(Math.abs(priceData.change24h))}`, color: isPositive ? 'hsl(145 65% 30%)' : 'hsl(0 72% 40%)' },
          { label: '24h High', value: `$${fmt(priceData.high24h)}`, color: 'hsl(var(--text-primary))' },
          { label: '24h Low', value: `$${fmt(priceData.low24h)}`, color: 'hsl(var(--text-primary))' },
          { label: '24h Volume', value: fmtBig(priceData.volume24h), color: 'hsl(var(--text-primary))' },
          { label: 'Open Interest', value: fmtBig(priceData.openInterest), color: 'hsl(var(--text-primary))' },
          { label: 'Funding Rate', value: `${priceData.fundingRate > 0 ? '+' : ''}${priceData.fundingRate.toFixed(4)}%`, color: priceData.fundingRate >= 0 ? 'hsl(145 65% 30%)' : 'hsl(0 72% 40%)' },
        ].map((s) => (
          <div key={s.label} style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: 'hsl(var(--text-muted))', marginBottom: 1 }}>{s.label}</div>
            <div className="font-mono" style={{ fontSize: 12, color: s.color, fontWeight: 500 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, marginLeft: 16 }}>
        {/* Faucets link */}
        <Link
          to="/faucets"
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 4,
            background: 'hsl(220 80% 45% / 0.1)',
            border: '1px solid hsl(220 80% 45% / 0.2)',
            color: 'hsl(220 80% 30%)',
            fontSize: 11, fontWeight: 500,
            textDecoration: 'none',
            fontFamily: 'var(--font-display)',
            transition: 'all 0.15s',
          }}
        >
          <Droplets size={11} />
          Faucets
        </Link>

        {/* Live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div className="live-dot" />
          <span style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>LIVE</span>
        </div>

        {/* Network */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '4px 8px', borderRadius: 4,
          background: 'hsl(145 65% 30% / 0.1)',
          border: '1px solid hsl(145 65% 30% / 0.2)',
        }}>
          <Wifi size={11} color="hsl(145 65% 30%)" />
          <span style={{ fontSize: 11, color: 'hsl(145 65% 30%)', fontWeight: 600 }}>Devnet</span>
        </div>

        {/* ─── EVM (MetaMask) Wallet ──────────────────────────────────────── */}
        {evmAddress ? (
          <button
            onClick={handleEVMDisconnect}
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
            <MetaMaskIcon size={16} />
            {evmShort}
          </button>
        ) : solConnected ? null : (
          <button
            onClick={handleEVMConnect}
            disabled={evmConnecting}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 6,
              background: 'hsl(33 80% 48%)',
              border: 'none',
              color: '#fff',
              fontSize: 12, fontWeight: 600,
              cursor: evmConnecting ? 'wait' : 'pointer',
              fontFamily: 'var(--font-display)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { if (!evmConnecting) e.currentTarget.style.background = 'hsl(33 80% 40%)'; }}
            onMouseLeave={(e) => { if (!evmConnecting) e.currentTarget.style.background = 'hsl(33 80% 48%)'; }}
          >
            <MetaMaskIcon size={16} />
            {evmConnecting ? 'Connecting...' : 'MetaMask'}
          </button>
        )}

        {/* ─── Solana (Phantom) Wallet ────────────────────────────────────── */}
        {solConnected ? (
          <button
            onClick={() => solDisconnect()}
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
            <PhantomIcon size={16} />
            {solShort}
          </button>
        ) : evmAddress ? null : (
          <button
            onClick={() => setVisible(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 16px', borderRadius: 6,
              background: 'hsl(260 80% 45%)',
              border: 'none',
              color: '#fff',
              fontSize: 13, fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'hsl(260 80% 38%)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'hsl(260 80% 45%)')}
          >
            <PhantomIcon size={16} />
            Connect Wallet
          </button>
        )}

        {/* If both connected, show both badges side by side */}
        {solConnected && evmAddress ? (
          <button
            onClick={() => setVisible(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 6,
              background: 'hsl(260 80% 45%)',
              border: 'none',
              color: '#fff',
              fontSize: 12, fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'var(--font-display)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'hsl(260 80% 38%)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'hsl(260 80% 45%)')}
          >
            <PhantomIcon size={16} />
            {solShort}
          </button>
        ) : null}
      </div>
    </header>
  );
}
