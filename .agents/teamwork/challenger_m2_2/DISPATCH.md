## 2026-11-13T17:01:12Z
You are Challenger 2 for Milestone 2: Preprocessing & PII Sanitization Module.
Working directory: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI
State folder: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\challenger_m2_2

MANDATORY RULES:
- NEVER run commands with `BypassSandbox: true`. Always use `BypassSandbox: false`.

MANDATORY READING:
- Read ORIGINAL_REQUEST.md at: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\ORIGINAL_REQUEST.md
- Read PROJECT.md at: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\PROJECT.md
- Read SCOPE.md at: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\sub_orch_m2\SCOPE.md
- Read Worker handoff: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\worker_m2_gen2\handoff.md

YOUR TASK:
Adversarial stress-testing of PII Sanitization in `BE_codex/src/preprocessing/pii-sanitizer.ts`:
1. Design and run an empirical adversarial stress-test script (e.g. using `node` in your state folder) importing `PiiSanitizer` from `BE_codex/src/preprocessing/pii-sanitizer.ts`.
2. Test critical PII stress vectors:
   - Bank Account vs. CCCD 12-digit conflict: Verify that 12-digit bank accounts with STK/TK/số tài khoản prefixes are ALWAYS masked as `<MASKED_BANK_ACC_n>` and NEVER as `<MASKED_CCCD_n>`.
   - Repeated PII across multi-turn dialogue: Verify that identical raw values within the same session map to identical indexed tokens (`<MASKED_BANK_ACC_1>` reused).
   - OTP variations (4 to 8 digits, colloquial phrases "la", "cua ban la", "cua quy khach la").
   - Phone numbers vs emergency hotlines (`113`, `198`, `1900xxxx` must NOT be masked).
   - Password variations with special characters and punctuation.
   - Placeholder immutability: Ensure `[MONEY]`, `[NUMBER]`, `[TIME]` are never treated as PII or corrupted.
3. Provide your explicit verdict: `APPROVE` or `REQUEST_CHANGES`.
4. Write your full report to `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\challenger_m2_2\handoff.md` and send a message to parent orchestrator.
