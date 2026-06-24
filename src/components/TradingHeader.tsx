import { useState, useEffect, useCallback } from 'react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { Link } from 'react-router-dom';
import { PriceData } from '../hooks/useBtcPrice';
import { connectEVM, getAccounts, onAccountsChanged, onDisconnect, detectProvider } from '../services/evmWallet';
import { connectSolana, disconnectSolana, isSolanaConnected, getSolanaAddress, onSolanaAccountsChanged, onSolanaDisconnect, hasPhantom } from '../services/solanaWallet';
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

// ─── MetaMask Fox ───────────────────────────────────────────────────────────
const MMSvg = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 318.6 318.6" style={{ flexShrink: 0 }}>
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

// ─── Phantom ────────────────────────────────────────────────────────────────
const PhantomSvg = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 34 34" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="17" cy="17" r="17" fill="url(#ph-grad2)"/>
    <path d="M26.6 15.5C26 12 22.7 9 18.4 9h-5.1C10 9 6.2 11.6 5.6 15.9c-.7 3.5-1 5.1-1 7 0 3.6 2.6 6.2 6 6.8 2 .4 4-.4 5.1-2 .6 1.6 2.2 2.7 4 2.7 1.2 0 2.4-.4 3.3-1.2.9.8 2 1.2 3.2 1.2 2.7 0 4.8-2 4.8-4.6 0-2.6-2.1-4.6-4.8-4.6h-5c-1 0-1.8.8-1.8 1.8 0 1 .8 1.8 1.8 1.8h3.2v1.2h-3.2c-1.6 0-3-1.3-3-3s1.3-3 3-3h5c1.8 0 3.2 1.4 3.2 3.1 0 1.7-1.4 3.1-3.2 3.1h-.8c-.4 0-.7-.3-.7-.7 0-.4.3-.7.7-.7h.8c1.1 0 2-.8 2-1.8 0-1-.8-1.8-2-1.8h-6.9c-1 0-1.8-.8-1.8-1.8V16h-.4c0 1-.8 1.8-1.8 1.8s-1.8-.8-1.8-1.8v-1.8h.4v1.8c0 .8.6 1.4 1.4 1.4s1.4-.6 1.4-1.4v-2h.4v1.8c0 1 .8 1.8 1.8 1.8s1.8-.8 1.8-1.8c0-3.2-2.5-5.6-5.6-5.6h-5.2c-3.1 0-5.6 2.4-5.6 5.6 0 1-.8 1.8-1.8 1.8s-1.8-.8-1.8-1.8c0-1 .8-1.8 1.8-1.8S4 15.3 4 14.3c0-3 2.5-5.3 5.3-5.3H20c2.4 0 4.3 1.5 5 3.5-.3-.1-.6-.1-1-.1h-2.3v1.2h.3z" fill="#fff"/>
    <defs>
      <linearGradient id="ph-grad2" x1="0" y1="0" x2="34" y2="34">
        <stop offset="0%" stopColor="#534BB1"/><stop offset="100%" stopColor="#551BF9"/>
      </linearGradient>
    </defs>
  </svg>
);

