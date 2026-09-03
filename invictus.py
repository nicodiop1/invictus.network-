class InvictusNetwork:
    def __init__(self):
        self.name = "Invictus"
        self.symbol = "ONE"
        self.total_supply = 0
        self.balances = {}

    def create_one(self, address, amount):
        self.balances[address] = self.balances.get(address, 0) + amount
        self.total_supply += amount

    def balance(self, address):
        return self.balances.get(address, 0)


invictus = InvictusNetwork()

print("Invictus Network started.")
print("Native coin: ONE")