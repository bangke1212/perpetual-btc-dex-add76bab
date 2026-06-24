import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PriceData } from '../hooks/useBtcPrice';
import { Zap, ChevronDown, Wifi, Droplets } from 'lucide-react';

/* ─── Types ───────────────────────────────────────────────────────────────── */

interface EIP1193Provider {
  request(args: { method: string; params?: any[] }): Promise<any>;
  on(event: string, cb: (...args: any[]) => void): void;
  removeListener(event: string, cb: (...args: any[]) => void): void;
  isMetaMask?: boolean;
  providers?: EIP1193Provider[];
}

interface SolanaProvider {
  isPhantom?: boolean;
  isConnected: boolean;
  publicKey: { toString(): string } | null;
  connect(): Promise<{ publicKey: { toString(): string } }>;
  disconnect(): Promise<void>;
  on(event: string, cb: () => void): void;
  removeListener(event: string, cb: () => void): void;
}

/* ─── Detection ───────────────────────────────────────────────────────────── */

function getEthProvider(): EIP1193Provider | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  const eth = w.ethereum;
  if (!eth) return null;
  if (eth.providers?.length) {
    return eth.providers.find((p: any) => p.isMetaMask) || eth.providers[0];
  }
  return eth;
}

function getSolProvider(): SolanaProvider | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  const sol = w.solana || w.phantom?.solana;
  if (sol?.isPhantom) return sol;
  if (sol && 'connect' in sol) return sol;
  return null;
}

/* ─── Inline Icons ────────────────────────────────────────────────────────── */

