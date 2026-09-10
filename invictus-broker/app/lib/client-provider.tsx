"use client";

import { useMemo, type ReactNode } from "react";
import { ClientProvider, useClient } from "@solana/react";
import { createAppClient, getConfiguredCluster, type AppClient } from "./solana-client";
import { useCluster } from "../components/cluster-context";

export function AppClientProvider({ children }: { children: ReactNode }) {
  const { cluster } = useCluster();
  const client = useMemo(
    () => createAppClient(cluster === "devnet" ? getConfiguredCluster() : cluster),
    [cluster]
  );

  return <ClientProvider client={client}>{children}</ClientProvider>;
}

export function useAppClient() {
  return useClient<AppClient>();
}
