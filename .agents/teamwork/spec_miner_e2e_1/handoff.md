# ScamShield AI API & Contract Specification Mining Report

## 1. Observation

Authoritative contract sources and implementations inspected:
1. `BE_codex/docs/ScamShield_AI_OpenAPI_v1.2.yaml` (Lines 87–130, 151–274, 275–306):
   - `/analysis/images`: `POST`, `multipart/form-data`, required property `images` (array of binary, minItems: 1, maxItems: 5), optional `context` (string, maxLength: 1000). Declared encoding `contentType: image/jpeg, image/png, image/webp`.
   - Responses declared: `200` (`AnalysisResponse`), `400`, `413`, `429`, `500`, `502`, `503`, `504` (all using `ErrorResponse`). Status `422` is NOT declared anywhere in the OpenAPI specification.
   - `AnalysisResponse`: exactly 11 snake_case properties, `additionalProperties: false`, all 11 required: `analysis_id`, `input_type`, `risk_score`, `risk_level`, `scam_category`, `summary`, `evidence`, `detected_urls`, `recommended_actions`, `speech_summary`, `analyzed_at`.
   - `Evidence`: `quote` (string), `reason` (string), `signal_type` (enum of 8 values), `image_index` (integer, minimum 0, `nullable: true`). `additionalProperties: false`, all 4 required.
   - `DetectedUrl`: `url` (string), `signals` (array of 7 enums), `is_verified_malicious` (boolean, strictly `enum: [false]`). `additionalProperties: false`, all 3 required.
   - `ErrorResponse`: `statusCode` (integer), `errorCode` (enum of 9 values), `message` (string), `requestId` (format: uuid), `timestamp` (format: date-time). `additionalProperties: false`, all 5 required.

2. `BE_codex/docs/CONTRACT_DECISIONS.md` (Lines 18–26, 30–38, 41–45):
   - Approved amendments: 1–5 JPEG, PNG, or WebP files. Max 5 MiB (5,242,880 bytes) per file; max 20 MiB (20,971,520 bytes) across all image files. Context and multipart framing are outside the combined image bytes limit. Files appended under repeated `images` key, oldest first. HTTP 413 returned with `IMAGE_TOO_LARGE`.
   - Error envelope: camelCase preserved exactly (`statusCode`, `errorCode`, `message`, `requestId`, `timestamp`).
   - Business rules: `risk_score: null` required when `risk_level: UNABLE_TO_ASSESS`. Numeric scores map to risk bands: SAFE [0, 39], SUSPICIOUS [40, 74], DANGER [75, 100]. Image evidence has 0-based `image_index` corresponding to submitted file order (`0 <= image_index < imageCount`). Text evidence has `image_index: null`. HTTP 200 `UNABLE_TO_ASSESS` handled separately from provider failures.

3. `BE_codex/docs/FRONTEND_INTEGRATION.md` (Lines 87–96, 126–140, 169–178):
   - Form creation: `form.append('images', { uri, name, type })` or `File` objects. Do NOT send JSON array, `images[]`, or base64.
   - Decoder protection limit: 16 million pixels (`16 MP`) per file across all frames.
   - Example 200 payload for `UNABLE_TO_ASSESS`: `risk_score: null`, `scam_category: "NONE"`, `evidence: []`, `detected_urls: []`, `summary: "Ảnh chưa đủ rõ hoặc chưa có đủ bằng chứng để đánh giá."`.
   - Integration errors table: JSON error/invalid input -> `400 INVALID_INPUT`; unsupported format -> `400 UNSUPPORTED_IMAGE_FORMAT`; corrupt image -> `400 INVALID_IMAGE`; size exceeded -> `413 IMAGE_TOO_LARGE`; AI failure -> `502` / `503`; timeout -> `504 AI_TIMEOUT`; internal -> `500 INTERNAL_ERROR`.

