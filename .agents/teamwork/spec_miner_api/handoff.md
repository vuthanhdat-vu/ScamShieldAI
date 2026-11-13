# Specification Mining Report: API Specifications & Frontend Contracts

## 1. Observation

Authoritative inspection was conducted across the primary API contracts and implementation sources:
- `BE_codex/docs/ScamShield_AI_OpenAPI_v1.2.yaml` (OpenAPI 3.0.3 specification)
- `BE_codex/docs/CONTRACT_DECISIONS.md` (Contract decisions and v1.1 to v1.2 amendments)
- `BE_codex/docs/FRONTEND_INTEGRATION.md` (Integration guide for Web and React Native)
- `FE_codex/src/lib/api/contracts.ts`, `FE_codex/src/features/analysis/analysisResult.ts`, `FE_codex/src/features/guidance/emergencyGuidance.ts`, `FE_codex/src/lib/api/imageAnalysis.ts`, `FE_codex/src/lib/api/httpClient.ts`, `FE_codex/src/lib/api/apiError.ts`
- `BE_codex/src/analysis/analysis.controller.ts`, `BE_codex/src/analysis/image-upload.ts`, `BE_codex/src/analysis/dto/*.ts`, `BE_codex/src/common/http/*.ts`, `BE_codex/src/contracts/*.ts`, `BE_codex/test/mock-api.e2e-spec.ts`

### 1.1 Endpoint Overview & Wire Protocols
All routes are mounted under prefix `/api/v1`:

| Method | Path | Content-Type | Auth / Headers | Success Response | Status | Error Codes |
|---|---|---|---|---|---|---|
| `GET` | `/api/v1/health` | None | None (`X-Request-Id` emitted) | `HealthResponse` JSON | 200 | `500 INTERNAL_ERROR` |
| `POST` | `/api/v1/analysis/text` | `application/json` | `X-Request-Id`, optional `Origin` | `AnalysisResponse` JSON | 200 | `400 INVALID_INPUT`, `413 IMAGE_TOO_LARGE` (declared), `429 RATE_LIMIT_EXCEEDED`, `500 INTERNAL_ERROR`, `502 AI_INVALID_RESPONSE` / `AI_PROVIDER_ERROR`, `503 AI_PROVIDER_ERROR`, `504 AI_TIMEOUT` |
| `POST` | `/api/v1/analysis/images` | `multipart/form-data` | `X-Request-Id`, optional `Origin` | `AnalysisResponse` JSON | 200 | `400 INVALID_INPUT` / `UNSUPPORTED_IMAGE_FORMAT` / `INVALID_IMAGE`, `413 IMAGE_TOO_LARGE`, `429 RATE_LIMIT_EXCEEDED`, `500 INTERNAL_ERROR`, `502 AI_INVALID_RESPONSE` / `AI_PROVIDER_ERROR`, `503 AI_PROVIDER_ERROR`, `504 AI_TIMEOUT` |
| `POST` | `/api/v1/guidance/emergency` | `application/json` | None (`X-Request-Id` emitted) | `EmergencyResponse` JSON | 200 | `400 INVALID_INPUT`, `500 INTERNAL_ERROR` |

### 1.2 Request Constraints & Schemas

1. **Text Request (`POST /api/v1/analysis/text`)**:
   - JSON Body:
     ```json
     {
       "text": "string (1 to 5000 chars)"
     }
     ```
   - Constraints:
     - `text`: string, length 1 to 5000 characters.
     - Backend trims whitespace first (`Transform(({ value }) => value.trim())`) then validates length 1..5000 (`Length(1, 5000)`). A string of only whitespace (`"   "`) is trimmed to empty and rejected with `400 INVALID_INPUT`.
     - Extra properties forbidden: rejected with `400 INVALID_INPUT` via NestJS `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })`.
     - Malformed JSON / non-JSON content-type: rejected with `400 INVALID_INPUT`.

