# Scope: ScamShieldAI Documentation Optimization (R1, R2, R3)

## Architecture
Microservice architecture separating NestJS API Gateway (`BE_codex`) and Python FastAPI AI Reasoning Service (`scamshield-reasoning-harness`), optimized for Intel Core i5 + NVIDIA GeForce RTX 4050 6GB VRAM.

1. **NestJS API Gateway (`BE_codex`)**:
   - Ingestion: Endpoints `POST /api/v1/analysis/text` and `POST /api/v1/analysis/images`.
   - Security & Validation: JsonRequestGuard, AnalysisRateLimitGuard, ImageUploadGuard (magic bytes JPEG/PNG/WebP, max 5 images, max 5MB/image, max 20MB total, max 16M pixels).
   - Deterministic Grounding: `EvidenceValidator` verifies evidence quotes exist verbatim in source text.
   - Deterministic Risk Engine: `RiskService` calculates mathematical risk score based on weighted indicator signals (`CREDENTIAL_REQUEST: 85`, `MONEY_REQUEST: 55`, `IMPERSONATION: 50`, `THREAT: 50`, `SUSPICIOUS_URL: 45`, `URGENCY: 45`, `TOO_GOOD_TO_BE_TRUE: 45`, `OTHER: 15`).
   - Risk Thresholds: $\ge 75 \rightarrow$ DANGER, $\ge 40 \rightarrow$ SUSPICIOUS, $< 40 \rightarrow$ SAFE.

2. **Python FastAPI AI Reasoning Service (`scamshield-reasoning-harness`)**:
   - Implements `AiAnalysisProvider` interface: returns `AiAnalysisCandidate` (`canAssess`, `suggestedCategory`, `summary`, `evidence`, `recommendedActions`, `speechSummary`).
   - 3-Tier Defense:
     * Tier 1: Local Heuristics + PhoBERT/MiniLM on CPU (0% VRAM, <30ms, filters safe/obvious cases).
     * Tier 2: Edge SLM on RTX 4050 (Qwen2.5-3B-Instruct GGUF Q4_K_M on `llama-server.exe` with FlashAttention-2 and Q8_0 KV Cache).
     * Tier 3: Cloud Fallback (`gemini-3.7-flash` per AGENTS.md rules) for ambiguous/deep visual forensics.
   - Offline OCR on CPU (PaddleOCR-v4 CPU / VietOCR, 0% VRAM, ~300MB RAM) for screenshot text extraction.

3. **Data Modalities (`data_demo/`)**:
   - `conservations.json`: 38 multi-turn conversations, 628 turns, roles `người gọi` / `người nhận`.
   - `dataset_url_sampled.csv`: 3,192 URLs, 4 columns (`channel`, `label`, `url_norm`, `pattern_group`), 19 pattern groups.
   - `Scam.csv`: 1,319 scam messages, RFC 4180 multiline, mock domains, placeholders (`[MONEY]`, `[NUMBER]`).
   - `No_scam.csv`: 1,930 safe messages (banking/OTP/telecom), RFC 4180 multiline, false positive prevention.
   - `images/`: 50 screenshots (Zalo, Messenger, iMessage, SMS; light/dark mode) + `metadata.json` + 50 ground truth transcripts.

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| F01 | Data Streamlining Alignment | Align docs with 5 current data sources in `data_demo/` (remove obsolete file refs) | M1, M2 | Survey E1, E2 |
| F02 | Preprocessing Schema Specs | Define input/output DTOs for Multi-turn Conversation, Single Scam, Single Safe, URL, and Screenshot Image | M1 | Survey E1, E2 |
| F03 | Vietnamese Cleaning Pipeline | Specify NFC normalization, diacritic recovery, regex masking, salted HMAC-SHA256 PII masking, placeholder preservation | M1 | Survey E1, E2 |
| F04 | Image Preprocessing & OCR Pipeline | Specify image normalization (EXIF, resizing, grayscale, Otsu binarization) and CPU-based PaddleOCR extraction | M1 | Survey E1, E2, E3 |
| F05 | Microservice Embedding Strategy | Specify vector embedding architecture (PhoBERT/MiniLM), vector dimension, pooling, caching, and distance metrics | M1 | Survey E2, E3 |
| F06 | Microservice Boundary & Protocols | Define responsibilities and REST/JSON contracts between NestJS Gateway (`BE_codex`) and FastAPI Reasoning Service | M2 | Survey E2, E3 |
| F07 | 6GB VRAM Budget & Serving Strategy | Provide mathematical VRAM allocation table for RTX 4050 (<3.75GB peak, >1.25GB safety buffer) using Qwen2.5-3B Q4_K_M | M2 | Survey E1, E3 |
| F08 | Comprehensive Test Harness Suites | Design 5 test suites covering Conversation, Single Scam, Single Safe (FP prevention), URL (19 groups), and 50 Screenshots | M2 | Survey E1, E2 |
| F09 | Performance & Accuracy Metric Framework | Define evaluation benchmarks (P50/P95 latency, VRAM peak, Precision, Recall, F1, FPR < 2%, OCR CER/WER, gemini-3.7-flash) | M2 | Survey E2, E3 |
| F10 | Multi-Agent Review & Challenge Gate | Independent Reviewers (x2) and Challengers (x2) verification | M3 | Project Pattern |
| F11 | Forensic Integrity Audit Gate | Forensic integrity auditor verification with zero shortcuts | M3 | Project Pattern |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Update Preprocessing Design | `docs/PREPROCESSING_DESIGN.md` | Phase 0 Survey | DONE |
| M2 | Update Reasoning Harness Design | `docs/REASONING_HARNESS_DESIGN.md` | Phase 0 Survey, M1 Interface Contracts | DONE |
| M3 | Review, Challenge & Forensic Audit Gate | `tests/`, `docs/`, Reviewers, Challengers, Auditor | M1, M2 | DONE |

