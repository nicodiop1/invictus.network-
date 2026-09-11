"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { address, formatDecimalFixedPoint, lamportsToSol } from "@solana/kit";
import {
  useConnectedWallet,
  useConnect,
  useDisconnect,
  useIsWalletReady,
  useWalletStatus,
  useWallets,
} from "@solana/kit-plugin-wallet/react";
import { toast } from "sonner";
import { useAppClient } from "../lib/client-provider";
import { ellipsify } from "../lib/explorer";
import { useBalance } from "../lib/hooks/use-balance";
import { useTokenBalance } from "../lib/hooks/use-token-balance";

const solFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 5 });
const subscribeToViewport = () => () => {};
const getMobileSnapshot = () => /android|iphone|ipad|ipod|mobile/.test(navigator.userAgent.toLowerCase());
const getMobileServerSnapshot = () => false;

export function WalletButton({ fullWidth = false }: { fullWidth?: boolean }) {
  const client = useAppClient();
  const wallets = useWallets(client);
  const status = useWalletStatus(client);
  const ready = useIsWalletReady(client);
  const connected = useConnectedWallet(client);
  const { dispatch: connect, error: connectError } = useConnect(client);
  const { dispatch: disconnect } = useDisconnect(client);
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useSyncExternalStore(subscribeToViewport, getMobileSnapshot, getMobileServerSnapshot);
  const ref = useRef<HTMLDivElement>(null);
  const wasConnected = useRef(false);
  const walletAddress = connected?.account.address;
  const balance = useBalance(walletAddress ? address(walletAddress) : undefined);
  const oneBalance = useTokenBalance(walletAddress);

  useEffect(() => {
    if (status === "connecting") toast.loading("Connecting wallet...", { id: "wallet-state" });
    if (status === "connected" && !wasConnected.current) {
      toast.success("Wallet connected", { id: "wallet-state" });
      wasConnected.current = true;
    }
    if (status === "disconnected" && wasConnected.current) {
      toast("Wallet disconnected", { id: "wallet-state" });
      wasConnected.current = false;
    }
  }, [status]);

  useEffect(() => {
    if (connectError != null) {
      console.error("Wallet connection failed", connectError);
      toast.error("Connection failed. Approve the request in your wallet or try again.", { id: "wallet-state" });
    }
  }, [connectError]);

  useEffect(() => {
    if (balance.error != null || oneBalance.error != null) {
      console.error("Wallet balance refresh failed", balance.error ?? oneBalance.error);
      toast.error("RPC unavailable. Balances will retry shortly.", { id: "wallet-balance-state" });
    }
  }, [balance.error, oneBalance.error]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openPhantom = () => {
    const returnUrl = window.location.href;
    window.location.href = `https://phantom.app/ul/browse/${encodeURIComponent(returnUrl)}?ref=${encodeURIComponent(window.location.origin)}`;
  };

  if (!connected) {
    return (
      <div className={`wallet-control${fullWidth ? " wallet-control-full" : ""}`} ref={ref}>
        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="gold-button wallet-trigger"
          disabled={status === "connecting" || status === "reconnecting"}
        >
          {status === "connecting" || status === "reconnecting" ? "Connecting..." : "Connect Wallet"}
        </button>
        {isOpen && (
          <div className="wallet-menu">
            <p className="eyebrow">SELECT WALLET</p>
            {wallets.length > 0 ? (
              <div>
                {wallets.map((wallet) => (
                  <button
                    key={wallet.name}
                    type="button"
                    onClick={() => { void connect(wallet); setIsOpen(false); }}
                    disabled={status === "connecting" || status === "reconnecting"}
                    className="wallet-option"
                  >
                    {wallet.icon && (
                      // eslint-disable-next-line @next/next/no-img-element -- Wallet Standard icons may be data URIs.
                      <img src={wallet.icon} alt="" className="wallet-icon-image" />
                    )}
                    <span>{wallet.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="wallet-empty">
                {!ready ? "Looking for installed wallet extensions..." : isMobile ? "No wallet is available in this browser. Open this page in Phantom to connect." : "Wallet extension not detected. Install Phantom or another Solana wallet, then try again."}
              </p>
            )}
            {isMobile && wallets.length === 0 && ready && (
              <>
                <button type="button" className="gold-button wallet-trigger" onClick={openPhantom}>OPEN IN PHANTOM</button>
                <a className="text-button mobile-wallet-install" href="https://phantom.app/download" target="_blank" rel="noreferrer">GET PHANTOM</a>
              </>
            )}
            {(status === "connecting" || status === "reconnecting") && <p className="wallet-empty">Approve the connection in your wallet...</p>}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`wallet-control${fullWidth ? " wallet-control-full" : ""}`} ref={ref}>
      <button type="button" onClick={() => setIsOpen((value) => !value)} className="wallet-connected">
        <span className="status-dot" />
        <span>{ellipsify(connected.account.address, 4)}</span>
        <span className="wallet-balance" aria-hidden="true">{balance.lamports == null ? "—" : formatDecimalFixedPoint(solFormatter, lamportsToSol(balance.lamports))} SOL</span>
      </button>
      {isOpen && (
        <div className="wallet-menu wallet-details">
          <p className="eyebrow">CONNECTED WALLET</p>
          <p className="wallet-address">{walletAddress}</p>
          <div className="wallet-stat"><span>Balance</span><strong>{balance.lamports == null ? "—" : formatDecimalFixedPoint(solFormatter, lamportsToSol(balance.lamports))} SOL</strong></div>
          <div className="wallet-stat"><span>ONE</span><strong>{oneBalance.isLoading ? "..." : oneBalance.balance?.uiAmountString ?? "0"}</strong></div>
          <button type="button" className="text-button" onClick={() => { void disconnect(); setIsOpen(false); }}>DISCONNECT</button>
        </div>
      )}
    </div>
  );
}
