/**
 * Type declarations for @hathor/snap-utils
 *
 * The package doesn't ship its own .d.ts files, so we declare the types we use here.
 */

declare module '@hathor/snap-utils' {
  import type { ReactNode } from 'react';

  export interface Snap {
    permissionName: string;
    id: string;
    version: string;
    initialPermissions: Record<string, unknown>;
  }

  /** Minimal EIP-1193 provider shape used by MetaMask */
  export interface Eip1193Provider {
    request: (args: { method: string; params?: unknown }) => Promise<unknown>;
  }

  export interface MetaMaskContextType {
    provider: Eip1193Provider | null;
    installedSnap: Snap | null;
    error: Error | null;
    setInstalledSnap: (snap: Snap | null) => void;
    setError: (error: Error | null) => void;
  }

  export interface InvokeSnapParams {
    method: string;
    params?: Record<string, unknown>;
  }

  export function MetaMaskProvider(props: { children: ReactNode }): ReactNode;

  export function useMetaMaskContext(): MetaMaskContextType;

  export function useRequestSnap(
    snapId?: string,
    version?: string,
  ): () => Promise<void>;

  export function useInvokeSnap(
    snapId?: string,
  ): (params: InvokeSnapParams) => Promise<unknown>;
}
