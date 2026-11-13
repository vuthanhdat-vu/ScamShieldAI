# ScamShield AI — Test Infrastructure & E2E Verification Strategy

## 1. Test Philosophy & Design Principles

The ScamShield AI testing architecture is built upon an **opaque-box, contract-driven, and progressive testability philosophy**. Testing treats the NestJS backend as an opaque service accessed strictly over HTTP, verifying observable behavior, status codes, and JSON payload contracts without depending on internal implementation details.

### 1.1 Authoritative Specification Sources
All test cases, input payloads, status codes, and expected output invariants are derived from authoritative project specifications:
1. **`ORIGINAL_REQUEST.md`**: Foundational mandate for end-to-end integration across OCR detection, Tesseract recognition, text preprocessing, and cloud LLM reasoning with ground-truth verification on `data/metadata.json` and `data/images/`.
2. **`BE_codex/docs/ScamShield_AI_OpenAPI_v1.2.yaml`**: The canonical OpenAPI v1.2 REST contract governing endpoints, parameters, multipart constraints, error schemas, and response properties.
3. **`BE_codex/docs/CONTRACT_DECISIONS.md`**: Architectural decisions defining exact boundary values (5 MiB single image, 20 MiB combined images, 16 MP decoder limit), error envelope conventions (`camelCase`), risk level mapping, and `UNABLE_TO_ASSESS` semantics.
4. **`FE_codex/src/lib/api/contracts.ts`**: Frontend client contract validators, TypeScript enums (`RiskLevel`, `ScamCategory`, `SignalType`, `UrlSignal`, `ErrorCode`), and response validators (`isAnalysisResponse`).

### 1.2 Invariant Verification & Contract Integrity
Every successful HTTP response returned by `POST /api/v1/analysis/images` must satisfy strict contract invariants:
- **Strict 11 snake_case fields**: `analysis_id`, `input_type`, `risk_score`, `risk_level`, `scam_category`, `summary`, `evidence`, `detected_urls`, `recommended_actions`, `speech_summary`, `analyzed_at`.
- **Closed schema (`additionalProperties: false`)**: Rejection of any unauthorized or internal debugging properties (e.g., raw transcripts or bounding boxes).
- **0-based `image_index` grounding**: For image analysis, every item in `evidence` must have an integer `image_index` satisfying `0 <= image_index < submittedImageCount`.
- **URL Intelligence invariant**: Every entry in `detected_urls` must declare `is_verified_malicious: false`.
- **Risk Score / Level Correlation**:
  - `SAFE` $\iff risk\_score \in [0, 39]$
  - `SUSPICIOUS` $\iff risk\_score \in [40, 74]$
  - `DANGER` $\iff risk\_score \in [75, 100]$
  - `UNABLE_TO_ASSESS` $\iff risk\_score = \text{null}$

### 1.3 Adversarial Verification
The test suite implements rigorous adversarial verification to ensure robust production readiness:
- **Encoding & byte integrity**: Magic byte verification for JPEG, PNG, and WebP, rejecting spoofed MIME headers and unrecognized formats (GIF, BMP, TIFF, HEIC, ICO).
- **Resource stress & payload limits**: Single image exceeding 5 MiB (413), combined images exceeding 20 MiB (413), and decompression bombs exceeding 16 megapixels (400).
- **Graceful degradation**: Unreadable or solid noise images return HTTP 200 with `UNABLE_TO_ASSESS`, `risk_score: null`, and `scam_category: "NONE"`.

---

## 2. Feature Inventory

The test suite systematically verifies the following features, threat categories, and boundary dimensions:

