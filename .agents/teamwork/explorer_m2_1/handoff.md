# Handoff Report: Milestone 2 — Codebase Exploration, Architecture & Integration Specification for Preprocessing & PII Sanitization

- **Agent ID**: `explorer_m2_1` (`617674dc-7142-48bd-b2c5-081679760afd`)
- **Target Module**: `BE_codex/src/preprocessing/` (Milestone 2: Preprocessing & PII Sanitization)
- **Working Directory**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI`
- **State Folder**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\explorer_m2_1`
- **Parent Conversation ID**: `4f2bff1b-5b15-404e-bce6-b3a8463b81a0` (`sub_orch_m2`)

---

## 1. Observation

### 1.1. Codebase Structure & Configuration Inspection (`BE_codex`)
- **Package Manifest (`BE_codex/package.json`)**:
  - Name & Version: `scamshield-backend` v1.2.0.
  - Node engine: `>=22`. Host runtime verified: Node.js `v24.19.0`, npm `11.17.0`.
  - Dependencies:
    - NestJS v11 core: `@nestjs/common` (^11.2.9), `@nestjs/core` (^11.2.9), `@nestjs/config` (^4.0.4), `@nestjs/platform-express` (^11.2.9), `@nestjs/swagger` (^11.4.8).
    - Utility & Validation: `ajv` (^8.20.0), `class-transformer` (^0.5.1), `class-validator` (^0.14.4), `multer` (^2.5.0), `reflect-metadata` (^0.2.2), `rxjs` (^7.8.2), `sharp` (^0.35.5), `yaml` (^2.9.1), `openai` (^7.54.0).
  - DevDependencies:
    - `@nestjs/cli` (^11.0.24), `@nestjs/testing` (^11.2.9), `jest` (^30.5.2), `ts-jest` (^29.4.15), `typescript` (5.9 / 5.9.3 in lockfile), `eslint` (^9.39.5).
  - Scripts:
    - `"build": "nest build"`
    - `"test": "jest --runInBand"`
    - `"test:e2e": "jest --runInBand --testMatch \"<rootDir>/test/**/*.e2e-spec.ts\""`
  - Jest Configuration (embedded in `package.json` lines 17–28):
    ```json
    "jest": {
      "testEnvironment": "node",
      "setupFiles": ["<rootDir>/test/mock-environment.ts"],
      "testMatch": ["<rootDir>/test/**/*.spec.ts"],
      "transform": { "^.+\\.ts$": "ts-jest" }
    }
    ```
- **TypeScript Configuration (`BE_codex/tsconfig.json`)**:
  - Target: `ES2022`, module: `Node16`, moduleResolution: `Node16`.
  - Decorators: `experimentalDecorators: true`, `emitDecoratorMetadata: true`.
  - Type checking: `strict: true`, `isolatedModules: true`.
  - Includes: `["src/**/*.ts", "test/**/*.ts"]`.
  - Relative imports in source files are written **without** file extensions (e.g. `import { AnalysisModule } from './analysis/analysis.module'`).

### 1.2. Existing NestJS Application Architecture (`BE_codex/src/`)
- **Current Modules in `src/`**:
  - `src/app.module.ts`: Root module importing `ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment })`, `AnalysisModule`, `GuidanceModule`, and `HealthModule`.
  - `src/analysis/`:
    - `analysis.module.ts`: Imports `AiModule`, `RiskModule`, `IntelligenceModule`. Declares `AnalysisController`. Provides `AnalysisService` and `EvidenceValidator`.
    - `analysis.controller.ts`: Exposes `POST /api/v1/analysis/text` and `POST /api/v1/analysis/images`.
    - `analysis.service.ts`: Coordinates `provider.analyze()` -> `evidence.validate()` -> `intelligence.detect()` -> `risk.assess()` -> `selectScamCategory()` -> `mapAnalysisResponse()`.
  - `src/ai/`: Handles `MockAiAnalysisProvider` and `OpenAiAnalysisProvider` selected dynamically via `ai.module.ts` based on `MOCK_AI` env variable.
  - `src/risk/`: Implements mathematical risk scoring via `risk.service.ts` (0–100) and scam categorization via `scam-category.ts`.
  - `src/intelligence/`: Implements heuristic URL signal detection via `url-intelligence.service.ts`.
  - `src/guidance/`: Implements deterministic emergency response advice via `guidance.service.ts`.
  - `src/health/`: Exposes `GET /api/v1/health`.
