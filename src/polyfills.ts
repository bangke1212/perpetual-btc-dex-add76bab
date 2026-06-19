import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
  window.Buffer = window.Buffer || Buffer;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as Record<string, unknown>).global = window;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as Record<string, unknown>).process = (window as Record<string, unknown>).process || { env: {} };
}

export {};