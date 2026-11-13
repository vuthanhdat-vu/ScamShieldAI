# Scope: Milestone 2 — Preprocessing & PII Sanitization Module

## Architecture
- Module location: `BE_codex/src/preprocessing/`
- Module components:
  - `preprocessing.module.ts`: NestJS module exporting `PreprocessingService` and `PiiSanitizer`.
  - `preprocessing.service.ts`: Implements `IPreprocessingService`. Performs Unicode NFC normalization, zero-width stripping, typewriter font transcoding, phonotactic un-stuttering, broken URL repair, telex typo & Vietnamese SMS slang normalization, risk-critical stopword retention, and dialogue prompt formatting.
  - `pii-sanitizer.ts`: Implements Vietnamese-specific PII detection and masking with session-scoped 32-byte HMAC-SHA256 salt. Enforces strict precedence order:
    1. PASSWORD (`<MASKED_PASSWORD_n>`)
    2. PERSON_NAME_DOB (`<MASKED_PERSON_NAME_n>`)
    3. BANK_ACCOUNT (`<MASKED_BANK_ACC_n>`) (8-16 digits, with prefix)
    4. OTP (`<MASKED_OTP_n>`) (4-8 digits)
    5. PHONE_NUMBER (`<MASKED_PHONE_NUMBER_n>`) (10-11 digits)
    6. CCCD (`<MASKED_CCCD_n>`) (12 digits, strict BCA / regex)
    - Strict preservation: 100% intact `[MONEY]`, `[NUMBER]`, `[TIME]`.
  - `preprocessing.service.spec.ts` & `pii-sanitizer.spec.ts`: Unit tests verifying all rules, edge cases, and integrity constraints.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 9 | Text Cleaning & Denoising | NFC normalization, zero-width stripping, typewriter font transcoding, telex & slang repair, broken URL repair | M2 | PREPROCESSING_DESIGN.md §3 |
| 10 | Strict PII Sanitization | Order: PASSWORD -> PERSON_NAME_DOB -> BANK_ACCOUNT -> OTP -> PHONE_NUMBER -> CCCD with salted HMAC-SHA256 | M2 | PREPROCESSING_DESIGN.md §4 |
| 11 | Placeholders & Stopwords Preservation | Preserves 100% of [MONEY], [NUMBER], [TIME], and urgency/conditional stopwords | M2 | PREPROCESSING_DESIGN.md §3.6, §4.3 |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 2 | Preprocessing & PII Sanitization Module | Text cleaning, Unicode NFC, telex/slang normalization, priority-ordered PII sanitization, placeholder preservation | none | IN_PROGRESS |

## Interface Contracts
### M1 (OCR) ↔ M2 (Preprocessing) ↔ M3 (Reasoning)
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

## Write Ownership
- Exclusive ownership: `BE_codex/src/preprocessing/*`
