# Project: ScamShield AI Image-Based Scam Detection Pipeline

## Architecture
ScamShield AI backend (`BE_codex`) is a modular NestJS 11 application providing scam detection services via REST APIs compliant with OpenAPI v1.2. The image analysis pipeline processes multi-page mobile chat screenshots through an end-to-end pipeline:
1. **Image Reception & Validation**: `AnalysisController` receives 1–5 images via `multipart/form-data`, validating file count, size (<=5MB per image, <=20MB combined), magic bytes (JPEG, PNG, WebP), and pixel limits (<=16MP) via `sharp`.
2. **Chat OCR Engine (M1)**: `PaddleOCR_v4_det` locates chat bubbles; smart UI geometry filters strip status bars (top 8.2%) and navigation bars (bottom 8.5%); horizontal line merging and top-down reading order sorting organize bounding boxes; margin-based speaker classification assigns turns (`peer` scammer vs `user` victim vs `system` chip); optical preprocessing (contrast, inversion, Lanczos resize) prepares crops; `Tesseract` (`vie`, `--psm 6`/`--psm 7`) transcribes Vietnamese text. In offline environments lacking host OCR binaries, an adapter pattern seamlessly falls back to metadata ground truth.
3. **Text Preprocessing & PII Sanitization (M2)**: Normalizes Unicode NFC, removes zero-width characters and adversarial typewriter fonts, normalizes Vietnamese telex/slang, preserves risk-critical stopwords and placeholders (`[MONEY]`, `[NUMBER]`, `[TIME]`), and sanitizes PII in strict order (`PASSWORD` -> `PERSON_NAME_DOB` -> `BANK_ACCOUNT` -> `OTP` -> `PHONE_NUMBER` -> `CCCD`) with session-scoped HMAC-SHA256 masking.
4. **Reasoning Harness & NestJS Integration (M3)**: Formats sanitized dialogue turns into a 4-stage Chain of Thought prompt (Authority Verification -> Psychological Pressure -> Risk Entities -> Defense Actions). Dispatches to Cloud LLM (`OpenAiAnalysisProvider` when `MOCK_AI=false`, or deterministic rule-based evaluator when `MOCK_AI=true`). `EvidenceValidator` verifies verbatim quotes with 0-based `image_index`, `UrlIntelligenceService` extracts heuristic URL signals (`is_verified_malicious: false`), and `RiskService` calculates deterministic mathematical risk score (0–100 or null for `UNABLE_TO_ASSESS`). Outputs strictly 11 snake_case fields.
5. **E2E Testing & Verification (M4)**: Executes automated integration tests across sample cases in `data/images/` cross-referenced with `data/metadata.json`, verifying 100% compliance with OpenAPI v1.2 schema and frontend contract validators.

