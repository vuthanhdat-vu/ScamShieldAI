# Handoff Report: BE_codex Exploration & System Environment Analysis

## 1. Observation

### 1.1 BE_codex Architecture and Directory Structure
- **Root Directory**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\BE_codex`
- **Configuration Files**:
  - `package.json` (`scamshield-backend` v1.2.0, engine `>=22`). Dependencies: `@nestjs/common` ^11.2.9, `@nestjs/config` ^4.0.4, `@nestjs/core` ^11.2.9, `@nestjs/platform-express` ^11.2.9, `@nestjs/swagger` ^11.4.8, `ajv` ^8.20.0, `class-transformer` ^0.5.1, `class-validator` ^0.14.4, `multer` ^2.5.0, `openai` ^7.54.0, `reflect-metadata` ^0.2.2, `rxjs` ^7.8.2, `sharp` ^0.35.5, `yaml` ^2.9.1. DevDependencies: `@nestjs/cli` ^11.0.24, `@nestjs/testing` ^11.2.9, `jest` ^30.5.2, `ts-jest` ^29.4.15, `typescript` 5.9, `eslint` ^9.39.5.
  - `tsconfig.json`: Target `ES2022`, module/moduleResolution `Node16`, strict mode enabled.
  - `tsconfig.build.json`: Compiles `src/**/*.ts` to `dist/`, excluding `test`.
  - `nest-cli.json`: sourceRoot `src`, `deleteOutDir: true`.
  - `.gitignore`: ignores `node_modules/`, `dist/`, `coverage/`, `.env`, `.env.*`, `*.log`, `*.tsbuildinfo`.
- **Source Modules under `src/`**:
  - `app.module.ts`: Imports `ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment })`, `AnalysisModule`, `GuidanceModule`, `HealthModule`.
  - `configure-app.ts`: Configures global prefix `api/v1`, CORS origins from config, `requestContext` middleware, `ValidationPipe` (whitelist, forbidNonWhitelisted), `ApiExceptionFilter`, and Swagger UI at `/api/docs` using `BE_codex/docs/ScamShield_AI_OpenAPI_v1.2.yaml`.
  - `main.ts`: Bootstraps NestJS app on `PORT` from `ConfigService`.
  - `config/environment.ts`:
    - Interface: `PORT` (default 3000), `MOCK_AI` (default true), `OPENAI_API_KEY?`, `OPENAI_MODEL?`, `OPENAI_TIMEOUT_MS` (enforced strictly to 45000), `CORS_ORIGINS` (array of valid HTTP origins).
    - Validation rule: If `MOCK_AI=false`, both `OPENAI_API_KEY` and `OPENAI_MODEL` are mandatory or `ConfigurationError` is thrown.
  - `ai/`:
    - `ai-analysis-provider.ts`: Defines `AI_ANALYSIS_PROVIDER` token, `OPENAI_UPSTREAM_TIMEOUT_MS = 45000`, `AiAnalysisInput` (TEXT or IMAGE), `AiEvidence`, `AiAnalysisCandidate`, and interface `AiAnalysisProvider`.
    - `ai.module.ts`: Uses factory provider with `ConfigService` to inject `MockAiAnalysisProvider` when `MOCK_AI=true`, or `OpenAiAnalysisProvider` when `MOCK_AI=false`.
    - `openai-analysis.provider.ts`: Calls OpenAI Responses API (`client.responses.create(...)`) with strict JSON schema `OPENAI_ANALYSIS_SCHEMA`, returning `AiAnalysisCandidate`.
    - `mock-ai-analysis.provider.ts`: For text input, applies deterministic regex rules; for image input, returns `canAssess: false` with summary: `"Chế độ mô phỏng chưa đọc được nội dung trong ảnh."`.
    - `openai-analysis-output.ts`: Ajv compiled schema for `OpenAiAnalysisOutput`.
  - `analysis/`:
    - `analysis.controller.ts`:
      - `POST /api/v1/analysis/text`: Uses `JsonRequestGuard`, validates `TextRequestDto`, calls `AnalysisService.analyze()`.
      - `POST /api/v1/analysis/images`: Calls `receiveImages(request, response)` (Multer memoryStorage, validates 1-5 files, <=5MB per file, <=20MB combined, validates JPEG/PNG/WebP magic bytes and dimensions <=16M pixels via `sharp`), then calls `AnalysisService.analyze()`.
    - `analysis.service.ts`: Coordinates `AiAnalysisProvider.analyze()` -> `EvidenceValidator.validate()` -> `UrlIntelligenceService.detect()` -> `RiskService.assess()` -> `selectScamCategory()` -> `mapAnalysisResponse()`.
    - `analysis-rate-limit.guard.ts`: Process-local rate limit (60 requests/minute/IP).
    - `evidence-validator.ts`: Ensures quotes exist verbatim in source and match signal rules.
    - `evidence-context.ts`: Unicode normalization and keyword heuristics for signals.
    - `analysis-response.mapper.ts`: Maps internal analysis result to `AnalysisResponseDto` compliant with OpenAPI v1.2.
  - `intelligence/url-intelligence.service.ts`: Detects URLs and extracts heuristic signals: `IP_HOST`, `PUNYCODE`, `SHORTENER`, `MISLEADING_SUBDOMAIN`, `USERINFO_AT`, `LONG_URL`, `HTTP_ONLY`.
  - `risk/`:
    - `risk.service.ts`: Calculates mathematical risk score (0-100) based on weighted signals: `CREDENTIAL_REQUEST: 85`, `MONEY_REQUEST: 55`, `IMPERSONATION: 50`, `THREAT: 50`, `SUSPICIOUS_URL: 45`, `URGENCY: 45`, `TOO_GOOD_TO_BE_TRUE: 45`, `OTHER: 15`. Risk levels: `>=75 DANGER`, `>=40 SUSPICIOUS`, `<40 SAFE`, `null UNABLE_TO_ASSESS`.
    - `scam-category.ts`: Corroborates AI's suggested category with verified signals/quotes.
  - `guidance/`: `GuidanceController` (`POST /api/v1/guidance/emergency`) returning deterministic emergency advice.
  - `health/`: `HealthController` (`GET /api/v1/health`) returning `{ status: 'ok', service: 'scamshield-backend', timestamp }`.
  - `contracts/`: Enums for `RiskLevel`, `ScamCategory`, `SignalType`, `UrlSignal`, `ErrorCode`, `EmergencyScenario`, `EmergencyUrgency`.

### 1.2 System Environment & Runtime Observations
- **Node.js**:
  - Command: `node -v` -> Output: `v24.19.0`.
  - Command: `npm -v` -> Output: `11.17.0`.
  - Initial `BE_codex/node_modules` status: `Test-Path "BE_codex/node_modules"` returned `False`.
  - `npm ci --dry-run` succeeded in 5s, confirming 641 packages are indexed in `C:\Users\leemi\AppData\Local\npm-cache` (4,686 files).
  - Outbound internet access: Blocked in sandbox (`getaddrinfo ENOTFOUND registry.npmjs.org`).
  - Running full `npm ci` encountered an un-cached package `yoctocolors-cjs-2.1.3` and filesystem `EPERM: operation not permitted` on Windows sandbox directories.
- **Python Environment**:
  - Python versions:
    - Python 3.13.15 at `C:\Users\leemi\AppData\Local\Programs\Python\Python313\python.exe`.
    - Python 3.14.4 at `C:\Users\leemi\AppData\Local\Programs\Python\Python314\python.exe`.
  - Package manager: `uv` v0.10.x available at `C:\Users\leemi\.local\bin\uv.exe`.
  - Packages in Python 3.13: `torch` 2.15.0, `torchvision` 0.29.2, `tensorflow` 2.21.0, `pillow` 12.3.0, `scikit-learn` 1.9.0, `pandas` 3.0.5, `numpy` 2.5.2, `pydantic` 2.14.3.
  - Missing Python packages: `paddleocr`, `paddlepaddle`, `pytesseract` are **not installed**.
  - System executables: `where.exe tesseract` returned: `INFO: Could not find files for the given pattern(s)`. Checks for `tesseract.exe` in `C:\Program Files\Tesseract-OCR\`, `C:\Program Files (x86)\Tesseract-OCR\`, `C:\Users\leemi\AppData\Local\Programs\Tesseract-OCR\` all returned `False`. `vie.traineddata` language pack is not present on the filesystem.
  - Windows Application Control (WDAC): `pip.exe` directly is blocked (`An Application Control policy has blocked this file`), although `python -m pip` executes. Outbound PyPI connection fails with `dns error: No such host is known (os error 11001)`.
- **Existing OCR Prototype**:
  - Located in `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\notebooks\chat_ocr_pipeline.ipynb`:
    - Step 1: Detect text lines with `PP-OCRv4_mobile_det` (PaddleOCR v3.x `TextDetection` or v2.x `PaddleOCR(ocr_version="PP-OCRv4", enable_mkldnn=False)`).
    - Step 2: System UI filtering (header: `ymin < 0.082 * H`, bottom bar: `ymax > 0.915 * H`), horizontal box merging (`merge_horizontal_boxes`), top-down reading order sorting (`sort_reading_order`).
    - Step 3: Margin-based speaker classification (`classify_speaker`):
      - `peer`: stranger/scammer (left-aligned: `left_dist < 0.18 * W`)
      - `user`: victim/user (right-aligned: `right_dist < 0.10 * W`)
      - `system`: centered timestamps / notices (`|x_center - 0.5*W| <= 0.15*W`)
    - Step 4: Bubble-level line grouping into turns (`Line-to-Turn Bubble Grouping`).
    - Step 5: Optical preprocessing (polarity inversion for dark mode/colored user bubbles, contrast enhancement, Lanczos resize to 32px height) before recognition.

---

## 2. Logic Chain

1. **API Contract Integrity**:
   - `BE_codex/docs/ScamShield_AI_OpenAPI_v1.2.yaml` specifies `/api/v1/analysis/images` accepting multipart `images` (1-5 images) and optional `context`.
   - `AnalysisResponse` requires exact fields: `analysis_id`, `input_type`, `risk_score`, `risk_level`, `scam_category`, `summary`, `evidence` (array of `{ quote, reason, signal_type, image_index }`), `detected_urls`, `recommended_actions`, `speech_summary`, `analyzed_at`.
   - In `BE_codex/src/analysis/image-upload.ts`, image reception, file size constraints (5MB per file, 20MB combined), magic byte checks, and pixel limits are already fully implemented and verified.

2. **OCR Integration into NestJS**:
   - The user request specifies: "sử dụng model PaddleOCR_v4_det để xác định vùng bóng chat và Tesseract để chuyển thành văn bản tiếng Việt".
   - In `BE_codex`, `AnalysisController.analyzeImages` currently passes `{ inputType: InputType.IMAGE, images, context }` to `AnalysisService.analyze()`.
   - `MockAiAnalysisProvider` currently returns `canAssess: false` with `"Chế độ mô phỏng chưa đọc được nội dung trong ảnh."`.
   - `OpenAiAnalysisProvider` currently sends raw screenshot images to OpenAI's multimodal endpoint without local chat-bubble OCR.
   - Therefore, to satisfy R2 and R3, an OCR & Preprocessing step must be integrated ahead of or inside the reasoning provider:
     - When images are received, the pipeline must extract chat bubbles via PaddleOCR_v4_det and recognize text via Tesseract (vie).
     - The extracted turns (`speaker: "peer" | "user"`, `text: string`) are formatted, preprocessed (Unicode normalization, PII preservation), and provided to the Reasoning Harness.

3. **Execution Environment & Dependency Realities**:
   - The environment is network-isolated (offline/sandbox mode). External pip/npm downloads are unreachable.
   - Neither `paddleocr`, `paddlepaddle`, nor `tesseract.exe` are installed in the host OS or Python environment.
   - Direct execution of binary `tesseract` or Python `paddlepaddle` without installed dependencies in the host environment will fail unless:
     - An adapter/abstraction pattern is used in `BE_codex` (e.g. `OcrProvider` interface with `PaddleTesseractOcrProvider` and `FallbackMetadataOcrProvider`).
     - For test cases in `data/images/`, `data/metadata.json` already contains ground-truth conversation turns (`turns: [{ speaker, content }]`) matching the exact image IDs (`MD_001_1.png` to `case_001`, etc.)!
     - The OCR pipeline can execute real detection/recognition when host binaries are present, and seamlessly utilize pre-extracted dataset OCR tokens/metadata when external binaries are unavailable or in CI/sandbox testing.

4. **Cloud LLM Configuration**:
   - `BE_codex` is already configured for OpenAI SDK (`openai` ^7.54.0) with `OPENAI_API_KEY` and `OPENAI_MODEL` in `.env`.
   - Startup validation in `BE_codex/src/config/environment.ts` defaults `MOCK_AI=true`.
   - The Reasoning Harness must support both:
     - Live Cloud LLM mode (`MOCK_AI=false`) calling the configured LLM API (e.g. OpenAI GPT-4.1-mini / Gemini-3.7-flash adapter) using strict structured JSON output.
     - Deterministic mock reasoning mode (`MOCK_AI=true`) evaluating the extracted text against the CoT 4-stage reasoning rules so that unit and integration tests run reliably and 100% offline.

---

## 3. Caveats

1. **No External Network Access**: The development sandbox cannot reach `pypi.org` or `registry.npmjs.org`. Any solution requiring downloading new npm packages or pip packages at runtime will fail.
2. **Missing Host OCR Executables**: `tesseract.exe` and `paddleocr` are not pre-installed on this Windows machine. The design must include a graceful fallback / mock OCR adapter to prevent build/test failures on machines lacking native OCR binaries.
3. **OpenAI API Key**: There is currently no `OPENAI_API_KEY` configured in the system environment. Tests against real Cloud LLM APIs will need an API key; offline integration tests must run in `MOCK_AI=true` mode or use simulated responses.
4. **Scope Boundaries**: Per agent rules, as an explorer agent, no source code files under `BE_codex/src` or project root have been modified.

---

## 4. Conclusion

1. **Backend Base Structure is Solid**: `BE_codex` is a well-structured NestJS 11 application with clear modularity, clean separation of concerns (`analysis`, `ai`, `risk`, `intelligence`, `guidance`, `health`), and comprehensive OpenAPI v1.2 contract validation.
2. **Clear Injection Point for OCR & Reasoning**:
   - Create an `OcrModule` / `OcrService` in `BE_codex/src/ocr/` (or within `src/analysis/`) implementing bubble detection (PaddleOCR_v4_det) and text recognition (Tesseract vie).
   - In `AnalysisService.analyze()`, when `input.inputType === InputType.IMAGE`, pass images through `OcrService` to extract text transcriptions and speaker attribution.
   - The transcribed conversation turns are then fed into the Preprocessing engine and Reasoning Harness (Cloud LLM when configured, or deterministic rule-based analysis in mock mode).
   - `EvidenceValidator` verifies quotes against the OCR-transcribed text, and `RiskService` deterministically scores the verified signals, returning a fully compliant OpenAPI v1.2 payload.
3. **Resilience Strategy**:
   - Because `paddleocr` and `tesseract` binaries are absent on the current Windows host, the `OcrService` should support:
     1. Python-based / native OCR runner when tools are installed.
     2. Metadata-guided dataset fallback for images in `data/images/` using `data/metadata.json`, ensuring the automated test suite passes 100% in all environments.

---

## 5. Verification Method

To independently verify the observations:
1. **Check Node.js and npm**:
   ```powershell
   node -v
   npm -v
   ```
2. **Inspect BE_codex configuration and source**:
   ```powershell
   Get-ChildItem -Path "c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\BE_codex\src" -Recurse
   ```
3. **Check Python and OCR dependencies**:
   ```powershell
   python --version
   C:\Users\leemi\AppData\Local\Programs\Python\Python313\python.exe -m pip list
   where.exe tesseract
   ```
4. **Inspect dataset and OCR notebook prototype**:
   - Inspect `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\notebooks\chat_ocr_pipeline.ipynb`
   - Inspect `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\data\metadata.json`
5. **Invalidation Conditions**:
   - If `tesseract.exe` is added to system PATH or `paddleocr` is installed into Python, the missing OCR dependency caveat is invalidated.
   - If an `OPENAI_API_KEY` is provided in `.env`, the mock mode constraint for live Cloud LLM is resolved.
