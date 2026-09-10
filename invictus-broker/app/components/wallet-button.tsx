"use client";

import { useEffect, useRef, useState } from "react";
import { address, formatDecimalFixedPoint, lamportsToSol } from "@solana/kit";
import {
  useWallets,
  useConnect,
  useDisconnect,
  useConnectedWallet,
  useWalletStatus,
} from "@solana/kit-plugin-wallet/react";
import { toast } from "sonner";
import { useBalance } from "../lib/hooks/use-balance";
import { ellipsify } from "../lib/explorer";
import { useAppClient } from "../lib/client-provider";

const solFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 5,
});

export function WalletButton({ fullWidth = false }: { fullWidth?: boolean }) {
  const client = useAppClient();
  const wallets = useWallets(client);
  const status = useWalletStatus(client);
  const connected = useConnectedWallet(client);
  const { dispatch: connect, error } = useConnect(client);
  const { dispatch: disconnect } = useDisconnect(client);

  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const wasConnected = useRef(false);

  const walletAddress = connected?.account.address;
  const balance = useBalance(
    walletAddress ? address(walletAddress) : undefined
  );

  const close = () => setIsOpen(false);

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
    if (error != null) toast.error(error instanceof Error ? error.message : String(error), { id: "wallet-state" });
  }, [error]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!connected) {
    return (
      <div className={`wallet-control${fullWidth ? " wallet-control-full" : ""}`} ref={ref}>
        <button
          onClick={() => setIsOpen((value) => !value)}
          className="gold-button wallet-trigger"
        >
            {status === "connecting" ? "Connecting..." : "Connect Wallet"}
        </button>

        {isOpen && (
          <div className="wallet-menu">
            <p className="eyebrow">SELECT WALLET</p>
            {wallets.length === 0 ? (
              <p className="wallet-empty">Install Phantom, Solflare, or Backpack to continue.</p>
            ) : (
              <div>
                {wallets.map((wallet) => (
                  <button
                    key={wallet.name}
                    onClick={() => {
                      connect(wallet);
                      close();
                    }}
                    disabled={status === "connecting"}
                    className="wallet-option"
                  >
                    {wallet.icon && (
                      // eslint-disable-next-line @next/next/no-img-element -- wallet-standard icons are data URIs
                      <img
                        src={wallet.icon}
                        alt=""
                        className="wallet-icon-image"
                      />
                    )}
                    <span>{wallet.name}</span>
                  </button>
                ))}
              </div>
            )}
            {status === "connecting" && (
                <p className="wallet-empty">Connecting...</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`wallet-control${fullWidth ? " wallet-control-full" : ""}`} ref={ref}>
      <button
        onClick={() => setIsOpen((value) => !value)}
        className="wallet-connected"
      >
        <span className="status-dot" />
        <span>{ellipsify(walletAddress!, 4)}</span>
        <span className="wallet-balance" aria-hidden="true">{balance.lamports == null ? "—" : formatDecimalFixedPoint(solFormatter, lamportsToSol(balance.lamports))} SOL</span>
      </button>

      {isOpen && (
        <div className="wallet-menu wallet-details">
          <p className="eyebrow">CONNECTED WALLET</p>
          <p className="wallet-address">{walletAddress}</p>
          <div className="wallet-stat"><span>Balance</span><strong>
                {balance.lamports != null
                  ? formatDecimalFixedPoint(
                      solFormatter,
                      lamportsToSol(balance.lamports)
                    )
                  : "—"}{" "}SOL</strong></div>
          <button className="text-button" onClick={() => { disconnect(); close(); }}>DISCONNECT</button>
        </div>
      )}
    </div>
  );
}
