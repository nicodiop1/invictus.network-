from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Protocol
import time


@dataclass(frozen=True)
class Account:
    chain: str
    address: str
    private_key: str


@dataclass(frozen=True)
class ChainBalance:
    chain: str
    address: str
    asset: str
    amount: int
    decimals: int
    token_ad


@dataclass(frozen=True)
class ChainTransaction:
    chain: str
    sender: str
    recipient: str
    amount: int
    asset: str
    raw: dict[str, Any]


@dataclass(frozen=True)
class RetryPolicy:
    attempts: int = 3
    base_delay: float = 0.05


class RpcError(RuntimeError):
    pass


class RpcTransport(Protocol):
    def call(self, method: str, params: list[Any]) -> Any:
        """Call a JSON-RPC method."""


class JsonRpcTransport:
    def __init__(self, endpoint: str, request: Callable[[str, dict[str, Any]], Any], retry: RetryPolicy | None = None):
        self.endpoint = endpoint
        self._request = request
        self.retry = retry or RetryPolicy()

    def call(self, method: str, params: list[Any]) -> Any:
        payload = {"jsonrpc": "2.0", "id": 1, "method": method, "params": params}
        for attempt in range(self.retry.attempts):
            try:
                response = self._request(self.endpoint, payload)
                if "error" in response:
                    raise RpcError(str(response["error"]))
                return response["result"]
            except (TimeoutError, ConnectionError, OSError) as error:
                if attempt + 1 == self.retry.attempts:
                    raise RpcError(f"RPC unavailable: {error}") from error
                time.sleep(self.retry.base_delay * (2**attempt))
        raise AssertionError("unreachable")


class ChainAdapter(Protocol):
    name: str
    native_asset: str
    native_decimals: int

    def generate_account(self) -> Account: ...
    def import_account(self, private_key: str) -> Account: ...
    def get_balance(self, address: str) -> ChainBalance: ...
    def discover_tokens(self, address: str) -> list[ChainBalance]: ...
    def build_transaction(self, sender: Account, recipient: str, amount: int, asset: str | None = None) -> ChainTransaction: ...


adapter_registry: dict[str, ChainAdapter] = {}
