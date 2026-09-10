from .block import Block
from .consensus import Consensus
from .crypto import digest
from .encoding import canonical_json


class Blockchain:
    def __init__(self, consensus: Consensus | None = None, genesis_data: dict | None = None):
        self.consensus = consensus or Consensus()
        self._genesis_data = genesis_data or {"genesis": True, "initial_balances": {}}
        self.blocks: list[Block] = [self.genesis(self._genesis_data)]

    @staticmethod
    def genesis(data: dict | None = None) -> Block:
        genesis_data = data or {"genesis": True}
        return Block(0, "0" * 64, int(genesis_data.get("timestamp", 0)), (), "genesis", "", digest(canonical_json(genesis_data)))

    @classmethod
    def from_dicts(cls, blocks: list[dict], consensus: Consensus | None = None, genesis_data: dict | None = None) -> "Blockchain":
        chain = cls(consensus, genesis_data)
        for data in blocks[1:]:
            chain.add_block(Block.from_dict(data))
        return chain

    def to_dicts(self) -> list[dict]:
        return [block.to_dict() for block in self.blocks]

    @property
    def latest(self) -> Block:
        return self.blocks[-1]

    def balance(self, address: str) -> int:
        balance = int(self._genesis_data.get("initial_balances", {}).get(address, 0))
        for block in self.blocks:
            for transaction in block.transactions:
                if transaction.sender == address:
                    balance -= transaction.amount + transaction.fee
                if transaction.recipient == address:
                    balance += transaction.amount
        return balance

    def next_nonce(self, address: str) -> int:
        return sum(transaction.sender == address for block in self.blocks for transaction in block.transactions)

    @property
    def total_supply(self) -> int:
        return sum(self._genesis_data.get("initial_balances", {}).values()) + sum(transaction.amount for block in self.blocks for transaction in block.transactions if transaction.is_coinbase())

    def validate_block(self, block: Block) -> bool:
        if block.index != len(self.blocks) or block.previous_hash != self.latest.block_hash or not block.is_valid_signature() or not self.consensus.accepts(block):
            return False
        if sum(transaction.is_coinbase() for transaction in block.transactions) > 1 or any(not transaction.is_valid() for transaction in block.transactions):
            return False
        known_ids = {transaction.transaction_id for item in self.blocks for transaction in item.transactions if not transaction.is_coinbase()}
        block_ids: set[str] = set()
        balances: dict[str, int] = {}
        nonces: dict[str, int] = {}
        for transaction in block.transactions:
            if not transaction.is_coinbase() and (transaction.transaction_id in known_ids or transaction.transaction_id in block_ids):
                return False
            block_ids.add(transaction.transaction_id)
            if transaction.is_coinbase():
                if transaction is not block.transactions[0]:
                    return False
                continue
            sender = transaction.sender
            current_balance = balances.setdefault(sender, self.balance(sender))
            current_nonce = nonces.setdefault(sender, self.next_nonce(sender))
            if transaction.nonce != current_nonce or current_balance < transaction.amount + transaction.fee:
                return False
            balances[sender] = current_balance - transaction.amount - transaction.fee
            nonces[sender] = current_nonce + 1
        return True

    def add_block(self, block: Block) -> None:
        if not self.validate_block(block):
            raise ValueError("invalid block")
        self.blocks.append(block)