4. `FE_codex/src/lib/api/contracts.ts` & `FE_codex/src/features/analysis/analysisResult.ts` (Lines 1–115):
   - Enums:
     - `RiskLevel`: `'SAFE'`, `'SUSPICIOUS'`, `'DANGER'`, `'UNABLE_TO_ASSESS'`
     - `ScamCategory` (10): `'BANK_IMPERSONATION'`, `'GOVERNMENT_IMPERSONATION'`, `'PHISHING'`, `'OTP_THEFT'`, `'FINANCIAL_FRAUD'`, `'FAKE_RECRUITMENT'`, `'FAKE_DELIVERY'`, `'SOCIAL_ENGINEERING'`, `'OTHER'`, `'NONE'`
     - `SignalType` (8): `'URGENCY'`, `'THREAT'`, `'CREDENTIAL_REQUEST'`, `'MONEY_REQUEST'`, `'IMPERSONATION'`, `'SUSPICIOUS_URL'`, `'TOO_GOOD_TO_BE_TRUE'`, `'OTHER'`
     - `UrlSignal` (7): `'IP_HOST'`, `'PUNYCODE'`, `'SHORTENER'`, `'MISLEADING_SUBDOMAIN'`, `'USERINFO_AT'`, `'LONG_URL'`, `'HTTP_ONLY'`
     - `ErrorCode` (9): `'INVALID_INPUT'`, `'UNSUPPORTED_IMAGE_FORMAT'`, `'INVALID_IMAGE'`, `'IMAGE_TOO_LARGE'`, `'RATE_LIMIT_EXCEEDED'`, `'AI_INVALID_RESPONSE'`, `'AI_PROVIDER_ERROR'`, `'AI_TIMEOUT'`, `'INTERNAL_ERROR'`
   - Validation functions:
     - `isAnalysisResponse` validates exact key count (11 keys), UUID v4 regex, DateTime parsing, `hasValidScore`, `isEvidence` (ensures `image_index === null` for text and `0 <= image_index < 5` for images), `isDetectedUrl` (ensures `is_verified_malicious === false`).

5. `BE_codex/src/analysis/image-upload.ts` (Lines 12–109):
   - Multer limits: `fileSize: 5 * 1024 * 1024`, `files: 5`, `fields: 1`, `parts: 6`, `fieldSize: 4000` (for context).
   - Validation: Total bytes checked against `20 * 1024 * 1024`.
   - Magic bytes detection:
     - JPEG: `0xFF, 0xD8, 0xFF`
     - PNG: `0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A`
     - WebP: `'RIFF'` at 0..3 and `'WEBP'` at 8..11
     - Unsupported signatures (`GIF87a`/`GIF89a`, `BM`, `II*\0`/`MM\0*`, `ftyp`, `0,0,1,0`) throw `UNSUPPORTED_IMAGE_FORMAT`.
     - Invalid / non-image bytes throw `INVALID_IMAGE`.
   - Sharp decode checks: `limitInputPixels: 16_000_000`. Full `image.stats()` executed to verify pixel stream decodability.

6. `BE_codex/test/mock-api.e2e-spec.ts` (Lines 18–37):
   - Demonstrates exact Ajv 8 validation setup with OpenAPI v1.2 schema:
     ```typescript
     const spec = parse(readFileSync(resolve(__dirname, '../docs/ScamShield_AI_OpenAPI_v1.2.yaml'), 'utf8'));
     const ajv = new Ajv({ strict: false, allErrors: true });
     addFormats(ajv);
     const validator = ajv.compile({ ...spec, $ref: '#/components/schemas/AnalysisResponse' });
     ```

7. `docs/PREPROCESSING_DESIGN.md` (Line 1385):
   - Mentions `status: 422` in the context of an internal RFC 7807 problem detail payload proposal for JSON schema validation. However, the authoritative public API baseline in `BE_codex/docs/ScamShield_AI_OpenAPI_v1.2.yaml` and `CONTRACT_DECISIONS.md` supersedes this with HTTP 400 `INVALID_INPUT` and the standard `ErrorResponse` envelope.

---

## 2. Logic Chain