2. **Image Request (`POST /api/v1/analysis/images`)**:
   - Multipart fields:
     - `images`: 1 to 5 files (binary stream). Multipart field key MUST be repeated `images` (e.g. `form.append('images', file1); form.append('images', file2);`), NOT `images[]` or base64 or JSON.
     - `context`: optional string, maximum 1000 characters.
   - Constraints:
     - File count: 1 to 5 files. Zero files or > 5 files -> `400 INVALID_INPUT`.
     - File formats supported: JPEG (`image/jpeg`), PNG (`image/png`), WebP (`image/webp`).
     - Real magic bytes verification (`image-upload.ts:66-76`):
       - JPEG: starts with `0xFF, 0xD8, 0xFF`.
       - PNG: starts with `0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A`.
       - WebP: starts with `RIFF` and byte 8..11 `WEBP`.
     - Unsupported format signatures (`GIF87a`, `GIF89a`, `BM`, `II*\0`, `MM\0*`, `ftyp`, ICO `[0,0,1,0]`) -> rejected with `400 UNSUPPORTED_IMAGE_FORMAT`.
     - Non-image / corrupt bytes / truncated files / 0-byte file -> rejected with `400 INVALID_IMAGE`.
     - Max size per image: 5 MiB (`5,242,880` bytes). Exceeding -> `413 IMAGE_TOO_LARGE`.
     - Max combined images size: 20 MiB (`20,971,520` bytes) total file bytes. Exceeding -> `413 IMAGE_TOO_LARGE`.
     - Decoded pixel limit (`image-upload.ts:12, 101`): `width * (pageHeight ?? height) * (pages ?? 1) <= 16,000,000` (16 MP). Exceeding or sharp decode failure -> `400 INVALID_IMAGE`.
     - Extra form fields: Any fields other than repeated `images` and single optional `context` -> `400 INVALID_INPUT`.
     - Malformed boundary or non-multipart body -> `400 INVALID_INPUT`.

3. **Emergency Guidance Request (`POST /api/v1/guidance/emergency`)**:
   - JSON Body:
     ```json
     {
       "scenario": "CLICKED_LINK",
       "scam_category": "PHISHING"
     }
     ```
   - Constraints:
     - `scenario`: required string enum (`NOT_INTERACTED`, `CLICKED_LINK`, `SHARED_CREDENTIALS`, `SHARED_OTP`, `TRANSFERRED_MONEY`, `INSTALLED_APP`).
     - `scam_category`: optional string enum (10 values).
     - Extra fields -> `400 INVALID_INPUT`.
     - Completely deterministic, static lookup, zero AI calls, not affected by upstream downtime, not rate-limited.

### 1.3 Response Schemas, Types, and Strict Shapes

1. **`AnalysisResponse`** (11 strict properties, camelCase error envelope but snake_case response payload, `additionalProperties: false`):
   ```typescript
   export interface AnalysisResponse {
     analysis_id: string;          // UUID v4 format (/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i)
     input_type: 'TEXT' | 'IMAGE';
     risk_score: number | null;    // Integer 0..100 OR null (strictly null for UNABLE_TO_ASSESS)
     risk_level: 'SAFE' | 'SUSPICIOUS' | 'DANGER' | 'UNABLE_TO_ASSESS';
     scam_category: ScamCategory;  // 10 enum values
     summary: string;              // Concise Vietnamese summary
     evidence: Evidence[];         // Array of Evidence objects
     detected_urls: DetectedUrl[]; // Array of DetectedUrl objects
     recommended_actions: string[];// Array of actionable Vietnamese advice
     speech_summary: string;       // Spoken text summary for TTS
     analyzed_at: string;          // ISO 8601 UTC date-time string
   }
   ```
   - **Score Ranges**:
     - `SAFE`: `[0, 39]`
     - `SUSPICIOUS`: `[40, 74]`
     - `DANGER`: `[75, 100]`
     - `UNABLE_TO_ASSESS`: `risk_score` MUST be `null`.
   - **Frontend Strict Shape Enforcement**:
     `FE_codex/src/features/analysis/analysisResult.ts:62-65` enforces exact keys matching: `Object.keys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key))`. Any extra key in the response causes frontend client rejection (`invalidResponse`).

2. **`Evidence`** (4 strict properties, `additionalProperties: false`):
   ```typescript
   export interface Evidence {
     quote: string;               // Exact verbatim text quote grounded in input
     reason: string;              // Standardized Vietnamese rationale
     signal_type: SignalType;     // 8 enum values
     image_index: number | null;  // 0-based integer [0..4] for IMAGE, MUST be null for TEXT
   }
   ```
   - Constraint: If `input_type === 'TEXT'`, then ALL `evidence.every(({ image_index }) => image_index === null)`. For `IMAGE`, `image_index` is 0-based integer `< uploaded_images_count` or `null`.