| Category / Area | Identifier | Feature / Dimension | Scope & Verification Invariants |
|---|---|---|---|
| **Core Endpoint** | `EP-01` | `POST /api/v1/analysis/images` | Multipart upload processing 1–5 images, optional context, returning 11-field `AnalysisResponse`. |
| **Threat Category** | `CAT-MD` | Government Impersonation | Police/Court extortion, threats, NCB fake escrow accounts, `GOVERNMENT_IMPERSONATION`, DANGER. |
| **Threat Category** | `CAT-DT` | Financial Fraud & Fake Tasks | E-commerce recruitment, task commissions, locked principal, `FINANCIAL_FRAUD` / `FAKE_RECRUITMENT`, DANGER. |
| **Threat Category** | `CAT-MB` | Fake Delivery & Courier Scam | Fake shipper fees, subscription cancellation links, `FAKE_DELIVERY`, DANGER. |
| **Threat Category** | `CAT-DC` | Account Theft & Phishing OTP | Phishing SMS brandnames, credential theft, OTP harvesting, `OTP_THEFT` / `PHISHING`, DANGER. |
| **Threat Category** | `CAT-HN` | Benign Daily Communication | Legitimate shipper delivery, routine bank appointments, payment confirmations, `NONE`, SAFE. |
| **Boundary** | `BND-01` | Minimum Image Count | Single image boundary (1 image) $\to$ 200 OK, `image_index === 0`. |
| **Boundary** | `BND-02` | Maximum Image Count | Upper image boundary (5 images) $\to$ 200 OK, `image_index` within `[0..4]`. |
| **Boundary** | `BND-03` | Image Count Exceeded | 6 image parts attached under `images` $\to$ 400 Bad Request, `INVALID_INPUT`. |
| **Boundary** | `BND-04` | Missing Image Parts | 0 images (form with only context) $\to$ 400 Bad Request, `INVALID_INPUT`. |
| **Boundary** | `BND-05` | Wrong Content-Type | Sending JSON body instead of multipart $\to$ 400 Bad Request, `INVALID_INPUT`. |
| **Boundary** | `BND-06` | Unsupported Image Format | Magic bytes for GIF (`GIF89a`) or BMP (`BM`) $\to$ 400 Bad Request, `UNSUPPORTED_IMAGE_FORMAT`. |
| **Boundary** | `BND-07` | Corrupted Image Bytes | Truncated or non-image random bytes $\to$ 400 Bad Request, `INVALID_IMAGE`. |
| **Boundary** | `BND-08` | Single Image Size Limit | Single image file of 5,242,881 bytes (> 5 MiB) $\to$ 413 Payload Too Large, `IMAGE_TOO_LARGE`. |
| **Boundary** | `BND-09` | Combined Images Limit | 5 images totalling 22.5 MiB (> 20 MiB) $\to$ 413 Payload Too Large, `IMAGE_TOO_LARGE`. |
| **Boundary** | `BND-10` | Resolution Limit (16 MP) | Decompression bomb (5000x4000 pixels) $\to$ 400 Bad Request, `INVALID_IMAGE`. |
| **Boundary** | `BND-11` | Multi-Page / Animated | Animated WebP / APNG (`pages > 1`) $\to$ 400 Bad Request, `INVALID_IMAGE`. |
| **Boundary** | `BND-12` | Unreadable Image / Noise | Solid noise or unreadable image $\to$ 200 OK, `UNABLE_TO_ASSESS`, `risk_score: null`. |
| **Boundary** | `BND-13` | Context Field Boundary | Context <= 1000 chars (200 OK); > 1000 chars (400); extraneous fields (400 `INVALID_INPUT`). |
| **Synergy** | `SYN-01` | Multi-Image Grounding | Verbatim quote extraction grounded in exact 0-based `image_index` across multi-screen turns. |
| **Synergy** | `SYN-02` | URL Heuristics & Scoring | Detection of `HTTP_ONLY` and suspicious domains elevating composite risk score. |
| **Synergy** | `SYN-03` | PII Anonymization | Preservation of context without leaking raw CCCD, bank account, or OTP in output summaries. |
| **Synergy** | `SYN-04` | Multi-Signal Convergence | OTP request + high urgency $\to$ corroborated danger score ($85..100$). |
| **Synergy** | `SYN-05` | Benign Disambiguation | Legitimate bank transfers without fraud pressure classified as `SAFE` ($\le 39$). |

