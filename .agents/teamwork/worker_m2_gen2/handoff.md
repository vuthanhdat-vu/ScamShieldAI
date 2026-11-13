# Handoff Report: Milestone 2 — Preprocessing & PII Sanitization Module

- **Agent ID**: Worker Gen 2 (`worker_m2_gen2`)
- **Conversation ID**: `1f6455a5-480f-451a-b096-4788a193b75d`
- **Parent Conversation ID**: `4f2bff1b-5b15-404e-bce6-b3a8463b81a0` (`sub_orch_m2`)
- **Target Working Directory**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI`
- **Target Module**: `BE_codex/src/preprocessing/`

---

## 1. Observation

### 1.1 Package Manifest Integrity Check (`BE_codex/package.json`)
- Prior to inspection, `git diff BE_codex/package.json` revealed extraneous modifications left by previous attempts:
  ```diff
  --- a/BE_codex/package.json
  +++ b/BE_codex/package.json
  @@ -27,7 +27,7 @@
       }
     },
     "dependencies": {
  -    "@nestjs/common": "^11.2.9",
  +    "@nestjs/common": "^11.2.10",
       "@nestjs/config": "^4.0.4",
       "@nestjs/core": "^11.2.9",
       "@nestjs/platform-express": "^11.2.9",
  @@ -35,6 +35,9 @@
       "ajv": "^8.20.0",
       "class-transformer": "^0.5.1",
       "class-validator": "^0.14.4",
  +    "google-libphonenumber": "^3.2.48",
  +    "libphonenumber-js": "^1.13.16",
  +    "lodash": "^4.18.1",
       "multer": "^2.5.0",
       "openai": "^7.54.0",
       "reflect-metadata": "^0.2.2",
  ```
- Executed fix: Removed `google-libphonenumber`, `libphonenumber-js`, and `lodash`. Reverted `@nestjs/common` to `^11.2.9`.
- Verification command:
  ```powershell
  git diff BE_codex/package.json
  ```
  Result: Exit code 0, 0 output lines (completely clean and identical to original repository state).

### 1.2 Preprocessing Module Source Code Review
The module contains 5 core source files in `BE_codex/src/preprocessing/`:
1. `preprocessing.interfaces.ts`:
   - Declares `OcrBoundingBox`, `OcrTurn`, `OcrResult`, `PreprocessedTurn`, `PreprocessedDialogue`, and `IPreprocessingService` in 100% agreement with `PROJECT.md` §Interface Contracts and `SCOPE.md`.
2. `text-cleaner.ts`:
   - `RE_INVISIBLE_CHARS`: Strips `\u200B-\u200F`, `\uFEFF`, `\u3164`, `\uFFA0`, `\u1160`, `\u00AD`, `\u202A-\u202E`, `\u2060-\u2069`, `\u180E`.
   - `transcodeMathMonospace`: Transcodes mathematical monospace glyphs (`U+1D670-U+1D6A3`, `U+1D7F6-U+1D7FF`) to ASCII alphanumeric chars.
   - `reconstructSpacedUrls`: Reconstructs spaced-out URLs (`http : //`, spaced domain dots).
   - `unStutterText`: Compresses repetitions $\ge 3$ and alternating-case pairs while vaulting `cccd` (`__VAULT_CAN_CUOC__`) to avoid destroying 3-letter acronyms into `cd`.
   - `repairTelexTypos`: Corrects `dd/DD -> đ/Đ`, `aa -> â`, `ee -> ê`, `oo -> ô`, while strictly preserving natural Vietnamese double vowels (`xoong`, `boong`, `coong`, `moong`).
   - `VIETNAMESE_SMS_SLANG_MAP`: Employs Unicode lookaround boundaries `(?<![\p{L}\p{N}]) ... (?![\p{L}\p{N}])/u` preventing false substring matches inside accented Vietnamese words (e.g. `nh` in `nhận`).
   - Currency protection: `(?<![\p{N}]\s*)(?<![\p{L}\p{N}])(ko|k|kh|khong|hổng)(?![\p{L}\p{N}])(?!\s*k\b)` preserves `500k` from naive replacement into `500 không`.
   - `RISK_PRESERVED_STOPWORDS`: Explicitly retains conditional and urgency keywords (`nếu`, `thì`, `ngay`, `phải`, `trước`, `trong`, `khẩn cấp`, etc.).
   - Placeholder preservation check: Throws `CRITICAL INTEGRITY VIOLATION` if initial and final counts of `[MONEY]`, `[NUMBER]`, `[TIME]` differ.
3. `pii-sanitizer.ts`:
   - Generates session-scoped 32-byte cryptographic random salt via native `node:crypto.randomBytes(32)`.
   - Maintains session lookup table `Map<HMAC-SHA256(salt, canonicalValue), token>` guaranteeing cross-turn token consistency (`<MASKED_ENTITY_n>`).
   - Strict priority ordering:
     1. `PASSWORD` (`<MASKED_PASSWORD_n>`)
     2. `PERSON_NAME_DOB` (`<MASKED_PERSON_NAME_n>`)
     3. `BANK_ACCOUNT` (`<MASKED_BANK_ACC_n>`) (8-16 digits with bank account keywords)
     4. `OTP` (`<MASKED_OTP_n>`) (4-8 digits with OTP keywords)
     5. `PHONE_NUMBER` (`<MASKED_PHONE_NUMBER_n>`) (Vietnamese telecom prefixes +84 / 0)
     6. `CCCD` (`<MASKED_CCCD_n>`) (12-digit BCA / general 12-digit / 14-digit)
   - Mandatory Invariant: `BANK_ACCOUNT` is evaluated before `CCCD`, preventing 12-digit bank accounts from being stripped as CCCD.
   - Preserves institutional emergency hotlines (`113`, `114`, `115`, `198`).
4. `preprocessing.service.ts`:
   - Implements `IPreprocessingService`.
   - Filters out non-dialogue `system` chips (timestamps, encryption headers).
   - Maps turns to `PreprocessedTurn` (`speaker: 'peer' | 'user'`).
   - Formats `formattedPromptText` with `[Peer]: ...` and `[User]: ...` headers for downstream LLM CoT reasoning.
5. `preprocessing.module.ts`:
   - NestJS module exporting `PreprocessingService` and `PiiSanitizer`.

### 1.3 Test Suites Review
- `test/pii-sanitizer.spec.ts`: 23 tests validating all 6 PII priority rules, cross-turn HMAC consistency, bank account vs. CCCD invariant, hotline preservation, and placeholder immutability.
- `test/preprocessing.service.spec.ts`: 19 tests validating zero-width stripping, monospace transcoding, spaced URL repair, un-stuttering, natural double vowels, slang substitution, currency `500k` preservation, risk stopwords retention, placeholder integrity, and `cleanAndSanitize` end-to-end execution.

---

## 2. Logic Chain

1. **Zero External Dependency Guarantee**:
   - `BE_codex/package.json` must remain unmodified because adding external packages violates the project constraints and causes package-lock / offline sync failures.
   - All text cleaning uses native JavaScript Unicode RegExp with `u` flag.
   - All PII tokenization and hashing uses built-in `node:crypto`.
   - Result: Zero external dependencies added, zero build breakages.

2. **Bank Account Before CCCD Precedence**:
   - *Observation*: Vietnamese commercial bank account numbers (Vietcombank, Techcombank, BIDV) frequently have exactly 12 digits. CCCD numbers also have 12 digits.
   - *Logic*: If CCCD regex `\b\d{12}\b` runs first, it matches 12-digit account numbers, erasing the bank account context.
   - *Proof*: By executing the bank account rule (which binds to prefix keywords `stk`, `tk`, `số tài khoản`) prior to CCCD, bank accounts are properly masked as `<MASKED_BANK_ACC_n>`. Remaining standalone 12-digit numbers are subsequently matched by CCCD as `<MASKED_CCCD_n>`. Both signals are preserved for the Reasoning Harness.

3. **System Turn Filtering**:
   - `OcrTurn` can have `speaker: 'peer' | 'user' | 'system'`.
   - `PreprocessedTurn` only allows `'peer' | 'user'`.
   - `system` bubbles (e.g. "Hôm nay 10:30", "Tin nhắn đã mã hóa") are UI metadata.
   - `cleanAndSanitize` filters out `speaker === 'system'`, preventing type errors and dialogue transcript pollution.

---

## 3. Caveats

1. **Standalone Personal Names**:
   - Priority 2 requires coupled Name + DOB (`Name_SN: DD/MM/YYYY`) or honorific prefixes (`khach hang`, `anh/chi`). Standalone names without context are not masked to prevent high false-positive rates on common Vietnamese vocabulary (such as "Hoa", "Bình", "Minh", "Thịnh").
2. **Offline Sandbox Network Constraints**:
   - Tests that attempt to open TCP socket connections (e.g. `test/foundation.spec.ts`) fail with `connect EACCES` due to sandbox network isolation when run without elevated privileges. Milestone 2 unit tests (`pii-sanitizer.spec.ts` and `preprocessing.service.spec.ts`) are 100% CPU/memory-bound and pass completely without network access.

---

## 4. Conclusion

- Milestone 2 implementation and test files are completely verified, functionally compliant, and satisfy 100% of the requirements in `docs/PREPROCESSING_DESIGN.md`, `PROJECT.md`, and `SCOPE.md`.
- `BE_codex/package.json` is clean and contains zero uncommitted modifications.
- NestJS build succeeds with exit code 0.
- All 42 unit tests in `test/pii-sanitizer.spec.ts` and `test/preprocessing.service.spec.ts` pass with 100% success (0 failures).

---

## 5. Verification Method

### 5.1 Verification Commands & Verbatim Outputs

#### Command 1: Package Manifest Cleanliness Check
```powershell
git diff BE_codex/package.json
```
**Output**:
```
(No output — 0 changes, exit code 0)
```

#### Command 2: NestJS Build Verification
```powershell
cd BE_codex; npm run build
```
**Output**:
```
> scamshield-backend@1.2.0 build
> nest build

(Exit code 0)
```

#### Command 3: TypeScript Typecheck Verification
```powershell
cd BE_codex; npx tsc -p tsconfig.build.json --noEmit
```
**Output**:
```
(No output — 0 type errors, exit code 0)
```

#### Command 4: Unit Test Suite Execution
```powershell
cd BE_codex; npx jest test/pii-sanitizer.spec.ts test/preprocessing.service.spec.ts --verbose
```
**Output**:
```
PASS test/pii-sanitizer.spec.ts
  PiiSanitizer
    Rule 1: PASSWORD
      √ masks password with colon delimiter and preserves trailing punctuation (20 ms)
      √ masks password with equals delimiter and pwd keyword (3 ms)
      √ masks password following password keyword case-insensitively (2 ms)
    Rule 2: PERSON_NAME_DOB
      √ masks coupled full name and date of birth (1 ms)
      √ masks coupled name and DOB with honorific prefix (1 ms)
    Rule 3: BANK_ACCOUNT
      √ masks 8 to 16 digit bank accounts preceded by STK keyword (1 ms)
      √ masks bank accounts with so tai khoan keyword and space (2 ms)
      √ masks bank accounts with tk keyword (3 ms)
    Rule 4: OTP
      √ masks 6-digit OTP code with formal phrase (5 ms)
      √ masks short OTP with colon (2 ms)
      √ masks mã xác thực phrase (2 ms)
    Rule 5: PHONE_NUMBER
      √ masks Vietnamese mobile number with domestic 0 prefix (3 ms)
      √ masks Vietnamese mobile number with +84 prefix (3 ms)
      √ does NOT mask institutional hotlines (1 ms)
    Rule 6: CCCD
      √ masks 12-digit BCA format citizen ID (2 ms)
      √ masks 14-digit BCA test card variant (2 ms)
    Strict Precedence Invariant: BANK_ACCOUNT before CCCD
      √ ensures 12-digit bank accounts are masked as BANK_ACC and not CCCD (3 ms)
    Session-Scoped Salted HMAC-SHA256 Consistency
      √ maps identical raw PII across multiple turns to the exact same token index (4 ms)
      √ formats phone numbers consistently even with spaces or hyphens (2 ms)
    100% Placeholder Preservation Invariant
      √ preserves [MONEY], [NUMBER], [TIME] completely intact (2 ms)
    sanitizeTurns
      √ sanitizes an array of dialogue turns with persistent state (3 ms)
    Edge cases
      √ handles empty string gracefully (1 ms)
      √ leaves text without PII untouched (1 ms)

PASS test/preprocessing.service.spec.ts
  PreprocessingService & TextCleaner
    Invisible & Zero-Width Characters Stripping
      √ strips zero-width spaces, joiners, Hangul fillers, and directional markers (47 ms)
    Mathematical Monospace Font Transcoding
      √ transcodes monospace letters and digits to ASCII (9 ms)
      √ transcodes monospace numbers U+1D7F6-U+1D7FF (1 ms)
    Spaced-out Broken URL Reconstruction
      √ reconstructs malformed schemes and spaced domain dots (27 ms)
      √ removes spaces after scheme like http:// domain (3 ms)
    Phonotactic Un-stuttering
      √ compresses alternating case pairs and repetitions >= 3 (4 ms)
      √ vaults CCCD acronym so 3 c letters are not crushed into cd (5 ms)
      √ compresses double accented vowels ââ, êê, ôô (1 ms)
    Telex Typo Repair
      √ converts dd/DD to đ/Đ, aa to â, ee to ê, oo to ô (6 ms)
      √ preserves natural Vietnamese double vowels xoong, boong, coong, moong (4 ms)
    Vietnamese SMS Slang Normalization & Unicode Boundaries
      √ replaces slang words using Unicode lookaround boundaries (60 ms)
      √ does NOT replace nh inside accented words like nhận (5 ms)
      √ protects currency suffix 500k from being replaced with 500 không (4 ms)
    Risk-Preserving Stopword Retention
      √ preserves all conditional and urgency stopwords (5 ms)
      √ contains authoritative list of preserved risk keywords (2 ms)
    100% Placeholder Preservation Invariant
      √ preserves [MONEY], [NUMBER], [TIME] completely intact through denoiseText (4 ms)
    PreprocessingService.cleanAndSanitize
      √ filters out system chips from dialogue turns (19 ms)
      √ formats prompt text with [Peer]: and [User]: headers (2 ms)
      √ handles empty or undefined OCR result gracefully (4 ms)

Test Suites: 2 passed, 2 total
Tests:       42 passed, 42 total
Snapshots:   0 total
Time:        5.768 s
Ran all test suites matching test/pii-sanitizer.spec.ts|test/preprocessing.service.spec.ts.
```
