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
  disconnect?: () => Promise<void> | void;
  signMessage: (message: Uint8Array) => Promise<{ signature: number[] }>;
  signTransaction?: (transaction: unknown) => Promise<unknown>;
};

type InjectedProvider = {
  isPhantom?: boolean;
  isInvictus?: boolean;
  connect?: (options?: { onlyIfTrusted?: boolean }) => Promise<unknown>;
};

declare global {
  interface Window {
    invictus?: InvictusWalletApi;
    solana?: InjectedProvider & { providers?: InjectedProvider[] };
    phantom?: { solana?: InjectedProvider };
  }
}

type InvictusWalletState = InvictusStatus & {
  detected: boolean;
  detectionComplete: boolean;
  phantomDetected: boolean;
  providerNames: string[];
  mobile: boolean;
};

const INITIAL_STATE: InvictusWalletState = {
  detected: false,
  detectionComplete: false,
  exists: false,
  locked: false,
  phantomDetected: false,
  providerNames: [],
  mobile: false,
  publicKey: null,
};

export function useInvictusWallet() {
  const [state, setState] = useState<InvictusWalletState>(INITIAL_STATE);
  const mounted = useRef(true);

  const readProviders = useCallback(() => {
    const mobile = /android|iphone|ipad|ipod|mobile/.test(navigator.userAgent.toLowerCase());
    const providers = [
      ...(window.solana?.providers ?? []),
      window.phantom?.solana,
      window.solana,
    ].filter((provider): provider is InjectedProvider => Boolean(provider));
    const uniqueProviders = [...new Set(providers)];
    const phantomDetected = uniqueProviders.some((provider) => provider.isPhantom === true);
    const providerNames = [
      ...(phantomDetected ? ["Phantom"] : []),
      ...(window.invictus?.isInvictus === true ? ["Invictus Wallet"] : []),
    ];
    if (mounted.current) {
      setState((current) => ({ ...current, mobile, phantomDetected, providerNames }));
    }
    return providerNames.length > 0;
  }, []);

  const readStatus = useCallback(async () => {
    readProviders();
    const wallet = window.invictus;
    if (!wallet || wallet.isInvictus !== true) {
      return;
    }

    try {
      const status = await wallet.status();
      if (mounted.current) setState((current) => ({ ...current, detected: true, ...status }));
    } catch {
      if (mounted.current) setState((current) => ({ ...current, detected: true }));
    }
  }, [readProviders]);

  useEffect(() => {
    mounted.current = true;
    const handleInitialized = () => void readStatus();
    window.addEventListener("invictus#initialized", handleInitialized);
    window.addEventListener("solana#initialized", handleInitialized);
    window.addEventListener("phantom#initialized", handleInitialized);

    const startedAt = Date.now();
    const poll = window.setInterval(() => {
      void readStatus();
      if (Date.now() - startedAt >= 2500) {
        window.clearInterval(poll);
        if (mounted.current) {
          setState((current) => ({ ...current, detectionComplete: true }));
        }
      }
    }, 200);

    const initialStatusCheck = window.setTimeout(() => void readStatus(), 0);
    return () => {
      mounted.current = false;
      window.removeEventListener("invictus#initialized", handleInitialized);
      window.removeEventListener("solana#initialized", handleInitialized);
      window.removeEventListener("phantom#initialized", handleInitialized);
      window.clearInterval(poll);
      window.clearTimeout(initialStatusCheck);
    };
  }, [readStatus]);

  const connect = useCallback(async () => {
    const wallet = window.invictus;
    if (!wallet) throw new Error("Invictus Wallet is not detected");
    const result = await wallet.connect();
    if (mounted.current) {
      setState((current) => ({ ...current, detected: true, exists: true, locked: false, publicKey: result.publicKey }));
    }
    return result.publicKey;
  }, []);

  const openMobileWallet = useCallback(() => {
    const returnUrl = `${window.location.origin}/wallet`;
    const requestUrl = `${returnUrl}?invictus=connect`;
    const deepLink = `invictuswallet://connect?return_url=${encodeURIComponent(requestUrl)}`;
    const universalLink = `https://wallet.invictus.one/connect?return_url=${encodeURIComponent(requestUrl)}`;

    window.location.href = deepLink;
    window.setTimeout(() => {
      if (document.visibilityState === "visible") window.location.href = universalLink;
    }, 900);
  }, []);

  const disconnect = useCallback(() => {
    const wallet = window.invictus;
    void wallet?.disconnect?.();
    if (mounted.current) setState((current) => ({ ...current, publicKey: null }));
  }, []);

  return {
    ...state,
    status: state.publicKey ? "connected" : state.locked ? "locked" : state.detected ? "disconnected" : "undetected",
    connect,
    disconnect,
    openMobileWallet,
  } as const;
}