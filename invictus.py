import json, getpass, urllib.request

key = getpass.getpass("OpenAI API key: ").strip()
previous = None

rules = """You are Invictus, a concise terminal AI for Invictus One.
Give clear prompt-style answers. Help with code, planning, writing, and debugging.
Never claim access to wallets, money, private keys, accounts, or systems you cannot access.
Ask before irreversible or public actions."""

print("\nINVICTUS AI READY — type /exit to close\n")

while True:
    prompt = input("YOU > ").strip()
    if prompt.lower() in ("/exit", "exit", "quit"):
        break
    if not prompt:
        continue

    body = {
        "model": "gpt-5.4-mini",
        "instructions": rules,
        "input": prompt
    }
    if previous:
        body["previous_response_id"] = previous

    request = urllib.request.Request(
        "https://api.openai.com/v1/responses",
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(request) as response:
            result = json.load(response)
        previous = result["id"]
        print("\nINVICTUS >", result["output_text"], "\n")
    except Exception as error:
        print("\nERROR >", error, "\n")
