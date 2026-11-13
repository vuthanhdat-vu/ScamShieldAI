## 2026-11-13T16:53:16Z
You are a replacement Worker (Gen 2) for Milestone 2: Preprocessing & PII Sanitization Module.
Working directory: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI
State folder: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\worker_m2_gen2

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY RULES:
- NEVER run commands with `BypassSandbox: true` (it triggers interactive permission requests that hang background subagents). Always use `BypassSandbox: false`.
- Do NOT add external dependencies to `BE_codex/package.json`. If `BE_codex/package.json` has uncommitted modifications, restore it (`git checkout -- BE_codex/package.json`).

MANDATORY READING:
- Read ORIGINAL_REQUEST.md at: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\ORIGINAL_REQUEST.md
- Read PROJECT.md at: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\PROJECT.md
- Read SCOPE.md at: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\sub_orch_m2\SCOPE.md
- Read Explorer handoffs:
  - c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\explorer_m2_1\handoff.md
  - c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\spec_miner_m2_2\handoff.md
  - c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\spec_miner_m2_3\handoff.md

CURRENT STATE & YOUR TASK:
The implementation files have already been drafted by the previous worker under:
- `BE_codex/src/preprocessing/preprocessing.interfaces.ts`
- `BE_codex/src/preprocessing/text-cleaner.ts`
- `BE_codex/src/preprocessing/pii-sanitizer.ts`
- `BE_codex/src/preprocessing/preprocessing.service.ts`
- `BE_codex/src/preprocessing/preprocessing.module.ts`
- `BE_codex/test/pii-sanitizer.spec.ts`
- `BE_codex/test/preprocessing.service.spec.ts`

Your job:
1. Verify and inspect all 5 module files and 2 test spec files. Ensure they strictly satisfy:
   - Text cleaning: Unicode NFC normalization, zero-width stripping, math monospace font transcoding, un-stuttering (protecting `cccd`), broken URL reconstruction, telex typo repair, Vietnamese SMS slang with Unicode lookaround boundaries `(?<![\p{L}\p{N}]) ... (?![\p{L}\p{N}])/u` and currency protection (`500k`), risk-preserving stopwords never removed, 100% preservation of `[MONEY]`, `[NUMBER]`, `[TIME]`.
   - Strict PII priority: PASSWORD -> PERSON_NAME_DOB -> BANK_ACCOUNT -> OTP -> PHONE_NUMBER -> CCCD (BANK_ACCOUNT before CCCD is mandatory).
   - Session-scoped 32-byte HMAC-SHA256 salt (`node:crypto`) with consistent token indexing.
   - Interface contracts matching `IPreprocessingService` and `PreprocessedDialogue`.
2. Ensure `BE_codex/package.json` is clean and unmodified.
3. Build and test verification:
   - In `BE_codex`, run `npx nest build` (or `npx tsc --noEmit`).
   - In `BE_codex`, run the unit tests: `npx jest test/pii-sanitizer.spec.ts test/preprocessing.service.spec.ts` (or `npm test -- test/pii-sanitizer.spec.ts test/preprocessing.service.spec.ts`).
   - Verify that all unit tests pass with 100% success (0 failures).
4. Write your complete handoff report to `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\worker_m2_gen2\handoff.md`. Include verbatim build and test command outputs.
5. Send a completion message to the parent orchestrator when done.