1. **Request Requirements for `POST /api/v1/analysis/images`**:
   - The route requires `Content-Type: multipart/form-data`.
   - Multer and `image-upload.ts` enforce that all files must be submitted under the form key `'images'`. If sent under `'images[]'` or `'file'`, or if no file is provided, it fails with 400 `INVALID_INPUT`.
   - Exactly 1 to 5 image parts are permitted. Submitting 0 or >5 files results in 400 `INVALID_INPUT`.
   - Size limit is two-tier: per-file <= 5 MiB (5,242,880 bytes) and combined image bytes <= 20 MiB (20,971,520 bytes). Exceeding either boundary produces 413 `IMAGE_TOO_LARGE`.
   - The client-declared MIME type is not trusted. The backend inspects binary headers for JPEG, PNG, or WebP magic bytes. Recognized non-supported formats (GIF, BMP, TIFF, HEIC/AVIF, ICO) yield 400 `UNSUPPORTED_IMAGE_FORMAT`. Corrupt, zero-byte, truncated, or non-image payloads yield 400 `INVALID_IMAGE`.
   - Pixel dimensions: Sharp validates that decoded pixels `width * height * pages <= 16,000,000`. Exceeding this fails with 400 `INVALID_IMAGE`.
   - Context parameter: optional `context` string. Length cannot exceed 1000 characters. Sending unknown extra form fields or duplicate `context` fields yields 400 `INVALID_INPUT`.

2. **AnalysisResponse Schema & 11 Snake_Case Fields**:
   - `additionalProperties: false` is strictly set on `AnalysisResponse`, `Evidence`, and `DetectedUrl`. The presence of any unlisted property causes schema validation failure.
   - All 11 fields must always be present (required):
     1. `analysis_id` (string, UUID v4)
     2. `input_type` (string enum: 'IMAGE' or 'TEXT')
     3. `risk_score` (integer 0..100 or null)
     4. `risk_level` (string enum: 'SAFE', 'SUSPICIOUS', 'DANGER', 'UNABLE_TO_ASSESS')
     5. `scam_category` (string enum: 10 values)
     6. `summary` (string)
     7. `evidence` (array of Evidence)
     8. `detected_urls` (array of DetectedUrl)
     9. `recommended_actions` (array of strings)
     10. `speech_summary` (string)
     11. `analyzed_at` (string, ISO 8601 date-time)
   - Specific field invariants:
     - `Evidence`: `quote`, `reason`, `signal_type`, `image_index`. For `input_type: 'IMAGE'`, `image_index` must be an integer within `[0, imageCount - 1]`. For `input_type: 'TEXT'`, `image_index` must be `null`.
     - `DetectedUrl`: `url`, `signals` (array of 7 enums), `is_verified_malicious` (strictly boolean literal `false`).
     - Correlation between `risk_level` and `risk_score`:
       - `UNABLE_TO_ASSESS` <==> `risk_score: null`
       - `SAFE` <==> `risk_score` in [0, 39]
       - `SUSPICIOUS` <==> `risk_score` in [40, 74]
       - `DANGER` <==> `risk_score` in [75, 100]

3. **Status Codes, Error Responses, and `UNABLE_TO_ASSESS` Semantics**:
   - Public contract statuses for `/analysis/images`:
     - `200 OK`: Analysis completed (even when no scam is detected or evidence is insufficient).
     - `400 Bad Request`: `INVALID_INPUT`, `INVALID_IMAGE`, `UNSUPPORTED_IMAGE_FORMAT`.
     - `413 Payload Too Large`: `IMAGE_TOO_LARGE`.
     - `429 Too Many Requests`: `RATE_LIMIT_EXCEEDED` (includes `Retry-After` header).
     - `500 Internal Server Error`: `INTERNAL_ERROR`.
     - `502 Bad Gateway`: `AI_INVALID_RESPONSE`, `AI_PROVIDER_ERROR`.
     - `503 Service Unavailable`: `AI_PROVIDER_ERROR` (circuit breaker / temporary outage).
     - `504 Gateway Timeout`: `AI_TIMEOUT` (upstream timeout exceeded 45s).
   - Regarding HTTP `422`:
     - In OpenAPI v1.2, HTTP 422 is deliberately omitted. All input validation errors use HTTP 400.
     - `docs/PREPROCESSING_DESIGN.md` §7.3 suggested an RFC 7807 422 payload for internal JSON schema validation, but `CONTRACT_DECISIONS.md` affirmed the public API uses camelCase `ErrorResponse` with HTTP 400.
   - `UNABLE_TO_ASSESS` semantics:
     - When images are valid files but have unreadable text, blurry chat screens, or ambiguous context, the API returns **HTTP 200 OK** (not an error status).
     - Response constraints: `risk_level: "UNABLE_TO_ASSESS"`, `risk_score: null` (never 0), `scam_category: "NONE"`, `evidence: []`, `detected_urls: []`.

