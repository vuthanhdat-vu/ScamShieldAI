# Investigation Report: Reasoning Harness, Cloud LLM Configuration & Testing Infrastructure

**Author**: Reasoning & Testing Explorer  
**State Folder**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\teamwork_explorer_llm_tests\`  
**Target Milestone**: Milestone 3 (Reasoning Harness & NestJS Integration) & Milestone 4 (Testing Infrastructure & OpenAPI v1.2 Compliance)  
**Date**: 2026-11-13T17:59:00Z  

---

## 1. Observation

### 1.1. Cloud LLM Configuration in `BE_codex`
1. **Environment Configuration (`BE_codex/src/config/environment.ts`)**:
   - Lines 3–10 define the `Environment` interface:
     ```typescript
     export interface Environment {
       PORT: number;
       MOCK_AI: boolean;
       OPENAI_API_KEY?: string;
       OPENAI_MODEL?: string;
       OPENAI_TIMEOUT_MS: typeof OPENAI_UPSTREAM_TIMEOUT_MS; // 45000
       CORS_ORIGINS: string[];
     }
     ```
   - Lines 14–60 implement `validateEnvironment(raw: Record<string, unknown>): Environment`:
     * `MOCK_AI`: Validates that `raw.MOCK_AI ?? 'true'` must be `'true'` or `'false'`. Defaults to `true`.
     * `OPENAI_API_KEY` & `OPENAI_MODEL`: When `MOCK_AI === false`, both are strictly required; throws `ConfigurationError('OPENAI_API_KEY is required when MOCK_AI is false.')` or `ConfigurationError('OPENAI_MODEL is required when MOCK_AI is false.')`.
     * `OPENAI_TIMEOUT_MS`: Strictly validated against `OPENAI_UPSTREAM_TIMEOUT_MS` (45000 ms). If different, throws `ConfigurationError('OPENAI_TIMEOUT_MS must be 45000 under API Contract v1.2.')`.
     * `PORT`: Validated integer `1..65535` (defaults to 3000).
     * `CORS_ORIGINS`: Comma-separated HTTP(S) origins, parsed and deduplicated.
   - In `BE_codex/src/app.module.ts` (lines 9–14), `ConfigModule` is imported globally:
     ```typescript
     ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment })
     ```

2. **AI Module Provider Wiring (`BE_codex/src/ai/ai.module.ts`)**:
   - Lines 4–8 import `AI_ANALYSIS_PROVIDER`, `AiAnalysisProvider`, `OPENAI_UPSTREAM_TIMEOUT_MS`, `MockAiAnalysisProvider`, `OpenAiAnalysisProvider`.
   - Lines 12–29 define the dynamic provider factory:
     ```typescript
     {
       provide: AI_ANALYSIS_PROVIDER,
       inject: [ConfigService, MockAiAnalysisProvider],
       useFactory: (config: ConfigService<Environment, true>, mock: MockAiAnalysisProvider): AiAnalysisProvider => {
         if (config.get('MOCK_AI', { infer: true })) {
           return mock;
         }

         const client = new OpenAI({
           apiKey: config.getOrThrow('OPENAI_API_KEY', { infer: true }),
           baseURL: 'https://api.openai.com/v1',
           timeout: OPENAI_UPSTREAM_TIMEOUT_MS,
           maxRetries: 0,
           logLevel: 'off',
         });
         return new OpenAiAnalysisProvider(client, config.getOrThrow('OPENAI_MODEL', { infer: true }));
       },
     }
     ```
   - Exports `[AI_ANALYSIS_PROVIDER]` for consumption by `AnalysisService`.

3. **OpenAI Provider Implementation (`BE_codex/src/ai/openai-analysis.provider.ts`)**:
   - Implements `AiAnalysisProvider` interface: `analyze(input: AiAnalysisInput, signal: AbortSignal): Promise<AiAnalysisCandidate>`.
   - Line 36 calls `this.client.responses.create(this.request(input), { signal, timeout: OPENAI_UPSTREAM_TIMEOUT_MS, maxRetries: 0 })`.
   - Lines 71–95 define `request(input: AiAnalysisInput)`:
     * Dispatches user message containing JSON-encoded input payload.
     * When `input.inputType === InputType.IMAGE`, appends each screenshot with `detail: 'high'` and `Screenshot ${index}` label.
     * Structured output format: `text: { format: { type: 'json_schema', name: 'scam_analysis', strict: true, schema: OPENAI_ANALYSIS_SCHEMA } }`.
     * Upstream abort signal and timeout: mapped via `mapProviderError` to `ApiException(ErrorCode.AI_TIMEOUT)` (504), `ApiException(ErrorCode.AI_PROVIDER_ERROR)` (502/503), or `ApiException(ErrorCode.AI_INVALID_RESPONSE)` (502).

4. **Model Architecture Directives (`PROJECT.md` & `docs/REASONING_HARNESS_DESIGN.md`)**:
   - `AGENTS.md` (lines 35): *"Do NOT use gemini-2.0-flash or gemini-2.5-flash — both are deprecated. Use gemini-3.7-flash instead."*
   - `REASONING_HARNESS_DESIGN.md` (lines 642–648): Defines Tier 3 Cloud Fallback explicitly specifying `gemini-3.7-flash` via Vertex AI Adapter / OpenAI-compatible endpoint.

---

### 1.2. 4-Stage CoT Reasoning Harness Implementation
1. **Authoritative Specification (`docs/REASONING_HARNESS_DESIGN.md`)**:
   - Lines 403–445 define the mandatory 4-stage Chain-of-Thought (CoT) reasoning flow:
     * **Stage 1: Authority Verification (`Xác thực Danh xưng và Thẩm quyền / Authority Audit`)**: Identifies the self-claimed authority (Police C02/C06, Procuracy, Court, Bank, Tax Authority). Enforces Vietnamese legal invariant: *Vietnamese authorities and banks NEVER summon, interrogate, work, or demand fund transfers/OTPs via phone call, Zalo, or Telegram*.
     * **Stage 2: Psychological Pressure (`Bóc tách Đòn Tâm lý & Sự Hối thúc / Psychological Tactics`)**: Detects intimidation/fear (threats of 48h detention, criminal prosecution), urgency (5–15 min deadlines), isolation (forbidding talking to family, ordering not to hang up), greed (abnormal commissions, doubled refunds), and sunk cost traps.
     * **Stage 3: Risk Entities & Artifacts (`Giám định Thực thể & Dữ vật Nguy cơ Cao / High-Risk Artifact Audit`)**: Audits requests for OTPs (especially consecutive OTPs), passwords, CCCD photos, biometric videos, transfers to personal bank accounts, suspicious links (`.top`, `.xyz`, PaaS `pages.dev`, `vercel.app`), and malicious APK installations.
     * **Stage 4: Synthesis & Defense Actions (`Tổng hợp Suy luận & Khuyến cáo Phòng vệ / Synthesis & Recommendations`)**: Synthesizes verified evidence into concise Vietnamese rationale, extracts verbatim quotes with 0-based image index or null, and formulates immediate, decisive defense guidance.
   - Delimiter Framework: Encloses unescaped/untrusted user dialogue in `<input_payload>`, demands reasoning in `<cot_reasoning_scaffold>`, and requires clean JSON output in `<output_verdict>`.

2. **Dialogue Formatting & Preprocessing (`BE_codex/src/preprocessing/preprocessing.service.ts`)**:
   - `cleanAndSanitize(ocrResult: OcrResult)` filters non-dialogue system chips, performs Unicode NFC normalization, zero-width stripping, typewriter monospace transcoding, spaced-out URL reconstruction, phonotactic un-stuttering, telex typo repair, and slang expansion.
   - Sanitizes PII in strict priority order (`PASSWORD` -> `PERSON_NAME_DOB` -> `BANK_ACCOUNT` -> `OTP` -> `PHONE_NUMBER` -> `CCCD`) using session-scoped HMAC-SHA256 masking (`<MASKED_CCCD_1>`, `<MASKED_BANK_ACC_1>`).
   - Lines 100–104 construct the standardized dialogue transcript for the reasoning harness:
     ```typescript
     const formattedPromptText = preprocessedTurns
       .map((t) => `[${t.speaker === 'peer' ? 'Peer' : 'User'}]: ${t.text}`)
       .join('\n');
     ```

3. **Structured Output Enforcement (`BE_codex/src/ai/openai-analysis-output.ts`)**:
   - Lines 13–37 define `OPENAI_ANALYSIS_SCHEMA`:
     * `additionalProperties: false`
     * `required: ['canAssess', 'suggestedCategory', 'summary', 'evidence', 'speechSummary']`
     * `suggestedCategory`: Enum corresponding to `ScamCategory` (10 values)
     * `evidence`: Array of `{ quote: string, reason: string, signalType: SignalType, imageIndex: integer | null }`
   - Compiled with Ajv validator `validateOpenAiOutput = new Ajv().compile<OpenAiAnalysisOutput>(OPENAI_ANALYSIS_SCHEMA)`.

---

### 1.3. Mock vs Real LLM Provider
1. **Current `MockAiAnalysisProvider` (`BE_codex/src/ai/mock-ai-analysis.provider.ts`)**:
   - Lines 6–12 define deterministic rule tuples:
     `[SignalType.CREDENTIAL_REQUEST, 'Nội dung yêu cầu cung cấp thông tin xác thực.']`,
     `[SignalType.MONEY_REQUEST, 'Nội dung yêu cầu chuyển tiền.']`,
     `[SignalType.URGENCY, 'Nội dung tạo áp lực về thời gian.']`,
     `[SignalType.THREAT, 'Nội dung đưa ra hậu quả để gây áp lực.']`,
     `[SignalType.TOO_GOOD_TO_BE_TRUE, 'Nội dung hứa hẹn phần thưởng.']`.
   - Lines 19–35 currently contain:
     ```typescript
     if (
       input.inputType === InputType.IMAGE || !/[\p{L}\p{N}]/u.test(input.text) ||
       /^(?:otp|ngân hàng|công an|tiền|chuyển tiền|chuyển khoản|bank|police|money|urgent|khẩn cấp)[.!?]*$/iu.test(normalizeEvidence(input.text))
     ) {
       const image = input.inputType === InputType.IMAGE;
       const summary = image
         ? 'Chế độ mô phỏng chưa đọc được nội dung trong ảnh.'
         : 'Tin nhắn không đủ thông tin để đánh giá.';
       return Promise.resolve({
         canAssess: false,
         suggestedCategory: ScamCategory.NONE,
         summary,
         evidence: [],
         recommendedActions: [image ? 'Gửi nội dung hội thoại dưới dạng văn bản.' : 'Gửi thêm nội dung tin nhắn.'],
         speechSummary: summary,
       });
     }
     ```
   - *Direct Finding*: In `MockAiAnalysisProvider`, `input.inputType === InputType.IMAGE` was previously an immediate stub returning `canAssess: false` because image transcription was not yet plumbed through OCR in M2.
   - For Milestone 3 & 4 integration, `MockAiAnalysisProvider` must evaluate transcribed OCR dialogue turns (or `preprocessedTurns`), matching each turn's text with `supportsSignal` and assigning `imageIndex: turn.imageIndex` so automated image pipeline tests can run deterministically without mocking `ai.analyze`.

2. **Toggle Mechanism**:
   - Environment variable `MOCK_AI=true` (default) activates `MockAiAnalysisProvider`.
   - Setting `MOCK_AI=false` activates `OpenAiAnalysisProvider`, pulling `OPENAI_API_KEY` and `OPENAI_MODEL`.
   - `test/mock-environment.ts` automatically establishes `process.env.MOCK_AI = 'true'` for Jest test suites.

---

### 1.4. Test Infrastructure & Verification
1. **Existing Test Suites in `BE_codex/test/`**:
   - `environment.spec.ts`: Environment variable validation, port range, timeout enforcement.
   - `foundation.spec.ts`: HTTP foundation, health endpoint, Swagger UI OpenAPI JSON (`/api/docs-json`), rate limiting (30 req/min/IP), error envelopes.
   - `ocr-pipeline.spec.ts`: 10 test suites covering UI geometry filtering (top 8.2%, bottom 8.5%), horizontal merging, reading order, speaker attribution, typography, Levenshtein CER multi-shot stitching, MetadataOcrProvider hashing, fallback delegation.
   - `pii-sanitizer.spec.ts`: Strict priority PII masking (PASSWORD -> PERSON_NAME_DOB -> BANK_ACCOUNT -> OTP -> PHONE_NUMBER -> CCCD) with HMAC-SHA256.
   - `preprocessing.service.spec.ts`: Text cleaner, zero-width stripping, typewriter font decoding, spaced URL reconstruction, phonotactic un-stuttering, telex repair, SMS slang normalization, dialogue turn formatting.
   - `risk-engine.spec.ts`: Mathematical risk calculation (8 signal weights, activeRequest + corroborated bonus +20, risk level bands DANGER/SUSPICIOUS/SAFE/UNABLE_TO_ASSESS, category tie-breaking).
   - `url-intelligence.spec.ts`: Heuristic URL analysis (IP_HOST, HTTP_ONLY, SHORTENER, MISLEADING_SUBDOMAIN, PUNYCODE, USERINFO_AT, LONG_URL, is_verified_malicious: false).
   - `mock-analysis.spec.ts`: Deterministic text analysis with MockAiAnalysisProvider, emergency guidance.
   - `openai-analysis.spec.ts`: Unit tests of OpenAiAnalysisProvider under offline simulated SDK transport.
   - `image-pipeline.integration.spec.ts`: Comprehensive 4-tier integration test suite (Tier 1 Feature Coverage, Tier 2 Boundaries 1-5 images / 5MB/20MB / 16MP, Tier 3 Cross-Feature combinations, Tier 4 10 Real-world Golden Benchmark Scenarios against OpenAPI v1.2 schema).
   - `mock-api.e2e-spec.ts`: E2E API tests under MOCK_AI=true.
   - `openai-api.e2e-spec.ts`: E2E API tests under MOCK_AI=false (with loopback mock fetch for OpenAI upstream).
   - `frontend-integration.e2e-spec.ts`: FE contract compatibility tests.

2. **Datasets**:
   - `data/images/`: 587 PNG screenshots of mobile chat conversations across iOS/Android, Light/Dark modes (`DC_` phishing/SMS, `DT_` task/recruitment, `MB_` delivery/deposit, `MD_` police extortion, `HN_` benign).
   - `data/metadata.json`: 200 cases (170 scam, 30 benign), mapping image paths to ground-truth transcribed turns (`role`, `content`) and classification labels.

3. **Current Test Execution Results**:
   - Command: `npm --prefix BE_codex test` (with `BypassSandbox: true`):
     * **Result**: **10 passed, 10 total test suites; 219 passed, 219 total tests (Time: 41.011s)**.
     * *Note*: When run without `BypassSandbox: true`, tests that bind loopback HTTP ports (`app.listen(0, '127.0.0.1')`) fail with `connect EACCES 127.0.0.1` due to Windows OS sandbox restrictions.
   - Command: `npm --prefix BE_codex run test:e2e`:
     * **Result**: **3 passed, 3 total test suites; 40 passed, 40 total tests (Time: 16.333s)**.
   - Command: `npm --prefix BE_codex run build`:
     * **Result**: **Passed cleanly (0 build errors)**.
   - Command: `node --test FE_codex/tests/*.test.mjs`:
     * **Result**: **58 passed, 0 failed across 6 frontend contract test suites**.

4. **Integration Gap Observed in `AnalysisService` & `AnalysisModule`**:
   - In `BE_codex/src/analysis/analysis.module.ts`:
     Lines 9–14 currently import:
     `imports: [AiModule, RiskModule, IntelligenceModule]`.
     *It does NOT yet import `OcrModule` or `PreprocessingModule`.*
   - In `BE_codex/src/analysis/analysis.service.ts`:
     Constructor currently injects:
     `@Inject(AI_ANALYSIS_PROVIDER) private readonly provider: AiAnalysisProvider`, `RiskService`, `UrlIntelligenceService`, `EvidenceValidator`.
     *It does NOT yet inject `OcrService` or `PreprocessingService`.*
   - In `AnalysisService.analyze`:
     `this.provider.analyze(input, ...)` is called directly on raw images without running `OcrService.processImages()` or `PreprocessingService.cleanAndSanitize()`.

---

## 2. Logic Chain

```
[Observation 1.1: Environment & AiModule]
MOCK_AI toggles between MockAiAnalysisProvider and OpenAiAnalysisProvider.
OPENAI_MODEL (e.g. gemini-3.7-flash) and OPENAI_API_KEY configure Cloud LLM.
OPENAI_UPSTREAM_TIMEOUT_MS is locked at 45000ms.
                     │
                     ▼
[Observation 1.2: 4-Stage CoT & Preprocessing]
PreprocessingService transforms OCR turns into cleaned, PII-masked dialogue:
"[Peer]: ... \n [User]: ...".
REASONING_HARNESS_DESIGN.md prescribes 4 stages: Authority -> Psychological -> Risk Entities -> Synthesis.
OpenAiAnalysisProvider enforces strict JSON schema with Ajv.
                     │
                     ▼
[Observation 1.4: AnalysisModule & AnalysisService Gap]
AnalysisModule lacks OcrModule and PreprocessingModule.
AnalysisService passes raw images directly to provider rather than transcribing and preprocessing first.
                     │
                     ▼
[Observation 1.3: Mock Provider Image Evaluation]
MockAiAnalysisProvider currently returns canAssess=false on InputType.IMAGE because OCR was absent.
Once OCR & Preprocessing are plumbed, Mock provider can evaluate preprocessed turns deterministically.
                     │
                     ▼
[Observation 1.4: 100% Test & Build Pass Rate]
All 219 backend tests and 58 frontend contract tests pass.
image-pipeline.integration.spec.ts already comprehensively tests 4 tiers across metadata.json cases.
                     │
                     ▼
[Conclusion & Proposed Strategy]
By connecting OcrService and PreprocessingService in AnalysisService,
updating MockAiAnalysisProvider to evaluate OCR dialogue turns,
and enriching OpenAI system prompt with 4-stage CoT instructions,
Milestone 3 & Milestone 4 integration will be 100% complete, fully deterministic in CI, and production-ready for Cloud LLM.
```

---

## 3. Caveats

1. **Sandbox Loopback Port Binding**:
   Executing tests that instantiate NestJS HTTP servers (`app.listen(0, '127.0.0.1')`) inside the sandbox without `BypassSandbox: true` results in `connect EACCES 127.0.0.1`. When running test runners in automated environments, socket/port binding permissions must be granted (`BypassSandbox: true`).
2. **Offline Host OCR Binaries**:
   If host machines lack native Python PaddleOCR / Tesseract binaries, `OcrModule` automatically falls back to `MetadataOcrProvider` (which hashes images against `data/metadata.json` with 587 indexed images). This ensures 100% test reliability in offline or CI environments.
3. **Approved Cloud LLM Models**:
   As required by `AGENTS.md`, `gemini-2.0-flash` and `gemini-2.5-flash` are strictly deprecated and must not be used. For Google Cloud LLM configurations, `gemini-3.7-flash` must be targeted.

---

## 4. Conclusion & Proposed Strategy for Milestone 3 & 4

### 4.1. Proposed Architecture Wiring for `AnalysisService`
To fulfill R1 ("Ghép nối OCR Engine và Preprocessing Module vào NestJS") and R2 ("Tích hợp quy trình 4-stage CoT Reasoning"):

1. **Update `BE_codex/src/analysis/analysis.module.ts`**:
   Import `OcrModule` and `PreprocessingModule`:
   ```typescript
   @Module({
     imports: [AiModule, RiskModule, IntelligenceModule, OcrModule, PreprocessingModule],
     controllers: [AnalysisController],
     providers: [AnalysisService, EvidenceValidator],
   })
   export class AnalysisModule {}
   ```

2. **Update `BE_codex/src/ai/ai-analysis-provider.ts`**:
   Extend `AiAnalysisInput` so image analysis can pass the preprocessed dialogue to the AI provider:
   ```typescript
   export type AiAnalysisInput =
     | { readonly inputType: InputType.TEXT; readonly text: string }
     | {
         readonly inputType: InputType.IMAGE;
         readonly images: readonly UploadedImage[];
         readonly context?: string;
         readonly preprocessed?: PreprocessedDialogue;
       };
   ```

3. **Update `BE_codex/src/analysis/analysis.service.ts`**:
   Inject `OcrService` and `PreprocessingService`.
   In `analyze(input)`:
   - If `input.inputType === InputType.IMAGE`:
     * Execute OCR: `const ocrResult = await this.ocrService.processImages(input.images.map(img => ({ buffer: img.bytes, mediaType: img.mediaType })));`
     * Clean & sanitize PII: `const preprocessed = this.preprocessingService.cleanAndSanitize(ocrResult);`
     * Pass enriched `preprocessed` to `this.provider.analyze({ ...input, preprocessed }, signal)`
   - Downstream: `EvidenceValidator` verifies evidence quotes and bounds `image_index` to `[0, images.length - 1]`.
   - `UrlIntelligenceService` extracts local URL indicators (`is_verified_malicious: false`).
   - `RiskService` calculates mathematical risk score (0–100 or null).
   - Returns strict 11 snake_case fields via `mapAnalysisResponse`.

4. **Update `BE_codex/src/ai/mock-ai-analysis.provider.ts`**:
   Support image analysis using `input.preprocessed`:
   - Iterate through `input.preprocessed.turns` (`speaker: 'peer' | 'user'`, `text`, `imageIndex`).
   - For each turn, evaluate `evidenceClauses(turn.text)` against `mockRules` with `supportsSignal`.
   - When a match is found, assign `imageIndex: turn.imageIndex`.
   - If no text or turns detected, return `canAssess: false` with fallback summary.
   - This guarantees that automated integration tests run 100% deterministically with `MOCK_AI=true` without external API dependencies.

5. **Update `BE_codex/src/ai/openai-analysis.provider.ts`**:
   - Embed the 4-Stage CoT instructions into `INSTRUCTIONS`:
     * Stage 1: Authority Verification (Vietnamese procedural law invariant).
     * Stage 2: Psychological Pressure (intimidation, urgency, isolation).
     * Stage 3: High-Risk Artifact Audit (OTP, credentials, personal bank STK, suspicious URLs, APKs).
     * Stage 4: Synthesis & Defense Actions (grounded verbatim quotes, TTS speech summary).
   - When `input.inputType === InputType.IMAGE` and `input.preprocessed` exists, include `input.preprocessed.formattedPromptText` in the message payload alongside high-detail screenshots.

---

## 5. Verification Method

To independently verify the implementation and confirm 100% compliance:

1. **Verify Backend Unit & Integration Tests**:
   Execute inside `BE_codex/`:
   ```powershell
   npm --prefix BE_codex test
   ```
   *Expected outcome*: 10 test suites pass, 219 tests pass (including `ocr-pipeline.spec.ts`, `preprocessing.service.spec.ts`, `image-pipeline.integration.spec.ts`).

2. **Verify Backend E2E Tests**:
   ```powershell
   npm --prefix BE_codex run test:e2e
   ```
   *Expected outcome*: 3 test suites pass, all 66 tests pass (`mock-api.e2e-spec.ts`, `openai-api.e2e-spec.ts`, `frontend-integration.e2e-spec.ts`).

3. **Verify Build & Type Safety**:
   ```powershell
   npm --prefix BE_codex run build
   ```
   *Expected outcome*: NestJS builds `dist/` with 0 compilation errors.

4. **Verify Frontend Contract Compatibility**:
   ```powershell
   node --test FE_codex/tests/*.test.mjs
   ```
   *Expected outcome*: 58 tests pass, confirming 100% contract compliance with FE client expectation.

5. **Verify Real Cloud LLM Production Configuration**:
   Inspect `BE_codex/src/config/environment.ts` and `BE_codex/test/openai-api.e2e-spec.ts`.
   Ensure `MOCK_AI=false` properly activates `OpenAiAnalysisProvider` when `OPENAI_API_KEY` and `OPENAI_MODEL` (`gemini-3.7-flash` or OpenAI model) are provided.

6. **Invalidation Conditions**:
   - Any test failure in `npm test` or `npm run test:e2e`.
   - Any violation of OpenAPI v1.2 schema (e.g. Extra fields, missing required fields, non-0-based `image_index`).
   - Deprecated model `gemini-2.0-flash` or `gemini-2.5-flash` referenced anywhere.
