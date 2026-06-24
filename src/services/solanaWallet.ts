/**
 * solanaWallet.ts — Direct Phantom detection (+ other Solana wallets)
 * Fallback when @solana/wallet-adapter-react-ui modal doesn't trigger.
 */

export interface SolanaProvider {
  isPhantom?: boolean;
  isConnected: boolean;
  publicKey: { toString(): string } | null;
  connect(options?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>;
  disconnect(): Promise<void>;
  on(event: string, cb: (...args: any[]) => void): void;
  removeListener(event: string, cb: (...args: any[]) => void): void;
}

function detectSolana(): SolanaProvider | null {
  if (typeof window === 'undefined') return null;
  const w = window as any;

  // Phantom injects window.solana (or window.phantom?.solana)
  const sol = w.solana || w.phantom?.solana;
  if (sol && sol.isPhantom) return sol as SolanaProvider;

  // Backpack, Glow, etc also inject window.solana if Phantom is absent
  if (sol && 'connect' in sol) return sol as SolanaProvider;

  return null;
}

export async function connectSolana(): Promise<{ address: string }> {
  const provider = detectSolana();

  if (!provider) {
    open('https://phantom.app/download', '_blank');
    throw new Error('Phantom not installed. Opening download page...');
  }

  try {
    const resp = await provider.connect();
    const address = resp.publicKey.toString();
    return { address };
  } catch (err: any) {
    if (err.message?.includes('rejected')) {
      throw new Error('Connection rejected by user.');
    }
    throw err;
  }
}

export async function disconnectSolana(): Promise<void> {
  const provider = detectSolana();
  if (!provider || !provider.isConnected) return;

  try {
    await provider.disconnect();
  } catch (_) {
    // ignore
  }
}

export async function isSolanaConnected(): Promise<boolean> {
  const provider = detectSolana();
  if (!provider) return false;

  // Auto-detect: silently try connect({ onlyIfTrusted: true })
  try {
    if ('connect' in provider && (provider as any).connect.length > 0) {
      // Phantom supports onlyIfTrusted
      await provider.connect({ onlyIfTrusted: true });
      return true;
    }
  } catch (_) {
    // Not auto-connected
  }

  return provider.isConnected;
}

export async function getSolanaAddress(): Promise<string | null> {
  const provider = detectSolana();
  if (!provider || !provider.isConnected) return null;

  try {
    return provider.publicKey?.toString() || null;
  } catch {
    return null;
  }
}

export function onSolanaAccountsChanged(cb: (pk: string | null) => void): () => void {
  const provider = detectSolana();
  if (!provider) return () => {};

  const handler = () => {
    try {
      const pk = provider.publicKey?.toString() || null;
      if (pk) cb(pk);
      else cb(null);
    } catch {
      cb(null);
    }
  };

  provider.on('accountChanged', handler);
  return () => {
    try { provider.removeListener('accountChanged', handler); } catch (_) {}
  };
}

export function onSolanaDisconnect(cb: () => void): () => void {
  const provider = detectSolana();
  if (!provider) return () => {};

  provider.on('disconnect', cb);
  return () => {
    try { provider.removeListener('disconnect', cb); } catch (_) {}
  };
}

export function hasPhantom(): boolean {
  return !!detectSolana();
}