3. **`DetectedUrl`** (3 strict properties, `additionalProperties: false`):
   ```typescript
   export interface DetectedUrl {
     url: string;
     signals: UrlSignal[];
     is_verified_malicious: false; // Literal boolean false!
   }
   ```
   - `is_verified_malicious` is fixed to literal `false` because ScamShield AI performs only local heuristic structural analysis and never verifies external blacklists.

4. **`EmergencyResponse`** (4 strict properties, `additionalProperties: false`):
   ```typescript
   export interface EmergencyResponse {
     scenario: EmergencyScenario;
     title: string;
     urgency: 'LOW' | 'MEDIUM' | 'HIGH';
     steps: string[];
   }
   ```

5. **`HealthResponse`** (3 strict properties, `additionalProperties: false`):
   ```typescript
   export interface HealthResponse {
     status: 'ok';
     service: string;             // e.g. "scamshield-backend"
     timestamp: string;           // ISO 8601 UTC date-time
   }
   ```

### 1.4 Error Response Envelope & Status Codes

All errors across all routes return the uniform camelCase envelope:
```json
{
  "statusCode": 400,
  "errorCode": "INVALID_INPUT",
  "message": "Dữ liệu đầu vào không hợp lệ.",
  "requestId": "550e8400-e29b-41d4-a716-446655440003",
  "timestamp": "2026-11-10T08:00:00.000Z"
}
```
- Status to ErrorCode mappings:
  - `400`: `INVALID_INPUT`, `UNSUPPORTED_IMAGE_FORMAT`, `INVALID_IMAGE`
  - `413`: `IMAGE_TOO_LARGE`
  - `429`: `RATE_LIMIT_EXCEEDED` (includes `Retry-After: <seconds>` header)
  - `500`: `INTERNAL_ERROR`
  - `502`: `AI_INVALID_RESPONSE`, `AI_PROVIDER_ERROR`
  - `503`: `AI_PROVIDER_ERROR` (when upstream provider is down/unavailable)
  - `504`: `AI_TIMEOUT` (when upstream call reaches 45s deadline)
- Strict shape: Exactly 5 properties: `statusCode`, `errorCode`, `message`, `requestId`, `timestamp`.

### 1.5 Enums Reference Table

| Enum Type | Values |
|---|---|
| `InputType` | `TEXT`, `IMAGE` |
| `RiskLevel` | `SAFE`, `SUSPICIOUS`, `DANGER`, `UNABLE_TO_ASSESS` |
| `ScamCategory` | `BANK_IMPERSONATION`, `GOVERNMENT_IMPERSONATION`, `PHISHING`, `OTP_THEFT`, `FINANCIAL_FRAUD`, `FAKE_RECRUITMENT`, `FAKE_DELIVERY`, `SOCIAL_ENGINEERING`, `OTHER`, `NONE` |
| `SignalType` | `URGENCY`, `THREAT`, `CREDENTIAL_REQUEST`, `MONEY_REQUEST`, `IMPERSONATION`, `SUSPICIOUS_URL`, `TOO_GOOD_TO_BE_TRUE`, `OTHER` |
| `UrlSignal` | `IP_HOST`, `PUNYCODE`, `SHORTENER`, `MISLEADING_SUBDOMAIN`, `USERINFO_AT`, `LONG_URL`, `HTTP_ONLY` |
| `EmergencyScenario` | `NOT_INTERACTED`, `CLICKED_LINK`, `SHARED_CREDENTIALS`, `SHARED_OTP`, `TRANSFERRED_MONEY`, `INSTALLED_APP` |
| `EmergencyUrgency` | `LOW`, `MEDIUM`, `HIGH` |
| `ErrorCode` | `INVALID_INPUT`, `UNSUPPORTED_IMAGE_FORMAT`, `INVALID_IMAGE`, `IMAGE_TOO_LARGE`, `RATE_LIMIT_EXCEEDED`, `AI_INVALID_RESPONSE`, `AI_PROVIDER_ERROR`, `AI_TIMEOUT`, `INTERNAL_ERROR` |

---

