import json
import collections
from pathlib import Path

p = Path(r"c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\data_demo\conservations.json")
with open(p, "r", encoding="utf-8") as f:
    convs = json.load(f)

print("Total convs:", len(convs))
top_keys = set()
turn_keys = set()
for c in convs:
    top_keys.update(c.keys())
    for t in c["dialogue"]:
        turn_keys.update(t.keys())
print("Top-level keys:", top_keys)
print("Turn keys:", turn_keys)

# Check who speaks first and last
first_roles = collections.Counter(c["dialogue"][0]["role"] for c in convs)
last_roles = collections.Counter(c["dialogue"][-1]["role"] for c in convs)
print("First speaker distribution:", dict(first_roles))
print("Last speaker distribution:", dict(last_roles))

# Find the one non-alternating conversation
for c in convs:
    roles = [t["role"] for t in c["dialogue"]]
    for i in range(len(roles)-1):
        if roles[i] == roles[i+1]:
            print(f"Non-alternating at Conv ID {c['id']}, turn index {i} and {i+1}: both '{roles[i]}'")
            print(f"  Turn {i}: {c['dialogue'][i]['content'][:60]}...")
            print(f"  Turn {i+1}: {c['dialogue'][i+1]['content'][:60]}...")
