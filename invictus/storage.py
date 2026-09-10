import json
import os
from pathlib import Path
from typing import Any


class NodeStorage:
    def __init__(self, directory: str | Path):
        self.directory = Path(directory)
        self.chain_path = self.directory / "chain.json"
        self.wallet_path = self.directory / "wallet.key"
        self.wallets_directory = self.directory / "wallets"

    def load_chain(self) -> list[dict[str, Any]] | None:
        if not self.chain_path.exists():
            candidates = [self.chain_path.with_suffix(".bak")]
        else:
            candidates = [self.chain_path, self.chain_path.with_suffix(".bak")]
        for path in candidates:
            try:
                with path.open(encoding="utf-8") as handle:
                    blocks = json.load(handle)["blocks"]
                if isinstance(blocks, list) and blocks:
                    return blocks
            except (OSError, KeyError, TypeError, json.JSONDecodeError):
                continue
        return None

    def save_chain(self, blocks: list[dict[str, Any]]) -> None:
        self.directory.mkdir(parents=True, exist_ok=True)
        temporary = self.chain_path.with_suffix(".tmp")
        with temporary.open("w", encoding="utf-8") as handle:
            json.dump({"blocks": blocks}, handle, separators=(",", ":"))
            handle.flush()
            os.fsync(handle.fileno())
        if self.chain_path.exists():
            self.chain_path.replace(self.chain_path.with_suffix(".bak"))
        temporary.replace(self.chain_path)

    def load_wallet_key(self) -> str | None:
        if not self.wallet_path.exists():
            return None
        return self.wallet_path.read_text(encoding="utf-8").strip() or None

    def save_wallet_key(self, private_key: str) -> None:
        self.directory.mkdir(parents=True, exist_ok=True)
        self.wallet_path.write_text(private_key + "\n", encoding="utf-8")
        self.wallet_path.chmod(0o600)

    def save_wallet(self, address: str, private_key: str) -> Path:
        self.wallets_directory.mkdir(parents=True, exist_ok=True)
        path = self.wallets_directory / f"{address}.key"
        from .wallet import Wallet

        path.write_text(Wallet.from_private_key(private_key).export_encrypted_private_key() + "\n", encoding="utf-8")
        path.chmod(0o600)
        return path
