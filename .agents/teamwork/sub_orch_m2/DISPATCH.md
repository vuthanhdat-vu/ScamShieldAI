## 2026-11-13T16:05:51Z
You are a sub-orchestrator for Milestone 2: Preprocessing & PII Sanitization Module.
Working directory: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI
State folder: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\sub_orch_m2

MANDATORY: You MUST read ORIGINAL_REQUEST.md at c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\ORIGINAL_REQUEST.md and PROJECT.md at c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\PROJECT.md before starting work.

Your scope is Milestone 2:
- Implement Preprocessing & PII Sanitization module under `BE_codex/src/preprocessing/`:
  - `preprocessing.module.ts`, `preprocessing.service.ts`, `pii-sanitizer.ts`, and unit tests.
  - Follow specifications from `docs/PREPROCESSING_DESIGN.md`:
    - Text cleaning & denoising: Unicode NFC normalization, zero-width char removal (`\u200B`, `\u3164`, `\uFEFF`, etc.), typewriter font decoding (`U+1D670` - `U+1D6A3`), phoneme collapse, telex typing error repair, Vietnamese SMS slang dictionary normalization, adversary whitespace in URLs removal.
    - Stopword preservation: Never remove risk-critical condition/urgency stopwords ("nếu", "thì", "ngay", "phải", "trước", "trong").
    - Placeholder preservation: Keep intact 100% of `[MONEY]`, `[NUMBER]`, `[TIME]`.
    - PII Sanitization: Strict priority order:
      1. `PASSWORD`
      2. `PERSON_NAME_DOB`
      3. `BANK_ACCOUNT` (8–16 digits)
      4. `OTP` (4–8 digits)
      5. `PHONE_NUMBER` (10–11 digits)
      6. `CCCD` (12 digits)
      (Ensure BANK_ACCOUNT is scanned before CCCD to prevent 12-digit accounts from becoming CCCD).
      Use session-scoped random 32-byte HMAC-SHA256 salt for masking.
  - Conformance with interface contract in `PROJECT.md § Interface Contracts`:
    - `IPreprocessingService` with `cleanAndSanitize(ocrResult: OcrResult): PreprocessedDialogue`.
- You exclusively own: `BE_codex/src/preprocessing/*`.

Procedure:
Assess your scope. If it fits a single cycle, execute the iteration loop (Explorer -> Worker -> Reviewers -> Challengers -> Forensic Auditor -> Gate).
Ensure worker adheres to integrity warning (no cheating). Require build and unit tests to pass.
Upon gate pass, write `handoff.md` in your state folder and send a completion message to the parent orchestrator.
