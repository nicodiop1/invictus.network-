from dataclasses import dataclass
import base64
import hashlib
import os

from cryptography.fernet import Fernet, InvalidToken

from .crypto import address_from_public_key, generate_keypair, sign


@dataclass(frozen=True)
class Wallet:
    private_key: bytes
    public_key: bytes

    @classmethod
    def create(cls) -> "Wallet":
        private_key, public_key = generate_keypair()
        return cls(private_key, public_key)

    @property
    def address(self) -> str:
        return address_from_public_key(self.public_key)

    def sign(self, payload: bytes) -> str:
        return sign(self.private_key, payload)

    def export_private_key(self) -> str:
        return self.private_key.hex()

    def export_encrypted_private_key(self, password: str | None = None) -> str:
        password = password or os.getenv("INVICTUS_WALLET_PASSWORD", "invictus-local-dev")
        key = base64.urlsafe_b64encode(hashlib.sha256(password.encode()).digest())
        return "INV1$" + Fernet(key).encrypt(self.private_key).decode()

    @classmethod
    def from_private_key(cls, value: str) -> "Wallet":
        from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

        if value.startswith("INV1$"):
            password = os.getenv("INVICTUS_WALLET_PASSWORD", "invictus-local-dev")
            key = base64.urlsafe_b64encode(hashlib.sha256(password.encode()).digest())
            try:
                value = Fernet(key).decrypt(value[5:]).hex()
            except InvalidToken as error:
                raise ValueError("unable to decrypt wallet key") from error
        private = bytes.fromhex(value)
        key = Ed25519PrivateKey.from_private_bytes(private)
        return cls(private, key.public_key().public_bytes_raw())
