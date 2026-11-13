# Handoff Report: BE_codex Test Infrastructure & E2E Testing Setup

**Author**: `explorer_e2e_2` (Teamwork Explorer)  
**Date**: 2026-11-13  
**Working Directory**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI`  
**State Folder**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\explorer_e2e_2`  
**Target Milestone**: Milestone 4 — Automated Integration Test Suite & Contract Validation (Sub-M1: Test Infrastructure)

---

## 1. Observation

### 1.1 `BE_codex/package.json` Configuration & Dependencies
Inspection of `BE_codex/package.json`:
- **Package Details**: Name `"scamshield-backend"`, Version `"1.2.0"`, Engine `"node": ">=22"`.
- **Scripts**:
  ```json
  "scripts": {
    "start": "nest start",
    "start:dev": "nest start --watch",
    "start:prod": "node dist/main.js",
    "lint": "eslint src test",
    "test": "jest --runInBand",
    "build": "nest build",
    "test:e2e": "jest --runInBand --testMatch \"<rootDir>/test/**/*.e2e-spec.ts\""
  }
  ```
- **Embedded Jest Configuration**:
  ```json
  "jest": {
    "testEnvironment": "node",
    "setupFiles": [
      "<rootDir>/test/mock-environment.ts"
    ],
    "testMatch": [
      "<rootDir>/test/**/*.spec.ts"
    ],
    "transform": {
      "^.+\\.ts$": "ts-jest"
    }
  }
  ```
- **Production Dependencies (`dependencies`)**:
  - `@nestjs/common`: `^11.2.9`
  - `@nestjs/config`: `^4.0.4`
  - `@nestjs/core`: `^11.2.9`
  - `@nestjs/platform-express`: `^11.2.9`
  - `@nestjs/swagger`: `^11.4.8`
  - `ajv`: `^8.20.0`
  - `class-transformer`: `^0.5.1`
  - `class-validator`: `^0.14.4`
  - `multer`: `^2.5.0`
  - `openai`: `^7.54.0`
  - `reflect-metadata`: `^0.2.2`
  - `rxjs`: `^7.8.2`
  - `sharp`: `^0.35.5`
  - `yaml`: `^2.9.1` (Note: the project uses `yaml`, not `js-yaml`)
- **Development Dependencies (`devDependencies`)**:
  - `@eslint/js`: `^9.39.5`
  - `@nestjs/cli`: `^11.0.24`
  - `@nestjs/testing`: `^11.2.9`
  - `@types/express`: `^5.0.6`
  - `@types/jest`: `^30.0.0`
  - `@types/multer`: `^2.3.0`
  - `@types/node`: `^24.19.2`
  - `ajv-formats`: `^3.0.1`
  - `eslint`: `^9.39.5`
  - `jest`: `^30.5.2`
  - `ts-jest`: `^29.4.15`
  - `typescript`: `5.9`
  - `typescript-eslint`: `^8.72.2`
- **Crucial Findings on Testing Libraries**:
  - `supertest` and `@types/supertest` are **NOT** present in `package.json` and are **NOT** installed in `node_modules`.
  - `ajv` (`^8.20.0`) and `ajv-formats` (`^3.0.1`) are already present in dependencies/devDependencies.
  - `yaml` (`^2.9.1`) is already installed for parsing OpenAPI v1.2 YAML files.
  - `sharp` (`^0.35.5`) is present for image handling and test fixture generation.

### 1.2 `BE_codex/test/` Structure and Existing Configurations
- **No standalone `jest-e2e.json` or `jest.config.js` exists**: The configuration is centralized in `package.json`.
- **`tsconfig.json`**:
  - `target: "ES2022"`, `module: "Node16"`, `moduleResolution: "Node16"`, `strict: true`, `isolatedModules: true`.
  - `include: ["src/**/*.ts", "test/**/*.ts"]`.
- **`test/mock-environment.ts` (Jest Setup File)**:
  ```typescript
  process.env.PORT = '3000';
  process.env.MOCK_AI = 'true';
  process.env.OPENAI_API_KEY = '';
  process.env.OPENAI_MODEL = '';
  process.env.OPENAI_TIMEOUT_MS = '45000';
  process.env.CORS_ORIGINS = '';
  ```
