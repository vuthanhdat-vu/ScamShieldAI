"""Stress-test harness for UnifiedScamInspectionPayload JSON Schema and boundary conditions.
Empirical verification for Challenger 2.
"""

from __future__ import annotations

import json
import uuid
from jsonschema import Draft202012Validator, ValidationError

# JSON Schema extracted verbatim from docs/PREPROCESSING_DESIGN.md Section 5.1
UNIFIED_PAYLOAD_SCHEMA = {
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://scamshield.ai/schemas/v1/unified-inspection-payload.json",
  "title": "UnifiedScamInspectionPayload",
  "description": "Standardized, sanitized, and enriched input payload for ScamShieldAI Model Inference Harness (Tier 2 SLM & Tier 3 Cloud Agent).",
  "type": "object",
  "required": [
    "schema_version",
    "session_id",
    "modality",
    "received_at",
    "content",
    "extracted_entities",
    "security_features",
    "tier1_preclassification"
  ],
  "additionalProperties": False,
  "properties": {
    "schema_version": {
      "type": "string",
      "enum": ["1.0.0"],
      "description": "Semantic version of the Unified API Input Schema."
    },
    "session_id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique UUID v4 tracking the inspection transaction across tiers."
    },
    "modality": {
      "type": "string",
      "enum": ["dialogue", "single_message", "url", "hybrid"],
      "description": "The input data modality determining downstream processing and prompt scaffolding."
    },
    "source_metadata": {
      "type": "object",
      "required": ["channel"],
      "additionalProperties": False,
      "properties": {
        "channel": {
          "type": "string",
          "enum": ["telecom_sms", "voice_call_transcript", "chat_social", "web_url", "email", "internal_dataset"],
          "description": "The originating communication or ingestion channel."
        },
        "raw_record_id": {
          "type": "string",
          "description": "Original record ID from dataset if applicable (e.g., 'COM_2985', 'lua-dao-dat-ban-an_001')."
        },
        "client_timestamp": {
          "type": "string",
          "format": "date-time",
          "description": "Timestamp reported by the client or recorded in the source log."
        }
      }
    },
    "received_at": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 UTC timestamp when Tier 1 ingestion started processing."
    },
    "content": {
      "type": "object",
      "description": "Normalized and de-obfuscated textual content corresponding to the chosen modality.",
      "additionalProperties": False,
      "properties": {
        "dialogue": {
          "type": "array",
          "description": "Sequential turns for multi-turn dialogue modality.",
          "items": {
            "$ref": "#/$defs/DialogueTurn"
          },
          "minItems": 1
        },
        "single_message": {
          "type": "string",
          "description": "Cleaned, de-obfuscated text for single-message SMS or chat."
        },
        "normalized_urls": {
          "type": "array",
          "description": "Array of canonicalized URL structures found in the payload or analyzed independently.",
          "items": {
            "$ref": "#/$defs/NormalizedUrlRecord"
          }
        }
      }
    },
    "extracted_entities": {
      "type": "object",
      "description": "High-risk entities and contextual masked tokens extracted deterministically.",
      "required": ["masked_tokens_count", "claimed_authorities", "urgency_indicators", "financial_indicators"],
      "additionalProperties": False,
      "properties": {
        "masked_tokens_count": {
          "type": "integer",
          "minimum": 0,
          "description": "Total number of PII occurrences masked in the text."
        },
        "token_registry": {
          "type": "array",
          "description": "List of active contextual tokens and their salted HMAC digests for correlation.",
          "items": {
            "$ref": "#/$defs/MaskedTokenReference"
          }
        },
        "claimed_authorities": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Public or private authority personas claimed in text (e.g., 'Bộ Công An', 'C06', 'Vietcombank', 'Oxfam')."
        },
        "urgency_indicators": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Phrases establishing artificial urgency or deadlines (e.g., 'trước 16 giờ', 'trong 15 phút')."
        },
        "financial_indicators": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Explicit demands for money, deposits, refunds, or OTPs (e.g., 'chuyển cọc 50%', 'đọc mã OTP')."
        }
      }
    },
    "security_features": {
      "type": "object",
      "description": "Pre-computed security artifacts for URL, domain, and phone reputation.",
      "required": ["max_tld_risk_score", "has_typosquatting_domain", "has_abused_paas_hosting", "adversarial_evasion_detected"],
      "additionalProperties": False,
      "properties": {
        "max_tld_risk_score": {
          "type": "number",
          "minimum": 0.0,
          "maximum": 1.0,
          "description": "Maximum risk score among all embedded TLDs (1.0 = known high-risk TLD like .top, .cc, .xyz)."
        },
        "has_typosquatting_domain": {
          "type": "boolean",
          "description": "True if any domain exhibits Levenshtein proximity <= 2 to curated white-listed institutions."
        },
        "has_abused_paas_hosting": {
          "type": "boolean",
          "description": "True if domain relies on free cloud hosting platforms (e.g., pages.dev, vercel.app, github.io)."
        },
        "adversarial_evasion_detected": {
          "type": "boolean",
          "description": "True if de-obfuscation pipeline stripped zero-width characters, monospace fonts, or stuttering text."
        },
        "evasion_details": {
          "type": "array",
          "items": { "type": "string" },
          "description": "List of specific evasion techniques neutralized (e.g., 'ZERO_WIDTH_SPACE', 'MATH_MONOSPACE_FONT', 'CHARACTER_STUTTERING', 'BROKEN_SPACED_URL')."
        }
      }
    },
    "tier1_preclassification": {
      "type": "object",
      "description": "Telemetry and deterministic verdict from Tier 1 CPU screening.",
      "required": ["preliminary_verdict", "preliminary_risk_score", "fast_pass_eligible", "inference_recommendation"],
      "additionalProperties": False,
      "properties": {
        "preliminary_verdict": {
          "type": "string",
          "enum": ["OBVIOUS_SCAM", "OBVIOUS_BENIGN", "SUSPICIOUS_REQUIRE_SLM", "COMPLEX_REQUIRE_CLOUD"],
          "description": "Tier 1 screening decision."
        },
        "preliminary_risk_score": {
          "type": "number",
          "minimum": 0.0,
          "maximum": 1.0,
          "description": "Normalized heuristic probability score computed on CPU."
        },
        "fast_pass_eligible": {
          "type": "boolean",
          "description": "If true, Tier 1 is confident enough to deflect traffic without dispatching to GPU SLM."
        },
        "inference_recommendation": {
          "type": "string",
          "enum": ["DEFLECT_SAFE", "DEFLECT_BLOCK", "DISPATCH_TIER2_SLM", "DISPATCH_TIER3_CLOUD"],
          "description": "Routing instruction for the ADK orchestrator."
        },
        "execution_latency_ms": {
          "type": "number",
          "minimum": 0.0,
          "description": "Wall-clock duration in milliseconds spent in Tier 1 preprocessing on CPU."
        }
      }
    }
  },
  "$defs": {
    "DialogueTurn": {
      "type": "object",
      "required": ["turn_id", "speaker_role", "text", "detected_intents"],
      "additionalProperties": False,
      "properties": {
        "turn_id": {
          "type": "integer",
          "minimum": 1,
          "description": "1-based chronological index of the turn within the dialogue."
        },
        "speaker_role": {
          "type": "string",
          "enum": ["caller", "receiver", "unknown"],
          "description": "Normalized participant role in the interaction."
        },
        "text": {
          "type": "string",
          "description": "Sanitized and de-obfuscated turn speech content in Vietnamese."
        },
        "detected_intents": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Linguistic cues detected in this turn (e.g., 'URGENCY_CREATION', 'AUTHORITY_CLAIM', 'OTP_DEMAND', 'RESISTANCE')."
        }
      }
    },
    "NormalizedUrlRecord": {
      "type": "object",
      "required": ["raw_url", "canonical_url", "scheme", "hostname", "registered_domain", "tld", "tld_risk_score", "is_ip_address", "is_abused_paas"],
      "additionalProperties": False,
      "properties": {
        "raw_url": { "type": "string" },
        "canonical_url": { "type": "string", "format": "uri" },
        "scheme": { "type": "string", "enum": ["http", "https"] },
        "hostname": { "type": "string" },
        "registered_domain": { "type": "string" },
        "tld": { "type": "string" },
        "tld_risk_score": { "type": "number", "minimum": 0.0, "maximum": 1.0 },
        "is_ip_address": { "type": "boolean" },
        "is_abused_paas": { "type": "boolean" },
        "is_mock_link": { "type": "boolean" },
        "typosquatting_target": { "type": ["string", "null"] },
        "levenshtein_distance": { "type": ["integer", "null"] },
        "embedded_payload_detected": { "type": "boolean" }
      }
    },
    "MaskedTokenReference": {
      "type": "object",
      "required": ["token", "entity_type", "salted_hmac_sha256"],
      "additionalProperties": False,
      "properties": {
        "token": {
          "type": "string",
          "pattern": "^<MASKED_[A-Z_]+_[0-9]+>$",
          "description": "Contextual replacement token (e.g., '<MASKED_CCCD_1>')."
        },
        "entity_type": {
          "type": "string",
          "enum": ["CCCD", "BANK_ACC", "OTP", "PHONE_NUMBER", "PASSWORD", "PERSON_NAME"],
          "description": "Category of the sensitive entity masked."
        },
        "salted_hmac_sha256": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$",
          "description": "Non-reversible 64-character hexadecimal SHA-256 HMAC digest."
        }
      }
    }
  }
}

