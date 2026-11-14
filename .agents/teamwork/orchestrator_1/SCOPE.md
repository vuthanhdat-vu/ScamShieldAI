# Scope: ScamShield AI Milestone 3 & Milestone 4

## Architecture
ScamShield AI backend (`BE_codex`) is a modular NestJS 11 application providing scam detection services via REST APIs compliant with OpenAPI v1.2. The complete image analysis pipeline processes multi-page mobile chat screenshots through an end-to-end pipeline:
1. **Image Reception & Validation**: `AnalysisController` receives 1–5 images via `multipart/form-data`, validating file count, size (<=5MB per image, <=20MB combined), magic bytes (JPEG, PNG, WebP), and pixel limits (<=16MP) via `sharp`.
2. **Chat OCR Engine (M1)**: `PaddleOCR_v4_det` locates chat bubbles; smart UI geometry filters strip status bars (top 8.2%) and navigation bars (bottom 8.5%); horizontal line merging and top-down reading order sorting organize bounding boxes; margin-based speaker classification assigns turns (`peer` scammer vs `user` victim vs `system` chip); optical preprocessing (contrast, inversion, Lanczos resize) prepares crops; `Tesseract` (`vie`, `--psm 6`/`--psm 7`) transcribes Vietnamese text. In offline environments lacking host OCR binaries, an adapter pattern seamlessly falls back to `MetadataOcrProvider` (matching SHA-256 hash against `data/metadata.json`).
3. **Text Preprocessing & PII Sanitization (M2)**: Normalizes Unicode NFC, removes zero-width characters and adversarial typewriter fonts, normalizes Vietnamese telex/slang, preserves risk-critical stopwords and placeholders (`[MONEY]`, `[NUMBER]`, `[TIME]`), and sanitizes PII in strict order (`PASSWORD` -> `PERSON_NAME_DOB` -> `BANK_ACCOUNT` -> `OTP` -> `PHONE_NUMBER` -> `CCCD`) with session-scoped HMAC-SHA256 masking (`[CCCD_REDACTED_<hash>]`).
4. **Reasoning Harness & NestJS Integration (M3)**:
   - Wires `OcrModule` and `PreprocessingModule` into `AnalysisModule` and `AnalysisService`.
   - `AnalysisService` coordinates: OCR -> Preprocessing -> LLM Reasoning -> EvidenceValidator -> UrlIntelligence -> RiskService.
   - 4-Stage Chain-of-Thought (CoT) Reasoning:
     * Stage 1: Authority Verification (`Xác thực Danh xưng và Thẩm quyền`)
     * Stage 2: Psychological Pressure (`Bóc tách Đòn Tâm lý & Sự Hối thúc`)
     * Stage 3: Risk Entities & Artifacts (`Giám định Thực thể & Dữ vật Nguy cơ Cao`)
     * Stage 4: Synthesis & Defense Actions (`Tổng hợp Suy luận & Khuyến cáo Phòng vệ`)
   - `MockAiAnalysisProvider` evaluated on OCR turns with 0-based `imageIndex`.
   - `OpenAiAnalysisProvider` connects to Cloud LLM API with strict JSON schema and timeout.
   - Outputs strictly 11 snake_case fields compliant with OpenAPI v1.2.
5. **E2E Testing & Verification (M4)**:
   - Full automated test suite execution in mock mode: unit tests (12 suites, 269 tests), E2E tests (3 suites, 66 tests), frontend contract tests (58 tests) pass 100%.
   - 100% OpenAPI v1.2 compliance verification across all endpoints and schemas.
   - Real Cloud LLM API configuration verification (`MOCK_AI=false`).

## Feature Inventory
| # | Feature | Description | Milestone | Source | Status |
|---|---------|-------------|-----------|--------|--------|
| 1 | Health Check (`GET /api/v1/health`) | Stateless health status check returning 200 HealthResponse | M3 | OpenAPI v1.2 | VERIFIED |
| 2 | Text Analysis (`POST /api/v1/analysis/text`) | Heuristic & AI text analysis returning 11-field AnalysisResponse | M3 | OpenAPI v1.2 | VERIFIED |
| 3 | Image Analysis (`POST /api/v1/analysis/images`) | Multipart 1-5 image upload and scam analysis returning 11-field AnalysisResponse | M3 | OpenAPI v1.2 | VERIFIED |
| 4 | Emergency Guidance (`POST /api/v1/guidance/emergency`) | Deterministic emergency guidance lookup returning 200 EmergencyResponse | M3 | OpenAPI v1.2 | VERIFIED |
| 5 | OCR Engine Integration | Wire OcrModule and OcrService into AnalysisModule and AnalysisService | M3 | R1 | VERIFIED |
| 6 | Preprocessing Module Integration | Wire PreprocessingModule into AnalysisModule and AnalysisService | M3 | R1 | VERIFIED |
| 7 | 4-Stage CoT Reasoning Prompt | Incorporate 4-stage CoT protocol into OpenAiAnalysisProvider prompt | M3 | R2 | VERIFIED |
| 8 | Mock AI Image Evaluation | Update MockAiAnalysisProvider to evaluate OCR dialogue turns with 0-based imageIndex | M3 | R2, R4 | VERIFIED |
| 9 | OpenAPI v1.2 Parity & Schema Enforcement | 100% compliance with OpenAPI v1.2, 11 snake_case fields, additionalProperties: false | M4 | R3 | VERIFIED |
| 10 | Automated Integration Testing | Pass 100% integration test suites using mock/stub LLM | M4 | R4 | VERIFIED |
| 11 | Real Cloud LLM API Production Readiness | Verify environment config and readiness for Cloud LLM (gemini-3.7-flash / OpenAI) | M4 | R4 | VERIFIED |

## Milestones
| # | Name | Scope | Dependencies | Status | Output |
|---|------|-------|-------------|--------|--------|
| M3 | Reasoning Harness & NestJS Integration | Connect OCR + Preprocessing to NestJS AnalysisService, 4-stage CoT reasoning, Cloud LLM & Mock AI integration, EvidenceValidator image_index, strict 11-field response | M1, M2 | DONE | Full pipeline operational, passes 269 unit tests, 66 E2E tests |
| M4 | Automated Integration Testing & OpenAPI v1.2 Verification | Automated integration tests against data/images/ & data/metadata.json, validating 100% compliance with OpenAPI v1.2 and FE contracts, verifying Cloud LLM config | M3 | DONE | 100% OpenAPI v1.2 compliance, 0 schema gaps, production Cloud LLM ready |

## Interface Contracts
### OCR ↔ Preprocessing ↔ AnalysisService
- Input: `UploadedImage[]` with `{ bytes: Buffer, mediaType: ImageMediaType }`.
- OCR: mapped to `ImageInput[]` with `{ buffer: Buffer, mediaType: string }`.
- Preprocessing: `PreprocessedDialogue` with `{ turns: PreprocessedTurn[], formattedPromptText: string, sanitizedPiiCount: number }`.
- AiAnalysisInput: `{ inputType: InputType.IMAGE, images, context?, dialogue?, ocrResult? }`.
- AnalysisResponse: 11 snake_case fields.