- **Existing Test Inventory in `test/`**:
  1. `environment.spec.ts`: Validates `validateEnvironment` across valid and invalid environment variable assignments.
  2. `foundation.spec.ts`: Tests `X-Request-Id` generation, global exception handling, Swagger UI endpoint (`/api/docs`), and request trimming.
  3. `frontend-integration.e2e-spec.ts`: Tests CORS preflight and allowed origins.
  4. `mock-analysis.spec.ts`: Tests `AnalysisService`, `RiskService`, and `validateImage` unit logic deterministically.
  5. `mock-api.e2e-spec.ts`: Tests end-to-end HTTP API behavior for health, guidance, text analysis, and image upload validation using compiled OpenAPI v1.2 Ajv schema.
  6. `openai-analysis.spec.ts`: Tests OpenAI prompt formatting and Responses API schema compliance.
  7. `openai-api.e2e-spec.ts`: Tests OpenAI provider wiring with offline `jest.spyOn(globalThis, 'fetch')` mock.
  8. `openai-fixtures.ts`: Fixtures for OpenAI response payloads.
  9. `risk-engine.spec.ts`: Unit tests for mathematical risk scoring rules.
  10. `url-intelligence.spec.ts`: Unit tests for heuristic URL signal detection.

### 1.3 NestJS Application Instantiation Pattern in Tests
In `BE_codex/test/mock-api.e2e-spec.ts` (lines 71–86) and `BE_codex/test/foundation.spec.ts` (lines 33–46):
- **Application Bootstrapping**:
  ```typescript
  import { type INestApplication } from '@nestjs/common';
  import { Test } from '@nestjs/testing';
  import { AppModule } from '../src/app.module';
  import { configureApp } from '../src/configure-app';

  let app: INestApplication;
  let url: string;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication({ logger: false });
    configureApp(app);
    await app.listen(0, '127.0.0.1'); // Binds to random available loopback port
    url = await app.getUrl();
  });

  afterAll(async () => {
    await app?.close();
  });
  ```
- **Why `configureApp(app)` is mandatory**:
  `BE_codex/src/configure-app.ts` configures critical global behavior:
  1. `requestContext` middleware (attaches unique `x-request-id` to every request).
  2. `app.setGlobalPrefix('api/v1')`.
  3. `ValidationPipe` with `{ transform: true, whitelist: true, forbidNonWhitelisted: true, exceptionFactory: () => new ApiException(ErrorCode.INVALID_INPUT) }`.
  4. Global `ApiExceptionFilter`.
  5. Swagger UI route `/api/docs`.

### 1.4 Native `fetch` + `FormData` vs Supertest for Image Uploads
Because `app.listen(0, '127.0.0.1')` binds to a live TCP port and the project requires Node `>=22`, existing E2E tests deliberately use standard Web standard `fetch`, `FormData`, and `Blob`:
- **Image Upload Helper in `BE_codex/test/mock-api.e2e-spec.ts` (lines 44–46, 94–96)**:
  ```typescript
  function appendImage(
    form: FormData,
    bytes: Buffer,
    name = 'screen.jpg',
    mime = 'image/jpeg',
    field = 'images'
  ): void {
    form.append(field, new Blob([Uint8Array.from(bytes)], { type: mime }), name);
  }

  function upload(form: FormData): Promise<Response> {
    return fetch(url + '/api/v1/analysis/images', {
      method: 'POST',
      body: form, // Native fetch automatically sets Content-Type: multipart/form-data with boundary
    });
  }
  ```
- **Key multipart requirements enforced by `BE_codex/src/analysis/image-upload.ts`**:
  - Form field name must be strictly `'images'` (repeated 1 to 5 times for multiple images).
  - Optional field `'context'` (string <= 1000 characters).
  - Any unexpected form field name (e.g., `'images[]'`, `'files'`) or extra fields throws HTTP 400 `INVALID_INPUT`.
  - Max per-file size: 5 MiB (`5 * 1024 * 1024` bytes).
  - Max combined file size: 20 MiB (`20 * 1024 * 1024` bytes).
  - Image format verified via magic bytes (JPEG `0xFF 0xD8 0xFF`, PNG `0x89 0x50 0x4E 0x47 ...`, WebP `RIFF....WEBP`).