validator = Draft202012Validator(UNIFIED_PAYLOAD_SCHEMA)


def test_schema_validates_against_meta_schema():
    """Verify that UNIFIED_PAYLOAD_SCHEMA is itself a valid Draft 2020-12 schema."""
    Draft202012Validator.check_schema(UNIFIED_PAYLOAD_SCHEMA)


def test_fixture_1_dialogue_validation_result():
    """Verify Fixture 1 from PREPROCESSING_DESIGN.md Section 5.3.
    Finding: Fixture 1 in the doc uses truncated HMAC hashes with '...' (e.g. '4c8f1e2908...ab312'),
    which fails the schema regex ^[0-9a-f]{64}$ !
    """
    fixture_1_verbatim = {
      "schema_version": "1.0.0",
      "session_id": "8a3e7b21-4f10-4822-b492-91e84a2d619a",
      "modality": "dialogue",
      "source_metadata": {
        "channel": "voice_call_transcript",
        "raw_record_id": "lua-dao-dinh-danh-cccd_003",
        "client_timestamp": "2026-02-14T09:15:30Z"
      },
      "received_at": "2026-11-12T04:30:00Z",
      "content": {
        "dialogue": [
          {
            "turn_id": 1,
            "speaker_role": "caller",
            "text": "Chào chị. Tôi là Đại tá Nguyễn Văn Hải...",
            "detected_intents": ["AUTHORITY_CLAIM", "IDENTITY_VERIFICATION"]
          }
        ],
        "normalized_urls": []
      },
      "extracted_entities": {
        "masked_tokens_count": 5,
        "token_registry": [
          { "token": "<MASKED_CCCD_1>", "entity_type": "CCCD", "salted_hmac_sha256": "4c8f1e2908...ab312" }
        ],
        "claimed_authorities": ["C02"],
        "urgency_indicators": ["trong vòng 5 phút"],
        "financial_indicators": ["rửa tiền 200 tỷ"]
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
        "preliminary_risk_score": 0.985,
        "fast_pass_eligible": False,
        "inference_recommendation": "DISPATCH_TIER2_SLM",
        "execution_latency_ms": 11.45
      }
    }

    errors = list(validator.iter_errors(fixture_1_verbatim))
    print(f"\n[Test Fixture 1] Errors with verbatim doc sample: {len(errors)}")
    for err in errors:
        print(f"  - Field '{err.json_path}': {err.message}")
    # Document defect: Verbatim doc sample fails validation because of ellipsis in salted_hmac_sha256
    assert len(errors) > 0, "Expected verbatim doc sample to fail due to ellipsis in hash!"


