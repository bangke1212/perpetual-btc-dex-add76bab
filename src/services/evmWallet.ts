/**
 * evmWallet.ts — EVM (MetaMask, Coinbase, etc.) wallet connector via ethers.js
 * 
 * Usage:
 *   import { getEVM, onAccountsChanged, onChainChanged } from '../services/evmWallet';
 *   
 *   // Connect
 *   const { address, provider } = await getEVM().connect();
 *   
 *   // Listen
 *   const unsub1 = onAccountsChanged((accounts) => ...);
 *   const unsub2 = onChainChanged((chainId) => ...);
 */

type Listener = (...args: any[]) => void;

let cachedProvider: any = null;

function detectProvider(): any {
  if (cachedProvider) return cachedProvider;

  if (typeof window === 'undefined') return null;

  const w = window as any;

  // MetaMask may inject itself as window.ethereum
  // Coinbase Wallet also injects window.ethereum (but with isCoinbaseWallet flag)
  const eth = w.ethereum;

  if (eth) {
    // Prefer the explicitly selected provider if multiple injected
    if (eth.providers?.length) {
      // Return the first available one (MetaMask is usually first)
      cachedProvider = eth.providers.find((p: any) => p.isMetaMask) || eth.providers[0];
    } else {
      cachedProvider = eth;
    }
  }

  return cachedProvider;
}

export function getEVM() {
  const provider = detectProvider();

  const connect = async (): Promise<{ address: string; chainId: number; provider: any }> => {
    if (!provider) {
      throw new Error('No EVM wallet detected. Please install MetaMask or another EVM wallet.');
    }

    try {
      const accounts: string[] = await provider.request({ method: 'eth_requestAccounts' });
      const chainIdHex: string = await provider.request({ method: 'eth_chainId' });
      const chainId = parseInt(chainIdHex, 16);

      return {
        address: accounts[0],
        chainId,
        provider,
      };
    } catch (err: any) {
      if (err.code === 4001) throw new Error('User rejected connection request.');
      throw err;
    }
  };

  const disconnect = () => {
    // EIP-1193 doesn't have a disconnect method.
    // We just clear local state — the dapp should stop referencing the account.
    // Some wallets (MetaMask) emit `disconnect` event but not all.
  };

  const getAccounts = async (): Promise<string[]> => {
    if (!provider) return [];
    try {
      return await provider.request({ method: 'eth_accounts' });
    } catch {
      return [];
    }
  };

  const getChainId = async (): Promise<number> => {
    if (!provider) return 1;
    try {
      const hex = await provider.request({ method: 'eth_chainId' });
      return parseInt(hex, 16);
    } catch {
      return 1;
    }
  };

  const isConnected = async (): Promise<boolean> => {
    const accounts = await getAccounts();
    return accounts.length > 0;
  };

  return {
    provider,
    connect,
    disconnect,
    getAccounts,
    getChainId,
    isConnected,
  };
}

export function onAccountsChanged(cb: (accounts: string[]) => void): () => void {
  const p = detectProvider();
  if (!p) return () => {};
  const listener = (accounts: string[]) => cb(accounts);
  p.on('accountsChanged', listener);
  return () => { p.removeListener('accountsChanged', listener); };
}

export function onChainChanged(cb: (chainId: number) => void): () => void {
  const p = detectProvider();
  if (!p) return () => {};
  const listener = (chainIdHex: string) => cb(parseInt(chainIdHex, 16));
  p.on('chainChanged', listener);
  return () => { p.removeListener('chainChanged', listener); };
}

export function onDisconnect(cb: () => void): () => void {
  const p = detectProvider();
  if (!p) return () => {};
  p.on('disconnect', cb);
  return () => { p.removeListener('disconnect', cb); };
}

/** Check if MetaMask is installed */
export function isMetaMaskInstalled(): boolean {
  const p = detectProvider();
  return !!(p && p.isMetaMask);
}

/** Check if Coinbase Wallet is installed */
export function isCoinbaseWalletInstalled(): boolean {
  const p = detectProvider();
  return !!(p && p.isCoinbaseWallet);
}