```
[Client / FE]
     │ (multipart/form-data: 1..5 images)
     ▼
[AnalysisController / image-upload.ts] (Magic byte & 16MP validation)
     │
     ▼
[OcrService] (PaddleOCR_v4_det + Tesseract vie / Fallback adapter)
     │ (Chat bubble bounding boxes, reading order, speaker classification)
     ▼
[PreprocessingService] (Unicode clean, telex normalize, strict PII sanitization)
     │ (Sanitized dialogue turns: peer/user)
     ▼
[AiAnalysisProvider / Reasoning Harness] (4-Stage CoT, Cloud LLM / Mock AI)
     │ (Candidate signals, category, quotes, summary, speech summary)
     ▼
[EvidenceValidator] (Verbatim quotes, 0-based image_index validation)
     │
     ▼
[UrlIntelligenceService + RiskService] (URL signals, deterministic 0-100 score)
     │
     ▼
[AnalysisResponseDto] (Strict 11 snake_case fields, OpenAPI v1.2 compliant)
```

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Health Check (`GET /api/v1/health`) | Stateless service health status check returning 200 HealthResponse | M3 (regression) | OpenAPI v1.2 |
| 2 | Text Analysis (`POST /api/v1/analysis/text`) | Heuristic & AI text analysis returning 11-field AnalysisResponse | M3 (regression) | OpenAPI v1.2 |
| 3 | Image Analysis (`POST /api/v1/analysis/images`) | Multipart 1-5 image upload and scam analysis returning 11-field AnalysisResponse | M3 | OpenAPI v1.2 |
| 4 | Emergency Guidance (`POST /api/v1/guidance/emergency`) | Deterministic emergency guidance lookup returning 200 EmergencyResponse | M3 (regression) | OpenAPI v1.2 |
| 5 | PaddleOCR_v4_det Bubble Detection | Text bubble localization with UI geometry filtering (top 8.2%, bottom 8.5%) | M1 | PREPROCESSING_DESIGN.md |
| 6 | Horizontal Box Merging & Reading Order | Merges adjacent boxes and sorts top-down, left-to-right into chat bubbles | M1 | PREPROCESSING_DESIGN.md |
| 7 | Margin-based Speaker Attribution | Classifies bubble speaker: peer/scammer (left), user (right), system (center) | M1 | PREPROCESSING_DESIGN.md |
| 8 | Optical Preprocessing & Tesseract OCR | Contrast enhancement, polarity inversion, Lanczos resize, Tesseract vie (psm 6/7) | M1 | PREPROCESSING_DESIGN.md |
| 9 | Text Cleaning & Denoising | NFC normalization, zero-width char removal, typewriter font decoding, telex repair | M2 | PREPROCESSING_DESIGN.md |
| 10 | Strict PII Sanitization | Order: PASSWORD -> PERSON_NAME_DOB -> BANK_ACCOUNT -> OTP -> PHONE_NUMBER -> CCCD | M2 | PREPROCESSING_DESIGN.md |
| 11 | Placeholders & Stopwords Preservation | Preserves [MONEY], [NUMBER], [TIME], and urgency/conditional stopwords | M2 | PREPROCESSING_DESIGN.md |
| 12 | 4-Stage CoT Reasoning Prompt | Identity/Authority -> Psychological Pressure -> Risk Entities -> Synthesis | M3 | REASONING_HARNESS_DESIGN.md |
| 13 | Cloud LLM Integration & Structured Output | OpenAI Responses API / Vertex AI adapter with strict JSON schema & mock fallback | M3 | REASONING_HARNESS_DESIGN.md |
| 14 | Verbatim Evidence & 0-based image_index | Grounding validator ensuring quotes exist in source and have valid image_index | M3 | OpenAPI v1.2 |
| 15 | Deterministic Risk Scoring & Strict Schema | Risk calculation (0-100 or null) and mapping to exact 11-field AnalysisResponse | M3 | CONTRACT_DECISIONS.md |
| 16 | Automated Integration Test Suite | Full pipeline test runner across sample cases from data/images/ and data/metadata.json | M4 | ORIGINAL_REQUEST.md |
| 17 | OpenAPI v1.2 Conformance Validation | Schema validation of all test payloads ensuring 0 schema errors or extra fields | M4 | OpenAPI v1.2 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | OCR Pipeline Engine | PaddleOCR_v4_det bubble detection, UI filtering, reading order, speaker attribution, Tesseract vie OCR, and offline metadata adapter | none | IN_PROGRESS (Conv: 089b47ac-14f7-4518-b599-5eec951bf650) |
| 2 | Preprocessing & PII Sanitization | Text cleaning, Unicode NFC, telex/slang normalization, priority-ordered PII sanitization, placeholder preservation | none | IN_PROGRESS (Conv: 4f2bff1b-5b15-404e-bce6-b3a8463b81a0) |
| 3 | Reasoning Harness & NestJS Integration | Connect OCR + Preprocessing to NestJS AnalysisService, 4-stage CoT reasoning, Cloud LLM & Mock AI integration, EvidenceValidator image_index, strict 11-field response | M1, M2 | PLANNED |
| 4 | Automated Integration Test Suite & Contract Validation | Automated integration tests against data/images/ & data/metadata.json, validating 100% compliance with OpenAPI v1.2 and FE contracts | M3 | IN_PROGRESS (Track: E2E, Conv: fb402aee-167e-4f77-8d34-1685bdd18bc3) |

