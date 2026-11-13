# BRIEFING — 2026-11-13T16:20:30Z

## Mission
Implement the Preprocessing & PII Sanitization Module for Milestone 2 in BE_codex.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa
- Working directory: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI
- State folder: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\worker_m2
- Original parent: 4f2bff1b-5b15-404e-bce6-b3a8463b81a0
- Milestone: Milestone 2: Preprocessing & PII Sanitization Module

## 🔒 Key Constraints
- DO NOT CHEAT: Genuine implementation, no hardcoded test shortcuts, real regex/logic.
- Exclusively own:
  - `BE_codex/src/preprocessing/*`
  - `BE_codex/test/pii-sanitizer.spec.ts`
  - `BE_codex/test/preprocessing.service.spec.ts`
- Do NOT touch other files in `BE_codex/src/` or elsewhere.
- Follow PROJECT.md § Interface Contracts.
- Strict PII precedence: PASSWORD -> PERSON_NAME_DOB -> BANK_ACCOUNT -> OTP -> PHONE_NUMBER -> CCCD.
- Unicode normalization, zero-width stripping, monospace transcoding, un-stuttering, broken URL repair, telex typo repair, SMS slang replacement.
- Unit tests must achieve 100% pass on Jest and Nest build must pass cleanly.

## Current Parent
- Conversation ID: 4f2bff1b-5b15-404e-bce6-b3a8463b81a0
- Updated: not yet

## Task Summary
- **What to build**: Preprocessing interfaces, TextCleaner, PiiSanitizer, PreprocessingService, PreprocessingModule, and test specs.
- **Success criteria**: Clean compilation with `npx nest build` / `npm run build`, full unit test coverage passing with Jest, full adherence to specifications.
- **Interface contracts**: `PROJECT.md § Interface Contracts`
- **Code layout**: `BE_codex/src/preprocessing/`

## Key Decisions Made
- [TBD]

## Artifact Index
- [TBD]

## Change Tracker
- **Files modified**: None yet
- **Build status**: Untested
- **Pending issues**: None

## Quality Status
- **Build/test result**: Untested
- **Lint status**: Untested
- **Tests added/modified**: None yet

## Loaded Skills
None
