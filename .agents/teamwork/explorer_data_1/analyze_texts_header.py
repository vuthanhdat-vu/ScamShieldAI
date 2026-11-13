from pathlib import Path
import collections

texts_dir = Path(r"c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\data_demo\images\texts")
categories = collections.Counter()
channels = collections.Counter()
ground_truths = collections.Counter()

for f in sorted(texts_dir.glob("case_*.txt")):
    lines = f.read_text(encoding="utf-8").splitlines()
    header_info = {}
    for line in lines:
        if line.startswith("---"):
            break
        if ":" in line:
            k, v = line.split(":", 1)
            header_info[k.strip()] = v.strip()
    
    categories[header_info.get("Category", "None")] += 1
    channels[header_info.get("Channel", "None")] += 1
    ground_truths[header_info.get("Ground Truth", "None")] += 1

print("--- TEXT ANNOTATION METADATA (50 cases) ---")
print("Ground Truths:", dict(ground_truths))
print("Channels:", dict(channels))
print("\nCategories breakdown:")
for cat, count in categories.most_common():
    print(f"  {cat}: {count}")
