# Invictus Network

The Future is ONE. This repository contains the modular, local-development
foundation for an independent public blockchain whose native currency is ONE.

## Status

This is a foundation release, not a live network. It includes Ed25519 wallet
addresses and signatures, signed blocks and transactions, configurable ONE
issuance, chain validation, a replaceable validator policy, and length-prefixed
JSON peer networking. The default consensus policy is intentionally simple and
deterministic for local development; it is not yet a production Byzantine fault
tolerant consensus protocol.

There is no fixed maximum supply. Each node's `block_reward` controls local
development issuance and should be replaced by a protocol-wide monetary policy
before a public launch.

## Setup and tests

Python 3.11+ is required.

```sh
python -m venv .venv
. .venv/bin/activate
python -m pip install -e . pytest
pytest
```

## Run a local node

Start separate terminals with different ports:

```sh
invictus-node --host 127.0.0.1 --port 8001
invictus-node --host 127.0.0.1 --port 8002
```

Nodes expose the `Node` API for local orchestration. A node can mine a reward,
create a signed payment with `Transaction.payment(wallet, recipient, amount)`,
submit it to its mempool, and use `broadcast_transaction` or
`mine_and_broadcast` to propagate it to connected peers. The wire protocol is
bounded length-prefixed JSON and is deliberately kept behind `Node` so it can
later be replaced without changing ledger primitives.

## Run the transfer demo

The complete local workflow runs two nodes, issues ONE to the sender, signs and
verifies a transfer, mines it, synchronizes the block, and prints balances:

```sh
invictus-demo
```

This only binds loopback sockets and does not deploy a public network.

## Controlled mainnet preparation

The checked-in [mainnet configuration](config/mainnet.json) uses network ID
`invictus-mainnet-1` and chain ID `1`. It has zero issuance and no bootstrap
peers until an operator explicitly supplies them. This is a launch artifact,
not a public deployment; do not use real funds with this foundation.

Start one controlled node with a persistent directory:

```sh
./.venv/bin/invictus-node --config config/mainnet.json --data-dir data/mainnet-node-1 --host 127.0.0.1 --port 7000 --rpc-port 7100
```

For a second node, use a separate data directory and ports, and add the first
node's `host:port` to `bootstrap_peers` in a copied configuration file. Never
share data directories between nodes. Startup logs identify the network and
wallet address but never print private keys.

## Testnet deployment

The checked-in [testnet configuration](config/testnet.json) is separate from
the local defaults and identifies the network as `invictus-testnet-1` with
chain ID `1001`. It has no bootstrap peers by default. Edit
`bootstrap_peers` with trusted `host:port` P2P seeds before starting additional
nodes. Each node needs its own data directory and P2P/RPC ports.

Start a persistent testnet node with:

```sh
./.venv/bin/invictus-node --config config/testnet.json --data-dir data/testnet-node-1 --host 0.0.0.0 --port 9000 --rpc-port 9100
```

The node stores its wallet key and chain in the data directory. Back up the
directory securely; the wallet key controls the node's mining rewards.

The HTTP API is intentionally small and testnet-oriented:

```sh
curl http://127.0.0.1:9100/status
curl http://127.0.0.1:9100/wallets/one1.../balance
curl -X POST http://127.0.0.1:9100/wallets
curl -X POST http://127.0.0.1:9100/transactions \
	-H 'content-type: application/json' \
	-d '{"recipient":"one1...","amount":10,"fee":1}'
```

The transaction endpoint signs with the node wallet and places the payment in
the mempool; it still requires a block producer to mine and broadcast it.
Wallet keys are stored with mode `0600` under the node data directory. The RPC
wallet endpoint returns an address and key-file location, never private-key
contents. Back up keys securely and keep RPC bound to loopback or a protected
network.

Before any public launch, add authentication and rate limiting for RPC, encrypted
key management, authenticated peer identity, monitored bootstrap nodes, a
production consensus protocol, and an audited monetary policy.

## Modules

- `wallet.py` and `crypto.py`: Ed25519 keys, ONE addresses, and signatures.
- `transaction.py`: canonical signed payments and validation.
- `block.py` and `chain.py`: immutable blocks, balances, issuance, and replay validation.
- `consensus.py`: replaceable validator acceptance policy.
- `node.py`: mempool, mining, peer connections, synchronization, and broadcast.