- **Status of Preprocessing and OCR Modules**:
  - `BE_codex/src/preprocessing/` **DOES NOT EXIST YET** (Exclusive write ownership assigned to Milestone 2 Worker).
  - `BE_codex/src/ocr/` **DOES NOT EXIST YET** (Owned by parallel Milestone 1 Worker).

### 1.3. Cryptographic Module Verification
- Command executed:
  ```powershell
  node -e "const crypto = require('node:crypto'); console.log('Crypto available:', typeof crypto.createHmac === 'function'); const salt = crypto.randomBytes(32).toString('hex'); const hmac = crypto.createHmac('sha256', salt).update('test').digest('hex'); console.log('HMAC-SHA256 test:', hmac);"
  ```
- Output verbatim:
  ```
  Crypto available: true
  HMAC-SHA256 test: 6b5e99bc04c1e0675ad5f72c2af6e09f57e56c915e03b21ccaf50abc5c43766d
  ```
- Node.js native `node:crypto` is 100% available in runtime, supporting CSPRNG `crypto.randomBytes(32)` and `crypto.createHmac('sha256', sessionSalt)` with **zero third-party dependencies**.

### 1.4. Synthesis of Peer Miner Specifications
- **From `spec_miner_m2_2/handoff.md` (Denoising & Text Normalization)**:
  - 6-stage pipeline: Zero-width removal -> Unicode NFC/NFKC -> Math Monospace Transcoding -> Character Stuttering Compression -> Spaced URL Reconstruction -> Telex & Slang Normalization.
  - Critical Edge Cases Discovered & Solved:
    1. Standard JS regex `\b` fails on Vietnamese accented words (e.g. `\bnh\b` matches inside `"nhận"` -> `"ngân hàngận"`). Must use Unicode lookarounds `(?<![\p{L}\p{N}]) ... (?![\p{L}\p{N}])/u`.
    2. Acronym `cccd` contains 3 `c`s. A naive `(.)\1{2,}` compression destroys `cccd` into `cd`. `cccd` must be vaulted (`__VAULT_CAN_CUOC__`) prior to stutter compression.
    3. `500k` / currency amounts: replacing `k` -> `không` blindly creates `"500 không"`. A negative lookbehind for digits `(?<![\p{N}]\s*)` is mandatory.
    4. Natural double vowels (`xoong`, `boong`, `coong`, `moong`) must be vaulted prior to Telex `oo` -> `ô` substitution.
    5. Placeholders `[MONEY]`, `[NUMBER]`, `[TIME]` must remain 100% intact with a strict count assertion check at the pipeline exit.
- **From `spec_miner_m2_3/handoff.md` (PII Sanitization Engine & Interfaces)**:
  - Mandatory strict precedence order:
    1. `PASSWORD` (`<MASKED_PASSWORD_n>`)
    2. `PERSON_NAME_DOB` (`<MASKED_PERSON_NAME_n>`)
    3. `BANK_ACCOUNT` (`<MASKED_BANK_ACC_n>`)
    4. `OTP` (`<MASKED_OTP_n>`)
    5. `PHONE_NUMBER` (`<MASKED_PHONE_NUMBER_n>`)
    6. `CCCD` (`<MASKED_CCCD_n>`)
  - Proof of Invariant: Bank Account (8-16 digits with prefix) MUST be scanned before CCCD (12 digits) because bank accounts in Vietnam (e.g. Vietcombank, Techcombank, BIDV) frequently have exactly 12 digits. If CCCD is scanned first, `\b\d{12}\b` greedily destroys bank accounts, stripping the `MONEY_REQUEST` signal needed for downstream reasoning.
  - Salted HMAC-SHA256 session table ensures consistent indexed tokens (`<MASKED_BANK_ACC_1>` matches repeated occurrences across turns).
  - Dialogue turn formatting: filters out `system` chips (`speaker: 'system'`) and converts dialogue turns into `formattedPromptText` for LLM consumption:
    `[Peer]: <turn 1>`
    `[User]: <turn 2>`

