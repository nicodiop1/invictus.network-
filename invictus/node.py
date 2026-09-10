import asyncio
import json
import struct
import logging
from pathlib import Path
from typing import Any

from .block import Block
from .chain import Blockchain
from .config import LOCAL_CONFIG, NetworkConfig
from .rpc import RPCServer
from .storage import NodeStorage
from .transaction import Transaction
from .wallet import Wallet


class Node:
    """A local node with length-prefixed JSON transport for development networks."""

    def __init__(self, wallet: Wallet | None = None, chain: Blockchain | None = None, block_reward: int | None = None,
                 config: NetworkConfig | None = None, data_dir: str | Path | None = None):
        self.config = config or LOCAL_CONFIG
        self.logger = logging.getLogger(f"invictus.node.{self.config.network_id}")
        self.network_id = self.config.network_id
        self.storage = NodeStorage(data_dir) if data_dir else None
        stored_key = self.storage.load_wallet_key() if self.storage else None
        self.wallet = wallet or (Wallet.from_private_key(stored_key) if stored_key else Wallet.create())
        if self.storage and not stored_key:
            self.storage.save_wallet_key(self.wallet.export_encrypted_private_key())
        elif self.storage and stored_key and not stored_key.startswith("INV1$"):
            self.storage.save_wallet_key(self.wallet.export_encrypted_private_key())
        genesis_data = self.config.genesis_data()
        if chain is None and self.storage and self.storage.load_chain():
            self.chain = Blockchain.from_dicts(self.storage.load_chain() or [], genesis_data=genesis_data)
        else:
            self.chain = chain or Blockchain(genesis_data=genesis_data)
        self.mempool: dict[str, Transaction] = {}
        self.peers: set[tuple[asyncio.StreamReader, asyncio.StreamWriter]] = set()
        self.peer_tasks: set[asyncio.Task[None]] = set()
        self._chain_received = asyncio.Event()
        self.server: asyncio.AbstractServer | None = None
        self.rpc = RPCServer(self)
        self.rpc_port: int | None = None
        self.block_reward = self.config.block_reward if block_reward is None else block_reward

    @classmethod
    def from_config(cls, config_path: str | Path, data_dir: str | Path | None = None) -> "Node":
        config = NetworkConfig.load(config_path)
        return cls(config=config, data_dir=data_dir)

    def initialize_genesis(self) -> None:
        if self.storage:
            self.storage.save_chain(self.chain.to_dicts())

    async def start(self, host: str = "127.0.0.1", port: int = 0, rpc_host: str | None = None, rpc_port: int | None = None) -> int:
        self.server = await asyncio.start_server(self._handle_peer, host, port)
        try:
            if rpc_port is not None:
                self.rpc_port = await self.rpc.start(rpc_host or host, rpc_port)
            for peer in self.config.bootstrap_peers:
                bootstrap_host, bootstrap_port = peer.rsplit(":", 1)
                await self.connect(bootstrap_host, int(bootstrap_port))
            return self.server.sockets[0].getsockname()[1]
        except Exception:
            await self.stop()
            raise

    async def stop(self) -> None:
        if self.server:
            self.server.close()
        await self.rpc.stop()
        tasks = tuple(self.peer_tasks)
        for task in tasks:
            task.cancel()
        writers = [writer for _, writer in self.peers]
        for writer in writers:
            writer.close()
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
        self.server = Nonenpm i @solana/web3.js @solana/spl-token
        
        self.peer_tasks.clear()
        self.peers.clear()

    def submit_transaction(self, transaction: Transaction) -> str:
        if not transaction.is_valid() or transaction.sender is None:
            raise ValueError("invalid transaction")
        if transaction.transaction_id in self.mempool or any(transaction.transaction_id == item.transaction_id for block in self.chain.blocks for item in block.transactions):
            raise ValueError("duplicate transaction")
        expected_nonce = self.chain.next_nonce(transaction.sender) + sum(
            item.sender == transaction.sender for item in self.mempool.values()
        )
        pending_cost = sum(
            item.amount + item.fee for item in self.mempool.values() if item.sender == transaction.sender
        )
        if transaction.nonce != expected_nonce or self.chain.balance(transaction.sender) < pending_cost + transaction.amount + transaction.fee:
            raise ValueError("invalid nonce or insufficient balance")
        self.mempool[transaction.transaction_id] = transaction
        self.logger.info("accepted transaction %s", transaction.transaction_id)
        return transaction.transaction_id

    def create_wallet(self) -> Wallet:
        wallet = Wallet.create()
        if self.storage:
            self.storage.save_wallet(wallet.address, wallet.export_private_key())
        return wallet

    def create_transaction(self, recipient: str, amount: int, fee: int = 0, nonce: int | None = None) -> Transaction:
        transaction = Transaction.payment(self.wallet, recipient, amount, fee, self.chain.next_nonce(self.wallet.address) if nonce is None else nonce)
        self.submit_transaction(transaction)
        return transaction

    def mine(self) -> Block:
        transactions = list(self.mempool.values())
        if self.block_reward:
            transactions.insert(0, Transaction(None, self.wallet.address, self.block_reward))
        block = Block.create(len(self.chain.blocks), self.chain.latest.block_hash, transactions, self.wallet)
        self.chain.add_block(block)
        if self.storage:
            self.storage.save_chain(self.chain.to_dicts())
        self.mempool.clear()
        return block

    async def broadcast_transaction(self, transaction: Transaction) -> str:
        transaction_id = self.submit_transaction(transaction)
        await self._broadcast({"type": "transaction", "network_id": self.network_id, "transaction": transaction.to_dict()})
        return transaction_id

    async def mine_and_broadcast(self) -> Block:
        block = self.mine()
        await self._broadcast({"type": "block", "network_id": self.network_id, "block": block.to_dict()})
        return block

    async def connect(self, host: str, port: int) -> None:
        reader, writer = await asyncio.open_connection(host, port)
        self.peers.add((reader, writer))
        task = asyncio.create_task(self._peer_loop(reader, writer))
        self.peer_tasks.add(task)
        task.add_done_callback(self.peer_tasks.discard)
        self._chain_received.clear()
        await self._send(writer, {"type": "get_chain", "network_id": self.network_id})
        await asyncio.wait_for(self._chain_received.wait(), timeout=5)

    async def _handle_peer(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        task = asyncio.current_task()
        if task:
            self.peer_tasks.add(task)
        await self._peer_loop(reader, writer)

    async def _peer_loop(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        self.peers.add((reader, writer))
        try:
            while data := await self._read(reader):
                await self._message(json.loads(data), writer)
        except (ConnectionError, asyncio.IncompleteReadError, json.JSONDecodeError, ValueError, asyncio.CancelledError):
            pass
        finally:
            self.peers.discard((reader, writer))
            writer.close()

    async def _message(self, message: dict[str, Any], source: asyncio.StreamWriter) -> None:
        if message.get("network_id") != self.network_id:
            raise ValueError("network mismatch")
        if message.get("type") == "get_chain":
            await self._send(source, {"type": "chain", "network_id": self.network_id, "blocks": [block.to_dict() for block in self.chain.blocks]})
        elif message.get("type") == "transaction":
            self.submit_transaction(Transaction.from_dict(message["transaction"]))
        elif message.get("type") == "block":
            self.chain.add_block(Block.from_dict(message["block"]))
            if self.storage:
                self.storage.save_chain(self.chain.to_dicts())
        elif message.get("type") == "chain":
            candidate = [Block.from_dict(item) for item in message["blocks"]]
            if candidate and len(candidate) > len(self.chain.blocks) and candidate[0] == self.chain.genesis(self.chain._genesis_data):
                replacement = Blockchain(self.chain.consensus, self.chain._genesis_data)
                for block in candidate[1:]:
                    replacement.add_block(block)
                self.chain = replacement
                if self.storage:
                    self.storage.save_chain(self.chain.to_dicts())
            self._chain_received.set()

    async def _send(self, writer: asyncio.StreamWriter, message: dict[str, Any]) -> None:
        payload = json.dumps(message, separators=(",", ":")).encode()
        writer.write(struct.pack(">I", len(payload)) + payload)
        await writer.drain()

    async def _broadcast(self, message: dict[str, Any]) -> None:
        for _, writer in tuple(self.peers):
            try:
                await self._send(writer, message)
            except ConnectionError:
                pass

    async def _read(self, reader: asyncio.StreamReader) -> bytes:
        header = await reader.readexactly(4)
        (size,) = struct.unpack(">I", header)
        if size > 4 * 1024 * 1024:
            raise ValueError("message too large")
        return await reader.readexactly(size)