---

## Interface Contracts
### Gateway (`BE_codex`) ↔ Reasoning Engine (`fastapi-service`) Contract
- **Endpoint**: `POST /internal/v1/analyze`
- **Request Payload**:
  ```json
  {
    "session_id": "uuid-v4",
    "modality": "text" | "dialogue" | "url" | "image",
    "raw_content": "string or array of turn objects",
    "normalized_text": "string",
    "extracted_urls": ["string"],
    "ocr_transcripts": ["string"],
    "metadata": {
      "platform": "sms" | "zalo" | "messenger" | "imessage" | "unknown",
      "timestamp": "ISO-8601"
    }
  }
  ```
- **Response Payload (`AiAnalysisCandidate`)**:
  ```json
  {
    "canAssess": true,
    "suggestedCategory": "FINANCIAL_SCAM" | "IMPERSONATION" | "OTP_THEFT" | "JOB_SCAM" | "BENIGN",
    "summary": "Tóm tắt ngắn gọn thủ đoạn lừa đảo...",
    "evidence": [
      {
        "exact_quote": "trích nguyên văn...",
        "risk_type": "CREDENTIAL_REQUEST" | "MONEY_REQUEST" | "IMPERSONATION" | "URGENCY",
        "explanation": "giải thích..."
      }
    ],
    "recommendedActions": [
      "Không chuyển tiền...",
      "Báo cáo cơ quan công an..."
    ],
    "speechSummary": "Cảnh báo khẩn cấp...",
    "reasoning_trace": {
      "tier_applied": 1 | 2 | 3,
      "latency_ms": 1250,
      "tokens_generated": 280
    }
  }
  ```

### Code Layout
```
c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\
├── data_demo/
│   ├── conservations.json                     # [READ-ONLY] 38 conversations, 628 turns
│   ├── dataset_url_sampled.csv                # [READ-ONLY] 3,192 URLs across 19 pattern groups
│   ├── Scam.csv                               # [READ-ONLY] 1,319 scam messages (RFC 4180)
│   ├── No_scam.csv                            # [READ-ONLY] 1,930 non-scam messages (RFC 4180)
│   ├── DEDUPLICATION_REPORT.md                # [READ-ONLY] Cleaning & dedup survey report
│   └── images/                                # [READ-ONLY] 50 screenshot test cases + metadata.json + texts/
├── docs/
│   ├── PREPROCESSING_DESIGN.md                # [MODIFIED by M1 Worker]
│   └── REASONING_HARNESS_DESIGN.md            # [MODIFIED by M2 Worker]
├── BE_codex/                                  # [READ-ONLY Gateway reference]
│   ├── src/analysis/                          # Analysis controller, service, image upload
│   ├── src/risk/                              # Risk service, evidence validator
│   └── docs/ScamShield_AI_OpenAPI_v1.2.yaml   # OpenAPI specs
└── .agents/
    └── teamwork/                              # Orchestrator & subagents metadata
```
