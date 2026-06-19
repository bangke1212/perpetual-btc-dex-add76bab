import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ExternalLink, Search, Zap, ArrowLeft, Droplets,
  Copy, Check, Shield, Clock, Coins,
} from 'lucide-react';

/* ─── Faucet data ───────────────────────────────────────────────────────────── */

interface Faucet {
  network: string;
  chainId: number;
  token: string;
  url: string;
  provider: string;
  amount: string;
  cooldown: string;
  requiresAuth: boolean;
  authType?: string;
  rpcUrl: string;
  explorer: string;
  category: 'L1' | 'L2' | 'Sidechain' | 'Appchain';
  logo: string;
  color: string;
}

const FAUCETS: Faucet[] = [
  // ─── Ethereum Testnets ─────────────────────────
  {
    network: 'Sepolia',
    chainId: 11155111,
    token: 'SepoliaETH',
    url: 'https://cloud.google.com/application/web3/faucet/ethereum/sepolia',
    provider: 'Google Cloud',
    amount: '0.05 ETH',
    cooldown: '24h',
    requiresAuth: true,
    authType: 'Google Account',
    rpcUrl: 'https://rpc.sepolia.org',
    explorer: 'https://sepolia.etherscan.io',
    category: 'L1',
    logo: 'Ξ',
    color: '217 91% 60%',
  },
  {
    network: 'Sepolia (Alchemy)',
    chainId: 11155111,
    token: 'SepoliaETH',
    url: 'https://www.alchemy.com/faucets/ethereum-sepolia',
    provider: 'Alchemy',
    amount: '0.5 ETH',
    cooldown: '24h',
    requiresAuth: true,
    authType: 'Alchemy Account',
    rpcUrl: 'https://eth-sepolia.g.alchemy.com/v2/demo',
    explorer: 'https://sepolia.etherscan.io',
    category: 'L1',
    logo: 'Ξ',
    color: '217 91% 60%',
  },
  {
    network: 'Sepolia (Infura)',
    chainId: 11155111,
    token: 'SepoliaETH',
    url: 'https://www.infura.io/faucet/sepolia',
    provider: 'Infura',
    amount: '0.5 ETH',
    cooldown: '24h',
    requiresAuth: true,
    authType: 'Infura Account',
    rpcUrl: 'https://sepolia.infura.io/v3/',
    explorer: 'https://sepolia.etherscan.io',
    category: 'L1',
    logo: 'Ξ',
    color: '217 91% 60%',
  },
  {
    network: 'Holesky',
    chainId: 17000,
    token: 'HoleskyETH',
    url: 'https://cloud.google.com/application/web3/faucet/ethereum/holesky',
    provider: 'Google Cloud',
    amount: '1 ETH',
    cooldown: '24h',
    requiresAuth: true,
    authType: 'Google Account',
    rpcUrl: 'https://ethereum-holesky-rpc.publicnode.com',
    explorer: 'https://holesky.etherscan.io',
    category: 'L1',
    logo: 'Ξ',
    color: '270 60% 55%',
  },
  // ─── L2 Testnets ───────────────────────────────
  {
    network: 'Arbitrum Sepolia',
    chainId: 421614,
    token: 'ArbSepoliaETH',
    url: 'https://www.alchemy.com/faucets/arbitrum-sepolia',
    provider: 'Alchemy',
    amount: '0.5 ETH',
    cooldown: '24h',
    requiresAuth: true,
    authType: 'Alchemy Account',
    rpcUrl: 'https://sepolia-rollup.arbitrum.io/rpc',
    explorer: 'https://sepolia.arbiscan.io',
    category: 'L2',
    logo: 'A',
    color: '210 80% 55%',
  },
  {
    network: 'Optimism Sepolia',
    chainId: 11155420,
    token: 'OpSepoliaETH',
    url: 'https://www.alchemy.com/faucets/optimism-sepolia',
    provider: 'Alchemy',
    amount: '0.5 ETH',
    cooldown: '24h',
    requiresAuth: true,
    authType: 'Alchemy Account',
    rpcUrl: 'https://sepolia.optimism.io',
    explorer: 'https://sepolia-optimistic.etherscan.io',
    category: 'L2',
    logo: 'O',
    color: '0 80% 55%',
  },
  {
    network: 'Base Sepolia',
    chainId: 84532,
    token: 'BaseSepoliaETH',
    url: 'https://www.alchemy.com/faucets/base-sepolia',
    provider: 'Alchemy',
    amount: '0.5 ETH',
    cooldown: '24h',
    requiresAuth: true,
    authType: 'Alchemy Account',
    rpcUrl: 'https://sepolia.base.org',
    explorer: 'https://sepolia.basescan.org',
    category: 'L2',
    logo: 'B',
    color: '220 75% 55%',
  },
  {
    network: 'Blast Sepolia',
    chainId: 168587773,
    token: 'BlastSepoliaETH',
    url: 'https://docs.blast.io/building/tools/faucets',
    provider: 'Blast',
    amount: '0.02 ETH',
    cooldown: '12h',
    requiresAuth: false,
    rpcUrl: 'https://sepolia.blast.io',
    explorer: 'https://sepolia.blastscan.io',
    category: 'L2',
    logo: '⚡',
    color: '50 90% 52%',
  },
  {
    network: 'Scroll Sepolia',
    chainId: 534351,
    token: 'ScrollSepoliaETH',
    url: 'https://docs.scroll.io/en/user-guide/faucet/',
    provider: 'Scroll',
    amount: '0.01 ETH',
    cooldown: '24h',
    requiresAuth: false,
    rpcUrl: 'https://sepolia-rpc.scroll.io',
    explorer: 'https://sepolia.scrollscan.com',
    category: 'L2',
    logo: 'S',
    color: '35 85% 55%',
  },
  {
    network: 'zkSync Sepolia',
    chainId: 300,
    token: 'zkSepoliaETH',
    url: 'https://www.alchemy.com/faucets/zksync-sepolia',
    provider: 'Alchemy',
    amount: '0.5 ETH',
    cooldown: '24h',
    requiresAuth: true,
    authType: 'Alchemy Account',
    rpcUrl: 'https://sepolia.era.zksync.dev',
    explorer: 'https://sepolia.explorer.zksync.io',
    category: 'L2',
    logo: 'Z',
    color: '260 70% 58%',
  },
  {
    network: 'Linea Sepolia',
    chainId: 59141,
    token: 'LineaSepoliaETH',
    url: 'https://www.infura.io/faucet/linea',
    provider: 'Infura',
    amount: '0.5 ETH',
    cooldown: '24h',
    requiresAuth: true,
    authType: 'Infura Account',
    rpcUrl: 'https://rpc.sepolia.linea.build',
    explorer: 'https://sepolia.lineascan.build',
    category: 'L2',
    logo: 'L',
    color: '170 50% 45%',
  },
  {
    network: 'Polygon Amoy',
    chainId: 80002,
    token: 'MATIC',
    url: 'https://www.alchemy.com/faucets/polygon-amoy',
    provider: 'Alchemy',
    amount: '0.5 MATIC',
    cooldown: '24h',
    requiresAuth: true,
    authType: 'Alchemy Account',
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    explorer: 'https://amoy.polygonscan.com',
    category: 'Sidechain',
    logo: 'P',
    color: '270 75% 55%',
  },
  {
    network: 'Polygon zkEVM Cardona',
    chainId: 2442,
    token: 'ETH',
    url: 'https://faucet.polygon.technology/',
    provider: 'Polygon',
    amount: '0.02 ETH',
    cooldown: '24h',
    requiresAuth: false,
    rpcUrl: 'https://rpc.cardona.zkevm-rpc.com',
    explorer: 'https://cardona-zkevm.polygonscan.com',
    category: 'L2',
    logo: 'P',
    color: '270 75% 55%',
  },
  // ─── BSC ─────────────────────────────────────
  {
    network: 'BSC Testnet',
    chainId: 97,
    token: 'tBNB',
    url: 'https://www.bnbchain.org/en/testnet-faucet',
    provider: 'BNB Chain',
    amount: '0.5 BNB',
    cooldown: '24h',
    requiresAuth: false,
    rpcUrl: 'https://data-seed-prebsc-1-s1.bnbchain.org:8545',
    explorer: 'https://testnet.bscscan.com',
    category: 'L1',
    logo: 'B',
    color: '45 95% 50%',
  },
  // ─── Avalanche ────────────────────────────────
  {
    network: 'Avalanche Fuji',
    chainId: 43113,
    token: 'AVAX',
    url: 'https://core.app/tools/testnet-faucet/',
    provider: 'Avalanche Core',
    amount: '2 AVAX',
    cooldown: '24h',
    requiresAuth: false,
    rpcUrl: 'https://api.avax-test.network/ext/bc/C/rpc',
    explorer: 'https://testnet.snowtrace.io',
    category: 'L1',
    logo: 'A',
    color: '0 72% 52%',
  },
  // ─── Fantom ────────────────────────────────
  {
    network: 'Fantom Testnet',
    chainId: 4002,
    token: 'FTM',
    url: 'https://faucet.fantom.network/',
    provider: 'Fantom Foundation',
    amount: '10 FTM',
    cooldown: '24h',
    requiresAuth: false,
    rpcUrl: 'https://rpc.testnet.fantom.network',
    explorer: 'https://testnet.ftmscan.com',
    category: 'L1',
    logo: 'F',
    color: '217 80% 55%',
  },
  // ─── Celo ────────────────────────────────
  {
    network: 'Celo Alfajores',
    chainId: 44787,
    token: 'CELO',
    url: 'https://faucet.celo.org/alfajores',
    provider: 'Celo Foundation',
    amount: '1 CELO',
    cooldown: 'No limit',
    requiresAuth: false,
    rpcUrl: 'https://alfajores-faucet.celo-testnet.org',
    explorer: 'https://alfajores.celoscan.io',
    category: 'L1',
    logo: 'C',
    color: '145 70% 45%',
  },
  // ─── Gnosis ────────────────────────────────
  {
    network: 'Gnosis Chiado',
    chainId: 10200,
    token: 'xDAI',
    url: 'https://gnosisfaucet.com/',
    provider: 'Gnosis',
    amount: '1 xDAI',
    cooldown: '24h',
    requiresAuth: false,
    rpcUrl: 'https://rpc.chiadochain.net',
    explorer: 'https://gnosis-chiado.blockscout.com',
    category: 'Sidechain',
    logo: 'G',
    color: '160 65% 40%',
  },
  // ─── Mantle ────────────────────────────────
  {
    network: 'Mantle Sepolia',
    chainId: 5003,
    token: 'MNT',
    url: 'https://faucet.sepolia.mantle.xyz/',
    provider: 'Mantle',
    amount: '0.1 MNT',
    cooldown: '24h',
    requiresAuth: false,
    rpcUrl: 'https://rpc.sepolia.mantle.xyz',
    explorer: 'https://sepolia.mantlescan.xyz',
    category: 'L2',
    logo: 'M',
    color: '165 55% 45%',
  },
  // ─── Metis ────────────────────────────────
  {
    network: 'Metis Sepolia',
    chainId: 59902,
    token: 'tMETIS',
    url: 'https://sepolia.faucet.metisdevs.io/',
    provider: 'Metis',
    amount: '0.5 METIS',
    cooldown: '24h',
    requiresAuth: false,
    rpcUrl: 'https://sepolia.metisdevs.io',
    explorer: 'https://sepolia-explorer.metisdevs.io',
    category: 'L2',
    logo: 'M',
    color: '195 75% 50%',
  },
  // ─── Moonbeam ────────────────────────────────
  {
    network: 'Moonbase Alpha',
    chainId: 1287,
    token: 'DEV',
    url: 'https://faucet.moonbeam.network/',
    provider: 'Moonbeam',
    amount: '1 DEV',
    cooldown: '24h',
    requiresAuth: false,
    rpcUrl: 'https://rpc.api.moonbase.moonbeam.network',
    explorer: 'https://moonbase.moonscan.io',
    category: 'L1',
    logo: '🌙',
    color: '260 60% 55%',
  },
  // ─── Taiko ─────────────────────────────────
  {
    network: 'Taiko Hekla',
    chainId: 167009,
    token: 'ETH',
    url: 'https://bridge.hekla.taiko.xyz/',
    provider: 'Taiko',
    amount: 'Bridge from Sepolia',
    cooldown: 'N/A',
    requiresAuth: false,
    rpcUrl: 'https://rpc.hekla.taiko.xyz',
    explorer: 'https://hekla.taikoscan.network',
    category: 'L2',
    logo: 'T',
    color: '340 70% 55%',
  },
  // ─── Mode ──────────────────────────────────
  {
    network: 'Mode Sepolia',
    chainId: 919,
    token: 'ETH',
    url: 'https://docs.mode.network/tools/testnet-faucets',
    provider: 'Mode',
    amount: '0.01 ETH',
    cooldown: '24h',
    requiresAuth: false,
    rpcUrl: 'https://sepolia.mode.network',
    explorer: 'https://sepolia.explorer.mode.network',
    category: 'L2',
    logo: 'M',
    color: '75 65% 48%',
  },
];

