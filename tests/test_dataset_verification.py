#!/usr/bin/env python3
"""
tests/test_dataset_verification.py
==================================
Independent automated verification suite for ScamShieldAI Milestone 2:
1. R1: Merged JSON conversation dataset integrity and schema conformance.
2. Source directory preservation (unmodified 5 original folders and core.json files).
3. R2: Cleaned in-place CSV datasets (dataset_url.csv, No_scam.csv, Scam.csv).
4. UTF-8 encoding, RFC 4180 multiline integrity, and zero duplicate checks.
5. Survey and deduplication reports existence and accuracy.

Exit code 0 on all tests passing, non-zero on any failure.
"""

import csv
import hashlib
import json
import os
import sys
import unittest
from typing import Dict, List, Set

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DEMO_DIR = os.path.join(PROJECT_ROOT, "data_demo")
DOCS_DIR = os.path.join(PROJECT_ROOT, "docs")


class TestOriginalSourcePreservation(unittest.TestCase):
    """Verifies that all 5 original source folders and core.json files remain 100% untouched."""

    ORIGINAL_HASHES: Dict[str, str] = {
        "Lừa đảo từ thiện": "3c562881319da340095ab453d2f1f44fef91748739b9c8fc0cd33fb3702cec54",
        "Lừa đảo đầu tư tiền ảo": "65db579fb1949c8042d791940c58ca0429e84f015c7629f42ecb662f3e1a7b01",
        "Lừa đảo đặt bàn ăn": "e34de1f97305109ac8fa05b761c122d7ac7f97d4287f832bc0a818e1a22d06a3",
        "Lừa đảo đặt phòng khách sạn": "a9990d30af433d5298ae842a2d32a6054d5dd6f99588ac2daaadce9049f69acd",
        "Lừa đảo định danh cccd": "e8ce4f69db9ac8831971daed9915a13d558554cf9a79b25ce5d05ee615230939",
    }

    def test_original_folders_and_files_exist_and_unmodified(self):
        for dirname, expected_hash in self.ORIGINAL_HASHES.items():
            folder = os.path.join(DATA_DEMO_DIR, dirname)
            core_file = os.path.join(folder, "core.json")

            self.assertTrue(os.path.isdir(folder), f"Source folder missing: {folder}")
            self.assertTrue(os.path.isfile(core_file), f"Source core.json missing: {core_file}")

            # Verify SHA256 matches pristine original state
            with open(core_file, "rb") as f:
                actual_hash = hashlib.sha256(f.read()).hexdigest()

            self.assertEqual(
                actual_hash,
                expected_hash,
                f"Source file {core_file} was modified! Hash mismatch."
            )


class TestMergedConversationsJSON(unittest.TestCase):
    """Verifies data_demo/merged_conversations.json structure, turn counts, and schema."""

    MERGED_FILE = os.path.join(DATA_DEMO_DIR, "merged_conversations.json")

    def setUp(self):
        self.assertTrue(
            os.path.isfile(self.MERGED_FILE),
            f"Missing merged JSON file: {self.MERGED_FILE}"
        )
        with open(self.MERGED_FILE, "r", encoding="utf-8") as f:
            self.data = json.load(f)

    def test_top_level_structure_and_count(self):
        self.assertIsInstance(self.data, list, "Top-level structure must be a JSON array")
        self.assertEqual(len(self.data), 38, f"Expected 38 conversations, got {len(self.data)}")

    def test_sequential_ids(self):
        ids = [conv.get("id") for conv in self.data]
        expected_ids = list(range(1, 39))
        self.assertEqual(ids, expected_ids, "Conversation IDs must be sequential integers from 1 to 38")

    def test_total_turn_count_and_roles(self):
        total_turns = 0
        caller_turns = 0
        receiver_turns = 0

        for idx, conv in enumerate(self.data, start=1):
            self.assertIn("dialogue", conv, f"Conversation {idx} missing 'dialogue' key")
            dialogue = conv["dialogue"]
            self.assertIsInstance(dialogue, list, f"Dialogue in conv {idx} must be a list")
            self.assertGreater(len(dialogue), 0, f"Dialogue in conv {idx} must not be empty")

            for turn_idx, turn in enumerate(dialogue):
                total_turns += 1
                self.assertIn("role", turn, f"Turn {turn_idx} in conv {idx} missing 'role'")
                self.assertIn("content", turn, f"Turn {turn_idx} in conv {idx} missing 'content'")

                role = turn["role"]
                content = turn["content"]

                self.assertIn(
                    role,
                    ("người gọi", "người nhận"),
                    f"Invalid role '{role}' in conv {idx}, turn {turn_idx}"
                )
                self.assertIsInstance(content, str, f"Content in conv {idx}, turn {turn_idx} must be a string")
                self.assertGreater(
                    len(content.strip()),
                    0,
                    f"Content in conv {idx}, turn {turn_idx} must not be empty"
                )

                if role == "người gọi":
                    caller_turns += 1
                else:
                    receiver_turns += 1

        self.assertEqual(total_turns, 628, f"Expected exactly 628 turns, got {total_turns}")
        self.assertEqual(caller_turns, 329, f"Expected 329 caller turns, got {caller_turns}")
        self.assertEqual(receiver_turns, 299, f"Expected 299 receiver turns, got {receiver_turns}")

    def test_utf8_vietnamese_diacritics_preserved(self):
        # Raw bytes should NOT contain escaped Unicode sequences like \u00e0 or \u1ea3
        with open(self.MERGED_FILE, "r", encoding="utf-8") as f:
            raw_text = f.read()

        self.assertNotIn("\\u00", raw_text, "Vietnamese characters must not be ASCII-escaped")
        self.assertNotIn("\\u1e", raw_text, "Vietnamese diacritics must not be ASCII-escaped")
        self.assertIn("người gọi", raw_text, "Unescaped role 'người gọi' must be present")
        self.assertIn("người nhận", raw_text, "Unescaped role 'người nhận' must be present")


