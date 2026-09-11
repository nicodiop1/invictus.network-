import { createClient, MicroLamports } from "@solana/kit";
import { walletSigner } from "@solana/kit-plugin-wallet";
import { solanaRpc, rpcAirdrop } from "@solana/kit-plugin-rpc";
import { tokenProgram } from "@solana-program/token";
import { memoProgram } from "@solana-program/memo";
import { systemProgram } from "@solana-program/system";

export type ClusterMoniker = "devnet" | "testnet" | "mainnet" | "localnet";

export const CLUSTERS: ClusterMoniker[] = [
  "devnet",
  "testnet",
  "mainnet",
  "localnet",
];

const ENV_NETWORKS: Record<string, ClusterMoniker> = {
  devnet: "devnet",
  testnet: "testnet",
  mainnet: "mainnet",
  "mainnet-beta": "mainnet",
  localnet: "localnet",
};

const CLUSTER_URLS: Record<ClusterMoniker, string> = {
  devnet: "https://api.devnet.solana.com",
  testnet: "https://api.testnet.solana.com",
  mainnet: "https://api.mainnet-beta.solana.com",
  localnet: "http://localhost:8899",
};

const WS_URLS: Record<ClusterMoniker, string> = {
  devnet: "wss://api.devnet.solana.com",
  testnet: "wss://api.testnet.solana.com",
  mainnet: "wss://api.mainnet-beta.solana.com",
  localnet: "ws://localhost:8900",
};

const WALLET_CHAINS: Record<ClusterMoniker, `solana:${string}`> = {
  devnet: "solana:devnet",
  testnet: "solana:testnet",
  mainnet: "solana:mainnet",
  // Wallets do not advertise a localnet chain. Sign against devnet so wallets
  // stay discoverable while the RPC below targets the local validator.
  localnet: "solana:devnet",
};

export function getClusterUrl(cluster: ClusterMoniker) {
  return CLUSTER_URLS[cluster];
}

export function getConfiguredCluster(): ClusterMoniker {
  const configured = process.env.NEXT_PUBLIC_SOLANA_NETWORK ?? process.env.NEXT_PUBLIC_DEFAULT_CLUSTER ?? "devnet";
  return ENV_NETWORKS[configured] ?? "devnet";
}

export function getWalletChain(cluster: ClusterMoniker) {
  return WALLET_CHAINS[cluster];
}

export type RpcUrlOverrides = {
  rpcUrl: string;
  rpcSubscriptionsUrl: string;
};

/**
 * Builds the app-wide kit client. `urls` overrides the cluster's default RPC
 * endpoints — used by tests to point the client at an ephemeral Surfpool
 * instance on dynamic ports.
 */
export function createAppClient(
  cluster: ClusterMoniker,
  urls?: RpcUrlOverrides
) {
  const configuredCluster = cluster === "devnet" ? getConfiguredCluster() : cluster;
  const rpcUrl = urls?.rpcUrl ?? process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? CLUSTER_URLS[configuredCluster];
  const rpcSubscriptionsUrl = urls?.rpcSubscriptionsUrl ?? process.env.NEXT_PUBLIC_SOLANA_WS_URL ?? WS_URLS[configuredCluster];

  return createClient()
    .use(walletSigner({ chain: WALLET_CHAINS[configuredCluster] }))
    .use(
      solanaRpc({
        rpcUrl,
        rpcSubscriptionsUrl,
        transactionConfig: {
          microLamportsPerComputeUnit: 1000n as MicroLamports,
        },
      })
    )
    .use(rpcAirdrop())
    .use(systemProgram())
    .use(tokenProgram())
    .use(memoProgram());
}

export type AppClient = ReturnType<typeof createAppClient>;
