import argparse
import asyncio
import logging
import json
import os
import secrets
from pathlib import Path
from urllib.request import Request, urlopen

from .node import Node
from .transaction import Transaction
from .config import NetworkConfig
from .storage import NodeStorage
from .wallet import Wallet


def main() -> None:
    parser = argparse.ArgumentParser(description="Run an Invictus Network node")
    parser.add_argument("--config", help="JSON network configuration")
    parser.add_argument("--data-dir", help="persistent node data directory")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int)
    parser.add_argument("--rpc-port", type=int)
    parser.add_argument("--connect", action="append", default=[], metavar="HOST:PORT")
    parser.add_argument("--rpc-token", default=os.getenv("INVICTUS_RPC_TOKEN"))
    args = parser.parse_args()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")

    async def run() -> None:
        node = Node.from_config(args.config, args.data_dir) if args.config else Node(data_dir=args.data_dir)
        node.rpc.auth_token = args.rpc_token or secrets.token_urlsafe(24)
        port = await node.start(args.host, args.port or node.config.p2p_port, rpc_host=args.host, rpc_port=args.rpc_port or node.config.rpc_port)
        for peer in getattr(args, "connect", []):
            peer_host, peer_port = peer.rsplit(":", 1)
            await node.connect(peer_host, int(peer_port))
        print(f"Invictus node {node.network_id} listening on {args.host}:{port}; RPC {node.rpc_port}; wallet {node.wallet.address}; RPC token {node.rpc.auth_token}")
        try:
            await asyncio.Event().wait()
        finally:
            await node.stop()

    asyncio.run(run())


def _http(method: str, url: str, payload: dict | None = None) -> dict:
    body = json.dumps(payload).encode() if payload is not None else None
    request = Request(url, data=body, method=method, headers={"Content-Type": "application/json"})
    with urlopen(request, timeout=10) as response:
        return json.load(response)


def wallet_command() -> None:
    parser = argparse.ArgumentParser(description="Manage Invictus wallets")
    subparsers = parser.add_subparsers(dest="command", required=True)
    create_parser = subparsers.add_parser("create", help="Create a new wallet")
    create_parser.add_argument("--data-dir", required=True)
    args = parser.parse_args()

    storage = NodeStorage(args.data_dir)
    wallet = Wallet.create()
    storage.save_wallet(wallet.address, wallet.export_private_key())
    print(wallet.address)


def genesis_command() -> None:
    parser = argparse.ArgumentParser(description="Create a network genesis configuration")
    parser.add_argument("--config", required=True)
    parser.add_argument("--wallet-address", required=True)
    parser.add_argument("--allocation", type=int, required=True)
    parser.add_argument("--output", required=True)
    args = parser.parse_args()
    data = json.loads(Path(args.config).read_text(encoding="utf-8"))
    data["initial_balances"] = {args.wallet_address: args.allocation}
    Path(args.output).write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    print(args.output)


def send_command() -> None:
    parser = argparse.ArgumentParser(description="Sign and send ONE from a wallet file")
    parser.add_argument("--wallet-file", required=True)
    parser.add_argument("--rpc", required=True)
    parser.add_argument("--recipient", required=True)
    parser.add_argument("--amount", type=int, required=True)
    parser.add_argument("--fee", type=int, default=0)
    args = parser.parse_args()
    wallet = Wallet.from_private_key(Path(args.wallet_file).read_text(encoding="utf-8").strip())
    transaction = Transaction.payment(wallet, args.recipient, args.amount, args.fee)
    result = _http("POST", args.rpc.rstrip("/") + "/transactions", {"recipient": args.recipient, "amount": args.amount, "fee": args.fee})
    _http("POST", args.rpc.rstrip("/") + "/mine")
    print(result["transaction_id"])


def balance_command() -> None:
    parser = argparse.ArgumentParser(description="Check ONE balances")
    parser.add_argument("--rpc", required=True)
    parser.add_argument("addresses", nargs="+")
    args = parser.parse_args()
    for address in args.addresses:
        result = _http("GET", args.rpc.rstrip("/") + f"/balance/{address}")
        print(f"{address} {result['balance']} ONE")


def demo() -> None:
    async def run() -> None:
        sender = Node(block_reward=50)
        recipient = Node(block_reward=0)
        port = await sender.start()
        await recipient.start()
        try:
            await recipient.connect("127.0.0.1", port)
            await sender.mine_and_broadcast()
            transaction = Transaction.payment(sender.wallet, recipient.wallet.address, 10, fee=1, nonce=0)
            print(f"sender {sender.wallet.address}")
            print(f"recipient {recipient.wallet.address}")
            print(f"transaction verified: {transaction.is_valid()}")
            print(f"before: sender={sender.chain.balance(sender.wallet.address)} ONE, recipient={sender.chain.balance(recipient.wallet.address)} ONE")
            await sender.broadcast_transaction(transaction)
            await sender.mine_and_broadcast()
            for _ in range(100):
                if len(recipient.chain.blocks) == len(sender.chain.blocks):
                    break
                await asyncio.sleep(0.01)
            print(f"after: sender={sender.chain.balance(sender.wallet.address)} ONE, recipient={sender.chain.balance(recipient.wallet.address)} ONE")
            print(f"blockchain height: {len(sender.chain.blocks)}")
        finally:
            await sender.stop()
            await recipient.stop()

    asyncio.run(run())


if __name__ == "__main__":
    main()
