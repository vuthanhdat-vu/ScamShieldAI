import json
from pathlib import Path
p = Path(r"c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\data_demo\conservations.json")
with open(p, "r", encoding="utf-8") as f:
    convs = json.load(f)

c9 = convs[8] # ID 9
print(f"Conv ID: {c9['id']}, Total turns: {len(c9['dialogue'])}")
for i, t in enumerate(c9['dialogue']):
    print(f"Turn {i:02d} [{t['role']}]: {t['content']}")