def test_schema_allows_empty_content_when_modality_is_dialogue():
    """FINDING / DEFECT: The schema does NOT enforce conditional presence of content fields.
    If modality is 'dialogue', content can be empty {} or contain only single_message!
    """
    payload_empty_content = {
      "schema_version": "1.0.0",
      "session_id": str(uuid.uuid4()),
      "modality": "dialogue",
      "received_at": "2026-11-12T04:30:00Z",
      "content": {},  # Empty content! Dialogue modality without any dialogue!
      "extracted_entities": {
        "masked_tokens_count": 0,
        "claimed_authorities": [],
        "urgency_indicators": [],
        "financial_indicators": []
      },
      "security_features": {
        "max_tld_risk_score": 0.0,
        "has_typosquatting_domain": False,
        "has_abused_paas_hosting": False,
        "adversarial_evasion_detected": False
      },
      "tier1_preclassification": {
        "preliminary_verdict": "SUSPICIOUS_REQUIRE_SLM",
        "preliminary_risk_score": 0.5,
        "fast_pass_eligible": False,
        "inference_recommendation": "DISPATCH_TIER2_SLM"
      }
    }

    errors = list(validator.iter_errors(payload_empty_content))
    print(f"\n[Test Modality Dialogue with Empty Content]: Errors: {len(errors)}")
    # The schema passes this invalid state! This is a schema boundary vulnerability!
    assert len(errors) == 0, "Schema currently allows empty content for dialogue modality!"


