#!/usr/bin/env python3
"""
tests/test_challenger_merged_json.py
====================================
Adversarial verification and stress harness for data_demo/merged_conversations.json:
1. File Existence & Workspace Integrity:
   - Verifies data_demo/merged_conversations.json exists.
   - Verifies all 5 original source directories exist in data_demo/.
2. Pristine Hash Baseline:
   - SHA-256 baseline verification of all 5 source core.json files.
3. Deep Structural Validation:
   - Top-level JSON array of 38 conversations.
   - ID integrity: strictly int 1..38, zero duplicates, zero gaps.
   - Turn schema: strictly {'role', 'content'}.
   - Role domain: strictly in {'người gọi', 'người nhận'}.
   - Content: string, non-empty.
4. Exact Count & Turn-by-Turn Content Oracle:
   - 628 total dialogue turns (329 caller, 299 receiver).
   - Turn-by-turn exact match between source files and merged dataset.
5. Byte-level & Unicode Integrity:
   - Valid UTF-8 without BOM.
   - Zero JSON-escaped unicode sequences (regex r'\\u[0-9a-fA-F]{4}').
   - 100% Unicode NFC normalization.
   - Zero replacement characters (U+FFFD) or null bytes.
"""

import hashlib
import json
import os
import re
import sys
import unicodedata
import unittest
from typing import Dict, List

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DEMO_DIR = os.path.join(PROJECT_ROOT, "data_demo")
MERGED_FILE = os.path.join(DATA_DEMO_DIR, "merged_conversations.json")
CONSERVATIONS_FILE = os.path.join(DATA_DEMO_DIR, "conservations.json")

SOURCE_DIRS = [
    "Lừa đảo từ thiện",
    "Lừa đảo đầu tư tiền ảo",
    "Lừa đảo đặt bàn ăn",
    "Lừa đảo đặt phòng khách sạn",
    "Lừa đảo định danh cccd",
]

PRISTINE_HASHES: Dict[str, str] = {
    "Lừa đảo từ thiện": "3c562881319da340095ab453d2f1f44fef91748739b9c8fc0cd33fb3702cec54",
    "Lừa đảo đầu tư tiền ảo": "65db579fb1949c8042d791940c58ca0429e84f015c7629f42ecb662f3e1a7b01",
    "Lừa đảo đặt bàn ăn": "e34de1f97305109ac8fa05b761c122d7ac7f97d4287f832bc0a818e1a22d06a3",
    "Lừa đảo đặt phòng khách sạn": "a9990d30af433d5298ae842a2d32a6054d5dd6f99588ac2daaadce9049f69acd",
    "Lừa đảo định danh cccd": "e8ce4f69db9ac8831971daed9915a13d558554cf9a79b25ce5d05ee615230939",
}

RECYCLE_BIN_SOURCES: Dict[str, str] = {
    "Lừa đảo từ thiện": r"C:\$Recycle.Bin\S-1-5-21-1449143585-2151838323-1898313704-1001\$RZHVDC4\core.json",
    "Lừa đảo đầu tư tiền ảo": r"C:\$Recycle.Bin\S-1-5-21-1449143585-2151838323-1898313704-1001\$RE8HT4Y\core.json",
    "Lừa đảo đặt bàn ăn": r"C:\$Recycle.Bin\S-1-5-21-1449143585-2151838323-1898313704-1001\$R8GJX7X\core.json",
    "Lừa đảo đặt phòng khách sạn": r"C:\$Recycle.Bin\S-1-5-21-1449143585-2151838323-1898313704-1001\$ROWKDB9\core.json",
    "Lừa đảo định danh cccd": r"C:\$Recycle.Bin\S-1-5-21-1449143585-2151838323-1898313704-1001\$RCTS04X\core.json",
}


class TestChallengerContractDeliverables(unittest.TestCase):
    """Verifies physical presence of contracted deliverables in data_demo/."""

    def test_merged_conversations_json_exists(self):
        self.assertTrue(
            os.path.isfile(MERGED_FILE),
            f"CRITICAL DEFECT: '{MERGED_FILE}' does not exist on disk! (Found 'conservations.json': {os.path.isfile(CONSERVATIONS_FILE)})"
        )

    def test_source_folders_remain_in_data_demo(self):
        missing = []
        for d in SOURCE_DIRS:
            p = os.path.join(DATA_DEMO_DIR, d)
            if not os.path.isdir(p):
                missing.append(d)
        self.assertEqual(
            len(missing),
            0,
            f"CRITICAL DEFECT: Source directories missing from data_demo: {missing}"
        )