---

## 3. Test Architecture & Execution Framework

### 3.1 NestJS Ephemeral Port Bootstrapping
Tests instantiate the real NestJS application module and bind to an ephemeral TCP loopback port (`127.0.0.1:0`), ensuring clean port isolation and eliminating port collision risks:

```typescript
import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';

let app: INestApplication;
let baseUrl: string;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication({ logger: false });
  configureApp(app);
  await app.listen(0, '127.0.0.1');
  baseUrl = await app.getUrl();
});

afterAll(async () => {
  await app?.close();
});
```

### 3.2 Native Node 22 HTTP Client (`fetch` + `FormData` + `Blob`)
In compliance with project architecture (Node `>=22`), HTTP requests are executed using standard Web APIs (`globalThis.fetch`, `FormData`, `Blob`), avoiding unnecessary external dependencies such as Supertest:

```typescript
function createMultipartForm(images: { buffer: Buffer; name: string; mime: string }[], context?: string): FormData {
  const form = new FormData();
  for (const img of images) {
    form.append('images', new Blob([Uint8Array.from(img.buffer)], { type: img.mime }), img.name);
  }
  if (context !== undefined) {
    form.append('context', context);
  }
  return form;
}
```

### 3.3 Strict Ajv v8 OpenAPI Schema Validation
Every response payload is compiled and validated against the official `ScamShield_AI_OpenAPI_v1.2.yaml` specification using `ajv` and `ajv-formats`:

```typescript
import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

const openApiSpec = parse(
  readFileSync(resolve(__dirname, '../docs/ScamShield_AI_OpenAPI_v1.2.yaml'), 'utf8')
) as { components: { schemas: Record<string, object> } };

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

const analysisResponseValidator: ValidateFunction = ajv.compile({
  ...openApiSpec,
  $ref: '#/components/schemas/AnalysisResponse',
});

const errorResponseValidator: ValidateFunction = ajv.compile({
  ...openApiSpec,
  $ref: '#/components/schemas/ErrorResponse',
});

function assertOpenApiCompliance(payload: unknown): void {
  const valid = analysisResponseValidator(payload);
  if (!valid) {
    throw new Error('OpenAPI v1.2 Schema Violation: ' + ajv.errorsText(analysisResponseValidator.errors));
  }
}
```

---

## 4. Real-World Application Scenarios (Tier 4)

Ten representative golden benchmark scenarios from `data/metadata.json` and `data/images/` test high-fidelity production interactions:

1. **Scenario 1 (Case 1 — `MD_001`, 3 images)**: Fake Police Narcotics & Money Laundering Extortion.
   - *Target*: Impersonation of Captain Nguyễn Quốc Trung (PC02 Hanoi Police), T16 arrest warrant, fake police domain `https://congan-pc02-hanoi.org`.
   - *Expectation*: HTTP 200, `risk_level: "DANGER"`, `risk_score: 75..100`, `scam_category: "GOVERNMENT_IMPERSONATION"`.
2. **Scenario 2 (Case 2 — `MD_002`, 3 images)**: Criminal Police Intimidation with Leaked CCCD.
   - *Target*: Senior Lieutenant Colonel Lê Văn Hậu (C02 Ministry of Public Security), leaked citizen ID `040054001299`, 700M VND extortion.
   - *Expectation*: HTTP 200, `risk_level: "DANGER"`, `scam_category: "GOVERNMENT_IMPERSONATION"`, PII masked.
3. **Scenario 3 (Case 44 — `DT_001`, 3 images)**: VIP Task Commission Timeout System Lock.
   - *Target*: VIP 3 task overdue, locked principal & commissions, 45M VND urgent deposit demand.
   - *Expectation*: HTTP 200, `risk_level: "DANGER"`, `scam_category: "FINANCIAL_FRAUD"`.
