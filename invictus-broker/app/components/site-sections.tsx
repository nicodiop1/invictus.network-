"use client";

import { useState } from "react";
import Image from "next/image";
import { address, formatDecimalFixedPoint, lamportsToSol } from "@solana/kit";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { toast } from "sonner";
import { useAppClient } from "../lib/client-provider";
import { useBalance } from "../lib/hooks/use-balance";
import { ellipsify } from "../lib/explorer";
import { BrandMark } from "./app-header";
import { WalletButton } from "./wallet-button";

const solFormatter = new Intl.NumberFormat("en-US", { maximumFractionDigits: 5 });

export function HeroSection() {
  return <section className="hero section-wrap" id="top"><div className="hero-copy reveal"><p className="eyebrow">CROWNED BY DESIGN / EST. 2026</p><h1>THE FUTURE<br /><em>IS ONE</em></h1><div className="gold-rule" /><p className="hero-lede">ONE NETWORK. ONE CURRENCY.<br />OPEN TO EVERYONE.</p><div className="button-row"><a className="gold-button" href="#one">BUY ONE</a><a className="outline-button" href="https://explorer.solana.com" target="_blank" rel="noreferrer">CHART ↗</a></div></div><div className="hero-mark reveal reveal-delay"><Image className="hero-logo" src="/Invictus One OFFICIAL LOGO.png" alt="Invictus One crowned monogram" width={120} height={120} priority /></div></section>;
}

export function NetworkSection() {
  const features = [["01", "OPEN BY DEFAULT", "A permissionless network for people building what comes next."], ["02", "ONE CLEAR STANDARD", "Fast, composable infrastructure with the Solana chain underneath."], ["03", "BUILT TO MOVE", "Designed for exchange, ownership, and everyday utility at scale."], ["04", "OWN YOUR ACCESS", "Your wallet is your identity. Your keys stay with you."]];
  return <section className="content-section section-wrap watermarked" id="network"><SectionIntro number="01" title="THE NETWORK" copy="Invictus One is a focused layer for a more open financial internet. One place to connect, move, and participate." /><div className="feature-grid">{features.map(([number, title, copy]) => <article className="feature-card" key={number}><span className="card-number">{number}</span><h3>{title}</h3><p>{copy}</p></article>)}</div></section>;
}

export function HowItWorksSection() {
  const steps = [["01", "CONNECT", "Bring a compatible wallet. Phantom, Solflare, and Backpack are ready."], ["02", "CHOOSE YOUR PATH", "Explore the network, hold ONE, or use the tools that fit your next move."], ["03", "MOVE WITH CONFIDENCE", "Every action is transparent, verifiable, and settled on Solana."]];
  return <section className="content-section section-wrap" id="how-it-works"><SectionIntro number="02" title="HOW IT WORKS" copy="A direct path from curiosity to participation. No gatekeepers, no clutter." /><div className="steps-list">{steps.map(([number, title, copy]) => <article className="step" key={number}><span className="step-number">{number}</span><div><h3>{title}</h3><p>{copy}</p></div><span className="step-arrow">↗</span></article>)}</div></section>;
}

export function OneSection() {
  const [copied, setCopied] = useState(false);
  const contract = "ONE111111111111111111111111111111111111111";
  const copyContract = async () => { await navigator.clipboard.writeText(contract); setCopied(true); toast.success("Contract address copied"); setTimeout(() => setCopied(false), 1800); };
  return <section className="content-section token-section section-wrap watermarked" id="one"><SectionIntro number="03" title="ONE" copy="A single symbol for shared momentum. Built on Solana, designed for a world that moves together." /><div className="token-grid"><div className="coin-visual"><div className="coin-orbit" /><Image className="coin-image" src="/Invictus One Coin.png" alt="Invictus One coin" width={330} height={330} /></div><div className="token-data"><div className="data-row"><span>SUPPLY</span><strong>1,000,000,000 ONE</strong></div><div className="data-row"><span>CHAIN</span><strong>SOLANA</strong></div><div className="data-row"><span>CONTRACT</span><button className="contract-button" type="button" onClick={copyContract}>{copied ? "COPIED" : ellipsify(contract, 8)} <span>⧉</span></button></div></div></div></section>;
}

export function WalletSection() {
  const client = useAppClient();
  const connected = useConnectedWallet(client);
  const walletAddress = connected?.account.address;
  const balance = useBalance(walletAddress ? address(walletAddress) : undefined);
  const solBalance = balance.lamports == null ? "—" : formatDecimalFixedPoint(solFormatter, lamportsToSol(balance.lamports));
  return <section className="content-section wallet-section section-wrap" id="wallet"><SectionIntro number="04" title="YOUR WALLET" copy="Connect your wallet to see your live Solana balance and enter the network." /><div className="wallet-panel"><div><p className="eyebrow">{connected ? "WALLET CONNECTED" : "READY WHEN YOU ARE"}</p><h3>{connected ? ellipsify(walletAddress!, 5) : "Start with a connection."}</h3>{connected && <p className="wallet-live">Live balance <strong>{solBalance} SOL</strong></p>}</div><WalletButton fullWidth /></div></section>;
}

export function ContactSection() {
  return <section className="content-section contact-section section-wrap" id="contact"><SectionIntro number="05" title="CONTACT" copy="For partnerships, press, and conversations about the future of ONE." /><div className="contact-links"><a href="mailto:hello@invictus.one">HELLO@INVICTUS.ONE <span>↗</span></a><a href="https://x.com" target="_blank" rel="noreferrer">X / INVICTUS ONE <span>↗</span></a><a href="https://github.com/nicodiop1/invictus.network-" target="_blank" rel="noreferrer">GITHUB <span>↗</span></a></div></section>;
}

function SectionIntro({ number, title, copy }: { number: string; title: string; copy: string }) {
  return <div className="section-intro reveal"><span className="section-number">{number}</span><div><p className="eyebrow">INVEST IN THE OPEN</p><h2>{title}</h2><div className="section-rule" /><p className="section-copy">{copy}</p></div></div>;
}

export function SiteFooter() {
  return <footer className="site-footer"><div className="footer-brand"><BrandMark small /><span>INVICTUS ONE</span></div><span>EST. 2026</span><a href="#top">BACK TO TOP ↑</a></footer>;
}