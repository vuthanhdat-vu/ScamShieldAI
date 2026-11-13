#!/usr/bin/env python3
"""
tests/test_challenger_csv_stress.py
===================================
Adversarial empirical stress verification harness for ScamShieldAI CSV datasets:
1. Encoding verification (strict UTF-8, BOM check, replacement char check).
2. Deduplication correctness (raw exact duplicates, normalized duplicates).
3. Exact row counts (dataset_url: 53116, No_scam: 1930, Scam: 1319).
4. Strict field count per row & RFC 4180 multiline preservation (1 field for No_scam/Scam, 3 for dataset_url).
5. Cross-file overlap checks (exact, stripped, lowercase, URL entity overlap).
6. Data hygiene: Nulls, empty strings, whitespace-only fields, NaN string literals.
7. Parser parity: csv.reader vs pandas.read_csv consistency (C vs Python engine).
8. Substring and boundary collision stress tests.
"""

import csv
import io
import os
import re
import sys
import unittest
from collections import Counter
from urllib.parse import urlparse
import pandas as pd

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DEMO_DIR = os.path.join(PROJECT_ROOT, "data_demo")

URL_CSV = os.path.join(DATA_DEMO_DIR, "dataset_url.csv")
NO_SCAM_CSV = os.path.join(DATA_DEMO_DIR, "No_scam.csv")
SCAM_CSV = os.path.join(DATA_DEMO_DIR, "Scam.csv")