---

## 2. Logic Chain

1. **Decoupled Architecture & Zero External Dependencies**:
   - *Observation*: `BE_codex/node_modules` installation in sandbox encountered offline constraints and Windows file-locking quirks.
   - *Logic*: The entire Preprocessing & PII Sanitization module relies purely on JavaScript string manipulations, Unicode regexes with `u` flag, and Node.js built-in `node:crypto`.
   - *Conclusion*: `PreprocessingService` and `PiiSanitizer` can be written and tested completely without introducing any new npm package or third-party binary.

2. **Interface Alignment Between OCR (M1), Preprocessing (M2), and Reasoning (M3)**:
   - *Observation*: `PROJECT.md` lines 76–88 and 95–113 specify:
     - `OcrResult.turns` contains `OcrTurn[]` where `speaker: 'peer' | 'user' | 'system'`.
     - `PreprocessedDialogue.turns` contains `PreprocessedTurn[]` where `speaker: 'peer' | 'user'`.
   - *Logic*: System chips (`speaker === 'system'`) represent UI timestamps or encryption headers, not statements by conversation participants.
   - *Conclusion*: `PreprocessingService.cleanAndSanitize(ocrResult)` must filter out `system` turns, clean the text, sanitize PII, maintain session-scoped HMAC references, and emit both `PreprocessedTurn[]` and `formattedPromptText`.

3. **NestJS Dependency Injection & Module Wiring**:
   - *Observation*: `AnalysisModule` is the consumer that coordinates image/text input to produce `AnalysisResponseDto`.
   - *Logic*:
     - `PreprocessingModule` should be an independent NestJS module under `BE_codex/src/preprocessing/preprocessing.module.ts`.
     - It should export `PreprocessingService` and `PiiSanitizer`.
     - When `AnalysisModule` or `OcrModule` is integrated in M3, `PreprocessingModule` is simply imported into `AnalysisModule` (or `AppModule`), and `PreprocessingService` is injected via standard constructor injection.

4. **Test Suite Location & Execution**:
   - *Observation*: `package.json` specifies `"testMatch": ["<rootDir>/test/**/*.spec.ts"]`.
   - *Logic*:
     - To align with the existing project pattern (`test/risk-engine.spec.ts`, `test/url-intelligence.spec.ts`, `test/mock-analysis.spec.ts`), the unit tests should be placed in `BE_codex/test/preprocessing.service.spec.ts` and `BE_codex/test/pii-sanitizer.spec.ts`.
     - In addition, to support isolated zero-dependency unit testing in offline environments, the test suite can also be executed via a standalone runner script or `node --test`.

---

## 3. Caveats

1. **Offline Environment (No Outbound Internet)**:
   - Sandbox cannot reach `registry.npmjs.org` or `pypi.org`.
   - Do NOT add any external npm dependencies in `package.json`. Everything must use standard Node.js and NestJS packages already defined.
2. **System Speaker Filtering**:
   - As established in `PROJECT.md`, `OcrTurn` can have `speaker: 'system'`, while `PreprocessedTurn` only supports `'peer' | 'user'`. The Worker must explicitly filter or ignore `system` turns during turn mapping.
3. **Standalone Person Names**:
   - Vietnamese personal names without honorific prefix or DOB (`_SN: DD/MM/YYYY`) are deliberately not masked via simple word regex to prevent massive false positives on common Vietnamese vocabulary ("Hoa", "Minh", "Bình", "Thịnh").
4. **Hotline Whitelist**:
   - Emergency and government hotlines (`113`, `114`, `115`, `198`, `1900xxxx`, `1800xxxx`) must remain unmasked to preserve institutional authority evaluation.

---

## 4. Conclusion & Technical Recommendations for Worker

### 4.1. Recommended File Structure for `BE_codex/src/preprocessing/`

