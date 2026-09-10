"use client";

import { motion } from "framer-motion";
import { ActionsPanel } from "./actions/actions-panel";

export function BrokerApp() {
  return (
    <motion.main
      className="mx-auto max-w-5xl px-6 pb-16 pt-14"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: "easeOut" }}
    >
      <section className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-[0.28em] text-muted">
          One network. One asset. One command surface.
        </p>
        <h1 className="mt-4 text-5xl font-black tracking-[-0.04em] sm:text-7xl">
          Move with <span className="text-muted">conviction.</span>
        </h1>
        <p className="mt-5 max-w-xl text-base leading-7 text-foreground/60">
          Invictus ONE brings wallet, liquidity, and on-chain actions into one
          focused terminal. Connect your wallet to begin.
        </p>
      </section>
      <ActionsPanel />
    </motion.main>
  );
}
