/**
 * evmWallet.ts — EVM wallet connector (MetaMask, Coinbase, etc.)
 * No ethers dependency — uses raw EIP-1193 window.ethereum provider.
 */

// ─── Detector ───────────────────────────────────────────────────────────────

type EthProvider = any;

let _provider: EthProvider | null | undefined = undefined; // undefined = not checked yet

export function detectProvider(): EthProvider | null {
  if (_provider !== undefined) return _provider;

  if (typeof window === 'undefined') {
    _provider = null;
    return null;
  }

  const w = window as any;
  const eth = w.ethereum;

  if (!eth) {
    _provider = null;
    return null;
  }

  // Multiple injected providers (e.g. MetaMask + Coinbase)
  if (eth.providers && eth.providers.length > 0) {
    // Prefer MetaMask
    _provider = eth.providers.find((p: any) => p.isMetaMask) || eth.providers[0];
  } else {
    _provider = eth;
  }

  return _provider;
}

// ─── Connection ─────────────────────────────────────────────────────────────

export async function connectEVM(): Promise<{ address: string; chainId: number }> {
  const provider = detectProvider();

  if (!provider) {
    // Try again in case MetaMask injected after page load
    await new Promise((r) => setTimeout(r, 300));
    const retry = detectProvider();
    if (!retry) {
      open('https://metamask.io/download/', '_blank');
      throw new Error('MetaMask not installed. Opening download page...');
    }
    return connectViaProvider(retry);
  }

  return connectViaProvider(provider);
}

async function connectViaProvider(provider: EthProvider): Promise<{ address: string; chainId: number }> {
  try {
    const accounts: string[] = await provider.request({
      method: 'eth_requestAccounts',
    });

    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts returned. Please unlock MetaMask and try again.');
    }

    let chainId = 1;
    try {
      const hex: string = await provider.request({ method: 'eth_chainId' });
      chainId = parseInt(hex, 16);
    } catch (_) {
      // chainId optional, default to mainnet
    }

    return { address: accounts[0], chainId };
  } catch (err: any) {
    // User rejected
    if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
      throw new Error('Connection rejected by user.');
    }
    throw err;
  }
}

// ─── Account helpers ─────────────────────────────────────────────────────────

export async function getAccounts(): Promise<string[]> {
  const p = detectProvider();
  if (!p) return [];
  try {
    return await p.request({ method: 'eth_accounts' });
  } catch {
    return [];
  }
}

export async function isConnected(): Promise<boolean> {
  const accs = await getAccounts();
  return accs.length > 0;
}

// ─── Events ─────────────────────────────────────────────────────────────────

export function onAccountsChanged(cb: (accounts: string[]) => void): () => void {
  const p = detectProvider();
  if (!p) return () => {};
  p.on('accountsChanged', cb);
  return () => { try { p.removeListener('accountsChanged', cb); } catch (_) {} };
}

export function onChainChanged(cb: (chainId: number) => void): () => void {
  const p = detectProvider();
  if (!p) return () => {};
  const listener = (hex: string) => cb(parseInt(hex, 16));
  p.on('chainChanged', listener);
  return () => { try { p.removeListener('chainChanged', listener); } catch (_) {} };
}

export function onDisconnect(cb: () => void): () => void {
  const p = detectProvider();
  if (!p) return () => {};
  p.on('disconnect', cb);
  return () => { try { p.removeListener('disconnect', cb); } catch (_) {} };
}
