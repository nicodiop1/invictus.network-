from .block import Block


class Consensus:
    """Replaceable validator policy; the default supports permissionless local nodes."""

    def __init__(self, validators: set[str] | None = None):
        self.validators = validators

    def accepts(self, block: Block) -> bool:
        return self.validators is None or block.validator in self.validators
