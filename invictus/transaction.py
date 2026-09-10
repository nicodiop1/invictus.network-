from dataclasses import dataclass
from typing import Any

from .crypto import address_from_public_key, digest, verify
from .encoding import canonical_json


@dataclass(frozen=True)
class Transaction:
    sender: str | None
    recipient: str
    amount: int
    fee: int = 0
    nonce: int = 0
    public_key: str | None = None
    signature: str | None = None

    def unsigned_data(self) -> dict[str, Any]:
        return {"sender": self.sender, "recipient": self.recipient, "amount": self.amount,
                "fee": self.fee, "nonce": self.nonce, "public_key": self.public_key}

    def signing_bytes(self) -> bytes:
        return canonical_json(self.unsigned_data())

    @property
    def transaction_id(self) -> str:
        return digest(canonical_json(self.to_dict()))

    def to_dict(self) -> dict[str, Any]:
        return {**self.unsigned_data(), "signature": self.signature}

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Transaction":
        fields = ("sender", "recipient", "amount", "fee", "nonce", "public_key", "signature")
        return cls(**{key: data.get(key) for key in fields})

    @classmethod
    def payment(cls, wallet: Any, recipient: str, amount: int, fee: int = 0, nonce: int = 0) -> "Transaction":
        unsigned = cls(wallet.address, recipient, amount, fee, nonce, wallet.public_key.hex())
        return cls(**{**unsigned.unsigned_data(), "signature": wallet.sign(unsigned.signing_bytes())})

    def is_coinbase(self) -> bool:
        return self.sender is None

    def is_valid(self) -> bool:
        if not isinstance(self.amount, int) or self.amount <= 0 or not isinstance(self.fee, int) or self.fee < 0:
            return False
        if not isinstance(self.recipient, str) or len(self.recipient) != 44 or not self.recipient.startswith("one1"):
            return False
        try:
            int(self.recipient[4:], 16)
        except ValueError:
            return False
        if self.is_coinbase():
            return self.public_key is None and self.signature is None and self.fee == 0
        if not self.public_key or not self.signature or not isinstance(self.nonce, int) or self.nonce < 0:
            return False
        try:
            public_key = bytes.fromhex(self.public_key)
        except ValueError:
            return False
        return self.sender == address_from_public_key(public_key) and verify(public_key, self.signature, self.signing_bytes())