const CATEGORIES = ['All', 'L1', 'L2', 'Sidechain'] as const;
type Category = typeof CATEGORIES[number];

/* ─── CopyButton ────────────────────────────────────────────────────────────── */

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      title="Copy"
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: copied ? 'hsl(155 65% 48%)' : 'hsl(var(--text-muted))',
        display: 'flex', alignItems: 'center', padding: 2,
        transition: 'color 0.15s',
      }}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

/* ─── Faucet Card ───────────────────────────────────────────────────────────── */

function FaucetCard({ faucet }: { faucet: Faucet }) {
  return (
    <div
      style={{
        background: 'hsl(var(--bg-panel))',
        border: '1px solid hsl(var(--border-subtle))',
        borderRadius: 10,
        padding: 0,
        overflow: 'hidden',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `hsl(${faucet.color} / 0.5)`;
        e.currentTarget.style.boxShadow = `0 0 24px hsl(${faucet.color} / 0.12)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'hsl(var(--border-subtle))';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 10px',
        borderBottom: '1px solid hsl(var(--border-subtle))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `hsl(${faucet.color} / 0.15)`,
            border: `1px solid hsl(${faucet.color} / 0.3)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: `hsl(${faucet.color})`,
          }}>
            {faucet.logo}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--text-primary))' }}>
              {faucet.network}
            </div>
            <div style={{ fontSize: 10, color: 'hsl(var(--text-muted))' }}>
              Chain ID: {faucet.chainId}
            </div>
          </div>
        </div>
        <span style={{
          fontSize: 9, padding: '2px 7px', borderRadius: 4,
          background: `hsl(${faucet.color} / 0.12)`,
          color: `hsl(${faucet.color})`,
          fontWeight: 700, letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}>
          {faucet.category}
        </span>
      </div>

      {/* Info rows */}
      <div style={{ padding: '10px 16px 6px' }}>
        {[
          { icon: <Coins size={11} />, label: 'Amount', value: faucet.amount },
          { icon: <Clock size={11} />, label: 'Cooldown', value: faucet.cooldown },
          { icon: <Shield size={11} />, label: 'Auth', value: faucet.requiresAuth ? faucet.authType || 'Required' : 'None' },
          { icon: <Droplets size={11} />, label: 'Provider', value: faucet.provider },
        ].map(({ icon, label, value }) => (
          <div key={label} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 6,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: 'hsl(var(--text-muted))' }}>{icon}</span>
              <span style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>{label}</span>
            </div>
            <span className="font-mono" style={{ fontSize: 11, color: 'hsl(var(--text-primary))', fontWeight: 500 }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      {/* RPC & Explorer */}
      <div style={{ padding: '0 16px 10px' }}>
        <div style={{
          background: 'hsl(var(--bg-card))',
          border: '1px solid hsl(var(--border-subtle))',
          borderRadius: 6, padding: '7px 10px',
          marginBottom: 6,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
            <span style={{ fontSize: 10, color: 'hsl(var(--text-muted))' }}>RPC URL</span>
            <CopyButton text={faucet.rpcUrl} />
          </div>
          <div className="font-mono" style={{
            fontSize: 10, color: 'hsl(var(--text-secondary))',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {faucet.rpcUrl}
          </div>
        </div>
        <a
          href={faucet.explorer}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 11, color: 'hsl(var(--text-muted))',
            textDecoration: 'none',
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = `hsl(${faucet.color})`)}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'hsl(var(--text-muted))')}
        >
          <ExternalLink size={10} /> {faucet.explorer.replace('https://', '')}
        </a>
      </div>

      {/* CTA */}
      <div style={{ padding: '0 16px 14px' }}>
        <a
          href={faucet.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            width: '100%', padding: '9px 0',
            borderRadius: 7,
            background: `hsl(${faucet.color})`,
            color: '#fff',
            fontSize: 12, fontWeight: 600,
            textDecoration: 'none',
            fontFamily: 'var(--font-display)',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.85')}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
        >
          <Droplets size={13} />
          Claim {faucet.token}
        </a>
      </div>
    </div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────────── */

export default function Faucets() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('All');

  const filtered = useMemo(() => {
    return FAUCETS.filter((f) => {
      const matchCat = category === 'All' || f.category === category;
      const matchSearch =
        f.network.toLowerCase().includes(search.toLowerCase()) ||
        f.token.toLowerCase().includes(search.toLowerCase()) ||
        f.provider.toLowerCase().includes(search.toLowerCase()) ||
        f.chainId.toString().includes(search);
      return matchCat && matchSearch;
    });
  }, [search, category]);

  const totalFaucets = FAUCETS.length;
  const totalNetworks = new Set(FAUCETS.map((f) => f.chainId)).size;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'hsl(var(--bg-base))',
    }}>
      {/* Top bar */}
      <header style={{
        background: 'hsl(var(--bg-surface))',
        borderBottom: '1px solid hsl(var(--border-subtle))',
        display: 'flex', alignItems: 'center',
        height: 56, padding: '0 24px',
        position: 'sticky', top: 0, zIndex: 100,
      }}>
        <Link
          to="/"
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            textDecoration: 'none', marginRight: 20,
          }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'linear-gradient(135deg, hsl(217 91% 60%), hsl(155 65% 48%))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Zap size={14} color="#fff" fill="#fff" />
          </div>
          <span style={{
            fontFamily: 'var(--font-display)', fontWeight: 700,
            fontSize: 15, color: 'hsl(var(--text-primary))',
            letterSpacing: '-0.02em',
          }}>PerpDEX</span>
        </Link>

        <nav style={{ display: 'flex', gap: 4, marginRight: 'auto' }}>
          <Link to="/" style={{
            padding: '6px 14px', borderRadius: 6,
            background: 'transparent',
            color: 'hsl(var(--text-muted))',
            fontSize: 13, fontWeight: 500,
            textDecoration: 'none',
            fontFamily: 'var(--font-display)',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <ArrowLeft size={13} />
            Trading
          </Link>
          <span style={{
            padding: '6px 14px', borderRadius: 6,
            background: 'hsl(var(--bg-card))',
            border: '1px solid hsl(var(--border-medium))',
            color: 'hsl(var(--text-primary))',
            fontSize: 13, fontWeight: 600,
            fontFamily: 'var(--font-display)',
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <Droplets size={13} />
            Faucets
          </span>
        </nav>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16 }}>
          <div>
            <div style={{ fontSize: 10, color: 'hsl(var(--text-muted))' }}>Total Faucets</div>
            <div className="font-mono" style={{ fontSize: 14, fontWeight: 600, color: 'hsl(155 65% 48%)' }}>{totalFaucets}</div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: 'hsl(var(--text-muted))' }}>Networks</div>
            <div className="font-mono" style={{ fontSize: 14, fontWeight: 600, color: 'hsl(217 91% 60%)' }}>{totalNetworks}</div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <div style={{
        padding: '40px 24px 32px',
        textAlign: 'center',
        borderBottom: '1px solid hsl(var(--border-subtle))',
        background: `radial-gradient(ellipse 60% 50% at 50% 0%, hsl(217 91% 60% / 0.06), transparent)`,
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '5px 14px', borderRadius: 20,
          background: 'hsl(217 91% 60% / 0.1)',
          border: '1px solid hsl(217 91% 60% / 0.2)',
          marginBottom: 16,
        }}>
          <Droplets size={13} color="hsl(217 91% 60%)" />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'hsl(217 91% 65%)' }}>EVM Testnet Faucets</span>
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 28, fontWeight: 700,
          color: 'hsl(var(--text-primary))',
          letterSpacing: '-0.03em',
          marginBottom: 8,
        }}>
          All EVM Testnet Faucets in One Place
        </h1>
        <p style={{ fontSize: 14, color: 'hsl(var(--text-secondary))', maxWidth: 480, margin: '0 auto' }}>
          Claim free testnet tokens for {totalNetworks} EVM-compatible chains. Copy RPC URLs, open explorers, and start building.
        </p>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '16px 24px',
        borderBottom: '1px solid hsl(var(--border-subtle))',
        background: 'hsl(var(--bg-surface))',
        position: 'sticky', top: 56, zIndex: 50,
        flexWrap: 'wrap',
      }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'hsl(var(--bg-input))',
          border: '1px solid hsl(var(--border-medium))',
          borderRadius: 6, padding: '0 10px',
          flex: '1 1 240px', maxWidth: 360,
        }}>
          <Search size={14} color="hsl(var(--text-muted))" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search networks, tokens, chain ID..."
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: 'hsl(var(--text-primary))', fontSize: 13,
              fontFamily: 'var(--font-display)',
              padding: '8px 0',
            }}
          />
        </div>

        {/* Category pills */}
        <div style={{ display: 'flex', gap: 4 }}>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{
                padding: '6px 14px', borderRadius: 6,
                background: category === c ? 'hsl(var(--bg-card))' : 'transparent',
                border: `1px solid ${category === c ? 'hsl(var(--border-medium))' : 'transparent'}`,
                color: category === c ? 'hsl(var(--text-primary))' : 'hsl(var(--text-muted))',
                fontSize: 12, fontWeight: category === c ? 600 : 400,
                cursor: 'pointer', fontFamily: 'var(--font-display)',
                transition: 'all 0.15s',
              }}
            >
              {c}
            </button>
          ))}
        </div>

        <span style={{ fontSize: 12, color: 'hsl(var(--text-muted))', marginLeft: 'auto' }}>
          Showing {filtered.length} of {totalFaucets}
        </span>
      </div>

      {/* Grid */}
      <div style={{
        padding: '24px',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))',
        gap: 16,
      }}>
        {filtered.map((f, i) => (
          <FaucetCard key={`${f.network}-${i}`} faucet={f} />
        ))}

        {filtered.length === 0 && (
          <div style={{
            gridColumn: '1 / -1',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', padding: '60px 20px', gap: 12,
          }}>
            <Search size={32} color="hsl(var(--text-muted))" />
            <span style={{ fontSize: 15, fontWeight: 500, color: 'hsl(var(--text-secondary))' }}>
              No faucets found
            </span>
            <span style={{ fontSize: 13, color: 'hsl(var(--text-muted))' }}>
              Try adjusting your search or category filter
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '20px 24px',
        borderTop: '1px solid hsl(var(--border-subtle))',
        textAlign: 'center',
      }}>
        <span style={{ fontSize: 11, color: 'hsl(var(--text-muted))' }}>
          PerpDEX Faucet Directory — All links open externally. No funds collected.
        </span>
      </div>
    </div>
  );
}