## 2. Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|---|---|---|---|---|---|---|
| 1 | Health | `GET /api/v1/health` | Stateless service health status check without AI invocation. | None | `HealthResponse` (`status: "ok"`, `service: string`, `timestamp: ISO 8601`) | Returns 500 on unexpected runtime crash | `OpenAPI v1.2`, `health.controller.ts` |
| 2 | Analysis | `POST /api/v1/analysis/text` | Heuristic and AI analysis of raw Vietnamese/multilingual text messages. | `TextRequest` (`text`: 1..5000 chars) | `AnalysisResponse` (`input_type: "TEXT"`, `risk_score: 0..100`, `risk_level`, `evidence` with `image_index: null`, etc.) | 400 for empty, padded, or > 5000 chars; 429 on rate limit; 502/503/504 on AI failures | `OpenAPI v1.2`, `analysis.controller.ts` |
| 3 | Analysis | `POST /api/v1/analysis/images` | Multimodal analysis of 1 to 5 sequential chat screenshot images. | `multipart/form-data`: 1..5 parts named `images` (JPEG/PNG/WebP, max 5 MiB each, max 20 MiB combined), optional `context` (max 1000 chars) | `AnalysisResponse` (`input_type: "IMAGE"`, `evidence` with `image_index: 0..4`, etc.) | 400 for bad format/signature/extra fields; 413 for oversized file/total; 429; 502/503/504 | `OpenAPI v1.2`, `image-upload.ts` |
| 4 | Guidance | `POST /api/v1/guidance/emergency` | Deterministic incident mitigation guidance lookup based on scenario. | `EmergencyRequest` (`scenario`, optional `scam_category`) | `EmergencyResponse` (`scenario`, `title`, `urgency: LOW/MEDIUM/HIGH`, `steps: string[]`) | 400 for unknown scenario/fields; 500 for internal error | `OpenAPI v1.2`, `guidance.controller.ts` |
| 5 | Security | Rate Limiting | IP-based request throttle on analysis endpoints (30 req/min/IP). | HTTP request headers | Standard response when allowed | 429 `RATE_LIMIT_EXCEEDED` + `Retry-After: <seconds>` | `analysis-rate-limit.guard.ts` |
| 6 | Observability | Request Tracing (`X-Request-Id`) | Unique UUID v4 attached to every request and returned in response headers and error envelopes. | Incoming `X-Request-Id` (optional) | Emitted header `X-Request-Id: <UUID>` | Maintained in all error envelopes (`requestId`) | `request-context.ts`, `api-exception.filter.ts` |
| 7 | Cross-Origin | CORS Allowlisting | Configurable browser cross-origin policy exposing `X-Request-Id` and `Retry-After`. | `Origin` header | Preflight `204`, normal response headers | Disallowed origins receive no CORS allow headers | `configure-app.ts`, `frontend-integration.e2e-spec.ts` |
| 8 | Validation | Magic Byte & Pixel Guard | Enforces real binary headers for JPEG/PNG/WebP and caps decoded pixels at 16 MP. | Binary file buffer | `UploadedImage` (`bytes`, `mediaType`) | 400 `UNSUPPORTED_IMAGE_FORMAT` or `INVALID_IMAGE` | `image-upload.ts` |
| 9 | Grounding | Deterministic Evidence Validation | Strips hallucinations and verifies that model quotes exist verbatim in source text/images. | Input text/images and AI candidate evidence | Clean accepted evidence list | Rejects ungrounded evidence items or flags `UNABLE_TO_ASSESS` | `evidence-validator.ts` |
| 10 | Intelligence | Local URL Heuristics | Inspects structural patterns of URLs (IP host, punycode, shortener, etc.) without visiting links. | URL string | `DetectedUrl` with signals, `is_verified_malicious: false` | None (safe heuristic fallback) | `url-intelligence.service.ts` |
| 11 | Severity | Deterministic Risk Scoring | Mathematical formula calculating heuristic risk score (0..100) from evidence signals and URL indicators. | Signals and URL indicators | `{ risk_score, risk_level }` | Score `null` when `UNABLE_TO_ASSESS` | `risk.service.ts` |

---

## 3. Edge Cases

