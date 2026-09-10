"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useConnectedWallet } from "@solana/kit-plugin-wallet/react";
import { useAppClient } from "../../lib/client-provider";
import { useCluster } from "../cluster-context";
import { AirdropCard } from "./airdrop-card";
import { TransferSolCard } from "./transfer-sol-card";
import { TokenCard } from "./token-card";
import { MemoCard } from "./memo-card";

export function ActionsPanel() {
  const client = useAppClient();
  const connected = useConnectedWallet(client);
  const { cluster } = useCluster();

  return (
    <AnimatePresence mode="wait" initial={false}>
      {!connected ? (
        <motion.div
          key="connect-prompt"
          className="mt-8 rounded-2xl border border-border-low bg-card p-6 text-sm text-muted"
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: -8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          Connect a wallet to try the on-chain actions.
        </motion.div>
      ) : (
        <motion.section
          key="action-grid"
          className="mt-8 grid gap-4 sm:grid-cols-2"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.055 } },
          }}
        >
          {cluster !== "mainnet" && <AnimatedCard><AirdropCard /></AnimatedCard>}
          <AnimatedCard><TransferSolCard /></AnimatedCard>
          <AnimatedCard><MemoCard /></AnimatedCard>
          <AnimatedCard><TokenCard key={cluster} /></AnimatedCard>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

function AnimatedCard({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="action-card-shell"
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0 },
      }}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 420, damping: 30, mass: 0.7 }}
    >
      {children}
    </motion.div>
  );
}
