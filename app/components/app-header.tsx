"use client";

import { ThemeToggle } from "./theme-toggle";
import { ClusterSelect } from "./cluster-select";
import { WalletButton } from "./wallet-button";

export function AppHeader() {
  return (
    <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-5">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-xs font-black tracking-tight text-primary-foreground">
          IO
        </span>
        <div>
          <p className="text-sm font-black tracking-[0.18em]">INVICTUS ONE</p>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted">
            Broker terminal
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <ClusterSelect />
        <WalletButton />
      </div>
    </header>
  );
}