def test_schema_lacks_dos_protection_length_limits():
    """FINDING / DEFECT: The schema has NO maxLength on text or single_message,
    and NO maxItems on dialogue array. An adversary can submit a 10MB message
    or 50,000 dialogue turns to cause CPU/Memory exhaustion.
    """
    massive_payload = {
      "schema_version": "1.0.0",
      "session_id": str(uuid.uuid4()),
      "modality": "single_message",
      "received_at": "2026-11-12T04:30:00Z",
      "content": {
        "single_message": "A" * 5_000_000  # 5 Megabytes single string!
      },
      "extracted_entities": {
        "masked_tokens_count": 0,
        "claimed_authorities": [],
        "urgency_indicators": [],
        "financial_indicators": []
      },
      "security_features": {
        "max_tld_risk_score": 0.0,
        "has_typosquatting_domain": False,
        "has_abused_paas_hosting": False,
        "adversarial_evasion_detected": False
      },
      "tier1_preclassification": {
        "preliminary_verdict": "SUSPICIOUS_REQUIRE_SLM",
        "preliminary_risk_score": 0.5,
        "fast_pass_eligible": False,
        "inference_recommendation": "DISPATCH_TIER2_SLM"
      }
    }

    errors = list(validator.iter_errors(massive_payload))
    print(f"\n[Test Massive 5MB String DOS]: Errors: {len(errors)}")
    # Schema accepts 5MB string without error because there is no maxLength constraint!
    assert len(errors) == 0, "Schema lacks maxLength DOS protection!"


def test_schema_rejects_empty_dialogue_array_when_present():
    """Verification: content.dialogue has minItems: 1, so if 'dialogue' key is present with [], it fails."""
    payload_empty_array = {
      "schema_version": "1.0.0",
      "session_id": str(uuid.uuid4()),
      "modality": "dialogue",
      "received_at": "2026-11-12T04:30:00Z",
      "content": {
        "dialogue": []
      },
      "extracted_entities": {
        "masked_tokens_count": 0,
        "claimed_authorities": [],
        "urgency_indicators": [],
        "financial_indicators": []
      },
      "security_features": {
        "max_tld_risk_score": 0.0,
        "has_typosquatting_domain": False,
        "has_abused_paas_hosting": False,
        "adversarial_evasion_detected": False
      },
      "tier1_preclassification": {
        "preliminary_verdict": "SUSPICIOUS_REQUIRE_SLM",
        "preliminary_risk_score": 0.5,
        "fast_pass_eligible": False,
        "inference_recommendation": "DISPATCH_TIER2_SLM"
      }
    }

    errors = list(validator.iter_errors(payload_empty_array))
    print(f"\n[Test content.dialogue = []]: Errors: {len(errors)}")
    assert len(errors) == 1, "Expected minItems: 1 error"
    assert "dialogue" in str(errors[0].path)


if __name__ == "__main__":
    test_schema_validates_against_meta_schema()
    test_fixture_1_dialogue_validation_result()
    test_schema_allows_empty_content_when_modality_is_dialogue()
    test_schema_lacks_dos_protection_length_limits()
    test_schema_rejects_empty_dialogue_array_when_present()
    print("\nAll schema boundary empirical tests executed successfully!")