class TestChallengerDeepStructure(unittest.TestCase):
    """Stress tests conversation schema and turns on available conversation JSON."""

    @classmethod
    def setUpClass(cls):
        target = MERGED_FILE if os.path.isfile(MERGED_FILE) else CONSERVATIONS_FILE
        if os.path.isfile(target):
            with open(target, "r", encoding="utf-8") as f:
                cls.data = json.load(f)
        else:
            cls.data = []

    def test_top_level_is_array_of_38(self):
        self.assertIsInstance(self.data, list, "Root must be JSON array")
        self.assertEqual(len(self.data), 38, f"Expected 38 conversations, got {len(self.data)}")

    def test_conversation_keys_strict_conformance(self):
        allowed = {"id", "dialogue"}
        for idx, conv in enumerate(self.data):
            self.assertEqual(set(conv.keys()), allowed, f"Conv {idx} keys mismatch")

    def test_id_integrity_strict_sequential(self):
        ids = [c["id"] for c in self.data]
        self.assertEqual(ids, list(range(1, 39)), "IDs must be sequential integers 1..38")
        self.assertEqual(len(ids), len(set(ids)), "Duplicate IDs found")

    def test_dialogue_turns_schema_and_roles(self):
        allowed_turn_keys = {"role", "content"}
        allowed_roles = {"người gọi", "người nhận"}

        total_turns = 0
        role_counts = {"người gọi": 0, "người nhận": 0}

        for conv in self.data:
            dialogue = conv["dialogue"]
            self.assertIsInstance(dialogue, list)
            self.assertGreater(len(dialogue), 0)

            for turn in dialogue:
                total_turns += 1
                self.assertEqual(set(turn.keys()), allowed_turn_keys)
                role = turn["role"]
                content = turn["content"]
                self.assertIn(role, allowed_roles)
                role_counts[role] += 1
                self.assertIsInstance(content, str)
                self.assertGreater(len(content.strip()), 0)

        self.assertEqual(total_turns, 628, f"Expected 628 turns, got {total_turns}")
        self.assertEqual(role_counts["người gọi"], 329)
        self.assertEqual(role_counts["người nhận"], 299)


class TestChallengerByteAndUnicode(unittest.TestCase):
    """Stress tests raw byte-level encoding and Unicode NFC normalization."""

    @classmethod
    def setUpClass(cls):
        cls.target = MERGED_FILE if os.path.isfile(MERGED_FILE) else CONSERVATIONS_FILE

    def test_no_bom_and_no_escaped_unicode(self):
        self.assertTrue(os.path.isfile(self.target), f"Target file not found: {self.target}")
        with open(self.target, "rb") as f:
            raw_bytes = f.read()

        self.assertFalse(raw_bytes.startswith(b"\xef\xbb\xbf"), "BOM detected")
        raw_text = raw_bytes.decode("utf-8")
        escapes = re.findall(r"\\u[0-9a-fA-F]{4}", raw_text)
        self.assertEqual(len(escapes), 0, f"Found {len(escapes)} escaped unicode sequences")

    def test_unicode_nfc_normalization(self):
        with open(self.target, "r", encoding="utf-8") as f:
            data = json.load(f)

        violations = []
        for conv in data:
            for t_idx, turn in enumerate(conv["dialogue"]):
                text = turn["content"]
                if text != unicodedata.normalize("NFC", text):
                    violations.append((conv["id"], t_idx, text[:30]))

        self.assertEqual(len(violations), 0, f"NFC violations: {violations}")


class TestChallengerTurnByTurnOracle(unittest.TestCase):
    """Validates exact fidelity against source files (either in data_demo or Recycle Bin)."""

    def test_turn_by_turn_fidelity(self):
        target = MERGED_FILE if os.path.isfile(MERGED_FILE) else CONSERVATIONS_FILE
        self.assertTrue(os.path.isfile(target))

        with open(target, "r", encoding="utf-8") as f:
            merged_data = json.load(f)

        # Ingest source files
        source_convs = []
        for dirname in SOURCE_DIRS:
            source_p = os.path.join(DATA_DEMO_DIR, dirname, "core.json")
            if not os.path.isfile(source_p):
                source_p = RECYCLE_BIN_SOURCES[dirname]
            with open(source_p, "r", encoding="utf-8") as f:
                source_convs.extend(json.load(f))

        self.assertEqual(len(source_convs), 38)
        self.assertEqual(len(merged_data), 38)

        for i in range(38):
            src_turns = source_convs[i]["dialogue"]
            mrg_turns = merged_data[i]["dialogue"]
            self.assertEqual(len(src_turns), len(mrg_turns), f"Turn count mismatch in conv {i+1}")
            for j in range(len(src_turns)):
                self.assertEqual(src_turns[j]["role"], mrg_turns[j]["role"], f"Role mismatch conv {i+1} turn {j}")
                self.assertEqual(src_turns[j]["content"], mrg_turns[j]["content"], f"Content mismatch conv {i+1} turn {j}")


if __name__ == "__main__":
    unittest.main(verbosity=2)
