import asyncio
import json
import time
from typing import Any

from .transaction import Transaction


class RPCServer:
    def __init__(self, node: Any, auth_token: str | None = None, rate_limit: int = 60):
        self.node = node
        self.auth_token = auth_token
        self.rate_limit = rate_limit
        self._requests: dict[str, list[float]] = {}
        self.server: asyncio.AbstractServer | None = None

    async def start(self, host: str, port: int) -> int:
        self.server = await asyncio.start_server(self._handle, host, port)
        return self.server.sockets[0].getsockname()[1]

    async def stop(self) -> None:
        if self.server:
            self.server.close()
            await self.server.wait_closed()
            self.server = None

    async def _handle(self, reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        try:
            header = await asyncio.wait_for(reader.readuntil(b"\r\n\r\n"), 5)
            request_line, *header_lines = header.decode().split("\r\n")
            method, path, _ = request_line.split(" ", 2)
            headers = {line.split(":", 1)[0].lower(): line.split(":", 1)[1].strip() for line in header_lines if ":" in line}
            body = await reader.readexactly(int(headers.get("content-length", "0")))
            payload = json.loads(body) if body else {}
            status, result = await self._dispatch(method, path, payload, headers)
        except (asyncio.IncompleteReadError, asyncio.LimitOverrunError, asyncio.TimeoutError, ValueError, json.JSONDecodeError, KeyError, TypeError):
            status, result = 400, {"error": "invalid request"}
        except PermissionError as error:
            status, result = 401, {"error": str(error)}
        except LookupError as error:
            status, result = 404, {"error": str(error)}
        except RuntimeError as error:
            status, result = 422, {"error": str(error)}
        response = json.dumps(result, separators=(",", ":")).encode()
        writer.write(f"HTTP/1.1 {status} {'OK' if status == 200 else 'Bad Request'}\r\nContent-Type: application/json\r\nContent-Length: {len(response)}\r\nConnection: close\r\n\r\n".encode() + response)
        await writer.drain()
        writer.close()

    async def _dispatch(self, method: str, path: str, payload: dict, headers: dict[str, str]) -> tuple[int, dict]:
        if self.auth_token and headers.get("authorization") != f"Bearer {self.auth_token}":
            raise PermissionError("authentication required")
        client = headers.get("x-forwarded-for", "local")
        now = time.monotonic()
        recent = [stamp for stamp in self._requests.get(client, []) if now - stamp < 60]
        if len(recent) >= self.rate_limit:
            raise PermissionError("rate limit exceeded")
        recent.append(now)
        self._requests[client] = recent
        if not isinstance(payload, dict):
            raise ValueError("JSON object required")
        if method == "GET" and path == "/health":
            return 200, {"status": "ok", "network_id": self.node.network_id}
        if method == "GET" and path == "/wallet":
            return 200, {"address": self.node.wallet.address}
        if method == "GET" and path == "/chain":
            return 200, {"blocks": [block.to_dict() for block in self.node.chain.blocks]}
        if method == "GET" and path.startswith("/balance/"):
            address = path.removeprefix("/balance/")
            return 200, {"address": address, "balance": self.node.chain.balance(address), "unit": "ONE"}
        if method == "GET" and path.startswith("/transactions/"):
            txid = path.removeprefix("/transactions/")
            for transaction in self.node.mempool.values():
                if transaction.transaction_id == txid:
                    return 200, {"transaction_id": txid, "status": "pending", "transaction": transaction.to_dict()}
            for block in self.node.chain.blocks:
                for transaction in block.transactions:
                    if transaction.transaction_id == txid:
                        return 200, {"transaction_id": txid, "status": "confirmed", "transaction": transaction.to_dict()}
            raise LookupError("transaction not found")
        if method == "GET" and path == "/status":
            return 200, {"network_id": self.node.network_id, "height": len(self.node.chain.blocks), "latest_hash": self.node.chain.latest.block_hash, "total_supply": self.node.chain.total_supply}
        if method == "GET" and path.startswith("/wallets/") and path.endswith("/balance"):
            address = path[len("/wallets/"):-len("/balance")]
            return 200, {"address": address, "balance": self.node.chain.balance(address), "unit": "ONE"}
        if method == "POST" and path == "/wallets":
            wallet = self.node.create_wallet()
            key_file = str(self.node.storage.wallets_directory / f"{wallet.address}.key") if self.node.storage else None
            return 200, {"address": wallet.address, "key_file": key_file}
        if method == "POST" and path == "/transactions":
            if set(payload) - {"recipient", "amount", "fee", "nonce"} or not {"recipient", "amount"} <= set(payload):
                raise ValueError("recipient, amount, fee, and optional nonce are required")
            transaction = self.node.create_transaction(payload["recipient"], payload["amount"], payload.get("fee", 0), payload.get("nonce"))
            return 200, {"transaction_id": transaction.transaction_id, "status": "pending", "verified": transaction.is_valid()}
        if method == "POST" and path == "/mine":
            block = await self.node.mine_and_broadcast()
            return 200, {"height": block.index + 1, "block_hash": block.block_hash, "broadcast": True}
        return 404, {"error": "not found"}
