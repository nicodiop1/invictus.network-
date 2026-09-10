"use client";

import { address } from "@solana/kit";
import { useEffect, useState } from "react";
import { useAppClient } from "../client-provider";
import { publicEnv } from "../config/env";
import { useCluster } from "../../components/cluster-context";

type TokenBalance = {
  amount: bigint;
  decimals: number;
  uiAmountString: string;
};

type ParsedTokenAccount = {
  account?: {
    data?: {
      parsed?: {
        info?: {
          tokenAmount?: {
            amount?: string;
            decimals?: number;
            uiAmountString?: string;
          };
        };
      };
    };
  };
};

export function useTokenBalance(owner?: string) {
  const client = useAppClient();
  const { cluster } = useCluster();
  const [balance, setBalance] = useState<TokenBalance | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const shouldLoad = Boolean(
    owner && publicEnv.oneMintAddress && cluster === "mainnet"
  );

  useEffect(() => {
    let cancelled = false;
    if (!shouldLoad || !owner) return;
    client.rpc
      .getTokenAccountsByOwner(
        address(owner),
        { mint: address(publicEnv.oneMintAddress) },
        { commitment: "confirmed", encoding: "jsonParsed" }
      )
      .send()
      .then((response) => {
        if (cancelled) return;
        const accounts = response.value as unknown as ParsedTokenAccount[];
        const total = accounts.reduce(
          (sum, item) =>
            sum +
            BigInt(
              item.account?.data?.parsed?.info?.tokenAmount?.amount ?? "0"
            ),
          0n
        );
        const decimals =
          accounts[0]?.account?.data?.parsed?.info?.tokenAmount?.decimals ??
          publicEnv.oneDecimals;
        setBalance({
          amount: total,
          decimals,
          uiAmountString: `${total / 10n ** BigInt(decimals)}.${(
            total %
            10n ** BigInt(decimals)
          )
            .toString()
            .padStart(decimals, "0")
            .replace(/0+$/, "")}`.replace(/\.$/, ""),
        });
        setLoadedFor(owner);
      })
      .catch((reason: unknown) => {
        if (cancelled) return;
        setError(reason);
        setLoadedFor(owner);
      });

    return () => {
      cancelled = true;
    };
  }, [client, cluster, owner, shouldLoad]);

  return {
    balance: shouldLoad ? balance : null,
    isLoading: shouldLoad && loadedFor !== owner,
    error: shouldLoad ? error : null,
  };
}