4. **Ajv Test Validation Strategy**:
   - Automated tests in `BE_codex/test/` load the YAML specification via `yaml.parse()`.
   - Ajv v8 requires `strict: false` because OpenAPI 3.0 uses `nullable: true` and keywords that strict JSON Schema draft-07 would reject.
   - `ajv-formats` is registered (`addFormats(ajv)`) to validate `format: "uuid"` and `format: "date-time"`.
   - Root document compilation with `$ref`:
     Passing `{ ...spec, $ref: '#/components/schemas/AnalysisResponse' }` into `ajv.compile()` ensures all relative references (`#/components/schemas/Evidence`, `#/components/schemas/DetectedUrl`) resolve within the document tree without external URI lookups.
   - Strict contract validation in E2E tests should combine Ajv schema checks with semantic assertions (`hasValidScore`, `image_index < submittedImageCount`, `is_verified_malicious === false`).

---

## 3. Caveats

1. **OCR Fallback in Offline Environments**:
   In sandbox or CI environments without host `tesseract` or Python `paddleocr` binaries installed, the OCR engine falls back to `metadata-ocr.provider.ts` using `data/metadata.json` ground truth. The API response contract remains identical in both modes.
2. **Upstream AI Timeout vs Client Timeout**:
   OpenAI upstream timeout is fixed at 45 seconds (`OPENAI_TIMEOUT_MS=45000`), while frontend recommended deadline is 60 seconds to account for network transmission and image processing.
3. **No Database / Anonymous**:
   `analysis_id` is a transient UUID v4 generated on the fly. It does not map to any database table or historical lookup endpoint.

---

## 4. Conclusion

The ScamShield AI API contract is rigidly governed by `ScamShield_AI_OpenAPI_v1.2.yaml`, `CONTRACT_DECISIONS.md`, and `contracts.ts`.
- The image endpoint `POST /api/v1/analysis/images` enforces strict multipart requirements (1–5 files under key `images`, max 5 MiB per file, max 20 MiB combined, JPEG/PNG/WebP magic byte detection, <=16 MP, optional <=1000 char `context`).
- Every successful analysis response must contain exactly 11 snake_case fields with `additionalProperties: false`, strictly correlated `risk_score` and `risk_level`, 0-based `image_index` within bounds, and `is_verified_malicious: false`.
- Validation and formatting failures return HTTP 400 (never 422), oversized images return HTTP 413, and unreadable images return HTTP 200 with `UNABLE_TO_ASSESS` (`risk_score: null`).
- Automated E2E tests can achieve 100% contract compliance validation by using Ajv 8 (`strict: false`, `ajv-formats`) compiling `{ ...spec, $ref: '#/components/schemas/AnalysisResponse' }` complemented by runtime semantic assertions from `analysisResult.ts`.

---

## 5. Verification Method

To verify these contract specifications:
1. Run OpenAPI schema validation in `BE_codex`:
   ```powershell
   cd "c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\BE_codex"
   npm test -- test/mock-api.e2e-spec.ts
   ```
2. Verify TypeScript contract compilation:
   ```powershell
   cd "c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\FE_codex"
   npm run build # or npx tsc --noEmit
   ```
3. Inspect `BE_codex/test/mock-api.e2e-spec.ts` lines 18–37 and `FE_codex/src/features/analysis/analysisResult.ts` lines 97–110 to verify that schema keys, enum values, and validation predicates align across the entire codebase.

---

