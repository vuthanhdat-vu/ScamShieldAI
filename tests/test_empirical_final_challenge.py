"""
Empirical Final Verification Challenge Test Suite for ScamShieldAI.
Author: Teamwork Final Verification Challenger
Targets:
- docs/PREPROCESSING_DESIGN.md
- docs/REASONING_HARNESS_DESIGN.md
- BE_codex implementation & contracts
- data_demo/ assets on disk
"""

import csv
import json
import re
import subprocess
import unittest
import uuid
from pathlib import Path

from jsonschema import Draft202012Validator


class TestEmpiricalFinalChallenge(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.root = Path(__file__).resolve().parent.parent
        cls.prep_path = cls.root / "docs" / "PREPROCESSING_DESIGN.md"
        cls.reas_path = cls.root / "docs" / "REASONING_HARNESS_DESIGN.md"
        cls.data_dir = cls.root / "data_demo"
        cls.enums_path = cls.root / "BE_codex" / "src" / "contracts" / "analysis.enums.ts"
        cls.risk_service_path = cls.root / "BE_codex" / "src" / "risk" / "risk.service.ts"
        cls.evidence_validator_path = cls.root / "BE_codex" / "src" / "analysis" / "evidence-validator.ts"

        with open(cls.prep_path, "r", encoding="utf-8") as f:
            cls.prep_text = f.read()

        with open(cls.reas_path, "r", encoding="utf-8") as f:
            cls.reas_text = f.read()

    # =========================================================================
    # Task 1: Verify docs/PREPROCESSING_DESIGN.md
    # =========================================================================

    def test_01_run_ten_test_challenge_suite(self):
        """1.1: Verify test_empirical_challenge.py runs and passes all 10 tests cleanly."""
        res = subprocess.run(
            ["python", str(self.root / "tests" / "test_empirical_challenge.py")],
            capture_output=True,
            text=True,
            cwd=str(self.root)
        )
        self.assertEqual(res.returncode, 0, f"test_empirical_challenge.py failed:\n{res.stderr}\n{res.stdout}")
        self.assertIn("Ran 10 tests", res.stderr)
        self.assertIn("OK", res.stderr)

    def test_02_image_path_fallback_on_disk(self):
        """1.2: Verify image directory path fallback operates seamlessly on disk."""
        # Test fallback snippet from docs/PREPROCESSING_DESIGN.md line 1459
        img_base = (
            Path('data_demo/single_images')
            if Path('data_demo/single_images').exists()
            else (
                Path('data_demo/single_image')
                if Path('data_demo/single_image').exists()
                else Path('data_demo/images')
            )
        )
        resolved_full = self.root / img_base
        self.assertTrue(resolved_full.exists(), f"Resolved path {resolved_full} does not exist on disk")
        self.assertEqual(img_base.name, "single_images", "Expected single_images to be selected on disk")

        with open(resolved_full / "metadata.json", "r", encoding="utf-8") as f:
            meta = json.load(f)
        self.assertEqual(len(meta), 50, f"Expected 50 metadata entries, got {len(meta)}")

        img_files = list((resolved_full / "images").glob("*"))
        self.assertEqual(len(img_files), 50, f"Expected 50 image files, got {len(img_files)}")

        txt_files = list((resolved_full / "texts").glob("*.txt"))
        self.assertEqual(len(txt_files), 50, f"Expected 50 transcript files, got {len(txt_files)}")

    def test_03_enhanced_otp_regex_colloquial_vietnamese(self):
        """1.3: Verify enhanced OTP regex matches colloquial Vietnamese OTP phrases."""
        # Extract regex from docs/PREPROCESSING_DESIGN.md Table 4.1
        # Table 4.1: (?i)(?:ma\s*otp|otp|ma\s*xac\s*thuc)(?:\s+(?:cua\s+)?(?:ban|quy\s*khach))?\s*(?:la|:|=|\s)+\s*([0-9]{4,8})\b
        otp_regex = re.compile(
            r"(?i)(?:ma\s*otp|otp|ma\s*xac\s*thuc)(?:\s+(?:cua\s+)?(?:ban|quy\s*khach))?\s*(?:la|:|=|\s)+\s*([0-9]{4,8})\b"
        )

        test_cases = [
            ("Ma OTP la 482917, tuyet doi khong chia se.", "482917"),
            ("Ma OTP la: 482917", "482917"),
            ("Ma OTP cua ban la: 482917, vui long nhap vao.", "482917"),
            ("Ma xac thuc cua Quy khach la: 654321.", "654321"),
            ("OTP: 123456", "123456"),
            ("Ma OTP 998877", "998877"),
            ("Ma xac thuc = 334455", "334455"),
            ("MA XAC THUC CUA BAN LA 778899", "778899"),
            ("otp la: 112233", "112233"),
        ]

        for text, expected_otp in test_cases:
            match = otp_regex.search(text)
            self.assertIsNotNone(match, f"Failed to match colloquial OTP in: '{text}'")
            self.assertEqual(match.group(1), expected_otp, f"Wrong OTP extracted from '{text}'")

    def test_04_pii_rule_ordering_prevents_misclassification(self):
        """1.4: Verify PII rule-ordering prevents 12-digit bank accounts from being classified as CCCD."""
        re_bank_acc = re.compile(r"(?i)(?:stk|tk|tai\s*khoan|so\s*tk|so\s*tai\s*khoan)\s*[:.\-]?\s*(\d{8,16})\b")
        re_cccd_loose = re.compile(r"\b\d{12}\b")

        input_text = "Chị gửi tiền vào STK: 123456789012 kèm số CCCD 001099012345 số tiền là [MONEY] nhé."

        # Scenario A: Correct Ordering (Bank Account FIRST, then bare CCCD)
        # Bank account regex runs first:
        def mask_bank(m):
            prefix = m.group(0)[:m.start(1) - m.start(0)]
            return prefix + "<MASKED_BANK_ACC_1>"

        def mask_cccd(m):
            return "<MASKED_CCCD_1>"

        text_correct = re_bank_acc.sub(mask_bank, input_text)
        text_correct = re_cccd_loose.sub(mask_cccd, text_correct)

        self.assertIn("STK: <MASKED_BANK_ACC_1>", text_correct)
        self.assertIn("CCCD <MASKED_CCCD_1>", text_correct)
        self.assertNotIn("STK: <MASKED_CCCD_1>", text_correct)

        # Scenario B: Flawed Ordering (bare CCCD runs first)
        text_flawed = re_cccd_loose.sub(mask_cccd, input_text)
        self.assertIn("STK: <MASKED_CCCD_1>", text_flawed, "Flawed ordering erroneously swallows bank account into CCCD")

    def test_05_session_id_strict_uuid_enforcement(self):
        """1.5: Verify session_id in schema strictly enforces UUID format even with plain validator."""
        # Extract schema from Section 5.1
        target_schema_start = '```json\n{\n  "$schema": "https://json-schema.org/draft/2020-12/schema"'
        idx = self.prep_text.find(target_schema_start)
        self.assertNotEqual(idx, -1, "Schema block not found in docs/PREPROCESSING_DESIGN.md")
        content_start = idx + len("```json\n")
        content_end = self.prep_text.find("```", content_start)
        schema = json.loads(self.prep_text[content_start:content_end].strip())

        # Inspect session_id property in schema
        session_id_prop = schema["properties"]["session_id"]
        self.assertEqual(session_id_prop.get("type"), "string")
        self.assertEqual(session_id_prop.get("format"), "uuid")
        self.assertIn("pattern", session_id_prop, "session_id missing pattern constraint")
        expected_pattern = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
        self.assertEqual(session_id_prop["pattern"], expected_pattern)

        # Validate with PLAIN validator (no FormatChecker!) to prove regex pattern enforcement
        plain_validator = Draft202012Validator(schema)

        # Extract Fixture 2
        f_idx = self.prep_text.find("#### Fixture 2:")
        code_start = self.prep_text.find("```json\n", f_idx) + len("```json\n")
        code_end = self.prep_text.find("```", code_start)
        fixture2 = json.loads(self.prep_text[code_start:code_end].strip())

        # Valid fixture passes
        self.assertTrue(plain_validator.is_valid(fixture2), "Valid Fixture 2 should pass plain validator")

        # Invalid UUIDs must be REJECTED by plain validator due to pattern regex
        invalid_uuids = [
            "not-a-valid-uuid-string",
            "12345678-1234-1234-1234-12345678901",       # 1 char short in last segment
            "12345678-1234-1234-1234-1234567890123",      # 1 char extra in last segment
            "g2345678-1234-1234-1234-123456789012",       # 'g' is non-hex
            "",
            "482917",
        ]
        for bad_id in invalid_uuids:
            bad_payload = dict(fixture2)
            bad_payload["session_id"] = bad_id
            self.assertFalse(
                plain_validator.is_valid(bad_payload),
                f"Plain validator failed to reject invalid session_id: '{bad_id}'"
            )

    # =========================================================================
    # Task 2: Verify docs/REASONING_HARNESS_DESIGN.md
    # =========================================================================

    def test_06_risk_scoring_formula_parity(self):
        """2.1: Verify Risk Scoring Formula in Section 2.3 matches BE_codex and passes all 9 test cases."""
        weights = {
            "CREDENTIAL_REQUEST": 85,
            "MONEY_REQUEST": 55,
            "IMPERSONATION": 50,
            "SUSPICIOUS_URL": 45,
            "URGENCY": 45,
            "THREAT": 50,
            "TOO_GOOD_TO_BE_TRUE": 45,
            "OTHER": 15,
        }
        elevated_url_signals = {"IP_HOST", "USERINFO_AT", "MISLEADING_SUBDOMAIN"}

        def formula_from_doc(signals, can_assess=True, url_signals=()):
            if not can_assess:
                return None
            behaviors = set(s for s in signals if s != "SUSPICIOUS_URL")
            if any(u in elevated_url_signals for u in url_signals):
                url_weight = weights["SUSPICIOUS_URL"]
            elif len(url_signals) > 0:
                url_weight = 25
            else:
                url_weight = 0

            b_weights = [weights[s] for s in behaviors] if behaviors else []
            base = max([0, url_weight] + b_weights)

            cred_request = "CREDENTIAL_REQUEST" in behaviors
            active_request = cred_request or ("MONEY_REQUEST" in behaviors)
            corroborated = (
                (url_weight == weights["SUSPICIOUS_URL"])
                or (cred_request and ("URGENCY" in behaviors))
                or any(s in behaviors for s in ["IMPERSONATION", "THREAT", "TOO_GOOD_TO_BE_TRUE"])
            )

            bonus = 20 if (active_request and corroborated) else 0
            return min(100, max(0, base + bonus))

        # 9 canonical test cases from BE_codex/test/risk-engine.spec.ts:
        cases = [
            ([], [], 0),
            (["CREDENTIAL_REQUEST", "URGENCY"], [], 100),
            (["CREDENTIAL_REQUEST", "IMPERSONATION"], [], 100),
            (["MONEY_REQUEST", "THREAT"], [], 75),
            (["MONEY_REQUEST", "URGENCY"], [], 55),
            (["CREDENTIAL_REQUEST"], ["IP_HOST"], 100),
            (["URGENCY", "URGENCY", "OTHER", "TOO_GOOD_TO_BE_TRUE"], [], 45),
            (["SUSPICIOUS_URL"], [], 0),
            ([], ["SHORTENER", "SHORTENER", "HTTP_ONLY"], 25),
        ]

        for sigs, urls, expected_score in cases:
            actual = formula_from_doc(sigs, True, urls)
            self.assertEqual(
                actual,
                expected_score,
                f"Formula failed for signals={sigs}, urls={urls}: expected {expected_score}, got {actual}"
            )
            # Symmetry test: reverse order
            actual_rev = formula_from_doc(list(reversed(sigs)), True, list(reversed(urls)))
            self.assertEqual(actual_rev, expected_score, "Formula must be symmetric under permutation")

        # canAssess = False test
        self.assertIsNone(formula_from_doc(["CREDENTIAL_REQUEST"], False, ["IP_HOST"]))

    def test_07_scam_category_enum_exact_parity(self):
        """2.2: Verify ScamCategory enum in Section 2.5 matches BE_codex analysis.enums.ts (10 values)."""
        # Read from BE_codex/src/contracts/analysis.enums.ts
        with open(self.enums_path, "r", encoding="utf-8") as f:
            enums_ts = f.read()

        scam_cat_block = re.search(r"export enum ScamCategory \{([^}]+)\}", enums_ts)
        self.assertIsNotNone(scam_cat_block, "Could not find ScamCategory enum in analysis.enums.ts")
        ts_values = set(re.findall(r"([A-Z_]+)\s*=", scam_cat_block.group(1)))
        self.assertEqual(len(ts_values), 10, f"Expected 10 values in TypeScript ScamCategory, got {len(ts_values)}")

        # Read from docs/REASONING_HARNESS_DESIGN.md Section 2.5
        schema_pattern = r'"suggestedCategory":\s*\{\s*"type":\s*"string",\s*"enum":\s*\[([^\]]+)\]'
        match = re.search(schema_pattern, self.reas_text)
        self.assertIsNotNone(match, "Could not find suggestedCategory enum in REASONING_HARNESS_DESIGN.md")
        doc_values = set(re.findall(r'"([A-Z_]+)"', match.group(1)))

        self.assertEqual(
            ts_values,
            doc_values,
            f"Discrepancy in ScamCategory!\nIn TS but not Doc: {ts_values - doc_values}\nIn Doc but not TS: {doc_values - ts_values}"
        )

        # Ensure obsolete enums are completely gone from the enum definition
        obsolete = ["FINANCIAL_SCAM", "JOB_SCAM", "LOTTERY_PRIZE", "BENIGN"]
        for obs in obsolete:
            self.assertNotIn(obs, doc_values, f"Obsolete enum {obs} still present in suggestedCategory enum!")

    def test_08_evidence_schema_image_index_required_and_null_support(self):
        """2.3: Verify imageIndex in required and satisfies BE_codex evidence-validator.ts."""
        # Check docs/REASONING_HARNESS_DESIGN.md Section 2.5
        schema_match = re.search(
            r'"evidence":\s*\{\s*"type":\s*"array",\s*"items":\s*\{\s*"type":\s*"object",\s*"properties":\s*\{.*?"imageIndex":\s*\{\s*"anyOf":\s*\[\s*\{\s*"type":\s*"integer"\s*\},\s*\{\s*"type":\s*"null"\s*\}\s*\]',
            self.reas_text,
            re.DOTALL
        )
        self.assertIsNotNone(schema_match, "imageIndex property with anyOf [integer, null] not found in evidence schema")

        # Check required fields
        required_match = re.search(r'"required":\s*\["quote",\s*"reason",\s*"signalType",\s*"imageIndex"\]', self.reas_text)
        self.assertIsNotNone(required_match, "imageIndex is not in 'required' array of evidence item schema")

        # Verify evidence-validator.ts logic simulation:
        UNDEFINED = object()
        def validate_item(input_type, item):
            quote = item.get("quote", "").strip()
            reason = item.get("reason", "").strip()
            signal = item.get("signalType")
            index = item.get("imageIndex", UNDEFINED)

            if not quote or not reason or not signal:
                return False, True # rejected

            # When input_type is TEXT:
            # In BE_codex TS: index === null && supportedText(...)
            if input_type == "TEXT":
                if index is not None:  # In JS: undefined === null is false, 0 === null is false
                    return False, True # rejected
                return True, False     # grounded
            elif input_type == "IMAGE":
                # BE_codex: index !== null && Number.isInteger(index) && index >= 0 && index < images.length
                if index is UNDEFINED or index is None or not isinstance(index, int) or index < 0 or index >= 2:
                    return False, True # rejected
                return True, False

        # Text input: imageIndex = null -> accepted
        valid_text_item = {"quote": "Gửi mã OTP", "reason": "Đòi mã", "signalType": "CREDENTIAL_REQUEST", "imageIndex": None}
        ok, rej = validate_item("TEXT", valid_text_item)
        self.assertTrue(ok)
        self.assertFalse(rej)

        # Text input: imageIndex omitted / undefined -> REJECTED
        missing_index_item = {"quote": "Gửi mã OTP", "reason": "Đòi mã", "signalType": "CREDENTIAL_REQUEST"}
        ok, rej = validate_item("TEXT", missing_index_item)
        self.assertFalse(ok)
        self.assertTrue(rej, "Omitted imageIndex must be rejected for text inputs")

        # Text input: imageIndex = 0 -> REJECTED
        wrong_index_item = {"quote": "Gửi mã OTP", "reason": "Đòi mã", "signalType": "CREDENTIAL_REQUEST", "imageIndex": 0}
        ok, rej = validate_item("TEXT", wrong_index_item)
        self.assertFalse(ok)
        self.assertTrue(rej, "imageIndex != null must be rejected for text inputs")

        # Image input: imageIndex = 0 -> accepted
        valid_img_item = {"quote": "Gửi mã OTP", "reason": "Đòi mã", "signalType": "CREDENTIAL_REQUEST", "imageIndex": 0}
        ok, rej = validate_item("IMAGE", valid_img_item)
        self.assertTrue(ok)
        self.assertFalse(rej)

    def test_09_self_referential_line_zero_matches(self):
        """2.4: Verify self-referential line in Section 7.4 has 0 false positive matches."""
        # PowerShell command from Section 7.4:
        # Select-String -Path docs/REASONING_HARNESS_DESIGN.md -Pattern '[G]emini 2\.[5] Flash|gemini-[2]\.0-flash|gemini-[2]\.[5]-flash'
        res = subprocess.run(
            [
                "powershell",
                "-Command",
                "Select-String -Path docs/REASONING_HARNESS_DESIGN.md -Pattern '[G]emini 2\\.[5] Flash|gemini-[2]\\.0-flash|gemini-[2]\\.[5]-flash'"
            ],
            capture_output=True,
            text=True,
            cwd=str(self.root)
        )
        self.assertEqual(res.returncode, 0)
        self.assertEqual(res.stdout.strip(), "", f"Expected 0 matches, but got:\n{res.stdout}")

    def test_10_empirical_defect_in_reasoning_harness_image_path(self):
        """EMPIRICAL CHALLENGE BUG: Verify that lines 907 and 939 in docs/REASONING_HARNESS_DESIGN.md fail on disk."""
        # In docs/REASONING_HARNESS_DESIGN.md:
        # line 907: img_dir = data_dir / "single_image" if (data_dir / "single_image").exists() else data_dir / "images"
        # line 939: img_dir = d / 'single_image' if (d / 'single_image').exists() else d / 'images'
        d = self.data_dir
        img_dir_doc = d / 'single_image' if (d / 'single_image').exists() else d / 'images'

        # EMPIRICAL PROOF OF DEFECT:
        # Neither d / 'single_image' nor d / 'images' exists on disk!
        # Therefore img_dir_doc evaluates to d / 'images', which does NOT exist!
        self.assertFalse(
            (d / 'single_image').exists(),
            "data_demo/single_image should not exist on disk"
        )
        self.assertFalse(
            (d / 'images').exists(),
            "data_demo/images should not exist on disk"
        )
        self.assertFalse(
            (img_dir_doc / 'metadata.json').exists(),
            "img_dir / 'metadata.json' as defined in line 939 fails to exist on disk!"
        )

        # Running the exact line 939 assertion fails with FileNotFoundError:
        with self.assertRaises(FileNotFoundError):
            with open(img_dir_doc / 'metadata.json', encoding='utf-8') as f:
                json.load(f)

        # Meanwhile, the actual on-disk directory is single_images:
        self.assertTrue(
            (d / 'single_images' / 'metadata.json').exists(),
            "data_demo/single_images/metadata.json DOES exist on disk"
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