class TestDeduplicatedCSVs(unittest.TestCase):
    """Verifies that all 3 CSVs are deduplicated in-place, UTF-8 clean, and preserve multiline rows."""

    def test_dataset_url_csv(self):
        csv_path = os.path.join(DATA_DEMO_DIR, "dataset_url.csv")
        self.assertTrue(os.path.isfile(csv_path), f"Missing {csv_path}")

        with open(csv_path, "r", encoding="utf-8", newline="") as f:
            reader = csv.reader(f)
            header = next(reader)
            rows = list(reader)

        self.assertEqual(header, ["channel", "label", "url_norm"], "Header mismatch in dataset_url.csv")
        self.assertEqual(len(rows), 53116, f"Expected 53,116 data rows, got {len(rows)}")

        url_keys = [r[2] for r in rows]
        unique_urls = set(url_keys)
        self.assertEqual(
            len(unique_urls),
            53116,
            f"Found duplicate URLs! Unique count: {len(unique_urls)}, expected: 53,116"
        )

        # Check label distribution
        labels = [r[1] for r in rows]
        label_counts = {lbl: labels.count(lbl) for lbl in set(labels)}
        self.assertEqual(label_counts.get("phishing"), 36706)
        self.assertEqual(label_counts.get("benign"), 16410)

    def test_no_scam_csv(self):
        csv_path = os.path.join(DATA_DEMO_DIR, "No_scam.csv")
        self.assertTrue(os.path.isfile(csv_path), f"Missing {csv_path}")

        # Check UTF-8 readability (must not raise UnicodeDecodeError)
        with open(csv_path, "r", encoding="utf-8", newline="") as f:
            reader = csv.reader(f)
            header = next(reader)
            rows = list(reader)

        self.assertEqual(header, ["message"], "Header mismatch in No_scam.csv")
        self.assertEqual(len(rows), 1930, f"Expected 1,930 unique rows, got {len(rows)}")

        msgs = [r[0] for r in rows]
        unique_msgs = set(msgs)
        self.assertEqual(
            len(unique_msgs),
            1930,
            f"Found duplicate messages in No_scam.csv! Unique: {len(unique_msgs)}"
        )

        # Multiline integrity check: verify exactly 524 multiline records preserved
        multiline_count = sum(1 for msg in msgs if "\n" in msg)
        self.assertEqual(
            multiline_count,
            524,
            f"Expected exactly 524 multiline messages in No_scam.csv, got {multiline_count}"
        )

    def test_scam_csv(self):
        csv_path = os.path.join(DATA_DEMO_DIR, "Scam.csv")
        self.assertTrue(os.path.isfile(csv_path), f"Missing {csv_path}")

        # Must be cleanly decodable with standard UTF-8 (formerly Windows-1252)
        with open(csv_path, "r", encoding="utf-8", newline="") as f:
            reader = csv.reader(f)
            header = next(reader)
            rows = list(reader)

        self.assertEqual(header, ["message"], "Header mismatch in Scam.csv")
        self.assertEqual(len(rows), 1319, f"Expected 1,319 unique rows, got {len(rows)}")

        msgs = [r[0] for r in rows]
        unique_msgs = set(msgs)
        self.assertEqual(
            len(unique_msgs),
            1319,
            f"Found duplicate messages in Scam.csv! Unique: {len(unique_msgs)}"
        )

        # Multiline integrity check: exactly 27 multiline records preserved
        multiline_count = sum(1 for msg in msgs if "\n" in msg)
        self.assertEqual(
            multiline_count,
            27,
            f"Expected exactly 27 multiline messages in Scam.csv, got {multiline_count}"
        )

        # Verify that formerly Windows-1252 characters decode cleanly in UTF-8
        joined_text = " ".join(msgs)
        self.assertTrue(
            any(c in joined_text for c in ("ô", "á", "à", "ê", "–")),
            "Special Vietnamese / en-dash characters should be present in decoded UTF-8 text"
        )

    def test_cross_file_duplicates(self):
        with open(os.path.join(DATA_DEMO_DIR, "No_scam.csv"), "r", encoding="utf-8", newline="") as f:
            r = csv.reader(f)
            next(r)
            no_scam_msgs = set(row[0] for row in r)

        with open(os.path.join(DATA_DEMO_DIR, "Scam.csv"), "r", encoding="utf-8", newline="") as f:
            r = csv.reader(f)
            next(r)
            scam_msgs = set(row[0] for row in r)

        with open(os.path.join(DATA_DEMO_DIR, "dataset_url.csv"), "r", encoding="utf-8", newline="") as f:
            r = csv.reader(f)
            next(r)
            urls = set(row[2] for row in r)

        overlap_no_vs_scam = no_scam_msgs.intersection(scam_msgs)
        overlap_no_vs_url = no_scam_msgs.intersection(urls)
        overlap_scam_vs_url = scam_msgs.intersection(urls)

        self.assertEqual(len(overlap_no_vs_scam), 0, "Found cross-file duplicates between No_scam and Scam!")
        self.assertEqual(len(overlap_no_vs_url), 0, "Found cross-file duplicates between No_scam and URLs!")
        self.assertEqual(len(overlap_scam_vs_url), 0, "Found cross-file duplicates between Scam and URLs!")