4. **Scenario 4 (Case 45 — `DT_002`, 3 images)**: Fake E-Commerce Part-Time Job Recruitment.
   - *Target*: iMessage fake recruitment, Lazada fake portal `https://tuyendung-lazada-vn.top`.
   - *Expectation*: HTTP 200, `risk_level: "DANGER"`, `scam_category: "FAKE_RECRUITMENT"`, detected URL.
5. **Scenario 5 (Case 87 — `MB_001`, 3 images)**: GHTK Fake Shipper Recurring Membership Fee.
   - *Target*: Shipper claims mistaken VIP registration (4.5M/mo fee), phishing link `http://ghtk-huythehoivien-247.com`.
   - *Expectation*: HTTP 200, `risk_level: "DANGER"`, `scam_category: "FAKE_DELIVERY"`, detected URL with `HTTP_ONLY`.
6. **Scenario 6 (Case 88 — `MB_002`, 4 images)**: Fake Resort Fanpage Room Booking Scam.
   - *Target*: 4-screenshot fanpage booking scam (Serena Resort Kim Bôi), urgent 100% deposit requirement.
   - *Expectation*: HTTP 200, `risk_level: "DANGER"`, `image_index` spanning 0..3.
7. **Scenario 7 (Case 129 — `DC_001`, 3 images)**: Vietcombank SMS Brandname Spoofing & OTP Theft.
   - *Target*: SMS Brandname spoofing, fake VCB Digibank activation, explicit OTP code `956897`.
   - *Expectation*: HTTP 200, `risk_level: "DANGER"`, `risk_score: 85..100`, `scam_category: "OTP_THEFT"`.
8. **Scenario 8 (Case 130 — `DC_002`, 3 images)**: ACB Phishing SMS & Account Theft.
   - *Target*: Global financial service fee notification, phishing link `https://acb-online-center.com`.
   - *Expectation*: HTTP 200, `risk_level: "DANGER"`, `scam_category: "PHISHING"` or `"BANK_IMPERSONATION"`.
9. **Scenario 9 (Case 171 — `HN_001`, 3 images)**: Legitimate GHTK Shipper Package Drop-off.
   - *Target*: Genuine delivery of 320k VND cosmetics package, security sign-off, routine MB Bank payment without extortion.
   - *Expectation*: HTTP 200, `risk_level: "SAFE"`, `risk_score: 0..39`, `scam_category: "NONE"`, empty evidence/urls.
10. **Scenario 10 (Case 172 — `HN_002`, 3 images)**: Legitimate Bank Branch Customer Appointment.
    - *Target*: Genuine Vietcombank relationship officer invitation for credit limit review, reminder to never share passwords or OTP.
    - *Expectation*: HTTP 200, `risk_level: "SAFE"`, `risk_score: 0..39`, `scam_category: "NONE"`.

---

## 5. Coverage Thresholds & Tier Stratification

The test suite enforces strict numerical minimums across all four tiers:

| Tier | Tier Name | Purpose | Minimum Count | Target Count |
|---|---|---|---|---|
| **Tier 1** | Feature Coverage | Validates happy paths across all 5 core threat categories (`MD`, `DT`, `MB`, `DC`, `HN`). | 5 | 5 |
| **Tier 2** | Boundary & Corner Cases | Validates all HTTP, multipart, size, format, resolution, noise, and context constraints. | 13 | 13 |
| **Tier 3** | Cross-Feature Synergies | Validates multi-image grounding, URL heuristics, PII masking, urgency convergence, benign transfers. | 5 | 5 |
| **Tier 4** | Real-World Application Scenarios | Validates end-to-end integration against golden benchmark cases from dataset. | 10 | 10 |
| **Total** | **Full E2E Suite** | Comprehensive automated integration suite with 100% OpenAPI schema validation. | **33** | **33** |
