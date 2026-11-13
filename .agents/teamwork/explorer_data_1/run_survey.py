import os
import json
import csv
import collections
from pathlib import Path
import pandas as pd
from PIL import Image

BASE_DIR = Path(r"c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI")
DATA_DEMO = BASE_DIR / "data_demo"

print("="*80)
print("SURVEY OF DATA_DEMO ASSETS")
print("="*80)

# 1. Survey conservations.json
conv_file = DATA_DEMO / "conservations.json"
print(f"\n--- 1. CONVERSATIONS SURVEY: {conv_file.name} ---")
print(f"File exists: {conv_file.exists()}")
print(f"File size: {conv_file.stat().st_size} bytes")

with open(conv_file, "r", encoding="utf-8") as f:
    convs = json.load(f)

print(f"Total conversations: {len(convs)}")
total_turns = sum(len(c.get("dialogue", [])) for c in convs)
print(f"Total turns: {total_turns}")

turn_counts = [len(c.get("dialogue", [])) for c in convs]
print(f"Turns per conversation: min={min(turn_counts)}, max={max(turn_counts)}, avg={sum(turn_counts)/len(turn_counts):.2f}")

role_counts = collections.Counter()
char_lengths = []
word_lengths = []

for c in convs:
    for t in c.get("dialogue", []):
        r = t.get("role")
        role_counts[r] += 1
        content = t.get("content", "")
        char_lengths.append(len(content))
        word_lengths.append(len(content.split()))

print(f"Role distribution: {dict(role_counts)}")
print(f"Turn text length (chars): min={min(char_lengths)}, max={max(char_lengths)}, avg={sum(char_lengths)/len(char_lengths):.2f}")
print(f"Turn text length (words): min={min(word_lengths)}, max={max(word_lengths)}, avg={sum(word_lengths)/len(word_lengths):.2f}")

# Check conversation IDs
ids = [c.get("id") for c in convs]
print(f"ID sequence: min={min(ids)}, max={max(ids)}, unique={len(set(ids))}, is_sequential={ids == list(range(1, len(ids)+1))}")

# 2. Survey dataset_url_sampled.csv & check dataset_url.csv
url_sampled_file = DATA_DEMO / "dataset_url_sampled.csv"
url_full_file = DATA_DEMO / "dataset_url.csv"
print(f"\n--- 2. URL DATASET SURVEY ---")
print(f"{url_sampled_file.name} exists: {url_sampled_file.exists()} ({url_sampled_file.stat().st_size} bytes)")
print(f"{url_full_file.name} exists: {url_full_file.exists()}")

df_url = pd.read_csv(url_sampled_file)
print(f"URL Sampled shape: {df_url.shape}")
print(f"Columns: {list(df_url.columns)}")
print(f"Label counts:\n{df_url['label'].value_counts(dropna=False)}")
print(f"Label percentages:\n{df_url['label'].value_counts(normalize=True)*100}")
print(f"Missing values:\n{df_url.isnull().sum()}")
print(f"Duplicate url_norm count: {df_url['url_norm'].duplicated().sum()}")

df_url['url_len'] = df_url['url_norm'].astype(str).str.len()
for label, grp in df_url.groupby('label'):
    print(f"Label '{label}' url length: min={grp['url_len'].min()}, max={grp['url_len'].max()}, mean={grp['url_len'].mean():.2f}, median={grp['url_len'].median():.2f}")

# 3. Survey Scam.csv
scam_file = DATA_DEMO / "Scam.csv"
print(f"\n--- 3. SCAM.CSV SURVEY ---")
print(f"File exists: {scam_file.exists()} ({scam_file.stat().st_size} bytes)")
df_scam = pd.read_csv(scam_file)
print(f"Scam.csv shape: {df_scam.shape}")
print(f"Columns: {list(df_scam.columns)}")
print(f"Missing values:\n{df_scam.isnull().sum()}")
print(f"Duplicate rows: {df_scam.duplicated().sum()}")

# Text lengths in Scam.csv
first_col = df_scam.columns[0]
scam_texts = df_scam[first_col].astype(str)
scam_lens_char = scam_texts.str.len()
scam_lens_word = scam_texts.apply(lambda x: len(x.split()))
print(f"Scam char length: min={scam_lens_char.min()}, max={scam_lens_char.max()}, mean={scam_lens_char.mean():.2f}, median={scam_lens_char.median():.2f}")
print(f"Scam word length: min={scam_lens_word.min()}, max={scam_lens_word.max()}, mean={scam_lens_word.mean():.2f}, median={scam_lens_word.median():.2f}")

# 4. Survey No_scam.csv
noscam_file = DATA_DEMO / "No_scam.csv"
print(f"\n--- 4. NO_SCAM.CSV SURVEY ---")
print(f"File exists: {noscam_file.exists()} ({noscam_file.stat().st_size} bytes)")
df_noscam = pd.read_csv(noscam_file)
print(f"No_scam.csv shape: {df_noscam.shape}")
print(f"Columns: {list(df_noscam.columns)}")
print(f"Missing values:\n{df_noscam.isnull().sum()}")
print(f"Duplicate rows: {df_noscam.duplicated().sum()}")

noscam_first_col = df_noscam.columns[0]
noscam_texts = df_noscam[noscam_first_col].astype(str)
noscam_lens_char = noscam_texts.str.len()
noscam_lens_word = noscam_texts.apply(lambda x: len(x.split()))
print(f"No_scam char length: min={noscam_lens_char.min()}, max={noscam_lens_char.max()}, mean={noscam_lens_char.mean():.2f}, median={noscam_lens_char.median():.2f}")
print(f"No_scam word length: min={noscam_lens_word.min()}, max={noscam_lens_word.max()}, mean={noscam_lens_word.mean():.2f}, median={noscam_lens_word.median():.2f}")

# Cross-dataset overlap
overlap = set(scam_texts).intersection(set(noscam_texts))
print(f"\nCross-dataset overlap between Scam and No_scam: {len(overlap)}")

# 5. Images survey
img_dir = DATA_DEMO / "images"
print(f"\n--- 5. IMAGES SURVEY: {img_dir} ---")
print(f"Directory exists: {img_dir.exists()}")
if img_dir.exists():
    img_files = list(img_dir.glob("*"))
    print(f"Total entries in images dir: {len(img_files)}")
    exts = collections.Counter(p.suffix.lower() for p in img_files)
    print(f"Extensions: {dict(exts)}")
    
    # Check resolutions
    resolutions = collections.Counter()
    valid_images = 0
    non_images = []
    for p in img_files:
        if p.is_file() and p.suffix.lower() in [".png", ".jpg", ".jpeg", ".webp"]:
            try:
                with Image.open(p) as im:
                    resolutions[im.size] += 1
                    valid_images += 1
            except Exception as e:
                print(f"Error opening {p.name}: {e}")
        else:
            non_images.append(p.name)
    print(f"Valid image count: {valid_images}")
    print(f"Non-image files: {non_images}")
    print(f"Top 10 resolutions (w, h): {resolutions.most_common(10)}")

# Check test_dataset_multiturn
test_multi = DATA_DEMO / "test_dataset_multiturn"
print(f"\n--- TEST_DATASET_MULTITURN SURVEY ---")
if test_multi.exists():
    all_test = list(test_multi.rglob("*"))
    print(f"Total items in test_dataset_multiturn: {len(all_test)}")
    for item in test_multi.glob("*"):
        print(f"  {item.name} ({'dir' if item.is_dir() else 'file'})")