class TestAdversarialCSVVerification(unittest.TestCase):

    def test_strict_utf8_encoding_and_no_bom(self):
        """Verify that all files are strictly UTF-8 valid and contain no UTF-8 BOM."""
        for path, name in [(URL_CSV, "dataset_url.csv"), (NO_SCAM_CSV, "No_scam.csv"), (SCAM_CSV, "Scam.csv")]:
            with self.subTest(file=name):
                with open(path, "rb") as f:
                    raw_bytes = f.read()

                # 1. Assert no UTF-8 BOM (\xef\xbb\xbf)
                self.assertFalse(
                    raw_bytes.startswith(b"\xef\xbb\xbf"),
                    f"{name} starts with unexpected UTF-8 BOM"
                )

                # 2. Strict UTF-8 decode
                try:
                    decoded = raw_bytes.decode("utf-8", errors="strict")
                except UnicodeDecodeError as e:
                    self.fail(f"Strict UTF-8 decode failed for {name} at position {e.start}: {e}")

                # 3. Assert no replacement characters (\ufffd)
                self.assertNotIn(
                    "\ufffd",
                    decoded,
                    f"{name} contains Unicode replacement character (U+FFFD), indicating prior lossy decode!"
                )

                # 4. Assert no NUL bytes (\x00)
                self.assertNotIn(
                    "\x00",
                    decoded,
                    f"{name} contains unexpected NUL bytes (\x00)!"
                )

    def test_exact_row_counts_and_headers(self):
        """Assert exact row counts: 53,116 for URL, 1,930 for No_scam, 1,319 for Scam."""
        specs = [
            (URL_CSV, ["channel", "label", "url_norm"], 53116),
            (NO_SCAM_CSV, ["message"], 1930),
            (SCAM_CSV, ["message"], 1319),
        ]
        for path, expected_header, expected_count in specs:
            fname = os.path.basename(path)
            with self.subTest(file=fname):
                with open(path, "r", encoding="utf-8", newline="") as f:
                    reader = csv.reader(f)
                    header = next(reader)
                    rows = list(reader)

                self.assertEqual(header, expected_header, f"Header mismatch in {fname}")
                self.assertEqual(len(rows), expected_count, f"Row count mismatch in {fname}: got {len(rows)}, expected {expected_count}")

    def test_strict_field_count_per_row(self):
        """Ensure no broken delimiters, orphan rows, or field splitting.
        No_scam/Scam must have strictly 1 field per row.
        dataset_url must have strictly 3 fields per row."""
        # 1. dataset_url.csv -> strictly 3 columns
        with open(URL_CSV, "r", encoding="utf-8", newline="") as f:
            reader = csv.reader(f)
            header = next(reader)
            self.assertEqual(len(header), 3)
            for row_idx, row in enumerate(reader, start=1):
                self.assertEqual(
                    len(row), 3,
                    f"dataset_url.csv row {row_idx} has {len(row)} fields instead of 3: {row[:3]}"
                )

        # 2. No_scam.csv -> strictly 1 column
        with open(NO_SCAM_CSV, "r", encoding="utf-8", newline="") as f:
            reader = csv.reader(f)
            header = next(reader)
            self.assertEqual(len(header), 1)
            for row_idx, row in enumerate(reader, start=1):
                self.assertEqual(
                    len(row), 1,
                    f"No_scam.csv row {row_idx} has {len(row)} fields instead of 1: {row}"
                )

        # 3. Scam.csv -> strictly 1 column
        with open(SCAM_CSV, "r", encoding="utf-8", newline="") as f:
            reader = csv.reader(f)
            header = next(reader)
            self.assertEqual(len(header), 1)
            for row_idx, row in enumerate(reader, start=1):
                self.assertEqual(
                    len(row), 1,
                    f"Scam.csv row {row_idx} has {len(row)} fields instead of 1: {row}"
                )

    def test_deduplication_correctness_exact(self):
        """Verify zero duplicate entries on primary keys."""
        # 1. dataset_url.csv (url_norm)
        with open(URL_CSV, "r", encoding="utf-8", newline="") as f:
            reader = csv.reader(f)
            next(reader)
            urls = [r[2] for r in reader]
        url_counts = Counter(urls)
        url_dups = {u: c for u, c in url_counts.items() if c > 1}
        self.assertEqual(len(url_dups), 0, f"Found exact duplicates in dataset_url.csv: {len(url_dups)}")

        # 2. No_scam.csv (message)
        with open(NO_SCAM_CSV, "r", encoding="utf-8", newline="") as f:
            reader = csv.reader(f)
            next(reader)
            no_scam_msgs = [r[0] for r in reader]
        no_scam_counts = Counter(no_scam_msgs)
        no_scam_dups = {m: c for m, c in no_scam_counts.items() if c > 1}
        self.assertEqual(len(no_scam_dups), 0, f"Found exact duplicates in No_scam.csv: {len(no_scam_dups)}")

        # 3. Scam.csv (message)
        with open(SCAM_CSV, "r", encoding="utf-8", newline="") as f:
            reader = csv.reader(f)
            next(reader)
            scam_msgs = [r[0] for r in reader]
        scam_counts = Counter(scam_msgs)
        scam_dups = {m: c for m, c in scam_counts.items() if c > 1}
        self.assertEqual(len(scam_dups), 0, f"Found exact duplicates in Scam.csv: {len(scam_dups)}")

    def test_deduplication_normalized_stress(self):
        """Stress-test: Check if duplicates exist when stripping trailing whitespace or standardizing newlines."""
        for path, name in [(NO_SCAM_CSV, "No_scam.csv"), (SCAM_CSV, "Scam.csv")]:
            with self.subTest(file=name):
                with open(path, "r", encoding="utf-8", newline="") as f:
                    reader = csv.reader(f)
                    next(reader)
                    msgs = [r[0] for r in reader]

                # Check stripped whitespace duplicates
                stripped_msgs = [m.strip() for m in msgs]
                stripped_counts = Counter(stripped_msgs)
                stripped_dups = {m: c for m, c in stripped_counts.items() if c > 1}

                # Check newline normalized duplicates (\r\n -> \n)
                crlf_normalized = [m.replace("\r\n", "\n") for m in msgs]
                crlf_counts = Counter(crlf_normalized)
                crlf_dups = {m: c for m, c in crlf_counts.items() if c > 1}

                print(f"[{name}] Exact: {len(msgs)} | Stripped unique: {len(stripped_counts)} (dups: {len(stripped_dups)}) | CRLF normalized unique: {len(crlf_counts)} (dups: {len(crlf_dups)})")

    def test_cross_file_overlap_strict(self):
        """Empirically verify intersection of message texts between No_scam and Scam is strictly empty (0 rows)."""
        with open(NO_SCAM_CSV, "r", encoding="utf-8", newline="") as f:
            reader = csv.reader(f)
            next(reader)
            no_scam_set = set(r[0] for r in reader)

        with open(SCAM_CSV, "r", encoding="utf-8", newline="") as f:
            reader = csv.reader(f)
            next(reader)
            scam_set = set(r[0] for r in reader)

        with open(URL_CSV, "r", encoding="utf-8", newline="") as f:
            reader = csv.reader(f)
            next(reader)
            url_set = set(r[2] for r in reader)

        overlap_no_vs_scam = no_scam_set.intersection(scam_set)
        self.assertEqual(len(overlap_no_vs_scam), 0, f"Direct cross-dataset collision detected between No_scam and Scam: {overlap_no_vs_scam}")

        overlap_no_vs_url = no_scam_set.intersection(url_set)
        self.assertEqual(len(overlap_no_vs_url), 0, f"Direct cross-dataset collision detected between No_scam and URLs: {overlap_no_vs_url}")

        overlap_scam_vs_url = scam_set.intersection(url_set)
        self.assertEqual(len(overlap_scam_vs_url), 0, f"Direct cross-dataset collision detected between Scam and URLs: {overlap_scam_vs_url}")

    def test_cross_file_overlap_normalized_stress(self):
        """Stress-test: Check if cross-overlap emerges under whitespace stripping or lowercasing."""
        with open(NO_SCAM_CSV, "r", encoding="utf-8", newline="") as f:
            reader = csv.reader(f)
            next(reader)
            no_scam_stripped = set(r[0].strip().lower() for r in reader)

        with open(SCAM_CSV, "r", encoding="utf-8", newline="") as f:
            reader = csv.reader(f)
            next(reader)
            scam_stripped = set(r[0].strip().lower() for r in reader)

        overlap_stripped = no_scam_stripped.intersection(scam_stripped)
        print(f"[Normalized Cross Overlap] No_scam vs Scam (lower & stripped): {len(overlap_stripped)} overlaps")
        self.assertEqual(len(overlap_stripped), 0, f"Normalized cross-file collision found between No_scam and Scam: {overlap_stripped}")

    def test_cross_file_url_entity_overlap(self):
        """Stress-test: Check if any URL/domain extracted from No_scam appears in Scam."""
        url_regex = re.compile(r"https?://[^\s,;\"'()]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:/[^\s,;\"'()]*)?")
        with open(NO_SCAM_CSV, "r", encoding="utf-8", newline="") as f:
            reader = csv.reader(f)
            next(reader)
            no_scam_msgs = [r[0] for r in reader]

        with open(SCAM_CSV, "r", encoding="utf-8", newline="") as f:
            reader = csv.reader(f)
            next(reader)
            scam_msgs = [r[0] for r in reader]

        no_scam_urls = set()
        for m in no_scam_msgs:
            for u in url_regex.findall(m):
                clean_u = u.lower().rstrip("/").replace("http://", "").replace("https://", "")
                no_scam_urls.add(clean_u)

        scam_urls = set()
        for m in scam_msgs:
            for u in url_regex.findall(m):
                clean_u = u.lower().rstrip("/").replace("http://", "").replace("https://", "")
                scam_urls.add(clean_u)

        shared_urls = no_scam_urls.intersection(scam_urls)
        print(f"[Extracted URL Entities] No_scam URLs: {len(no_scam_urls)} | Scam URLs: {len(scam_urls)} | Shared: {len(shared_urls)}")
        if shared_urls:
            print(f"  Shared entities: {shared_urls}")

    def test_substring_containment_stress(self):
        """Stress-test: Check if any complete No_scam message is contained inside a Scam message or vice versa."""
        with open(NO_SCAM_CSV, "r", encoding="utf-8", newline="") as f:
            reader = csv.reader(f)
            next(reader)
            no_scam_msgs = [r[0].strip() for r in reader if len(r[0].strip()) >= 20]

        with open(SCAM_CSV, "r", encoding="utf-8", newline="") as f:
            reader = csv.reader(f)
            next(reader)
            scam_msgs = [r[0].strip() for r in reader if len(r[0].strip()) >= 20]

        no_scam_in_scam = 0
        scam_in_no_scam = 0
        for ns in no_scam_msgs:
            for s in scam_msgs:
                if ns in s:
                    no_scam_in_scam += 1
                if s in ns:
                    scam_in_no_scam += 1

        print(f"[Substring Stress] No_scam in Scam: {no_scam_in_scam} | Scam in No_scam: {scam_in_no_scam}")
        self.assertEqual(no_scam_in_scam, 0, f"Found No_scam message contained inside Scam message!")
        self.assertEqual(scam_in_no_scam, 0, f"Found Scam message contained inside No_scam message!")

    def test_data_hygiene_no_empty_or_nan(self):
        """Verify no empty strings, whitespace-only messages, or NaN string representations."""
        # 1. No_scam.csv
        with open(NO_SCAM_CSV, "r", encoding="utf-8", newline="") as f:
            reader = csv.reader(f)
            next(reader)
            for idx, r in enumerate(reader, start=1):
                msg = r[0]
                self.assertGreater(len(msg.strip()), 0, f"No_scam.csv row {idx} is empty or whitespace-only!")
                self.assertNotIn(msg.strip().lower(), ["nan", "null", "none"], f"No_scam.csv row {idx} has literal null/nan: '{msg}'")

        # 2. Scam.csv
        with open(SCAM_CSV, "r", encoding="utf-8", newline="") as f:
            reader = csv.reader(f)
            next(reader)
            for idx, r in enumerate(reader, start=1):
                msg = r[0]
                self.assertGreater(len(msg.strip()), 0, f"Scam.csv row {idx} is empty or whitespace-only!")
                self.assertNotIn(msg.strip().lower(), ["nan", "null", "none"], f"Scam.csv row {idx} has literal null/nan: '{msg}'")

        # 3. dataset_url.csv
        with open(URL_CSV, "r", encoding="utf-8", newline="") as f:
            reader = csv.reader(f)
            next(reader)
            for idx, r in enumerate(reader, start=1):
                channel, label, url = r
                self.assertIn(channel, ["url", "social"], f"dataset_url.csv row {idx} has invalid channel '{channel}'")
                self.assertIn(label, ["phishing", "benign"], f"dataset_url.csv row {idx} has invalid label '{label}'")
                self.assertGreater(len(url.strip()), 0, f"dataset_url.csv row {idx} has empty url!")

    def test_multiline_record_counts(self):
        """Assert exact multiline record counts: 524 for No_scam.csv, 27 for Scam.csv, 0 for dataset_url.csv."""
        with open(NO_SCAM_CSV, "r", encoding="utf-8", newline="") as f:
            reader = csv.reader(f)
            next(reader)
            no_scam_multiline = sum(1 for r in reader if "\n" in r[0])
        self.assertEqual(no_scam_multiline, 524, f"No_scam.csv multiline count mismatch: got {no_scam_multiline}, expected 524")

        with open(SCAM_CSV, "r", encoding="utf-8", newline="") as f:
            reader = csv.reader(f)
            next(reader)
            scam_multiline = sum(1 for r in reader if "\n" in r[0])
        self.assertEqual(scam_multiline, 27, f"Scam.csv multiline count mismatch: got {scam_multiline}, expected 27")

        with open(URL_CSV, "r", encoding="utf-8", newline="") as f:
            reader = csv.reader(f)
            next(reader)
            url_multiline = sum(1 for r in reader if any("\n" in col for col in r))
        self.assertEqual(url_multiline, 0, f"dataset_url.csv has unexpected multiline rows: {url_multiline}")

    def test_pandas_readability_parity(self):
        """Verify pandas.read_csv reads all 3 datasets cleanly with identical row and column shapes across C and Python engines."""
        for path, expected_shape, expected_cols in [
            (URL_CSV, (53116, 3), ["channel", "label", "url_norm"]),
            (NO_SCAM_CSV, (1930, 1), ["message"]),
            (SCAM_CSV, (1319, 1), ["message"]),
        ]:
            fname = os.path.basename(path)
            with self.subTest(file=fname):
                df_c = pd.read_csv(path, engine="c", encoding="utf-8")
                df_py = pd.read_csv(path, engine="python", encoding="utf-8")

                self.assertEqual(df_c.shape, expected_shape)
                self.assertEqual(df_py.shape, expected_shape)
                self.assertEqual(list(df_c.columns), expected_cols)
                self.assertEqual(list(df_py.columns), expected_cols)
                self.assertTrue((df_c.values == df_py.values).all())


if __name__ == "__main__":
    unittest.main(verbosity=2)
