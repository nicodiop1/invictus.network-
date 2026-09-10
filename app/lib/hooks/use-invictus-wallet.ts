"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type InvictusStatus = {
  exists: boolean;
  locked: boolean;
  publicKey: string | null;
};

type InvictusWalletApi = {
  isInvictus: true;
  name: string;
  status: () => Promise<InvictusStatus>;
  connect: () => Promise<{ publicKey: string }>;
  signMessage: (message: Uint8Array) => Promise<{ signature: number[] }>;
  signTransaction?: (transaction: unknown) => Promise<unknown>;
};

declare global {
  interface Window {
    invictus?: InvictusWalletApi;
  }
}

type InvictusWalletState = InvictusStatus & {
  detected: boolean;
};

const INITIAL_STATE: InvictusWalletState = {
  detected: false,
  exists: false,
  locked: false,
  publicKey: null,
};

export function useInvictusWallet() {
  const [state, setState] = useState<InvictusWalletState>(INITIAL_STATE);
  const mounted = useRef(true);

  const readStatus = useCallback(async () => {
    const wallet = window.invictus;
    if (!wallet || wallet.isInvictus !== true) {
      if (mounted.current) setState((current) => ({ ...current, detected: false }));
      return;
    }

    try {
      const status = await wallet.status();
      if (mounted.current) setState({ detected: true, ...status });
    } catch {
      if (mounted.current) setState((current) => ({ ...current, detected: true }));
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    const handleInitialized = () => void readStatus();
    window.addEventListener("invictus#initialized", handleInitialized);

    const startedAt = Date.now();
    const poll = window.setInterval(() => {
      void readStatus();
      if (Date.now() - startedAt >= 3000) window.clearInterval(poll);
    }, 200);

    const initialStatusCheck = window.setTimeout(() => void readStatus(), 0);
    return () => {
      mounted.current = false;
      window.removeEventListener("invictus#initialized", handleInitialized);
      window.clearInterval(poll);
      window.clearTimeout(initialStatusCheck);
    };
  }, [readStatus]);

  const connect = useCallback(async () => {
    const wallet = window.invictus;
    if (!wallet) throw new Error("Invictus Wallet is not detected");
    const result = await wallet.connect();
    if (mounted.current) {
      setState({ detected: true, exists: true, locked: false, publicKey: result.publicKey });
    }
    return result.publicKey;
  }, []);

  const disconnect = useCallback(() => {
    if (mounted.current) setState((current) => ({ ...current, publicKey: null }));
  }, []);

  return {
    ...state,
    status: state.publicKey ? "connected" : state.locked ? "locked" : state.detected ? "disconnected" : "undetected",
    connect,
    disconnect,
  } as const;
}