### 1.5 OpenAPI v1.2 Schema Validation via Ajv
In `BE_codex/test/mock-api.e2e-spec.ts` (lines 18–37):
```typescript
import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';

const spec = parse(
  readFileSync(resolve(__dirname, '../docs/ScamShield_AI_OpenAPI_v1.2.yaml'), 'utf8')
) as { components: { schemas: Record<string, object> } };

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

const analysisResponseValidator: ValidateFunction = ajv.compile({
  ...spec,
  $ref: '#/components/schemas/AnalysisResponse',
});

function assertOpenApiCompliance(payload: unknown): void {
  if (!analysisResponseValidator(payload)) {
    throw new Error('OpenAPI v1.2 Schema Violation: ' + ajv.errorsText(analysisResponseValidator.errors));
  }
}
```

### 1.6 Environment Configuration & AI/OCR Dependencies
1. **Environment Toggles (`BE_codex/src/config/environment.ts`)**:
   - `MOCK_AI`: Boolean (`true` or `false`). Defaults to `true` in `mock-environment.ts`.
   - When `MOCK_AI=true`: `AiModule` provides `MockAiAnalysisProvider`. No `OPENAI_API_KEY` is required.
   - When `MOCK_AI=false`: `AiModule` provides `OpenAiAnalysisProvider`. Requires `OPENAI_API_KEY` and `OPENAI_MODEL`. In testing, external OpenAI calls can be mocked using `jest.spyOn(globalThis, 'fetch')` as demonstrated in `openai-api.e2e-spec.ts`.
2. **OCR Engine & Fallback Strategy**:
   - Host environment currently lacks native `paddleocr` and `tesseract.exe` binaries.
   - As designed in `PROJECT.md` (Milestone 1), `BE_codex/src/ocr/` introduces an adapter pattern:
     - `PaddleTesseractOcrProvider` (native Python subprocess / OCR execution when binaries are available).
     - `MetadataOcrProvider` (fallback adapter reading ground-truth conversation turns from `data/metadata.json` matching sample images by filename or ID).
   - This architecture allows E2E integration tests to execute reliably in offline, sandbox, or CI environments without external binary installation failures.

### 1.7 Node Modules & Execution State
- `BE_codex/node_modules` exists.
- In `npm ci --dry-run`, all 641 required packages are indexed in local npm cache (`C:\Users\leemi\AppData\Local\npm-cache`).
- However, Windows file locking (`EPERM: operation not permitted` on `@eslint/eslintrc/node_modules`, `@angular-devkit`, etc.) was observed when attempting an in-place directory wipe on Windows.
- Running tests requires executing Jest from the `BE_codex` folder:
  `cd "c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\BE_codex"; npx jest test/mock-api.e2e-spec.ts --runInBand`

---

## 2. Logic Chain

1. **Why Supertest is neither required nor recommended**:
   - Observation 1.1 shows `supertest` is absent from `package.json`.
   - Observation 1.3 & 1.4 show that existing tests in `BE_codex` uniformly start the NestJS app on `127.0.0.1` on port 0 and execute HTTP requests using `globalThis.fetch`.
   - Native `fetch` with `FormData` and `Blob` is fully supported in Node 22 (the required engine).
   - Attempting to install `supertest` would violate the read-only constraint and introduce unnecessary external dependencies into a network-isolated environment.
   - Conclusion: The M4 E2E integration test suite (`image-pipeline.integration.spec.ts`) should strictly adopt the existing `fetch` + `FormData` pattern.

2. **Schema Compliance & Validation Chain**:
   - Observation 1.5 shows that `BE_codex/docs/ScamShield_AI_OpenAPI_v1.2.yaml` is directly compilable by `ajv` (v8) with `ajv-formats` and `yaml`.
   - Every response from `POST /api/v1/analysis/images` must pass the compiled `AnalysisResponse` schema validator (`additionalProperties: false`, exactly 11 snake_case fields).
   - In addition, business contract invariants from `CONTRACT_DECISIONS.md` and `FE_codex/src/lib/api/contracts.ts` must be asserted:
     - `evidence[].image_index`: Must be an integer `0 <= image_index < submittedImageCount` for image analysis (never null).
     - `detected_urls[].is_verified_malicious`: Must strictly be `false`.
     - `risk_score`: Must be `null` when `risk_level === 'UNABLE_TO_ASSESS'`.
     - `risk_score`: Must be within `[0, 39]` for `SAFE`, `[40, 74]` for `SUSPICIOUS`, `[75, 100]` for `DANGER`.