const Fox = ({ s = 16 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 319 319" style={{ flexShrink: 0 }}>
    <polygon fill="#E2761B" points="274,36 175,110 193,66"/>
    <polygon fill="#E4761B" points="44,36 143,110 126,66"/>
    <polygon fill="#E4761B" points="238,207 212,247 268,263 285,208"/>
    <polygon fill="#E4761B" points="34,208 50,263 107,247 80,207"/>
    <polygon fill="#F6851B" points="104,138 88,162 144,165 142,104"/>
    <polygon fill="#F6851B" points="215,138 176,103 175,165 231,162"/>
    <polygon fill="#D7C1B3" points="107,247 141,231 111,208"/>
    <polygon fill="#D7C1B3" points="178,231 212,247 207,208"/>
    <polygon fill="#2F343B" points="212,247 178,231 181,253 180,262"/>
    <polygon fill="#2F343B" points="107,247 138,262 138,253 141,231"/>
    <polygon fill="#D7C1B3" points="139,194 111,185 131,176"/>
    <polygon fill="#D7C1B3" points="180,194 188,176 208,185"/>
    <polygon fill="#233447" points="107,247 112,207 80,208"/>
    <polygon fill="#233447" points="207,207 212,247 238,208"/>
    <polygon fill="#E2761B" points="231,162 175,165 180,194 188,176 208,185"/>
    <polygon fill="#E2761B" points="88,162 111,185 131,176 139,194 144,165"/>
    <polygon fill="#E2761B" points="144,165 139,194 145,228 147,183"/>
    <polygon fill="#E2761B" points="175,165 173,183 174,228 180,194"/>
    <polygon fill="#F6851B" points="180,194 174,228 178,231 207,208 208,185"/>
    <polygon fill="#F6851B" points="111,185 111,208 141,231 139,194 145,228"/>
    <polygon fill="#E4761B" points="180,262 181,253 178,251 140,251 138,253 138,262 107,247 118,256 140,272 178,272 201,256 212,247"/>
    <polygon fill="#F6851B" points="178,272 140,272 118,256 107,247"/>
    <polygon fill="#C0AD9E" points="178,272 201,256 212,247 238,208"/>
    <polygon fill="#CD6116" points="238,208 212,247 207,207"/>
    <polygon fill="#F6851B" points="212,247 107,247 118,256"/>
    <polygon fill="#C0AD9E" points="140,272 118,256 107,247 80,208"/>
    <polygon fill="#CD6116" points="80,208 107,247 111,208"/>
    <polygon fill="#F6851B" points="178,272 201,256 118,256 140,272"/>
    <polygon fill="#233447" points="118,256 201,256 212,247 107,247"/>
    <polygon fill="#C0AD9E" points="178,272 201,256 212,247"/>
  </svg>
);

const Ghost = ({ s = 18 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 34 34" fill="none" style={{ flexShrink: 0 }}>
    <circle cx="17" cy="17" r="17" fill="url(#ph)"/>
    <path d="M26.6 15.5C26 12 22.7 9 18.4 9h-5.1C10 9 6.2 11.6 5.6 15.9c-.7 3.5-1 5.1-1 7 0 3.6 2.6 6.2 6 6.8 2 .4 4-.4 5.1-2 .6 1.6 2.2 2.7 4 2.7 1.2 0 2.4-.4 3.3-1.2.9.8 2 1.2 3.2 1.2 2.7 0 4.8-2 4.8-4.6 0-2.6-2.1-4.6-4.8-4.6h-5c-1 0-1.8.8-1.8 1.8 0 1 .8 1.8 1.8 1.8h3.2v1.2h-3.2c-1.6 0-3-1.3-3-3s1.3-3 3-3h5c1.8 0 3.2 1.4 3.2 3.1 0 1.7-1.4 3.1-3.2 3.1h-.8c-.4 0-.7-.3-.7-.7 0-.4.3-.7.7-.7h.8c1.1 0 2-.8 2-1.8 0-1-.8-1.8-2-1.8h-6.9c-1 0-1.8-.8-1.8-1.8V16h-.4c0 1-.8 1.8-1.8 1.8s-1.8-.8-1.8-1.8v-1.8h.4v1.8c0 .8.6 1.4 1.4 1.4s1.4-.6 1.4-1.4v-2h.4v1.8c0 1 .8 1.8 1.8 1.8s1.8-.8 1.8-1.8c0-3.2-2.5-5.6-5.6-5.6h-5.2c-3.1 0-5.6 2.4-5.6 5.6 0 1-.8 1.8-1.8 1.8s-1.8-.8-1.8-1.8c0-1 .8-1.8 1.8-1.8S4 15.3 4 14.3c0-3 2.5-5.3 5.3-5.3H20c2.4 0 4.3 1.5 5 3.5-.3-.1-.6-.1-1-.1h-2.3v1.2h.3z" fill="#fff"/>
    <defs><linearGradient id="ph" x1="0" y1="0" x2="34" y2="34"><stop offset="0%" stopColor="#534BB1"/><stop offset="100%" stopColor="#551BF9"/></linearGradient></defs>
  </svg>
);

/* ─── Utils ───────────────────────────────────────────────────────────────── */

function fmt(n: number, d = 2) { return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }); }
function fmtBig(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  return `$${fmt(n)}`;
}

interface Props { priceData: PriceData; flashClass: string; }