## Interface Contracts
### M1 (OCR) ↔ M2/M3 (Preprocessing & Analysis)
- Function signature:
  ```typescript
  export interface OcrBoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  export interface OcrTurn {
    speaker: 'peer' | 'user' | 'system';
    text: string;
    imageIndex: number;
    confidence: number;
    boundingBoxes?: OcrBoundingBox[];
  }

  export interface OcrResult {
    turns: OcrTurn[];
    fullTranscript: string;
    imageCount: number;
  }

  export interface IOcrEngine {
    processImages(images: { buffer: Buffer; mediaType: string }[]): Promise<OcrResult>;
  }
  ```

### M2 (Preprocessing) ↔ M3 (Reasoning)
- Function signature:
  ```typescript
  export interface PreprocessedTurn {
    speaker: 'peer' | 'user';
    text: string;
    imageIndex: number;
  }

  export interface PreprocessedDialogue {
    turns: PreprocessedTurn[];
    formattedPromptText: string;
    sanitizedPiiCount: number;
  }

  export interface IPreprocessingService {
    cleanAndSanitize(ocrResult: OcrResult): PreprocessedDialogue;
  }
  ```

### M3 (AnalysisService) ↔ M4 (E2E Test & FE Contract)
- Endpoint: `POST /api/v1/analysis/images`
  - Input: `multipart/form-data`, field `images` (1-5 files), optional `context` (string <= 1000 chars).
  - Output: `AnalysisResponse` JSON with exactly 11 snake_case fields (`additionalProperties: false`):
    - `analysis_id` (UUID v4)
    - `input_type` (`"IMAGE"`)
    - `risk_score` (number 0..100 or null)
    - `risk_level` (`"SAFE"` | `"SUSPICIOUS"` | `"DANGER"` | `"UNABLE_TO_ASSESS"`)
    - `scam_category` (one of 10 enums)
    - `summary` (string)
    - `evidence` (array of `{ quote, reason, signal_type, image_index }` where `image_index` is 0-based integer `< imageCount` or null)
    - `detected_urls` (array of `{ url, signals, is_verified_malicious: false }`)
    - `recommended_actions` (array of strings)
    - `speech_summary` (string)
    - `analyzed_at` (ISO 8601 date-time)

## Code Layout
All new backend integration code resides within `BE_codex/src/`:
- `BE_codex/src/ocr/`:
  - `ocr.module.ts`: NestJS module exporting OCR services
  - `ocr.service.ts`: Main OCR orchestration service
  - `paddle-tesseract-ocr.provider.ts`: Python / native OCR execution provider
  - `metadata-ocr.provider.ts`: Ground-truth dataset OCR fallback provider for offline/sandbox testing
  - `ocr.interfaces.ts`: Interfaces and DTOs for OCR results
- `BE_codex/src/preprocessing/`:
  - `preprocessing.module.ts`: NestJS module for text preprocessing
  - `preprocessing.service.ts`: Denoising, NFC normalization, telex repair
  - `pii-sanitizer.ts`: Strict priority-ordered PII anonymization
- `BE_codex/src/analysis/`:
  - `analysis.controller.ts`: Keep existing route, wire into OcrService
  - `analysis.service.ts`: Connect OCR -> Preprocessing -> Reasoning -> EvidenceValidator -> RiskService
  - `mock-ai-analysis.provider.ts`: Update image assessment to evaluate transcribed OCR dialogue
  - `openai-analysis.provider.ts`: Update image reasoning prompt to include 4-stage CoT dialogue
- `BE_codex/test/`:
  - `image-pipeline.integration.spec.ts`: Automated integration tests on `data/images/` and `data/metadata.json` validating against OpenAPI v1.2 schema.