export default function TradingHeader({ priceData, flashClass }: Props) {
  const { setVisible } = useWalletModal();
  const { connected: solConnected, publicKey, disconnect: solDisconnect } = useWallet();

  // ─── EVM ──────────────────────────────────────────────────────────────────
  const [evmAddress, setEvmAddress] = useState<string | null>(null);
  const [evmLoading, setEvmLoading] = useState(false);
  const [hasMetaMask, setHasMetaMask] = useState(false);

  useEffect(() => {
    setHasMetaMask(!!detectProvider());
    getAccounts().then((accs) => { if (accs.length > 0) setEvmAddress(accs[0]); });
    const u1 = onAccountsChanged((accounts) => setEvmAddress(accounts[0] ?? null));
    const u2 = onDisconnect(() => setEvmAddress(null));
    return () => { u1(); u2(); };
  }, []);

  const handleMetaMask = useCallback(async () => {
    setEvmLoading(true);
    try {
      const { address } = await connectEVM();
      setEvmAddress(address);
    } catch (err: any) { /* error shown via title */ }
    finally { setEvmLoading(false); }
  }, []);

  // ─── Solana (Phantom direct) backup ───────────────────────────────────────
  const [solAddr, setSolAddr] = useState<string | null>(null);
  const [solLoading, setSolLoading] = useState(false);
  const [phantomDetected, setPhantomDetected] = useState(false);

  useEffect(() => {
    setPhantomDetected(hasPhantom());

    isSolanaConnected().then((yes) => {
      if (yes) getSolanaAddress().then((a) => { if (a) setSolAddr(a); });
    });

    const u1 = onSolanaAccountsChanged((pk) => setSolAddr(pk));
    const u2 = onSolanaDisconnect(() => setSolAddr(null));
    return () => { u1(); u2(); };
  }, []);

  const handlePhantom = useCallback(async () => {
    // Try wallet adapter modal first
    if (setVisible) {
      setVisible(true);
      return;
    }
    // Fallback: direct connect
    setSolLoading(true);
    try {
      const { address } = await connectSolana();
      setSolAddr(address);
    } catch (_) {}
    finally { setSolLoading(false); }
  }, [setVisible]);

  const handleSolDisconnect = useCallback(async () => {
    if (solDisconnect) {
      solDisconnect();
      return;
    }
    await disconnectSolana();
    setSolAddr(null);
  }, [solDisconnect]);

  // ─── Derived ──────────────────────────────────────────────────────────────
  const solShort = (publicKey || solAddr)
    ? `${(publicKey?.toBase58() || solAddr || '').slice(0, 4)}...${(publicKey?.toBase58() || solAddr || '').slice(-4)}`
    : null;
  const showSolConnected = solConnected || !!solAddr;

  const evmShort = evmAddress ? `${evmAddress.slice(0, 6)}...${evmAddress.slice(-4)}` : null;
  const isPositive = priceData.changePct24h >= 0;

  return (
    <header style={{
      background: 'hsl(var(--bg-surface))',
      borderBottom: '1px solid hsl(var(--border-subtle))',
      display: 'flex', alignItems: 'center', height: 56,
      padding: '0 14px', gap: 0, position: 'sticky', top: 0, zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 20, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg, hsl(220 80% 45%), hsl(195 75% 40%))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={16} color="#fff" fill="rgba(255,255,255,0.9)" strokeWidth={1.5} />
        </div>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'hsl(var(--text-primary))', letterSpacing: '-0.02em' }}>PerpDEX</span>
      </div>

      {/* Pair */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-medium))', cursor: 'pointer', marginRight: 16, flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-primary))' }}>{priceData.symbol}</span>
        <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: 'hsl(220 80% 45% / 0.2)', color: 'hsl(220 80% 30%)', fontWeight: 600 }}>PERP</span>
        <ChevronDown size={12} color="hsl(200,10%,30%)" />
      </div>

      {/* Price */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginRight: 24 }}>
        <span className={`font-mono ${flashClass}`} style={{ fontSize: 20, fontWeight: 600, color: isPositive ? 'hsl(145 65% 30%)' : 'hsl(0 72% 40%)', letterSpacing: '-0.03em', transition: 'color 0.2s' }}>
          ${fmt(priceData.price)}
        </span>
        <span style={{ fontSize: 12, fontWeight: 500, color: isPositive ? 'hsl(145 65% 30%)' : 'hsl(0 72% 40%)' }}>
          {isPositive ? '+' : ''}{priceData.changePct24h.toFixed(2)}%
        </span>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, flex: 1, overflowX: 'auto', alignItems: 'center' }}>
        {[
          { label: '24h Change', value: `${isPositive ? '+' : ''}$${fmt(Math.abs(priceData.change24h))}`, color: isPositive ? 'hsl(145 65% 30%)' : 'hsl(0 72% 40%)' },
          { label: '24h High', value: `$${fmt(priceData.high24h)}`, color: 'hsl(var(--text-primary))' },
          { label: '24h Low', value: `$${fmt(priceData.low24h)}`, color: 'hsl(var(--text-primary))' },
          { label: '24h Volume', value: fmtBig(priceData.volume24h), color: 'hsl(var(--text-primary))' },
        ].map((s) => (
          <div key={s.label} style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: 'hsl(var(--text-muted))', marginBottom: 1 }}>{s.label}</div>
            <div className="font-mono" style={{ fontSize: 12, color: s.color, fontWeight: 500 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
        {/* Faucets */}
        <Link to="/faucets" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 4, background: 'hsl(220 80% 45% / 0.1)', border: '1px solid hsl(220 80% 45% / 0.2)', color: 'hsl(220 80% 30%)', fontSize: 11, fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          <Droplets size={11} /> Faucets
        </Link>

        {/* Live */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <div className="live-dot" />
          <span style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>LIVE</span>
        </div>

        {/* ─── MetaMask ──────────────────────────────────────────────────── */}
        {evmAddress ? (
          <button onClick={() => setEvmAddress(null)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-medium))', color: 'hsl(var(--text-primary))', fontSize: 11, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <MMSvg size={14} /> {evmShort}
          </button>
        ) : (
          <button
            onClick={handleMetaMask}
            disabled={evmLoading || !hasMetaMask}
            title={!hasMetaMask ? 'Install MetaMask first' : 'Connect with MetaMask'}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 6,
              background: evmLoading ? 'hsl(33 60% 55%)' : 'hsl(33 80% 48%)',
              border: 'none', color: '#fff', fontSize: 11, fontWeight: 600,
              cursor: !hasMetaMask ? 'not-allowed' : evmLoading ? 'wait' : 'pointer',
              opacity: hasMetaMask ? 1 : 0.6, transition: 'background 0.15s, opacity 0.15s', whiteSpace: 'nowrap',
            }}
          >
            <MMSvg size={14} />
            {evmLoading ? 'Connecting...' : !hasMetaMask ? 'No MetaMask' : 'MetaMask'}
          </button>
        )}

        {/* ─── Phantom ───────────────────────────────────────────────────── */}
        {showSolConnected ? (
          <button onClick={handleSolDisconnect} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 6, background: 'hsl(var(--bg-card))', border: '1px solid hsl(var(--border-medium))', color: 'hsl(var(--text-primary))', fontSize: 11, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <PhantomSvg size={16} /> {solShort}
          </button>
        ) : (
          <button
            onClick={handlePhantom}
            disabled={solLoading || !phantomDetected}
            title={!phantomDetected ? 'Install Phantom first' : 'Connect Phantom'}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 6,
              background: solLoading ? 'hsl(260 60% 50%)' : 'hsl(260 80% 45%)',
              border: 'none', color: '#fff', fontSize: 11, fontWeight: 600,
              cursor: !phantomDetected ? 'not-allowed' : solLoading ? 'wait' : 'pointer',
              opacity: phantomDetected ? 1 : 0.6, transition: 'background 0.15s, opacity 0.15s', whiteSpace: 'nowrap',
            }}
          >
            <PhantomSvg size={16} />
            {solLoading ? 'Connecting...' : !phantomDetected ? 'No Phantom' : 'Phantom'}
          </button>
        )}
      </div>
    </header>
  );
}