# invictus-broker

Next.js starter built on `@solana/kit` v7 with the kit plugin client and [`@solana/react`](https://www.npmjs.com/package/@solana/react). Connect a browser wallet, switch networks, and send real transactions — SOL transfers, SPL token actions, and memos — with zero manual `pipe()` boilerplate.

## Getting Started

```shell
npx -y create-solana-dapp@latest -t solana-foundation/templates/kit/invictus-broker
```

```shell
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), connect a wallet, and (on devnet) click **Airdrop 1 SOL** to fund it. Then try the actions. Need devnet SOL another way? [faucet.solana.com](https://faucet.solana.com/).

## What's Included

- **Wallet connection** via [`@solana/kit-plugin-wallet`](https://www.npmjs.com/package/@solana/kit-plugin-wallet) (wallet-standard discovery, auto-reconnect)
- **Network switcher** — devnet, testnet, mainnet, localnet
- **Transfer SOL** with the (`@solana-program/system`)[https://www.npmjs.com/package/@solana-program/system] kit plugin
- **Token actions** — create a mint, mint tokens, and transfer them with the [`@solana-program/token`](https://www.npmjs.com/package/@solana-program/token) kit plugin (associated token accounts created for you)
- **Add memo** with the [`@solana-program/memo`](https://www.npmjs.com/package/@solana-program/memo) kit plugin
- **Live balance** and **toast notifications** with explorer links
- **Tailwind CSS v4** with light/dark mode

## How it works

The app builds one kit client per selected cluster in [`app/lib/solana-client.ts`](app/lib/solana-client.ts) and provides it through `@solana/react`'s `ClientProvider`:

```ts
createClient()
  .use(walletSigner({ chain })) // wallet as payer + identity; must precede rpc
  .use(solanaRpc({ rpcUrl, rpcSubscriptionsUrl })) // rpc, subscriptions, getMinimumBalance, sendTransaction
  .use(rpcAirdrop()) // client.airdrop (non-mainnet)
  .use(systemProgram()) // client.system.instructions.transferSol
  .use(tokenProgram()) // client.token.instructions.{createMint,mintToATA,transferToATA}
  .use(memoProgram()); // client.memo.instructions.addMemo
```

Components read the client with `useClient()` and the connected wallet with the `@solana/kit-plugin-wallet/react` hooks (`useWallets`, `useConnect`, `useConnectedWallet`, `useDisconnect`). Sending is a single call — `client.sendTransaction([instruction])` for raw instructions, or `client.token.instructions.createMint({...}).sendTransaction()` for the token plugin's built-in instruction plans.

### Switching networks

A kit client is bound to one chain and RPC endpoint. The cluster dropdown rebuilds the client in a `useMemo` keyed on the cluster and hands the new instance to `ClientProvider`, which reprovisions the subtree. See [`app/lib/client-provider.tsx`](app/lib/client-provider.tsx).

## Testing

```shell
npm run test
```

The tests in [`tests/`](tests/) drive the real UI — click **Connect Wallet**, pick a wallet, fill in the transfer form, press **Send SOL** — and assert on-chain state before and after each click. Three pieces make that work without a browser or a wallet extension:

- **[`@solana/surfpool`](https://www.npmjs.com/package/@solana/surfpool)** embeds a [Surfpool](https://surfpool.run) Solana runtime in-process. Each test file boots its own surfnet on dynamic ports in well under a second, with cheatcodes to fund accounts (`surfnet.fundSol`), set token balances, deploy programs, and time travel. It's a native addon with prebuilt binaries for macOS (x64/arm64) and Linux x64.
- **A mock wallet-standard wallet** ([`tests/mock-wallet.ts`](tests/mock-wallet.ts)) registers itself like any browser extension would, so the app's real wallet discovery, connect flow, and transaction signing run unmodified — signatures come from an in-memory keypair.
- **[Vitest](https://vitest.dev) + [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)** render the actual app components in jsdom and interact with them by role and label, the same way a user would.

The tests point the app's client factory at the surfnet via the optional URL override on `createAppClient` — everything else (plugins, signing, subscriptions, live balance updates) is the production code path.