| # | Feature | Input / Condition | Observed Behavior |
|---|---|---|---|
| 1 | Text Analysis | Padded whitespace e.g. `"   "` | Trimmed to empty string, violates `@Length(1, 5000)`, rejects with `400 INVALID_INPUT`. |
| 2 | Text Analysis | Padded 5000 characters e.g. `" " + "a".repeat(5000) + " "` | Trimmed to 5000 chars, successfully passes validation and returns `200 OK`. |
| 3 | Text Analysis | 5001 raw characters without whitespace | Exceeds `@Length(1, 5000)`, rejects with `400 INVALID_INPUT`. |
| 4 | Text Analysis | JSON with unknown extra properties e.g. `{"text": "hi", "extra": true}` | Rejected with `400 INVALID_INPUT` due to `forbidNonWhitelisted: true`. |
| 5 | Text Analysis | Non-JSON body or malformed JSON (`{"text":`) | Rejected with `400 INVALID_INPUT`. |
| 6 | Image Analysis | Single image 5,242,881 bytes (1 byte over 5 MiB) | Rejected with `413 IMAGE_TOO_LARGE`. |
| 7 | Image Analysis | Four 5 MiB images + 1-byte 5th image (20,971,521 bytes total) | Rejected with `413 IMAGE_TOO_LARGE` (combined image bytes limit exceeded). |
| 8 | Image Analysis | Zero images sent (`images` field missing) | Rejected with `400 INVALID_INPUT`. |
| 9 | Image Analysis | Six images sent (> 5 images) | Rejected with `400 INVALID_INPUT`. |
| 10 | Image Analysis | GIF / BMP / TIFF / MP4 file disguised as `.jpg` | Magic byte check detects unsupported prefix, rejects with `400 UNSUPPORTED_IMAGE_FORMAT`. |
| 11 | Image Analysis | Truncated / corrupted JPEG / PNG byte stream | Sharp decoding fails, rejects with `400 INVALID_IMAGE`. |
| 12 | Image Analysis | 0-byte file | Rejected with `400 INVALID_IMAGE`. |
| 13 | Image Analysis | Decompression bomb image (> 16,000,000 pixels) | Rejected with `400 INVALID_IMAGE`. |
| 14 | Image Analysis | Non-multipart request sent to `/analysis/images` | Rejected with `400 INVALID_INPUT`. |
| 15 | Image Analysis | Form field named `images[]` or `file` instead of `images` | Rejected with `400 INVALID_INPUT`. |
| 16 | Image Analysis | Additional form fields e.g. `context[0]` or `unknown` | Rejected with `400 INVALID_INPUT`. |
| 17 | Image Analysis | Context string > 1000 characters | Rejected with `400 INVALID_INPUT`. |
| 18 | Image Analysis | Valid image but unreadable text / no clear evidence | Returns `200 OK` with `risk_level: "UNABLE_TO_ASSESS"`, `risk_score: null`, `scam_category: "NONE"`, `evidence: []`, `detected_urls: []`. |
| 19 | Emergency Guidance | Unknown scenario string e.g. `{"scenario": "HACKED"}` | Rejected with `400 INVALID_INPUT`. |
| 20 | Emergency Guidance | Extra fields in body e.g. `{"scenario": "CLICKED_LINK", "otp": "123456"}` | Rejected with `400 INVALID_INPUT`. |
| 21 | Emergency Guidance | Upstream AI is down / throws error | Returns `200 OK` unaffected (completely independent of AI). |
| 22 | Analysis Endpoints | Exceeding 30 requests/minute from same IP | Returns `429 RATE_LIMIT_EXCEEDED` with header `Retry-After: <seconds>`. |
| 23 | Analysis Endpoints | Upstream AI timeout reached (45,000 ms) | Returns `504 AI_TIMEOUT`. |
| 24 | Analysis Endpoints | Upstream AI unavailable / rate-limited | Returns `503 AI_PROVIDER_ERROR`. |
| 25 | Analysis Endpoints | Upstream AI response fails schema / invalid JSON | Returns `502 AI_INVALID_RESPONSE`. |
| 26 | Analysis Endpoints | Response contains unexpected property (e.g. `raw_ocr`) | Frontend validator `hasShape` fails strict key count, throws `invalidResponse`. |

---

## 4. Logic Chain

1. **Source Cross-Referencing**:
   - The OpenAPI document (`ScamShield_AI_OpenAPI_v1.2.yaml`) defines schema types and endpoint paths.
   - `CONTRACT_DECISIONS.md` records all binding amendments:
     - 20 MiB combined image limit (up from 15 MiB).
     - 45s upstream AI timeout (`OPENAI_TIMEOUT_MS=45000`).
     - 60s recommended client timeout (`DEFAULT_API_TIMEOUT_MS=60000`).
     - Strict camelCase error envelope (`statusCode`, `errorCode`, `message`, `requestId`, `timestamp`).
     - Strict snake_case analysis response (`analysis_id`, `input_type`, `risk_score`, `risk_level`, `scam_category`, `summary`, `evidence`, `detected_urls`, `recommended_actions`, `speech_summary`, `analyzed_at`).
   - `FE_codex/src/features/analysis/analysisResult.ts` implements strict runtime validators (`hasShape`) that enforce:
     - `Object.keys(value).length === 11` for `AnalysisResponse`.
     - `Object.keys(value).length === 4` for `Evidence`.
     - `Object.keys(value).length === 3` for `DetectedUrl`.
     - Exact score bands: `SAFE [0..39]`, `SUSPICIOUS [40..74]`, `DANGER [75..100]`, and `UNABLE_TO_ASSESS` (`risk_score: null`).
     - For `TEXT`, all `image_index === null`. For `IMAGE`, `image_index` is 0-based integer `< uploaded_images.length` or `null`.

