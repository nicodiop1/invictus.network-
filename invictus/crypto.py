import hashlib

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey


def digest(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def address_from_public_key(public_key: bytes) -> str:
    return "one1" + digest(public_key)[:40]


def generate_keypair() -> tuple[bytes, bytes]:
    private = Ed25519PrivateKey.generate()
    return private.private_bytes_raw(), private.public_key().public_bytes_raw()


def sign(private_key: bytes, payload: bytes) -> str:
    return Ed25519PrivateKey.from_private_bytes(private_key).sign(payload).hex()


def verify(public_key: bytes, signature: str, payload: bytes) -> bool:
    try:
        Ed25519PublicKey.from_public_bytes(public_key).verify(bytes.fromhex(signature), payload)
        return True
    except (InvalidSignature, ValueError, TypeError):
        return False