```
BE_codex/
├── src/
│   └── preprocessing/
│       ├── preprocessing.interfaces.ts  # OCR & Preprocessing turn/dialogue contracts
│       ├── pii-sanitizer.ts             # Salted HMAC-SHA256 & 6-priority PII engine
│       ├── text-cleaner.ts              # Unicode NFC/NFKC, invisible stripping, telex, slang
│       ├── preprocessing.service.ts     # Main service implementing IPreprocessingService
│       └── preprocessing.module.ts      # NestJS module exporting PreprocessingService
└── test/
    ├── pii-sanitizer.spec.ts            # Unit tests for PII masking, precedence & placeholders
    └── preprocessing.service.spec.ts    # Unit tests for cleaning, prompt format & IPreprocessingService
```

### 4.2. Exact Contract & Export Specifications

#### A. Interfaces (`src/preprocessing/preprocessing.interfaces.ts`)
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

#### B. PII Sanitizer (`src/preprocessing/pii-sanitizer.ts`)
- Class: `PiiSanitizer` (with optional `@Injectable()`).
- Methods:
  - `constructor(sessionSalt?: Buffer)`: Default `sessionSalt = crypto.randomBytes(32)`.
  - `sanitize(text: string): { sanitizedText: string; piiCount: number }`
  - `sanitizeTurns(turns: Array<{ speaker: 'peer' | 'user'; text: string; imageIndex: number }>): { turns: PreprocessedTurn[]; totalPiiCount: number }`
  - Internal strict priority execution:
    1. `PASSWORD`: `(?i)(?:mat\s*khau|mật\s*khẩu|password|pwd|pass|mk)\s*[:=]\s*(\S+)` -> `<MASKED_PASSWORD_n>`
    2. `PERSON_NAME_DOB`: `(?i)(?:(?:anh/chi|ong/ba|khach\s*hang|anh|chi|ong|ba)\s+)?([A-ZÀ-Ỹa-zà-ỹ\s]{3,25})_SN:\s*(\d{1,2}/\d{1,2}/\d{4})` -> `<MASKED_PERSON_NAME_n>`
    3. `BANK_ACCOUNT`: `(?i)(?:\b(?:stk|so\s*tk|số\s*tk|tk|tai\s*khoan|tài\s*khoản|so\s*tai\s*khoan|số\s*tài\s*khoản)\b)\s*[:.\-]?\s*(\d{8,16})\b` -> `<MASKED_BANK_ACC_n>`
    4. `OTP`: `(?i)(?:\b(?:ma\s*otp|mã\s*otp|otp|ma\s*xac\s*thuc|mã\s*xác\s*thực|ma\s*xac\s*minh|mã\s*xác\s*minh)\b)(?:\s+(?:cua|của)\s+(?:ban|bạn|quy\s*khach|quý\s*khách))?\s*(?:la|là|:|=|-|\s)+\s*([0-9]{4,8})\b` -> `<MASKED_OTP_n>`
    5. `PHONE_NUMBER`: `(?:\+?84|0)(?:3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-46-9])\d{7}\b` -> `<MASKED_PHONE_NUMBER_n>`
    6. `CCCD`: `(?<!\d)(?:0\d{2}[0-3]\d{2}\d{6})(?!\d)` / `(?<!\d)\d{12}(?!\d)` / `(?<!\d)001190\d{8}(?!\d)` -> `<MASKED_CCCD_n>`
- Placeholder Preservation Invariant:
  - Assert that count of `[MONEY]`, `[NUMBER]`, `[TIME]` matches before and after.

#### C. Text Cleaner (`src/preprocessing/text-cleaner.ts`)
- Functions / Class:
  - `stripInvisibleChars(text: string): string`
  - `transcodeMathMonospace(text: string): string`
  - `reconstructSpacedUrls(text: string): string`
  - `unStutterText(text: string): string` (protect `cccd` -> `__VAULT_CAN_CUOC__`)
  - `repairTelexAndSlang(text: string): string` (protect `xoong` -> `__VAULT_XOONG__`, use `(?<![\p{L}\p{N}])` Unicode lookarounds, protect `500k` via `(?<![\p{N}]\s*)`)
  - `cleanText(text: string): string`: Orchestrates 1 to 5 and normalizes Unicode NFC.

