"use client";

import Link from "next/link";
import { useState } from "react";
import { WalletButton } from "./wallet-button";

const navItems = [["NETWORK", "/network"], ["HOW IT WORKS", "/how-it-works"], ["ONE", "/one"], ["WALLET", "/wallet"], ["CONTACT", "/contact"]] as const;

export function BrandMark({ small = false }: { small?: boolean }) {
  return <span className={`brand-mark${small ? " brand-mark-small" : ""}`} aria-hidden="true"><span className="brand-crown">⌃</span><span className="brand-i">I</span></span>;
}

export function AppHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  return <header className="site-header">
    <Link className="brand-lockup" href="/" onClick={() => setMenuOpen(false)}><BrandMark /><span className="brand-wordmark">INVICTUS</span><span className="brand-submark">ONE</span></Link>
    <button className="menu-toggle" type="button" aria-expanded={menuOpen} aria-label={menuOpen ? "Close menu" : "Open menu"} onClick={() => setMenuOpen((open) => !open)}><span /><span /></button>
    <nav className={`site-nav${menuOpen ? " site-nav-open" : ""}`}>{navItems.map(([label, href]) => <Link key={href} href={href} className="nav-link" onClick={() => setMenuOpen(false)}>{label}</Link>)}<WalletButton /></nav>
  </header>;
}
