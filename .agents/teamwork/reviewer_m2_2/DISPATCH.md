## 2026-11-13T17:00:58Z
You are Reviewer 2 for Milestone 2: Preprocessing & PII Sanitization Module.
Working directory: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI
State folder: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\reviewer_m2_2

MANDATORY RULES:
- NEVER run commands with `BypassSandbox: true`. Always use `BypassSandbox: false`.

MANDATORY READING:
- Read ORIGINAL_REQUEST.md at: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\ORIGINAL_REQUEST.md
- Read PROJECT.md at: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\PROJECT.md
- Read SCOPE.md at: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\sub_orch_m2\SCOPE.md
- Read PREPROCESSING_DESIGN.md at: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\docs\PREPROCESSING_DESIGN.md
- Read Worker handoff: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\worker_m2_gen2\handoff.md

YOUR TASK:
Examine the implementation in `BE_codex/src/preprocessing/` against the comprehensive specifications in `docs/PREPROCESSING_DESIGN.md`:
1. Denoising & Text Cleaning (§3):
   - Unicode NFC normalization, invisible/zero-width character removal, math typewriter font decoding, un-stuttering (with `cccd` vaulting), broken URL repair, telex typo repair, Vietnamese SMS slang dictionary with Unicode lookarounds `(?<![\p{L}\p{N}]) ... (?![\p{L}\p{N}])/u` and currency protection (`500k`), risk-preserving stopwords retention, and 100% placeholder preservation (`[MONEY]`, `[NUMBER]`, `[TIME]`).
2. PII Sanitization Engine (§4):
   - Strict priority order: PASSWORD -> PERSON_NAME_DOB -> BANK_ACCOUNT -> OTP -> PHONE_NUMBER -> CCCD. Verify that BANK_ACCOUNT is evaluated before CCCD so 12-digit bank accounts are never misclassified as CCCD.
   - Session-scoped 32-byte CSPRNG HMAC-SHA256 salt with consistent token indexing.
   - Institutional hotline preservation (`113`, `198`, etc.).
3. Execute tests: In `BE_codex`, run `npx jest test/pii-sanitizer.spec.ts test/preprocessing.service.spec.ts --verbose`.
4. Provide your explicit verdict in your report: `APPROVE` or `REQUEST_CHANGES`.
5. Write your full report to `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\reviewer_m2_2\handoff.md` and send a message to the parent orchestrator with your verdict.