## Features Discovered

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | Endpoint | Image Analysis (`POST /api/v1/analysis/images`) | Multi-image screenshot analysis for scam indicators | Multipart with 1–5 images (`images`), optional `context` <= 1000 chars | HTTP 200 `AnalysisResponse` | 400 (`INVALID_INPUT`, `INVALID_IMAGE`, `UNSUPPORTED_IMAGE_FORMAT`), 413 (`IMAGE_TOO_LARGE`), 429, 500, 502, 503, 504 | `ScamShield_AI_OpenAPI_v1.2.yaml` |
| 2 | Endpoint | Text Analysis (`POST /api/v1/analysis/text`) | Single message scam analysis | JSON `{ text: string }` (1–5000 chars) | HTTP 200 `AnalysisResponse` (with `image_index: null`) | 400 (`INVALID_INPUT`), 413, 429, 500, 502, 503, 504 | `ScamShield_AI_OpenAPI_v1.2.yaml` |
| 3 | Endpoint | Health Check (`GET /api/v1/health`) | Stateless server health probe | None | HTTP 200 `HealthResponse` `{ status: "ok", service: "scamshield-backend", timestamp }` | None (stateless, no AI upstream) | `ScamShield_AI_OpenAPI_v1.2.yaml` |
| 4 | Endpoint | Emergency Guidance (`POST /api/v1/guidance/emergency`) | Deterministic Vietnamese guidance for scam scenarios | JSON `{ scenario, scam_category? }` | HTTP 200 `EmergencyResponse` `{ scenario, title, urgency, steps }` | 400 (`INVALID_INPUT`), 500 | `ScamShield_AI_OpenAPI_v1.2.yaml` |
| 5 | Request Validation | Multipart Image Limits | Enforces 1–5 files, 5 MiB/file, 20 MiB combined | Multipart form-data | Passed to decoding pipeline | Exceeding 5 MiB or 20 MiB -> 413 `IMAGE_TOO_LARGE`; 0 or >5 files -> 400 `INVALID_INPUT` | `CONTRACT_DECISIONS.md`, `image-upload.ts` |
| 6 | Request Validation | Magic Byte Format Check | True binary signature inspection for JPEG, PNG, WebP | Image Buffer | Detected `ImageMediaType` | GIF, BMP, TIFF, HEIC, ICO -> 400 `UNSUPPORTED_IMAGE_FORMAT`; corrupted/empty -> 400 `INVALID_IMAGE` | `image-upload.ts` |
| 7 | Request Validation | Decompression Bomb Defense | Decoded pixel ceiling across all pages | Image Buffer | Image metadata and pixel stats | Total pixels > 16,000,000 -> 400 `INVALID_IMAGE` | `image-upload.ts`, `FRONTEND_INTEGRATION.md` |
| 8 | Schema Model | AnalysisResponse (11 fields) | Exact response object with snake_case keys | Processed analysis result | JSON with 11 required fields, `additionalProperties: false` | Ajv rejection if any field missing or extraneous field present | `ScamShield_AI_OpenAPI_v1.2.yaml`, `analysisResult.ts` |
| 9 | Schema Model | Evidence Grounding & Indexing | Verbatim quote citing bubble text with source image index | Quoted OCR turn text | Evidence object with `quote`, `reason`, `signal_type`, `image_index` | Must be 0-based index `< imageCount`; invalid index or ungrounded quote rejected | `evidence-validator.ts`, `CONTRACT_DECISIONS.md` |
| 10 | Schema Model | URL Intelligence Heuristics | Heuristic structural detection on extracted URLs | Extracted URL strings | DetectedUrl with `url`, `signals`, `is_verified_malicious: false` | `is_verified_malicious` MUST be `false` (enum: [false]) | `url-intelligence.service.ts`, `ScamShield_AI_OpenAPI_v1.2.yaml` |
| 11 | Schema Model | Deterministic Risk Scoring | Deterministic score (0–100 or null) and level mapping | Set of detected behavior and URL signals | `{ risk_score, risk_level }` | Score must strictly fall within level bounds: SAFE [0, 39], SUSPICIOUS [40, 74], DANGER [75, 100], UNABLE_TO_ASSESS null | `risk.service.ts`, `analysisResult.ts` |
| 12 | Schema Model | ErrorResponse Envelope | Uniform error envelope for all non-200 responses | Exception / rejection | JSON `{ statusCode, errorCode, message, requestId, timestamp }` | camelCase required; must match `X-Request-Id` header | `api-exception.filter.ts`, `contracts.ts` |
| 13 | Semantics | UNABLE_TO_ASSESS Result | Graceful evaluation when image is unreadable or ambiguous | Valid image with no clear dialogue | HTTP 200 OK with `risk_score: null`, `scam_category: "NONE"`, empty evidence/urls | Returned as 200 OK, NEVER 400, 422, or 500 | `CONTRACT_DECISIONS.md`, `analysis-response.mapper.ts` |
| 14 | Test Automation | Ajv Schema Validator | Strict OpenAPI schema validation in test suites | OpenAPI YAML parsed object | Compiled Ajv validator function | Fails test if payload violates schema constraints | `mock-api.e2e-spec.ts` |