export default function TradingHeader({ priceData, flashClass }: Props) {

  /* ─── MetaMask ────────────────────────────────────────────────────────── */
  const [mmAddr, setMmAddr] = useState('');
  const [mmBusy, setMmBusy] = useState(false);
  const [mmOk, setMmOk] = useState(false);

  useEffect(() => { setMmOk(!!getEthProvider()); }, []);

  useEffect(() => {
    const p = getEthProvider();
    if (!p) return;
    try { p.request({ method: 'eth_accounts' }).then((a: string[]) => a[0] && setMmAddr(a[0])); } catch {}
    const aCb = (a: string[]) => setMmAddr(a[0] || '');
    const dCb = () => setMmAddr('');
    p.on('accountsChanged', aCb); p.on('disconnect', dCb);
    return () => { try { p.removeListener('accountsChanged', aCb); } catch {} try { p.removeListener('disconnect', dCb); } catch {} };
  }, []);

  const connectMM = useCallback(async () => {
    const p = getEthProvider();
    if (!p) {
      // Open MetaMask in-app browser or download page
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        // Deep link to MetaMask mobile browser
        window.location.href = `https://metamask.app.link/dapp/${window.location.host}${window.location.pathname}`;
      } else {
        window.open('https://metamask.io/download/', '_blank');
      }
      return;
    }
    setMmBusy(true);
    try {
      const accs: string[] = await p.request({ method: 'eth_requestAccounts' });
      if (accs[0]) setMmAddr(accs[0]);
    } catch {}
    setMmBusy(false);
  }, []);

  /* ─── Phantom ─────────────────────────────────────────────────────────── */
  const [phAddr, setPhAddr] = useState('');
  const [phBusy, setPhBusy] = useState(false);
  const [phOk, setPhOk] = useState(false);

  useEffect(() => { setPhOk(!!getSolProvider()); }, []);

  useEffect(() => {
    const p = getSolProvider();
    if (!p) return;
    try { if (p.isConnected && p.publicKey) setPhAddr(p.publicKey.toString()); } catch {}
    const aCb = () => {
      try { setPhAddr(p.publicKey?.toString() || ''); } catch { setPhAddr(''); }
    };
    const dCb = () => setPhAddr('');
    p.on('accountChanged', aCb); p.on('disconnect', dCb);
    return () => { try { p.removeListener('accountChanged', aCb); } catch {} try { p.removeListener('disconnect', dCb); } catch {} };
  }, []);

  const connectPH = useCallback(async () => {
    const p = getSolProvider();
    if (!p) {
      // Open Phantom browser or download page
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile) {
        // Phantom mobile deep link
        window.location.href = `https://phantom.app/ul/browse/${window.location.href.replace(/^https?:\/\//, '')}`;
      } else {
        window.open('https://phantom.app/download', '_blank');
      }
      return;
    }
    setPhBusy(true);
    try {
      await p.connect();
      setPhAddr(p.publicKey?.toString() || '');
    } catch {}
    setPhBusy(false);
  }, []);

  const disconnectPH = useCallback(async () => {
    const p = getSolProvider();
    try { await p!.disconnect(); } catch {}
    setPhAddr('');
  }, []);

  /* ─── Display ─────────────────────────────────────────────────────────── */
  const mmShort = mmAddr ? `${mmAddr.slice(0, 6)}...${mmAddr.slice(-4)}` : '';
  const phShort = phAddr ? `${phAddr.slice(0, 4)}...${phAddr.slice(-4)}` : '';
  const pos = priceData.changePct24h >= 0;
  const c = (v: string) => `hsl(${v})`;

  const btn = (bg: string, hover: string) => ({
    display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
    borderRadius: 6, border: 'none', color: '#fff', fontSize: 11, fontWeight: 600,
    cursor: 'pointer', whiteSpace: 'nowrap' as const, background: bg, transition: 'background .15s',
    fontFamily: 'var(--font-display)',
  });

  return (
    <header style={{
      background: c('var(--bg-surface)'), borderBottom: `1px solid ${c('var(--border-subtle)')}`,
      display: 'flex', alignItems: 'center', height: 56, padding: '0 14px', gap: 0,
      position: 'sticky', top: 0, zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 20, flexShrink: 0 }}>
        <div style={{ width: 28, height: 28, borderRadius: 6, background: `linear-gradient(135deg, ${c('220 80% 45%')}, ${c('195 75% 40%')})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Zap size={16} color="#fff" fill="rgba(255,255,255,0.9)" strokeWidth={1.5} />
        </div>
        <span style={{ fontWeight: 700, fontSize: 15, color: c('var(--text-primary)'), letterSpacing: '-0.02em' }}>PerpDEX</span>
      </div>

      {/* Pair */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: c('var(--bg-card)'), border: `1px solid ${c('var(--border-medium)')}`, marginRight: 16, flexShrink: 0 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: c('var(--text-primary)') }}>{priceData.symbol}</span>
        <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 3, background: c('220 80% 45% / 0.2'), color: c('220 80% 30%)'), fontWeight: 600 }}>PERP</span>
        <ChevronDown size={12} color="hsl(200,10%,30%)" />
      </div>

      {/* Price */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginRight: 24 }}>
        <span className={`font-mono ${flashClass}`} style={{ fontSize: 20, fontWeight: 600, color: pos ? c('145 65% 30%)') : c('0 72% 40%)'), letterSpacing: '-0.03em' }}>
          ${fmt(priceData.price)}
        </span>
        <span style={{ fontSize: 12, fontWeight: 500, color: pos ? c('145 65% 30%)') : c('0 72% 40%)') }}>
          {pos ? '+' : ''}{priceData.changePct24h.toFixed(2)}%
        </span>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 16, flex: 1, overflowX: 'auto', alignItems: 'center' }}>
        {[
          ['24h Change', `${pos ? '+' : ''}$${fmt(Math.abs(priceData.change24h))}`, pos ? '145 65% 30%' : '0 72% 40%'],
          ['24h High', `$${fmt(priceData.high24h)}`, 'var(--text-primary)'],
          ['24h Low', `$${fmt(priceData.low24h)}`, 'var(--text-primary)'],
          ['24h Volume', fmtBig(priceData.volume24h), 'var(--text-primary)'],
        ].map(([l, v, clr]) => (
          <div key={l as string} style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: c('var(--text-muted)'), marginBottom: 1 }}>{l}</div>
            <div className="font-mono" style={{ fontSize: 12, color: c(clr as string), fontWeight: 500 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Right buttons */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
        <Link to="/faucets" style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 4, background: c('220 80% 45% / 0.1'), border: `1px solid ${c('220 80% 45% / 0.2')}`, color: c('220 80% 30%)'), fontSize: 11, fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap' }}>
          <Droplets size={11} /> Faucets
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          <div className="live-dot" />
          <span style={{ fontSize: 11, color: c('var(--text-muted)') }}>LIVE</span>
        </div>

        {/* ─── MetaMask ──────────────────────────────────────────────────── */}
        {mmAddr ? (
          <button onClick={() => setMmAddr('')} style={{ ...btn(c('var(--bg-card)'), c('var(--bg-card)')), color: c('var(--text-primary)'), border: `1px solid ${c('var(--border-medium)')}`, background: c('var(--bg-card)') }}>
            <Fox s={14} /> {mmShort}
          </button>
        ) : (
          <button
            onClick={connectMM} disabled={mmBusy}
            style={{ ...btn(mmBusy ? 'hsl(33,60%,55%)' : 'hsl(33,80%,48%)', 'hsl(33,80%,40%)'), opacity: 1, cursor: mmBusy ? 'wait' : 'pointer' }}
          >
            <Fox s={14} /> {mmBusy ? 'Connecting...' : mmOk ? 'MetaMask' : 'Install MetaMask'}
          </button>
        )}

        {/* ─── Phantom ───────────────────────────────────────────────────── */}
        {phAddr ? (
          <button onClick={disconnectPH} style={{ ...btn(c('var(--bg-card)'), c('var(--bg-card)')), color: c('var(--text-primary)'), border: `1px solid ${c('var(--border-medium)')}`, background: c('var(--bg-card)') }}>
            <Ghost s={16} /> {phShort}
          </button>
        ) : (
          <button
            onClick={connectPH} disabled={phBusy}
            style={{ ...btn(phBusy ? 'hsl(260,60%,50%)' : 'hsl(260,80%,45%)', 'hsl(260,80%,38%)'), opacity: 1, cursor: phBusy ? 'wait' : 'pointer' }}
          >
            <Ghost s={16} /> {phBusy ? 'Connecting...' : phOk ? 'Phantom' : 'Install Phantom'}
          </button>
        )}
      </div>
    </header>
  );
}