class TestSurveyReports(unittest.TestCase):
    """Verifies that survey & deduplication reports exist and contain required statistics."""

    def test_report_files_exist_and_complete(self):
        report_docs = os.path.join(DOCS_DIR, "CSV_SURVEY_REPORT.md")
        report_data_demo = os.path.join(DATA_DEMO_DIR, "DEDUPLICATION_REPORT.md")

        self.assertTrue(os.path.isfile(report_docs), f"Missing report: {report_docs}")
        self.assertTrue(os.path.isfile(report_data_demo), f"Missing report: {report_data_demo}")

        for path in (report_docs, report_data_demo):
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()

            self.assertGreater(len(content), 1000, f"Report {path} is too short or empty")
            self.assertIn("53,116", content, f"Missing 53,116 in report {path}")
            self.assertIn("1,930", content, f"Missing 1,930 in report {path}")
            self.assertIn("1,319", content, f"Missing 1,319 in report {path}")
            self.assertIn("274", content, f"Missing 274 in report {path}")
            self.assertIn("111", content, f"Missing 111 in report {path}")


def run_all_tests() -> bool:
    print("=" * 75)
    print("Running ScamShieldAI Dataset Verification Test Suite")
    print("=" * 75)

    suite = unittest.TestSuite()
    suite.addTest(unittest.TestLoader().loadTestsFromTestCase(TestOriginalSourcePreservation))
    suite.addTest(unittest.TestLoader().loadTestsFromTestCase(TestMergedConversationsJSON))
    suite.addTest(unittest.TestLoader().loadTestsFromTestCase(TestDeduplicatedCSVs))
    suite.addTest(unittest.TestLoader().loadTestsFromTestCase(TestSurveyReports))

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    print("=" * 75)
    if result.wasSuccessful():
        print(f"ALL {result.testsRun} TESTS PASSED SUCCESSFULLY! (Exit Code 0)")
        print("=" * 75)
        return True
    else:
        print(f"VERIFICATION FAILED: {len(result.failures)} failures, {len(result.errors)} errors")
        print("=" * 75)
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