---

## Edge Cases

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Image Count Limit | 0 images (form with only `context`) | HTTP 400 Bad Request, `errorCode: "INVALID_INPUT"` |
| 2 | Image Count Limit | 6 images (all valid 16x16 JPEGs) | HTTP 400 Bad Request, `errorCode: "INVALID_INPUT"` |
| 3 | Per-File Size Limit | Single image of exactly 5,242,881 bytes (5 MiB + 1 byte) | HTTP 413 Payload Too Large, `errorCode: "IMAGE_TOO_LARGE"` |
| 4 | Combined Size Limit | Four 5 MiB images + one 1-byte image (20,971,521 bytes total) | HTTP 413 Payload Too Large, `errorCode: "IMAGE_TOO_LARGE"` |
| 5 | Framing Overhead | Four 5 MiB images + 1,000 char context (total request > 20 MiB, images == 20 MiB) | HTTP 200 OK (context and multipart boundaries excluded from 20 MiB image ceiling) |
| 6 | MIME Spoofing | WebP file named `screen.jpg` with `Content-Type: image/jpeg` | HTTP 200 OK (server reads magic bytes `RIFF...WEBP`, ignores declared MIME/extension) |
| 7 | Unsupported Format | Valid GIF, BMP, TIFF, HEIC, or ICO file | HTTP 400 Bad Request, `errorCode: "UNSUPPORTED_IMAGE_FORMAT"` |
| 8 | Corrupted Data | Truncated JPEG/PNG missing end bytes, or 0-byte buffer | HTTP 400 Bad Request, `errorCode: "INVALID_IMAGE"` |
| 9 | Pixel Decompression Bomb | 100 KB image file that unpacks to 4000x4001 pixels (>16 MP) | HTTP 400 Bad Request, `errorCode: "INVALID_IMAGE"` |
| 10 | Form Field Name | Image attached under field `'image'` or `'images[]'` instead of `'images'` | HTTP 400 Bad Request, `errorCode: "INVALID_INPUT"` |
| 11 | Unknown Form Field | Form containing `images` + unknown field `'extra': 'value'` | HTTP 400 Bad Request, `errorCode: "INVALID_INPUT"` |
| 12 | Duplicate Field | Form containing two `context` fields (`context=A` and `context=B`) | HTTP 400 Bad Request, `errorCode: "INVALID_INPUT"` |
| 13 | Context Length Limit | Context of 1001 UTF-8 characters | HTTP 400 Bad Request, `errorCode: "INVALID_INPUT"` |
| 14 | Non-Multipart Body | JSON payload `{ "images": ["data:..."] }` sent to `/analysis/images` | HTTP 400 Bad Request, `errorCode: "INVALID_INPUT"` |
| 15 | Unreadable Image | Low resolution / blurry screenshot with no discernible text | HTTP 200 OK, `risk_level: "UNABLE_TO_ASSESS"`, `risk_score: null`, `scam_category: "NONE"` |
| 16 | Text Evidence Index | Text analysis returning evidence with `image_index: 0` | Rejected by contract (text evidence MUST have `image_index: null`) |
| 17 | Out-of-Bounds Index | 2 images uploaded, evidence returns `image_index: 2` (or 3, 4) | Rejected by EvidenceValidator / contract (`image_index` must be `< 2`) |
| 18 | Malicious Flag Invariance | DetectedUrl returning `is_verified_malicious: true` | Schema violation (`enum: [false]`); rejected by Ajv and `analysisResult.ts` |
| 19 | Additional Properties | Payload containing extra property like `raw_transcript: "..."` | Schema violation (`additionalProperties: false`); rejected by Ajv |
| 20 | Rate Limiting | More than 60 analysis requests within window | HTTP 429 Too Many Requests, `errorCode: "RATE_LIMIT_EXCEEDED"`, `Retry-After` header present |
| 21 | Upstream Timeout | OpenAI inference exceeding 45,000 ms | HTTP 504 Gateway Timeout, `errorCode: "AI_TIMEOUT"` |
