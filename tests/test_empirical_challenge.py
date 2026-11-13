"""
Empirical Challenge & Adversarial Stress-Test Suite for ScamShieldAI Preprocessing Design & Data Assets.
Author: Teamwork Challenger Agent (critic, specialist)
Review Target: docs/PREPROCESSING_DESIGN.md & data_demo/ assets
"""

import csv
import hashlib
import hmac
import json
import re
import sys
import unittest
import uuid
from pathlib import Path

import jsonschema
from jsonschema import Draft202012Validator, FormatChecker


class TestPreprocessingDesignChallenge(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.workspace_root = Path(__file__).resolve().parent.parent
        cls.design_doc_path = cls.workspace_root / "docs" / "PREPROCESSING_DESIGN.md"
        cls.data_demo_path = cls.workspace_root / "data_demo"

        # 1. Read Design Document
        with open(cls.design_doc_path, "r", encoding="utf-8") as f:
            cls.design_text = f.read()

        # 2. Extract JSON Schema from Section 5.1
        target_schema_start = '```json\n{\n  "$schema": "https://json-schema.org/draft/2020-12/schema"'
        idx = cls.design_text.find(target_schema_start)
        if idx == -1:
            raise ValueError("Target schema block not found in docs/PREPROCESSING_DESIGN.md")
        content_start = idx + len("```json\n")
        content_end = cls.design_text.find("```", content_start)
        cls.schema_json_raw = cls.design_text[content_start:content_end].strip()
        cls.schema = json.loads(cls.schema_json_raw)
        cls.validator = Draft202012Validator(cls.schema, format_checker=Draft202012Validator.FORMAT_CHECKER)

        # 3. Extract Fixtures from Section 5.3
        fixture_headers = [
            "#### Fixture 1:",
            "#### Fixture 2:",
            "#### Fixture 3:",
            "#### Fixture 4:",
            "#### Fixture 5:"
        ]
        cls.fixtures = []
        for fh in fixture_headers:
            f_idx = cls.design_text.find(fh)
            if f_idx != -1:
                code_start = cls.design_text.find("```json\n", f_idx) + len("```json\n")
                code_end = cls.design_text.find("```", code_start)
                cls.fixtures.append(json.loads(cls.design_text[code_start:code_end].strip()))

    # =========================================================================
    # Part 1: Schema Integrity & Validation
    # =========================================================================

    def test_01_schema_meta_validity(self):
        """Validate that the extracted schema is compliant with Draft 2020-12."""
        Draft202012Validator.check_schema(self.schema)
        self.assertEqual(self.schema.get("title"), "UnifiedScamInspectionPayload")
        self.assertIn("properties", self.schema)
        self.assertIn("$defs", self.schema)
        self.assertIn("DialogueTurn", self.schema["$defs"])
        self.assertIn("NormalizedUrlRecord", self.schema["$defs"])
        self.assertIn("ImageTurnRecord", self.schema["$defs"])
        self.assertIn("MaskedTokenReference", self.schema["$defs"])

    def test_02_design_fixtures_conformance(self):
        """Ensure all 5 concrete fixtures in docs/PREPROCESSING_DESIGN.md validate against the schema."""
        self.assertEqual(len(self.fixtures), 5, "Expected exactly 5 fixtures in docs/PREPROCESSING_DESIGN.md")
        for i, fixture in enumerate(self.fixtures, start=1):
            errors = list(self.validator.iter_errors(fixture))
            self.assertEqual(len(errors), 0, f"Fixture {i} validation failed: {[e.message for e in errors]}")

    # =========================================================================
    # Part 2: Real Data Conformance & Adaptation Testing
    # =========================================================================

    def test_03_conversations_real_data_conformance(self):
        """Load real items from data_demo/conservations.json and validate adapted payloads against schema."""
        conv_path = self.data_demo_path / "conservations.json"
        self.assertTrue(conv_path.exists(), "conservations.json does not exist")

        with open(conv_path, "r", encoding="utf-8") as f:
            convs = json.load(f)

        self.assertEqual(len(convs), 38, f"Expected 38 conversations, got {len(convs)}")
        total_turns = sum(len(c["dialogue"]) for c in convs)
        self.assertEqual(total_turns, 628, f"Expected 628 turns, got {total_turns}")

        # Adapt all 38 conversations to verify schema robustness
        for conv in convs:
            cid = conv["id"]
            dialogue_turns = []
            for idx, turn in enumerate(conv["dialogue"], start=1):
                role = "caller" if turn["role"] == "người gọi" else ("receiver" if turn["role"] == "người nhận" else "unknown")
                actor_switch = False
                # Handle handover for Conv 9 turn 11 (1-indexed 12)
                if cid == 9 and idx == 12:
                    actor_switch = True
                dialogue_turns.append({
                    "turn_id": idx,
                    "speaker_role": role,
                    "text": turn["content"],
                    "detected_intents": ["CONVERSATION_TURN"],
                    "actor_switch": actor_switch,
                })

            payload = {
                "schema_version": "2.0.0",
                "session_id": str(uuid.uuid4()),
                "modality": "dialogue",
                "source_metadata": {
                    "channel": "voice_call_transcript",
                    "raw_record_id": f"conservations_id_{cid:03d}",
                    "client_timestamp": "2026-11-12T10:00:00Z"
                },
                "received_at": "2026-11-12T10:00:01Z",
                "content": {
                    "dialogue": dialogue_turns,
                    "normalized_urls": []
                },
                "extracted_entities": {
                    "masked_tokens_count": 0,
                    "token_registry": [],
                    "claimed_authorities": [],
                    "urgency_indicators": [],
                    "financial_indicators": []
                },
                "security_features": {
                    "max_tld_risk_score": 0.0,
                    "has_typosquatting_domain": False,
                    "has_abused_paas_hosting": False,
                    "adversarial_evasion_detected": (cid == 9),
                    "evasion_details": ["CALLER_HANDOVER_DETECTED"] if cid == 9 else []
                },
                "tier1_preclassification": {
                    "preliminary_verdict": "SUSPICIOUS_REQUIRE_SLM",
                    "preliminary_risk_score": 0.85,
                    "fast_pass_eligible": False,
                    "inference_recommendation": "DISPATCH_TIER2_SLM",
                    "execution_latency_ms": 15.5
                }
            }

            errors = list(self.validator.iter_errors(payload))
            self.assertEqual(len(errors), 0, f"Real dialogue conv {cid} failed schema validation: {[e.message for e in errors]}")

    def test_04_dataset_url_sampled_real_data_conformance(self):
        """Load real items from data_demo/dataset_url_sampled.csv and validate against schema."""
        url_path = self.data_demo_path / "dataset_url_sampled.csv"
        self.assertTrue(url_path.exists(), "dataset_url_sampled.csv does not exist")

        with open(url_path, "r", encoding="utf-8") as f:
            reader = list(csv.reader(f))

        header = reader[0]
        self.assertEqual(header, ["channel", "label", "url_norm", "pattern_group"])
        rows = reader[1:]
        self.assertEqual(len(rows), 3192, f"Expected 3192 URL rows, got {len(rows)}")

        # Sample 1 representative URL from each of the 19 pattern groups
        pattern_samples = {}
        for r in rows:
            pat = r[3]
            if pat not in pattern_samples:
                pattern_samples[pat] = r
        self.assertEqual(len(pattern_samples), 19, "Expected 19 pattern groups")

        for pat, r in pattern_samples.items():
            channel, label, url_norm, pattern_group = r
            scheme = "https" if url_norm.startswith("https://") else "http"
            hostname = url_norm.split("://")[-1].split("/")[0].split("?")[0]
            parts = hostname.split(".")
            tld = parts[-1] if len(parts) > 1 else ""
            tld_risk = 1.0 if tld in ["top", "cc", "xyz", "vip", "club"] else (0.1 if tld in ["vn", "com", "gov.vn"] else 0.5)

            url_record = {
                "raw_url": url_norm,
                "canonical_url": url_norm,
                "scheme": scheme,
                "hostname": hostname,
                "registered_domain": ".".join(parts[-2:]) if len(parts) >= 2 else hostname,
                "tld": tld,
                "tld_risk_score": tld_risk,
                "is_ip_address": bool(re.match(r"^\d{1,3}(\.\d{1,3}){3}", hostname)),
                "is_abused_paas": any(p in hostname for p in ["pages.dev", "vercel.app", "github.io"]),
                "is_mock_link": False,
                "pattern_group": pattern_group,
                "typosquatting_target": None,
                "levenshtein_distance": None,
                "embedded_payload_detected": False
            }

            payload = {
                "schema_version": "2.0.0",
                "session_id": str(uuid.uuid4()),
                "modality": "url",
                "source_metadata": {
                    "channel": "web_url",
                    "raw_record_id": f"url_pattern_{pattern_group}",
                    "client_timestamp": "2026-11-12T10:00:00Z"
                },
                "received_at": "2026-11-12T10:00:01Z",
                "content": {
                    "normalized_urls": [url_record]
                },
                "extracted_entities": {
                    "masked_tokens_count": 0,
                    "token_registry": [],
                    "claimed_authorities": [],
                    "urgency_indicators": [],
                    "financial_indicators": []
                },
                "security_features": {
                    "max_tld_risk_score": tld_risk,
                    "has_typosquatting_domain": False,
                    "has_abused_paas_hosting": url_record["is_abused_paas"],
                    "adversarial_evasion_detected": False,
                    "evasion_details": []
                },
                "tier1_preclassification": {
                    "preliminary_verdict": "OBVIOUS_SCAM" if label == "phishing" else "OBVIOUS_BENIGN",
                    "preliminary_risk_score": 0.95 if label == "phishing" else 0.05,
                    "fast_pass_eligible": True,
                    "inference_recommendation": "DEFLECT_BLOCK" if label == "phishing" else "DEFLECT_SAFE",
                    "execution_latency_ms": 3.2
                }
            }

            errors = list(self.validator.iter_errors(payload))
            self.assertEqual(len(errors), 0, f"URL sample {pattern_group} failed schema: {[e.message for e in errors]}")

    def test_05_scam_csv_and_no_scam_csv_real_data_conformance(self):
        """Validate sample messages from Scam.csv and No_scam.csv against schema."""
        scam_path = self.data_demo_path / "Scam.csv"
        noscam_path = self.data_demo_path / "No_scam.csv"

        with open(scam_path, "r", encoding="utf-8") as f:
            scam_rows = list(csv.reader(f))[1:]
        with open(noscam_path, "r", encoding="utf-8") as f:
            noscam_rows = list(csv.reader(f))[1:]

        # Test 10 scam samples (including multiline and mock URL)
        for i, row in enumerate(scam_rows[:10]):
            msg = row[0]
            payload = {
                "schema_version": "2.0.0",
                "session_id": str(uuid.uuid4()),
                "modality": "single_message",
                "source_metadata": {
                    "channel": "telecom_sms",
                    "raw_record_id": f"scam_row_{i}",
                    "client_timestamp": "2026-11-12T10:00:00Z"
                },
                "received_at": "2026-11-12T10:00:01Z",
                "content": {
                    "single_message": msg,
                    "normalized_urls": []
                },
                "extracted_entities": {
                    "masked_tokens_count": 0,
                    "token_registry": [],
                    "claimed_authorities": [],
                    "urgency_indicators": [],
                    "financial_indicators": ["[MONEY]"] if "[MONEY]" in msg else []
                },
                "security_features": {
                    "max_tld_risk_score": 0.0,
                    "has_typosquatting_domain": False,
                    "has_abused_paas_hosting": False,
                    "adversarial_evasion_detected": False,
                    "evasion_details": []
                },
                "tier1_preclassification": {
                    "preliminary_verdict": "SUSPICIOUS_REQUIRE_SLM",
                    "preliminary_risk_score": 0.85,
                    "fast_pass_eligible": False,
                    "inference_recommendation": "DISPATCH_TIER2_SLM",
                    "execution_latency_ms": 4.5
                }
            }
            errors = list(self.validator.iter_errors(payload))
            self.assertEqual(len(errors), 0, f"Scam row {i} failed schema: {[e.message for e in errors]}")

        # Test 10 safe samples (including multiline and banking balance alert)
        for i, row in enumerate(noscam_rows[:10]):
            msg = row[0]
            payload = {
                "schema_version": "2.0.0",
                "session_id": str(uuid.uuid4()),
                "modality": "single_message",
                "source_metadata": {
                    "channel": "telecom_sms",
                    "raw_record_id": f"noscam_row_{i}",
                    "client_timestamp": "2026-11-12T10:00:00Z"
                },
                "received_at": "2026-11-12T10:00:01Z",
                "content": {
                    "single_message": msg,
                    "normalized_urls": []
                },
                "extracted_entities": {
                    "masked_tokens_count": 0,
                    "token_registry": [],
                    "claimed_authorities": [],
                    "urgency_indicators": [],
                    "financial_indicators": ["[MONEY]"] if "[MONEY]" in msg else []
                },
                "security_features": {
                    "max_tld_risk_score": 0.0,
                    "has_typosquatting_domain": False,
                    "has_abused_paas_hosting": False,
                    "adversarial_evasion_detected": False,
                    "evasion_details": []
                },
                "tier1_preclassification": {
                    "preliminary_verdict": "OBVIOUS_BENIGN",
                    "preliminary_risk_score": 0.02,
                    "fast_pass_eligible": True,
                    "inference_recommendation": "DEFLECT_SAFE",
                    "execution_latency_ms": 3.8
                }
            }
            errors = list(self.validator.iter_errors(payload))
            self.assertEqual(len(errors), 0, f"No-scam row {i} failed schema: {[e.message for e in errors]}")

    def test_06_image_metadata_real_data_conformance(self):
        """Validate sample screenshot items from data_demo/single_images/metadata.json against schema."""
        # Empirical finding: docs mention 'data_demo/single_image/' or 'data_demo/images/',
        # but on-disk reality is 'data_demo/single_images/'. We test both and flag the defect.
        real_img_path = self.data_demo_path / "single_images" / "metadata.json"
        doc_path_1 = self.data_demo_path / "single_image" / "metadata.json"
        doc_path_2 = self.data_demo_path / "images" / "metadata.json"

        # Assert path discrepancy defect
        self.assertTrue(real_img_path.exists(), "Expected data_demo/single_images/metadata.json to exist on disk")
        self.assertFalse(doc_path_1.exists(), "data_demo/single_image/ does NOT exist on disk (plural mismatch defect)")
        self.assertFalse(doc_path_2.exists(), "data_demo/images/ does NOT exist on disk (alias missing defect)")

        with open(real_img_path, "r", encoding="utf-8") as f:
            img_items = json.load(f)

        self.assertEqual(len(img_items), 50, f"Expected 50 image items, got {len(img_items)}")

        # Validate all 50 screenshot items
        for item in img_items:
            case_id = item["case_id"]
            img_path_rel = item["image_path"]
            platform = "zalo" if "zalo" in img_path_rel else ("messenger" if "messenger" in img_path_rel else ("imessage" if "imessage" in img_path_rel else "sms"))
            mode = "dark" if "dark" in img_path_rel else "light"

            ocr_turns = []
            for t_idx, turn in enumerate(item.get("turns", []), start=1):
                ocr_turns.append({
                    "turn_id": t_idx,
                    "speaker": turn.get("speaker", "peer"),
                    "text": turn.get("text", ""),
                    "bounding_box": [30, 100 * t_idx, 320, 100 * t_idx + 50],
                    "ocr_confidence": 0.97
                })

            payload = {
                "schema_version": "2.0.0",
                "session_id": str(uuid.uuid4()),
                "modality": "image",
                "source_metadata": {
                    "channel": "screenshot_upload",
                    "raw_record_id": case_id,
                    "client_timestamp": "2026-11-12T10:00:00Z"
                },
                "received_at": "2026-11-12T10:00:01Z",
                "content": {
                    "image_payload": {
                        "image_metadata": {
                            "platform": platform,
                            "display_mode": mode,
                            "image_count": 1,
                            "file_hash_sha256": hashlib.sha256(case_id.encode()).hexdigest(),
                            "resolution": {
                                "width": 375,
                                "height": 812
                            }
                        },
                        "ocr_transcripts": ocr_turns
                    },
                    "normalized_urls": []
                },
                "extracted_entities": {
                    "masked_tokens_count": 0,
                    "token_registry": [],
                    "claimed_authorities": [],
                    "urgency_indicators": [],
                    "financial_indicators": []
                },
                "security_features": {
                    "max_tld_risk_score": 0.0,
                    "has_typosquatting_domain": False,
                    "has_abused_paas_hosting": False,
                    "adversarial_evasion_detected": False,
                    "evasion_details": []
                },
                "tier1_preclassification": {
                    "preliminary_verdict": "SUSPICIOUS_REQUIRE_SLM",
                    "preliminary_risk_score": 0.70,
                    "fast_pass_eligible": False,
                    "inference_recommendation": "DISPATCH_TIER2_SLM",
                    "execution_latency_ms": 680.0
                }
            }

            errors = list(self.validator.iter_errors(payload))
            self.assertEqual(len(errors), 0, f"Image case {case_id} failed schema: {[e.message for e in errors]}")

    # =========================================================================
    # Part 3: Adversarial Edge Cases & Stress Testing
    # =========================================================================

    def test_07_rfc_4180_multiline_stress(self):
        """Stress-test RFC 4180 multiline reading on Scam.csv and No_scam.csv."""
        # 1. Scam.csv
        scam_path = self.data_demo_path / "Scam.csv"
        with open(scam_path, "r", encoding="utf-8") as f:
            scam_reader = list(csv.reader(f))
        scam_header = scam_reader[0]
        scam_rows = scam_reader[1:]

        self.assertEqual(len(scam_rows), 1319, f"Scam.csv expected 1319 records, got {len(scam_rows)}")
        scam_multiline = [i for i, r in enumerate(scam_rows) if "\n" in r[0] or "\r" in r[0]]
        self.assertEqual(len(scam_multiline), 27, f"Scam.csv expected exactly 27 multiline records, got {len(scam_multiline)}")

        # Check what happens with naive readlines()
        with open(scam_path, "r", encoding="utf-8") as f:
            scam_raw_lines = f.readlines()
        self.assertEqual(len(scam_raw_lines), 1387, "Scam.csv raw lines mismatch")
        self.assertGreater(len(scam_raw_lines), len(scam_rows) + 1, "Naive readlines must fragment multiline records!")

        # 2. No_scam.csv
        noscam_path = self.data_demo_path / "No_scam.csv"
        with open(noscam_path, "r", encoding="utf-8") as f:
            noscam_reader = list(csv.reader(f))
        noscam_header = noscam_reader[0]
        noscam_rows = noscam_reader[1:]

        self.assertEqual(len(noscam_rows), 1930, f"No_scam.csv expected 1930 records, got {len(noscam_rows)}")
        noscam_multiline = [i for i, r in enumerate(noscam_rows) if "\n" in r[0] or "\r" in r[0]]
        self.assertEqual(len(noscam_multiline), 524, f"No_scam.csv expected exactly 524 multiline records, got {len(noscam_multiline)}")

        # Check what happens with naive readlines()
        with open(noscam_path, "r", encoding="utf-8") as f:
            noscam_raw_lines = f.readlines()
        self.assertEqual(len(noscam_raw_lines), 3279, "No_scam.csv raw lines mismatch")
        self.assertGreater(len(noscam_raw_lines), len(noscam_rows) + 1, "Naive readlines must fragment multiline records!")

    def test_08_pii_masking_and_placeholder_preservation(self):
        """Stress-test Vietnamese PII masking rules and strict preservation of [MONEY] / [NUMBER]."""
        # Regex patterns as specified in PREPROCESSING_DESIGN.md Section 4.1
        re_cccd_strict = re.compile(r"(?<!\d)(?:0\d{2}[0-3]\d{2}\d{6})(?!\d)")
        re_cccd_loose = re.compile(r"\b\d{12}\b")
        re_bank_acc = re.compile(r"(?i)(?:stk|tk|tai\s*khoan|so\s*tk|so\s*tai\s*khoan)\s*[:.\-]?\s*(\d{8,16})\b")
        re_otp_design = re.compile(r"(?i)(?:ma\s*otp|otp|ma\s*xac\s*thuc)\s*(?:la|:|=)?\s*([0-9]{4,8})\b")
        # Improved OTP regex to handle Vietnamese colloquial expressions ('la:', 'cua ban la:')
        re_otp_robust = re.compile(r"(?i)(?:ma\s*otp|otp|ma\s*xac\s*thuc)(?:\s+(?:cua\s+)?(?:ban|quy\s*khach))?\s*(?:la|:|=|\s)+\s*([0-9]{4,8})\b")

        # Test A: CCCD detection
        cccd_valid = "001099012345" # 12 digits, valid format
        self.assertTrue(re_cccd_strict.search(f"CCCD của tôi là {cccd_valid}."))
        self.assertTrue(re_cccd_loose.search(f"So can cuoc: {cccd_valid}."))

        # Test B: Bank account detection
        text_bank = "Vui lòng chuyển tiền vào STK: 19034567890123 ngân hàng Techcombank"
        match_bank = re_bank_acc.search(text_bank)
        self.assertIsNotNone(match_bank)
        self.assertEqual(match_bank.group(1), "19034567890123")

        # Test C: OTP detection & Defect Demonstration
        # 1. Literal design pattern matches simple case:
        text_otp_simple = "Ma OTP la 482917, tuyet doi khong chia se."
        self.assertIsNotNone(re_otp_design.search(text_otp_simple))

        # 2. Literal design pattern FAILS on colloquial Vietnamese 'la:' or 'cua ban la:'
        text_otp_colloquial_1 = "Ma OTP la: 482917"
        text_otp_colloquial_2 = "Ma OTP cua ban la: 482917, tuyet doi khong chia se."
        self.assertIsNone(re_otp_design.search(text_otp_colloquial_1), "Empirical defect: literal regex fails on 'la:'")
        self.assertIsNone(re_otp_design.search(text_otp_colloquial_2), "Empirical defect: literal regex fails on 'cua ban la:'")

        # 3. Robust regex successfully catches all colloquial variations
        self.assertIsNotNone(re_otp_robust.search(text_otp_colloquial_1))
        self.assertIsNotNone(re_otp_robust.search(text_otp_colloquial_2))
        self.assertEqual(re_otp_robust.search(text_otp_colloquial_2).group(1), "482917")

        # Test D: Strict Preservation of [MONEY] and [NUMBER]
        sample_with_placeholders = "VCB: TK [NUMBER] biến động -[MONEY] VND vào lúc 14:00. Số dư [MONEY] VND."
        
        # Ensure our PII regexes DO NOT match [MONEY] or [NUMBER]
        self.assertIsNone(re_cccd_strict.search(sample_with_placeholders))
        self.assertIsNone(re_cccd_loose.search(sample_with_placeholders))
        self.assertIsNone(re_bank_acc.search(sample_with_placeholders))

        # Test E: PII Masking Pipeline Simulation & Rule-Ordering Stress Test
        # Empirical finding: If bare 12-digit CCCD is run BEFORE Bank Account regex,
        # 'STK: 123456789012' gets falsely classified as CCCD!
        # Therefore, Bank Account regex MUST precede unanchored CCCD regex.
        class PiiSanitizer:
            def __init__(self, session_salt: str, bank_first: bool = True):
                self.session_salt = session_salt
                self.bank_first = bank_first
                self.token_registry = {}
                self.cccd_count = 0
                self.bank_count = 0

            def mask_text(self, text: str) -> str:
                def replace_bank(m):
                    prefix = m.group(0)[:m.start(1) - m.start(0)]
                    raw_acc = m.group(1)
                    h = hmac.new(self.session_salt.encode(), raw_acc.encode(), hashlib.sha256).hexdigest()
                    if h not in self.token_registry:
                        self.bank_count += 1
                        tok = f"<MASKED_BANK_ACC_{self.bank_count}>"
                        self.token_registry[h] = {"token": tok, "entity_type": "BANK_ACC", "salted_hmac_sha256": h}
                    return prefix + self.token_registry[h]["token"]

                def replace_cccd(m):
                    raw = m.group(0)
                    h = hmac.new(self.session_salt.encode(), raw.encode(), hashlib.sha256).hexdigest()
                    if h not in self.token_registry:
                        self.cccd_count += 1
                        tok = f"<MASKED_CCCD_{self.cccd_count}>"
                        self.token_registry[h] = {"token": tok, "entity_type": "CCCD", "salted_hmac_sha256": h}
                    return self.token_registry[h]["token"]

                if self.bank_first:
                    text = re_bank_acc.sub(replace_bank, text)
                    text = re_cccd_loose.sub(replace_cccd, text)
                else:
                    text = re_cccd_loose.sub(replace_cccd, text)
                    text = re_bank_acc.sub(replace_bank, text)
                return text

        salt_1 = "session_salt_alpha_1234567890abcdef"
        input_str = "Chị gửi tiền vào STK: 123456789012 kèm số CCCD 001099012345 số tiền là [MONEY] nhé."

        # Order 1 (CCCD first) produces misclassification defect:
        sanitizer_flawed = PiiSanitizer(salt_1, bank_first=False)
        flawed_output = sanitizer_flawed.mask_text(input_str)
        self.assertIn("STK: <MASKED_CCCD_1>", flawed_output, "Demonstrate collision when CCCD runs first")

        # Order 2 (Bank first) correctly categorizes both:
        sanitizer_correct = PiiSanitizer(salt_1, bank_first=True)
        correct_output = sanitizer_correct.mask_text(input_str)
        self.assertIn("<MASKED_BANK_ACC_1>", correct_output)
        self.assertIn("<MASKED_CCCD_1>", correct_output)
        self.assertIn("[MONEY]", correct_output, "[MONEY] MUST be strictly preserved!")
        self.assertNotIn("123456789012", correct_output)
        self.assertNotIn("001099012345", correct_output)

        # Verify HMAC Salted repeatability within same session
        input_repeat = "Số CCCD 001099012345 nhắc lại lần nữa."
        masked_repeat = sanitizer_correct.mask_text(input_repeat)
        self.assertIn("<MASKED_CCCD_1>", masked_repeat, "Same CCCD within session must reuse <MASKED_CCCD_1>")

        # Verify different session salt produces different hash
        salt_2 = "session_salt_beta_0987654321fedcba"
        h1 = hmac.new(salt_1.encode(), b"001099012345", hashlib.sha256).hexdigest()
        h2 = hmac.new(salt_2.encode(), b"001099012345", hashlib.sha256).hexdigest()
        self.assertNotEqual(h1, h2, "Cross-session salts must produce different HMAC digests!")

    def test_09_caller_handover_handling(self):
        """Stress-test caller handover handling in conservations.json (Conv ID 9 turns 10-11 in 0-indexed, 11-12 in 1-indexed)."""
        conv_path = self.data_demo_path / "conservations.json"
        with open(conv_path, "r", encoding="utf-8") as f:
            convs = json.load(f)

        c9 = next(c for c in convs if c["id"] == 9)
        dialogue = c9["dialogue"]

        # In 0-indexed:
        # dialogue[10] is 1-indexed Turn 11: "người gọi" (Minh - mentions chuyển máy)
        # dialogue[11] is 1-indexed Turn 12: "người gọi" (Hạnh - kế toán trưởng)
        t10_0 = dialogue[10]
        t11_0 = dialogue[11]

        self.assertEqual(t10_0["role"], "người gọi", "Turn index 10 role must be 'người gọi'")
        self.assertEqual(t11_0["role"], "người gọi", "Turn index 11 role must be 'người gọi'")

        # Test regex for handover detection
        re_handover = re.compile(r"(?i)(?:chuyển máy|nối máy|chị ấy sẽ hướng dẫn)")
        self.assertTrue(re_handover.search(t10_0["content"]), "Turn index 10 content must trigger handover regex!")

        # Verify that turn index 11 starts with new actor greeting
        self.assertIn("Hạnh, kế toán trưởng", t11_0["content"])

        # Check all other conversations: verify Conv 9 is unique or if other handovers exist
        consecutive_same_roles = []
        for c in convs:
            for idx in range(len(c["dialogue"]) - 1):
                if c["dialogue"][idx]["role"] == c["dialogue"][idx + 1]["role"]:
                    consecutive_same_roles.append((c["id"], idx, idx + 1, c["dialogue"][idx]["role"]))

        self.assertEqual(len(consecutive_same_roles), 1, "Expected exactly 1 consecutive same-role instance across all datasets")
        self.assertEqual(consecutive_same_roles[0], (9, 10, 11, "người gọi"))

    # =========================================================================
    # Part 4: Schema Adversarial & Negative Rejection Testing
    # =========================================================================

    def test_10_schema_negative_rejection(self):
        """Ensure schema strictly rejects malformed payloads, invalid enums, and unauthorized additional properties."""
        base_valid_payload = self.fixtures[1] # Fixture 2

        # 1. Reject missing required field
        invalid_payload_1 = dict(base_valid_payload)
        del invalid_payload_1["modality"]
        self.assertFalse(self.validator.is_valid(invalid_payload_1), "Schema must reject payload missing 'modality'")

        # 2. Reject invalid enum for modality
        invalid_payload_2 = json.loads(json.dumps(base_valid_payload))
        invalid_payload_2["modality"] = "video_deepfake"
        self.assertFalse(self.validator.is_valid(invalid_payload_2), "Schema must reject invalid modality enum")

        # 3. Reject unauthorized additional properties (additionalProperties: false)
        invalid_payload_3 = json.loads(json.dumps(base_valid_payload))
        invalid_payload_3["unauthorized_hack_field"] = "malicious_injection"
        self.assertFalse(self.validator.is_valid(invalid_payload_3), "Schema must reject unexpected additionalProperties")

        # 4. Reject malformed UUID for session_id with FormatChecker enabled
        invalid_payload_4 = json.loads(json.dumps(base_valid_payload))
        invalid_payload_4["session_id"] = "not-a-valid-uuid-string"
        self.assertFalse(self.validator.is_valid(invalid_payload_4), "Schema must reject invalid session_id format when format assertions are active")

        # 5. Reject invalid dialogue speaker role
        fixture_1 = self.fixtures[0]
        invalid_dialogue_payload = json.loads(json.dumps(fixture_1))
        invalid_dialogue_payload["content"]["dialogue"][0]["speaker_role"] = "imposter_hacker"
        self.assertFalse(self.validator.is_valid(invalid_dialogue_payload), "Schema must reject invalid speaker_role enum")

        # 6. Reject invalid MaskedTokenReference regex pattern
        invalid_dialogue_payload_2 = json.loads(json.dumps(fixture_1))
        invalid_dialogue_payload_2["extracted_entities"]["token_registry"][0]["token"] = "INVALID_TOKEN_TAG"
        self.assertFalse(self.validator.is_valid(invalid_dialogue_payload_2), "Schema must reject token not matching ^<MASKED_[A-Z_]+_[0-9]+>$")

        # 7. Reject invalid salted HMAC hash (not 64 hex characters)
        invalid_dialogue_payload_3 = json.loads(json.dumps(fixture_1))
        invalid_dialogue_payload_3["extracted_entities"]["token_registry"][0]["salted_hmac_sha256"] = "short_hash_123"
        self.assertFalse(self.validator.is_valid(invalid_dialogue_payload_3), "Schema must reject non-64 hex HMAC digest")


if __name__ == "__main__":
    unittest.main(verbosity=2)
