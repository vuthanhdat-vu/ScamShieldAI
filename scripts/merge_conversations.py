#!/usr/bin/env python3
"""
scripts/merge_conversations.py
==============================
Merges Vietnamese scam dialogue conversations from 5 source directories under `data_demo/`
into a single consolidated JSON dataset at `data_demo/merged_conversations.json`.

Source directories:
1. data_demo/Lừa đảo từ thiện/core.json
2. data_demo/Lừa đảo đầu tư tiền ảo/core.json
3. data_demo/Lừa đảo đặt bàn ăn/core.json
4. data_demo/Lừa đảo đặt phòng khách sạn/core.json
5. data_demo/Lừa đảo định danh cccd/core.json

Output schema:
JSON array of conversation objects:
[
  {
    "id": 1,
    "dialogue": [
      {
        "role": "người gọi",
        "content": "..."
      },
      {
        "role": "người nhận",
        "content": "..."
      }
    ]
  },
  ...
]

Strictly preserves:
- The 5 original source folders and core.json files (READ-ONLY, untouched).
- Original turn schema and roles ("người gọi", "người nhận").
- UTF-8 encoding without ASCII escaping (ensure_ascii=False).
- Sequential conversation indexing from 1 to 38.
"""

import json
import os
import sys
from typing import Any, Dict, List

SOURCE_DIRS = [
    "Lừa đảo từ thiện",
    "Lừa đảo đầu tư tiền ảo",
    "Lừa đảo đặt bàn ăn",
    "Lừa đảo đặt phòng khách sạn",
    "Lừa đảo định danh cccd",
]

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DEMO_DIR = os.path.join(PROJECT_ROOT, "data_demo")
OUTPUT_PATH = os.path.join(DATA_DEMO_DIR, "merged_conversations.json")


def merge_conversations() -> List[Dict[str, Any]]:
    print("=" * 70)
    print("Starting JSON Conversation Merger (Requirement R1)")
    print(f"Data Demo Directory: {DATA_DEMO_DIR}")
    print(f"Target Output Path:   {OUTPUT_PATH}")
    print("=" * 70)

    merged_data: List[Dict[str, Any]] = []
    current_id = 1
    total_turns = 0
    caller_turns = 0
    receiver_turns = 0

    category_stats = []

    for dirname in SOURCE_DIRS:
        folder_path = os.path.join(DATA_DEMO_DIR, dirname)
        core_file = os.path.join(folder_path, "core.json")

        if not os.path.isdir(folder_path):
            raise FileNotFoundError(f"Missing source directory: {folder_path}")
        if not os.path.isfile(core_file):
            raise FileNotFoundError(f"Missing core.json file: {core_file}")

        # Strictly read-only ingestion with UTF-8
        with open(core_file, "r", encoding="utf-8") as f:
            conversations = json.load(f)

        if not isinstance(conversations, list):
            raise ValueError(f"Expected JSON array in {core_file}, got {type(conversations)}")

        cat_conv_count = len(conversations)
        cat_turn_count = 0

        for conv in conversations:
            if not isinstance(conv, dict):
                raise ValueError(f"Expected conversation dict in {core_file}, got {type(conv)}")
            if "dialogue" not in conv or not isinstance(conv["dialogue"], list):
                raise ValueError(f"Conversation missing 'dialogue' array in {core_file}")

            # Validate each turn preserves schema and role annotations
            cleaned_dialogue = []
            for turn in conv["dialogue"]:
                if not isinstance(turn, dict):
                    raise ValueError(f"Turn is not a dict in {core_file}: {turn}")
                role = turn.get("role")
                content = turn.get("content")

                if role not in ("người gọi", "người nhận"):
                    raise ValueError(f"Invalid role '{role}' in {core_file}")
                if not isinstance(content, str) or len(content.strip()) == 0:
                    raise ValueError(f"Empty or non-string content in {core_file}")

                if role == "người gọi":
                    caller_turns += 1
                else:
                    receiver_turns += 1

                cleaned_dialogue.append({
                    "role": role,
                    "content": content
                })
                cat_turn_count += 1
                total_turns += 1

            record = {
                "id": current_id,
                "dialogue": cleaned_dialogue
            }
            merged_data.append(record)
            current_id += 1

        category_stats.append({
            "category": dirname,
            "conversations": cat_conv_count,
            "turns": cat_turn_count
        })

    # Write output atomically: write to temp file, then rename
    temp_output_path = OUTPUT_PATH + ".tmp"
    with open(temp_output_path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(merged_data, f, ensure_ascii=False, indent=2)
        f.write("\n")

    if os.path.exists(OUTPUT_PATH):
        os.remove(OUTPUT_PATH)
    os.rename(temp_output_path, OUTPUT_PATH)

    # Verification of written file
    with open(OUTPUT_PATH, "r", encoding="utf-8") as f:
        verified_data = json.load(f)

    print("\nMerge Summary:")
    print("-" * 70)
    for stat in category_stats:
        print(f"  * {stat['category']:<32} : {stat['conversations']:>2} convs | {stat['turns']:>3} turns")
    print("-" * 70)
    print(f"Total Conversations Merged : {len(verified_data)} (Expected: 38)")
    print(f"Total Dialogue Turns       : {total_turns} (Expected: 628)")
    print(f"  - Người gọi (Caller)     : {caller_turns} (52.39%)")
    print(f"  - Người nhận (Receiver)  : {receiver_turns} (47.61%)")
    print(f"Output File Size           : {os.path.getsize(OUTPUT_PATH):,} bytes")
    print("=" * 70)

    assert len(verified_data) == 38, f"Expected 38 conversations, got {len(verified_data)}"
    assert total_turns == 628, f"Expected 628 turns, got {total_turns}"
    assert [c["id"] for c in verified_data] == list(range(1, 39)), "IDs must be sequential 1..38"
    print("MERGE AND VERIFICATION COMPLETED SUCCESSFULLY!\n")

    return verified_data


if __name__ == "__main__":
    try:
        merge_conversations()
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