2. **Integration with OCR & Reasoning Pipeline**:
   - The user's request (R1-R4) mandates that the NestJS backend ingest screenshot images, execute PaddleOCR_v4_det for chat bubble detection, Tesseract for Vietnamese recognition, and Cloud LLM API reasoning.
   - The downstream output from OCR and reasoning MUST map into `AnalysisResponseDto` without adding or omitting any fields:
     - In particular, raw OCR transcripts and bounding boxes are NOT part of the public `AnalysisResponse` schema (as documented in `CONTRACT_DECISIONS.md § Remaining ambiguities`).
     - Only extracted `quote` strings matching source content, classified with `signal_type`, accompanied by standard `reason`, and anchored to 0-based `image_index`, may appear in the `evidence` array.
     - Extracted URLs found in OCR text or user text must be parsed by `UrlIntelligenceService` and output as `detected_urls` with `is_verified_malicious: false`.

---

## 5. Caveats

1. **OCR Transcripts & Bounding Boxes**:
   The public OpenAPI v1.2 schema does NOT expose full OCR transcripts, chat bubble bounding boxes, or confidence scores per word. Those are internal pipeline artifacts. If the pipeline extracts bounding boxes or raw OCR text, they must stay internal and never leak into the response body, or the frontend contract validation will immediately fail.
2. **Text HTTP 413 Discrepancy**:
   OpenAPI YAML declares a 413 status on `POST /analysis/text`. However, backend and contract decisions specify that oversized text is rejected with `400 INVALID_INPUT`.
3. **Statelessness**:
   No persistent database or history retrieval is supported. `analysis_id` is a transient identifier for correlation and logging; client cannot query `GET /analysis/:id`.
4. **Offline Mock Mode**:
   When `MOCK_AI=true`, backend runs entirely offline without calling OpenAI or Cloud LLM. When `MOCK_AI=false`, valid credentials and model configurations are required.

---

## 6. Conclusion

The ScamShield AI API contract is rigidly specified and validated on both backend and frontend sides:
1. Four endpoints exist under `/api/v1`: `/health`, `/analysis/text`, `/analysis/images`, `/guidance/emergency`.
2. Image upload accepts 1 to 5 images under repeated key `images`, max 5 MiB per file, max 20 MiB combined, with strict JPEG/PNG/WebP magic byte detection and 16 MP decoded pixel limits.
3. Response schemas enforce strict key matching with `additionalProperties: false`. The response has 11 snake_case fields for analysis and 5 camelCase fields for errors.
4. Risk scores are heuristics mapped strictly: `SAFE (0..39)`, `SUSPICIOUS (40..74)`, `DANGER (75..100)`, and `UNABLE_TO_ASSESS (null)`.
5. Any pipeline integration (PaddleOCR + Tesseract + LLM Reasoning) must produce candidates that seamlessly adapt into `AiAnalysisCandidate` and map to `AnalysisResponseDto`, preserving verbatim evidence grounding and 0-based image indexing without emitting extraneous properties.

---

## 7. Verification Method

To independently verify all findings and contract integrity:
1. **Schema Validation Test**:
   Run the backend e2e test suite against OpenAPI v1.2:
   ```powershell
   cd "c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\BE_codex"
   npm test -- test/mock-api.e2e-spec.ts
   ```
2. **Frontend Contract Validation**:
   Inspect `FE_codex/src/features/analysis/analysisResult.ts` to verify `isAnalysisResponse` and `hasShape` key counts.
3. **OpenAPI v1.2 Document Integrity**:
   Inspect `BE_codex/docs/ScamShield_AI_OpenAPI_v1.2.yaml` lines 1-374 and verify with AJV / Swagger UI at `/api/docs`.
