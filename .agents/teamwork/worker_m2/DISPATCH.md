## 2026-11-13T16:20:04Z
You are a Worker for Milestone 2: Preprocessing & PII Sanitization Module.
Working directory: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI
State folder: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\worker_m2

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY READING:
- Read ORIGINAL_REQUEST.md at: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\ORIGINAL_REQUEST.md
- Read PROJECT.md at: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\PROJECT.md
- Read SCOPE.md at: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\sub_orch_m2\SCOPE.md
- Read Explorer handoffs:
  - c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\explorer_m2_1\handoff.md
  - c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\spec_miner_m2_2\handoff.md
  - c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\spec_miner_m2_3\handoff.md

WRITE OWNERSHIP:
You EXCLUSIVELY own:
- `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\BE_codex\src\preprocessing\*`
- `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\BE_codex\test\pii-sanitizer.spec.ts`
- `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\BE_codex\test\preprocessing.service.spec.ts`
DO NOT modify any other files in `BE_codex/src/` or elsewhere.

YOUR OBJECTIVE:
Implement the Preprocessing & PII Sanitization module under `BE_codex/src/preprocessing/` according to the synthesized specifications:
1. `src/preprocessing/preprocessing.interfaces.ts`:
   Define `OcrBoundingBox`, `OcrTurn`, `OcrResult`, `PreprocessedTurn`, `PreprocessedDialogue`, and `IPreprocessingService` matching `PROJECT.md § Interface Contracts`.
2. `src/preprocessing/text-cleaner.ts`:
   Implement text cleaning and adversarial de-obfuscation:
   - Unicode NFC & NFKC normalization.
   - Invisible & zero-width character stripping (`\u200B-\u200F`, `\uFEFF`, `\u3164`, `\uFFA0`, `\u1160`, `\u00AD`, `\u202A-\u202E`, `\u2060-\u2069`, `\u180E`).
   - Mathematical monospace font transcoding to ASCII (`U+1D670-U+1D6A3` and `U+1D7F6-U+1D7FF`).
   - Phonotactic un-stuttering: compress characters repeating >= 3 times, alternating case pairs (`NhHậẬnN` -> `Nhận`), and unnatural double vowels. Vault `cccd` before 3-letter compression. Preserve natural double vowels (`xoong`, `boong`, `coong`, `moong`) and digraphs (`ng`, `qu`).
   - Broken spaced-out URL reconstruction (repair scheme, post-scheme spaces, and spaces before domain dots/TLDs). Use an idempotent loop.
   - Telex typo repair (`dd`/`DD` -> `đ`/`Đ`, `aa` -> `â`, `ee` -> `ê`, `oo` -> `ô`).
   - Vietnamese SMS slang normalization: replace slang words using Unicode lookaround boundaries `(?<![\p{L}\p{N}]) ... (?![\p{L}\p{N}])/u` (never use `\b` because it fails on Vietnamese accented characters). Protect numbers like `500k` with negative lookbehind for digits `(?<![\p{N}]\s*)`.
   - Risk-preserving stopword retention: NEVER remove conditional or urgency stopwords ("nếu", "thì", "ngay", "phải", "trước", "trong").
   - Placeholder preservation: Ensure `[MONEY]`, `[NUMBER]`, `[TIME]` remain 100% intact.
3. `src/preprocessing/pii-sanitizer.ts`:
   Implement Vietnamese PII detection and masking with session-scoped 32-byte HMAC-SHA256 salt (`node:crypto`):
   - Strict Precedence Order:
     1. `PASSWORD` -> `<MASKED_PASSWORD_n>`
     2. `PERSON_NAME_DOB` -> `<MASKED_PERSON_NAME_n>`
     3. `BANK_ACCOUNT` (8-16 digits with prefixes like STK, TK, số tài khoản) -> `<MASKED_BANK_ACC_n>`
     4. `OTP` (4-8 digits near OTP keywords like mã otp, otp, mã xác thực) -> `<MASKED_OTP_n>`
     5. `PHONE_NUMBER` (10-11 digits starting with +84 or 0, excluding hotlines like 113, 198, 1900xxxx) -> `<MASKED_PHONE_NUMBER_n>`
     6. `CCCD` (12 digits BCA format, regex `\b\d{12}\b`, 8-digit and 14-digit) -> `<MASKED_CCCD_n>`
     (Ensure BANK_ACCOUNT is processed before CCCD so 12-digit bank accounts are never masked as CCCD).
   - Consistent indexed token mapping: identical raw values within the session map to the same token index.
   - Never re-mask `[MONEY]`, `[NUMBER]`, or `[TIME]`.
4. `src/preprocessing/preprocessing.service.ts`:
   Implement `PreprocessingService implements IPreprocessingService`:
   - `@Injectable()`
   - Method `cleanAndSanitize(ocrResult: OcrResult): PreprocessedDialogue`:
     - Filter out `system` chips (`t.speaker === 'peer' || t.speaker === 'user'`).
     - Clean text using `text-cleaner.ts`.
     - Sanitize PII using `pii-sanitizer.ts`.
     - Format `formattedPromptText` with lines like `[Peer]: ...` and `[User]: ...`.
     - Return `PreprocessedDialogue` with `turns`, `formattedPromptText`, and `sanitizedPiiCount`.
5. `src/preprocessing/preprocessing.module.ts`:
   NestJS module exporting `PreprocessingService` and `PiiSanitizer`.
6. Unit tests:
   - `test/pii-sanitizer.spec.ts`
   - `test/preprocessing.service.spec.ts`
   Cover all 6 PII rules, precedence invariant (Bank Account before CCCD), placeholder retention, slang replacement, Unicode NFC, math font transcoding, broken URL repair, un-stuttering, system turn filtering, and formatted prompt text.


## 2026-11-13T16:33:43Z
**Context**: Milestone 2 Implementation Verification
**Content**: I see that you have created `BE_codex/src/preprocessing/*` and `BE_codex/test/*`. Please provide a status update on running the build (`npm run build`) and unit tests (`npm test`). Are there any blockers?
**Action**: Please reply with your status and write your completion handoff report to `handoff.md`.


## 2026-11-13T16:43:29Z
**Context**: Build & Test Verification for Milestone 2
**Content**: Please be aware that the sandbox environment is offline and cannot reach registry.npmjs.org. If `npm install` is running, it may hang or timeout.
All preprocessing code has zero third-party dependencies (pure Unicode/JS and built-in `node:crypto`).
You can verify the TypeScript compilation with `npx tsc --noEmit` (or using local typescript binary), and run unit tests either via `npx jest` if available, or via Node.js built-in test runner (`node --test`), or standalone test runner scripts.
**Action**: Please do not wait for npm install. Proceed with build & test verification using available local tools and write your handoff report.