3. **Multipart Request Construction for Multi-Image Datasets**:
   - Observation 1.4 shows how multiple images must be attached.
   - For a given case with $N$ images (from `data/images/`):
     ```typescript
     const form = new FormData();
     for (let i = 0; i < imagePaths.length; i++) {
       const bytes = fs.readFileSync(imagePaths[i]);
       form.append('images', new Blob([Uint8Array.from(bytes)], { type: 'image/png' }), `screen_${i}.png`);
     }
     if (contextText) {
       form.append('context', contextText);
     }
     ```
   - This directly exercises the Multer parser, magic byte validator, Sharp pixel decoder, and the downstream analysis pipeline.

4. **Integration with OCR & Reasoning Harness (Milestones M1–M3)**:
   - For E2E tests, when running against cases from `data/metadata.json`, the application will route images through `AnalysisService.analyze()`.
   - When OCR is executed, it parses the chat dialogue.
   - The reasoning module analyzes the conversation turns and produces the candidate output.
   - `EvidenceValidator` verifies evidence grounding and validates `image_index`.
   - `RiskService` computes the mathematical risk score.
   - `AnalysisResponseDto` is emitted and validated against OpenAPI v1.2.

---

## 3. Caveats

1. **Host OCR Binaries in Offline Environment**:
   - `paddleocr`, `paddlepaddle`, and `tesseract.exe` are not currently installed on the host system, and network access to PyPI/npm is blocked in the sandbox.
   - Milestone 1 (OCR) is implementing an adapter pattern with a `MetadataOcrProvider` fallback that seamlessly supplies ground-truth dialogue turns for `data/images/` sample cases.
   - The E2E test suite should be designed to test the full NestJS HTTP pipeline with this provider architecture, ensuring full testability in offline CI.
2. **Windows Sandbox File Locking**:
   - File locking by Windows Defender or OS processes can cause `EPERM` when running directory-mutating npm commands (like `npm ci`). Running tests via `npm test` or `npx jest` does not mutate `node_modules` and executes cleanly once dependencies are settled.

---

## 4. Conclusion

1. **Test Runner & Framework**:
   - Use Jest with `ts-jest` targeting Node 22, configured via `BE_codex/package.json`.
   - Execute tests using `npm run test:e2e` or `npm test` inside `BE_codex`.
2. **HTTP Client Choice**:
   - Do **NOT** use Supertest.
   - Use Node 22 native `globalThis.fetch` with `FormData` and `Blob`, connecting to `app.listen(0, '127.0.0.1')`.
3. **OpenAPI Schema Validation**:
   - Use `ajv` + `ajv-formats` + `yaml` directly compiling `BE_codex/docs/ScamShield_AI_OpenAPI_v1.2.yaml` for 100% schema validation of all 11 snake_case fields.
4. **Target File for M4 Test Suite**:
   - `BE_codex/test/image-pipeline.integration.spec.ts` (matching both `*.spec.ts` for `npm test` and `*.e2e-spec.ts` if named `image-pipeline.e2e-spec.ts`).
   - Recommending `image-pipeline.integration.e2e-spec.ts` so it is picked up by both `npm test` and `npm run test:e2e`.

---

## 5. Verification Method

### 5.1 Verification Commands
From the project working directory (`c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI`):
1. **Verify configuration and spec files**:
   ```powershell
   Get-Content "BE_codex/package.json" | ConvertFrom-Json | Select-Object -ExpandProperty scripts
   Get-ChildItem "BE_codex/test"
   ```
2. **Verify OpenAPI schema validity**:
   ```powershell
   node -e "const fs = require('fs'); const yaml = require('yaml'); const Ajv = require('ajv'); const addFormats = require('ajv-formats'); const spec = yaml.parse(fs.readFileSync('BE_codex/docs/ScamShield_AI_OpenAPI_v1.2.yaml', 'utf8')); const ajv = new Ajv({ strict: false }); addFormats(ajv); const v = ajv.compile(spec.components.schemas.AnalysisResponse); console.log('Schema valid:', typeof v === 'function');"
   ```
3. **Run existing E2E and integration tests**:
   ```powershell
   cd BE_codex
   npm run test:e2e
   ```

### 5.2 Invalidation Conditions
- Any introduction of `supertest` dependency that breaks existing `fetch`-based test suites.
- Any discrepancy between the 11 snake_case response fields and `ScamShield_AI_OpenAPI_v1.2.yaml`.
- Any non-integer or out-of-range `image_index` in image analysis evidence.
- Any modification of `package.json` that breaks offline npm execution.
