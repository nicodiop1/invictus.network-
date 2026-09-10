"use client";

import { motion } from "framer-motion";
import { address, formatDecimalFixedPoint, lamportsToSol } from "@solana/kit";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import Link from "next/link";
import { useAppClient } from "../lib/client-provider";
import { useBalance } from "../lib/hooks/use-balance";
import { useTokenBalance } from "../lib/hooks/use-token-balance";
import { ellipsify } from "../lib/explorer";
import { ActionsPanel } from "./actions/actions-panel";
import { WalletButton } from "./wallet-button";

const solFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 5 });

export function BrokerApp() {
  const client = useAppClient();
  const connected = useConnectedWallet(client);
  const walletAddress = connected?.account.address;
  const { lamports, isLoading: isSolLoading } = useBalance(
    walletAddress ? address(walletAddress) : undefined
  );
  const { balance: oneBalance, isLoading: isOneLoading } = useTokenBalance(walletAddress);
  const solBalance = lamports == null ? null : lamportsToSol(lamports);

  return (
    <motion.main
      className="broker-home"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      <section className="broker-topbar">
        <div className="broker-brand">
          <span className="broker-brand-mark" aria-hidden="true">⌃</span>
          <div><span>INVICTUS</span><small>ONE</small></div>
        </div>
        <button className="broker-icon-button" type="button" aria-label="Notifications" onClick={() => undefined}>◌</button>
      </section>

      <section className="broker-portfolio" aria-labelledby="portfolio-title">
        <div className="broker-section-label"><span id="portfolio-title">TOTAL PORTFOLIO</span><span className="broker-live-dot">LIVE</span></div>
        <p className="broker-total-value">
          {connected ? (isSolLoading ? "Loading" : solBalance != null ? `${formatDecimalFixedPoint(solFormatter, solBalance)} SOL` : "—") : "Connect wallet"}
        </p>
        <p className="broker-muted">USD value unavailable until a live market price is returned.</p>
        <div className="broker-chart" aria-label="Portfolio performance chart unavailable until market data is connected">
          <svg viewBox="0 0 600 100" role="img" aria-hidden="true" preserveAspectRatio="none">
            <path d="M0 77 C55 77 65 62 112 66 S170 77 214 61 S272 45 315 55 S366 35 412 45 S470 41 508 27 S560 35 600 12" />
          </svg>
          <span>24H CHANGE <strong>—</strong></span>
        </div>
        {!connected && <WalletButton fullWidth />}
        {connected && walletAddress && <p className="broker-address">{ellipsify(walletAddress, 6)}</p>}
      </section>

      <section className="broker-quick-actions" aria-label="Wallet actions">
        <Link href="#send" className="broker-action-button"><span>↑</span>SEND</Link>
        <Link href="#receive" className="broker-action-button"><span>↓</span>RECEIVE</Link>
        <Link href="#swap" className="broker-action-button"><span>↕</span>SWAP</Link>
        <button className="broker-action-button" type="button" disabled title="Buy is unavailable until a verified fiat on-ramp is configured"><span>+</span>BUY</button>
      </section>

      <section className="broker-assets" id="assets" aria-labelledby="assets-title">
        <div className="broker-section-heading"><h2 id="assets-title">ASSETS</h2><span>ON-CHAIN BALANCES</span></div>
        <AssetRow symbol="ONE" name="Invictus One" balance={isOneLoading ? "..." : oneBalance?.uiAmountString ?? "—"} change="—" />
        <AssetRow symbol="SOL" name="Solana" balance={isSolLoading ? "..." : solBalance != null ? formatDecimalFixedPoint(solFormatter, solBalance) : "—"} change="—" />
        <AssetRow symbol="USDC" name="USD Coin" balance="—" change="—" />
      </section>

      <section className="broker-connection-note">
        <p>NON-CUSTODIAL BY DESIGN</p>
        <span>Every signature requires your explicit approval in your wallet.</span>
      </section>
      <ActionsPanel />

      <nav className="broker-bottom-nav" aria-label="Primary navigation">
        <Link className="is-active" href="/"><span>⌂</span>HOME</Link>
        <Link href="#swap"><span>↕</span>TRADE</Link>
        <Link href="#assets"><span>◈</span>ASSETS</Link>
        <Link href="/network"><span>✦</span>DISCOVER</Link>
        <Link href="/wallet"><span>⚙</span>SETTINGS</Link>
      </nav>
    </motion.main>
  );
}

function AssetRow({ symbol, name, balance, change }: { symbol: string; name: string; balance: string; change: string }) {
  return (
    <div className="broker-asset-row">
      <div className={`broker-asset-icon broker-asset-${symbol.toLowerCase()}`}>{symbol === "ONE" ? "⌃" : symbol[0]}</div>
      <div className="broker-asset-name"><strong>{symbol}</strong><span>{name}</span></div>
      <div className="broker-asset-balance"><strong>{balance}</strong><span>USD — <em>{change}</em></span></div>
    </div>
  );
}