#### D. Preprocessing Service (`src/preprocessing/preprocessing.service.ts`)
- Decorator: `@Injectable()`
- Implements: `IPreprocessingService`
- Injects: `PiiSanitizer` (or instantiates per session/call with fresh salt for ephemeral privacy).
- Method:
  ```typescript
  @Injectable()
  export class PreprocessingService implements IPreprocessingService {
    cleanAndSanitize(ocrResult: OcrResult): PreprocessedDialogue {
      const sanitizer = new PiiSanitizer(); // Fresh session salt per inspection
      const filteredTurns = ocrResult.turns.filter(
        (t): t is OcrTurn & { speaker: 'peer' | 'user' } => t.speaker === 'peer' || t.speaker === 'user'
      );

      let totalPii = 0;
      const preprocessedTurns: PreprocessedTurn[] = filteredTurns.map((turn) => {
        const cleaned = cleanText(turn.text);
        const { sanitizedText, piiCount } = sanitizer.sanitize(cleaned);
        totalPii += piiCount;
        return {
          speaker: turn.speaker,
          text: sanitizedText,
          imageIndex: turn.imageIndex,
        };
      });

      const formattedPromptText = preprocessedTurns
        .map((t) => `[${t.speaker === 'peer' ? 'Peer' : 'User'}]: ${t.text}`)
        .join('\n');

      return {
        turns: preprocessedTurns,
        formattedPromptText,
        sanitizedPiiCount: totalPii,
      };
    }
  }
  ```

#### E. NestJS Preprocessing Module (`src/preprocessing/preprocessing.module.ts`)
```typescript
import { Module } from '@nestjs/common';
import { PreprocessingService } from './preprocessing.service';
import { PiiSanitizer } from './pii-sanitizer';

@Module({
  providers: [PreprocessingService, PiiSanitizer],
  exports: [PreprocessingService, PiiSanitizer],
})
export class PreprocessingModule {}
```

### 4.3. Recommended Test Suite & Validation Strategy

1. **Unit Test Scenarios (`test/pii-sanitizer.spec.ts`)**:
   - `test_priority_ordering_bank_account_before_cccd`: Verifies `STK: 123456789012` is masked as `<MASKED_BANK_ACC_1>`, not `<MASKED_CCCD_1>`.
   - `test_session_scoped_hmac_consistency`: Verifies that repeating the same phone/bank account in turn 1 and turn 3 produces identical `<MASKED_..._1>` tokens.
   - `test_placeholders_100_percent_intact`: Verifies `[MONEY]`, `[NUMBER]`, `[TIME]` remain unchanged.
   - `test_vietnamese_otp_and_password_phrases`: Tests `Ma OTP cua ban la: 482917`, `mật khẩu: Admin@123`.
2. **Unit Test Scenarios (`test/preprocessing.service.spec.ts`)**:
   - `test_system_turns_filtered_out`: Verifies system chips are excluded from `PreprocessedDialogue.turns`.
   - `test_zero_width_and_math_font_cleaning`: Tests `\u200B` stripping and `U+1D670` monospace transcoding.
   - `test_broken_url_reconstruction`: Tests `http : // domain .com .vn`.
   - `test_telex_and_slang_with_unicode_boundaries`: Tests `nh` inside `nhận` is not corrupted, and `500k` is not converted to `500 không`.
   - `test_formatted_prompt_text_generation`: Verifies output matches `[Peer]: ...\n[User]: ...`.

---

## 5. Verification Method

1. **Verify Node.js Crypto Functionality**:
   ```powershell
   node -e "const crypto = require('node:crypto'); const salt = crypto.randomBytes(32); console.log('Salt len:', salt.length); const hmac = crypto.createHmac('sha256', salt).update('STK12345678').digest('hex'); console.log('HMAC:', hmac);"
   ```
2. **Verify Node.js Unicode Normalization**:
   ```powershell
   node -e "console.log('NFC test:', 'o\u0323\u0302'.normalize('NFC') === '\u1ED9');"
   ```
3. **Verify Empirical Spec Suite**:
   ```powershell
   node "c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\spec_miner_m2_2\test_probe.js"
   ```
   - Must output: `All tests passed? true`.
4. **Invalidation Conditions**:
   - If `PreprocessedTurn` interface in `PROJECT.md` is updated to include `'system'` speaker, the system-turn filtering logic must be updated.
   - If new PII categories are added to `PREPROCESSING_DESIGN.md`, the precedence table must be extended accordingly.
