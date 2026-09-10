import time
from dataclasses import dataclass
from typing import Any

from .crypto import digest, verify
from .encoding import canonical_json
from .transaction import Transaction


@dataclass(frozen=True)
class Block:
    index: int
    previous_hash: str
    timestamp: int
    transactions: tuple[Transaction, ...]
    validator: str
    validator_public_key: str
    signature: str | None = None

    def unsigned_data(self) -> dict[str, Any]:
        return {"index": self.index, "previous_hash": self.previous_hash, "timestamp": self.timestamp,
                "transactions": [transaction.to_dict() for transaction in self.transactions],
                "validator": self.validator, "validator_public_key": self.validator_public_key}

    def signing_bytes(self) -> bytes:
        return canonical_json(self.unsigned_data())

    @property
    def block_hash(self) -> str:
        return digest(canonical_json(self.to_dict()))

    def to_dict(self) -> dict[str, Any]:
        return {**self.unsigned_data(), "signature": self.signature}

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Block":
        return cls(data["index"], data["previous_hash"], data["timestamp"],
                   tuple(Transaction.from_dict(item) for item in data["transactions"]),
                   data["validator"], data["validator_public_key"], data.get("signature"))

    @classmethod
    def create(cls, index: int, previous_hash: str, transactions: list[Transaction], wallet: Any) -> "Block":
        block = cls(index, previous_hash, int(time.time()), tuple(transactions), wallet.address, wallet.public_key.hex())
        signature = wallet.sign(block.signing_bytes())
        return cls(index, previous_hash, block.timestamp, tuple(transactions), wallet.address, wallet.public_key.hex(), signature)

    def is_valid_signature(self) -> bool:
        try:
            return self.signature is not None and verify(bytes.fromhex(self.validator_public_key), self.signature, self.signing_bytes())
        except ValueError:
            return False
