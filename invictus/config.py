import json
from dataclasses import dataclass, field
from pathlib import Path


@dataclass(frozen=True)
class NetworkConfig:
    network_id: str
    chain_id: int
    p2p_port: int
    rpc_port: int
    block_reward: int
    bootstrap_peers: tuple[str, ...]
    genesis_timestamp: int
    initial_balances: dict[str, int] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: dict) -> "NetworkConfig":
        return cls(
            network_id=data["network_id"],
            chain_id=int(data["chain_id"]),
            p2p_port=int(data["p2p_port"]),
            rpc_port=int(data["rpc_port"]),
            block_reward=int(data["block_reward"]),
            bootstrap_peers=tuple(data.get("bootstrap_peers", ())),
            genesis_timestamp=int(data.get("genesis_timestamp", 0)),
            initial_balances={key: int(value) for key, value in data.get("initial_balances", {}).items()},
        )

    @classmethod
    def load(cls, path: str | Path) -> "NetworkConfig":
        with Path(path).open(encoding="utf-8") as handle:
            return cls.from_dict(json.load(handle))

    def genesis_data(self) -> dict[str, int | str]:
        return {"network_id": self.network_id, "chain_id": self.chain_id, "timestamp": self.genesis_timestamp, "initial_balances": self.initial_balances}


LOCAL_CONFIG = NetworkConfig("invictus-local", 1337, 8000, 8100, 50, (), 0, {})
TESTNET_CONFIG = NetworkConfig("invictus-testnet-1", 1001, 9000, 9100, 50, (), 0, {})
