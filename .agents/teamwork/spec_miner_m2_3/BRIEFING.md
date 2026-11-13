# BRIEFING — 2026-11-13T16:13:45Z

## Mission
Discover and document complete, authoritative specifications for Milestone 2: Preprocessing & PII Sanitization Module, specifically Vietnamese PII Detection Rules, strict priority ordering, HMAC-SHA256 reference mapping, placeholder preservation, ephemeral lifecycle, and interface conformance with `IPreprocessingService`.

## 🔒 My Identity
- Archetype: Specification Miner
- Roles: Spec Miner
- Working directory: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI
- State folder: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\spec_miner_m2_3
- Original parent: 4f2bff1b-5b15-404e-bce6-b3a8463b81a0
- Milestone: Milestone 2: Preprocessing & PII Sanitization Module

## 🔒 Key Constraints
- Strict priority ordering:
  1. Plaintext Password -> `<MASKED_PASSWORD_n>`
  2. Full Name & DOB -> `<MASKED_PERSON_NAME_n>`
  3. Bank Account Number -> `<MASKED_BANK_ACC_n>`
  4. OTP Verification Code -> `<MASKED_OTP_n>`
  5. Personal Phone Number -> `<MASKED_PHONE_NUMBER_n>`
  6. Citizen ID / CCCD -> `<MASKED_CCCD_n>`
- Bank Account MUST be scanned before CCCD to prevent 12-digit bank accounts from being falsely masked as CCCD.
- Context-preserving indexed tokens (`<MASKED_X_1>`, `<MASKED_X_2>`).
- Salted HMAC-SHA256 reference mapping (per-session 32-byte crypto random salt).
- Preservation of existing placeholders: `[MONEY]`, `[NUMBER]`, `[TIME]` must NEVER be matched or re-masked.
- In-memory ephemeral lifecycle.
- Interface conformance: `IPreprocessingService.cleanAndSanitize(ocrResult: OcrResult): PreprocessedDialogue`.
- Read-only agent: do NOT implement code in src/, only specify.

## Current Parent
- Conversation ID: 4f2bff1b-5b15-404e-bce6-b3a8463b81a0
- Updated: 2026-11-13T16:13:45Z

## Task Summary
- **What to build**: Specification mining report for Vietnamese PII Sanitization Engine & Preprocessing service integration.
- **Success criteria**: Comprehensive handoff report with exact regex patterns, precedence rules, data structures, edge cases, test vectors, and interface contracts.
- **Interface contracts**: `PROJECT.md` & `docs/PREPROCESSING_DESIGN.md` Section 4.
- **Code layout**: Specified according to `PROJECT.md`.

## Key Decisions Made
- Fully documented all 6 priority rules, complete regexes, flags, and extraction logic.
- Provided mathematical and practical proof for why Bank Account must precede CCCD.
- Designed complete TypeScript architecture for `PiiSanitizer` and `PreprocessingService`.
- Specified filtering of `system` chips from `OcrResult.turns` to `PreprocessedTurn[]`.
- Finalized comprehensive handoff report at `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\spec_miner_m2_3\handoff.md`.

## Artifact Index
- `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\spec_miner_m2_3\DISPATCH.md` — Incoming dispatch log.
- `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\spec_miner_m2_3\progress.md` — Liveness heartbeat and progress.
- `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\spec_miner_m2_3\handoff.md` — Final spec miner report.
