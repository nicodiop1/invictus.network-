"use client";

import Image from "next/image";
import { ThemeToggle } from "./theme-toggle";
import { ClusterSelect } from "./cluster-select";
import { WalletButton } from "./wallet-button";

const navItems = ["NETWORK", "HOW IT WORKS", "ONE", "WALLET", "CONTACT"];

export function AppHeader() {
  return (
    <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
      <div className="flex items-center gap-3">
        <div className="relative h-10 w-10 overflow-hidden rounded-full border border-[#d4af5d]/60 bg-[#101010]">
          <Image
            src="/logo.png"
            alt="Invictus One logo"
            fill
            sizes="40px"
            priority
            className="object-cover"
          />
        </div>
        <span className="text-lg font-light tracking-[0.32em] text-[#f3d68a] uppercase">
          Invictus One
        </span>
      </div>

      <nav className="hidden items-center gap-8 text-[10px] font-light tracking-[0.24em] text-[#f6dca3]/80 md:flex">
        {navItems.map((item) => (
          <a key={item} href="#" className="transition hover:text-[#f3d68a]">
            {item}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <ThemeToggle />
        <ClusterSelect />
        <WalletButton />
      </div>
    </header>
  );
}
