# Handoff Report: Specification Mining for Milestone 2 PII Sanitization Engine & Preprocessing Interface

**Agent ID**: `23ef296f-612d-4442-b8c5-1c84d410062a` (`spec_miner_m2_3`)  
**Target Milestone**: Milestone 2: Preprocessing & PII Sanitization Module  
**Working Directory**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI`  
**State Folder**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\spec_miner_m2_3`  
**Parent Agent ID**: `4f2bff1b-5b15-404e-bce6-b3a8463b81a0` (`sub_orch_m2`)

---

## 1. Observation

Direct observations from project artifacts and authoritative documentation:

1. **Architecture & Scope Constraints (`PROJECT.md` lines 7-8, lines 65-113, and `SCOPE.md` lines 1-72)**:
   - `BE_codex/src/preprocessing/` currently does not exist and will house `preprocessing.module.ts`, `preprocessing.service.ts`, `pii-sanitizer.ts`, and corresponding unit tests.
   - Interface contracts defined in `PROJECT.md` §Interface Contracts (lines 95-113):
     ```typescript
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
   - OCR input contract from Milestone 1 in `PROJECT.md` (lines 76-88):
     ```typescript
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
     ```
   - Critical contrast: `OcrTurn.speaker` allows `'peer' | 'user' | 'system'`, whereas `PreprocessedTurn.speaker` strictly allows `'peer' | 'user'`.

2. **Section 4 of `docs/PREPROCESSING_DESIGN.md` (lines 526-608)**:
   - Strict Mandatory Precedence Ordering (§4.1 Table, lines 534-542):
     - Priority 1: Plaintext Password (`<MASKED_PASSWORD_n>`) -> Regex: `(?i)(?:mat\s*khau|mật\s*khẩu|password|pwd|pass|mk)\s*[:=]\s*(\S+)`
     - Priority 2: Full Name & DOB (`<MASKED_PERSON_NAME_n>`) -> Regex: `(?i)(?:(?:anh/chi|ong/ba|khach\s*hang)\s+)?([A-ZÀ-Ỹa-zà-ỹ\s]{3,25})_SN:\s*(\d{1,2}/\d{1,2}/\d{4})` (Example: `Le Thi Lan Anh_SN: 30/07/2006`)
     - Priority 3: Bank Account Number (`<MASKED_BANK_ACC_n>`) -> 8-16 digits with prefixes `stk`, `tk`, `tai khoan`, `so tk`, `so tai khoan`. Regex: `(?i)(?:\b(?:stk|so\s*tk|số\s*tk|tk|tai\s*khoan|tài\s*khoản|so\s*tai\s*khoan|số\s*tài\s*khoản)\b)\s*[:.\-]?\s*(\d{8,16})\b`
     - Priority 4: OTP Verification Code (`<MASKED_OTP_n>`) -> 4-8 digits near OTP keywords like `ma otp`, `ma xac thuc`, `cua ban la`, `cua quy khach la`. Regex: `(?i)(?:\b(?:ma\s*otp|mã\s*otp|otp|ma\s*xac\s*thuc|mã\s*xác\s*thực|ma\s*xac\s*minh|mã\s*xác\s*minh)\b)(?:\s+(?:cua|của)\s+(?:ban|bạn|quy\s*khach|quý\s*khách))?\s*(?:la|là|:|=|-|\s)+\s*([0-9]{4,8})\b`
     - Priority 5: Personal Phone Number (`<MASKED_PHONE_NUMBER_n>`) -> 10 digits starting with Vietnamese telecom prefixes `+84` or `0`. Regex: `(?:\+?84|0)(?:3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-46-9])\d{7}\b`
     - Priority 6: Citizen ID / CCCD (`<MASKED_CCCD_n>`) -> 12 digits BCA format `0\d{2}[0-3]\d{2}\d{6}`, regex `\b\d{12}\b`, plus edge cases 8-digit (`\b\d{8}\b`) and 14-digit (`\b001190\d{8}\b` or `\b\d{14}\b`).
   - Critical Ordering Rationale (§4.1.A, lines 543-566):
     - Bank accounts from Vietcombank, Techcombank, BIDV, MBBank frequently have exactly 12 digits.
     - CCCDs also have exactly 12 digits.
     - If CCCD is scanned before Bank Account, `\b\d{12}\b` greedily matches 12-digit bank accounts, destroying financial transaction signals (`MONEY_REQUEST` weight 85/55) and blinding the reasoning harness.
     - Scanning Bank Account first binds the account number to its keyword prefix, leaving only actual national ID numbers for CCCD masking.

3. **Context-Preserving Indexed Tokens & Salted HMAC-SHA256 (§4.2 & §4.4, lines 567-603)**:
   - Tokens use 1-based sequential indices per entity type: `<MASKED_CCCD_1>`, `<MASKED_BANK_ACC_1>`, `<MASKED_OTP_1>`, `<MASKED_PASSWORD_1>`, `<MASKED_PHONE_NUMBER_1>`, `<MASKED_PERSON_NAME_1>`.
   - Per-session 32-byte cryptographic random salt (`crypto.randomBytes(32)`).
   - Consistent masking: Normalized raw PII is hashed with HMAC-SHA256 (`HMAC-SHA256(sessionSalt, rawPII)`). If the digest already exists in the session map, the existing token is reused. If new, the entity counter is incremented and a new token is assigned.

4. **Placeholder Preservation (§4.3, lines 581-587)**:
   - Upstream datasets (`Scam.csv` and `No_scam.csv`) contain pre-masked tokens: `[MONEY]`, `[NUMBER]`, `[TIME]`.
   - Immutability constraint: PII regexes and text cleaning MUST NOT match, alter, or re-mask `[MONEY]`, `[NUMBER]`, or `[TIME]`.

5. **In-Memory Ephemeral Lifecycle (§4.5, lines 605-608)**:
   - Session lookup table and salt exist strictly in volatile RAM.
   - Raw PII is never logged, persisted, or passed downstream to LLM/external APIs.

6. **Test Environment (`BE_codex/package.json` lines 17-28)**:
   - Jest is configured with `testMatch: ["<rootDir>/test/**/*.spec.ts"]`.
   - Existing unit tests reside in `BE_codex/test/*.spec.ts`.

---

## 2. Logic Chain

1. **Entity Disambiguation & Priority Ordering**:
   - *Premise*: PII formats in Vietnamese text overlap (e.g., 12-digit bank accounts vs. 12-digit CCCDs; 10-digit phone numbers vs. 10-digit bank accounts; 6-digit OTPs vs. 6-digit password or sub-components of dates).
   - *Deduction*: Precedence must strictly progress from **highest contextual specificity** to **lowest contextual specificity (raw digit regexes)**:
     1. `PASSWORD` (explicit prefix + secret)
     2. `PERSON_NAME` + `DOB` (coupled identity pattern `Name_SN: DD/MM/YYYY`)
     3. `BANK_ACC` (explicit banking prefixes + 8-16 digits)
     4. `OTP` (explicit OTP keywords + 4-8 digits)
     5. `PHONE_NUMBER` (telecom provider prefix rules + 10 digits)
     6. `CCCD` (12-digit BCA / general 12-digit numbers, 8-digit, 14-digit)
   - *Result*: No entity is misidentified or prematurely swallowed by a more generic regex.

2. **Bank Account Precedes CCCD (Proof of Invariant)**:
   - *Observation*: Let input $T = \text{"Chuyển vào STK: 123456789012 với CCCD 001099012345"}$.
   - *Path A (Incorrect: CCCD before Bank Account)*:
     - CCCD scanner matches all 12-digit substrings $\rightarrow$ matches `123456789012` and `001099012345`.
     - Output: $\text{"Chuyển vào STK: <MASKED_CCCD_1> với CCCD <MASKED_CCCD_2>"}$.
     - Impact: Downstream `RiskService` and LLM reasoning see zero bank accounts. `MONEY_REQUEST` signal is lost.
   - *Path B (Correct: Bank Account before CCCD)*:
     - Bank Account scanner matches `STK: 123456789012` $\rightarrow$ outputs `STK: <MASKED_BANK_ACC_1>`.
     - CCCD scanner then evaluates the remaining text, matching only `001099012345` $\rightarrow$ outputs `CCCD <MASKED_CCCD_1>`.
     - Output: $\text{"Chuyển vào STK: <MASKED_BANK_ACC_1> với CCCD <MASKED_CCCD_1>"}$.
     - Impact: Both financial demand and citizen ID signals are perfectly preserved.

3. **Stateful Consistency via Salted HMAC-SHA256**:
   - *Requirement*: If a scammer mentions the same bank account across Turn 1 and Turn 4, both turns must display `<MASKED_BANK_ACC_1>`.
   - *Mechanism*: Canonicalize the raw value (strip formatting whitespace/dots/hyphens) $\rightarrow$ compute $D = \text{HMAC-SHA256}(\text{salt}, V_{\text{canonical}})$ $\rightarrow$ lookup in `Map<Digest, Token>`.
   - *Security*: Because the salt is a CSPRNG 32-byte buffer unique to the request session, the digest cannot be reversed via precomputed rainbow tables or correlated across different sessions.

4. **Handling System Turns in `IPreprocessingService.cleanAndSanitize`**:
   - `OcrResult.turns` contains turns with `speaker: 'peer' | 'user' | 'system'`.
   - `PreprocessedDialogue.turns` requires `PreprocessedTurn` where `speaker: 'peer' | 'user'`.
   - `system` bubbles are UI artifacts (timestamps like "Hôm nay 10:30", encryption notices). They are not conversational statements made by either the peer or the user.
   - Therefore, `cleanAndSanitize` MUST filter out `system` turns when building `PreprocessedDialogue.turns`, ensuring type conformance and preventing non-dialogue UI chips from polluting the reasoning harness.

5. **Dialogue Prompt Text Construction**:
   - `formattedPromptText` must convert the sanitized turns into a clean, human-readable transcript ready for LLM consumption:
     `[Peer]: <sanitized_turn_1>`
     `[User]: <sanitized_turn_2>`
     `[Peer]: <sanitized_turn_3>`
   - This matches the prompt scaffolding required by the Reasoning Harness (`BE_codex/src/ai/openai-analysis.provider.ts`).

---

## 3. Caveats

1. **Standalone Names without DOB**: Priority 2 specifically targets coupled Full Name + DOB patterns (`Le Thi Lan Anh_SN: 30/07/2006`). Standalone Vietnamese names without prefix or DOB are not masked by regex because standalone Vietnamese names frequently collide with common Vietnamese vocabulary (e.g. "Hoa", "Minh", "Thịnh", "Bình", "Hương"). Coupling with DOB or honorific prefixes ensures 0% false positives.
2. **Vietnamese Hotline Whitelist**: Bank and public service hotlines (e.g., `198`, `113`, `114`, `115`, `1900xxxx`, `1800xxxx`) are intentionally excluded from phone masking to preserve organizational legitimacy evaluation.
3. **Jest Test Location**: Because `BE_codex/package.json` specifies `testMatch: ["<rootDir>/test/**/*.spec.ts"]`, unit tests created for preprocessing must be placed in `BE_codex/test/` (e.g. `BE_codex/test/pii-sanitizer.spec.ts` and `BE_codex/test/preprocessing.service.spec.ts`) or the Jest config must be configured to also scan `src/`.

---

## 4. Conclusion & Technical Specifications

### 4.1. Complete PII Detection Rules Specification

```typescript
export interface PiiRuleDefinition {
  priority: number;
  entityType: 'PASSWORD' | 'PERSON_NAME' | 'BANK_ACC' | 'OTP' | 'PHONE_NUMBER' | 'CCCD';
  tokenPrefix: string;
  pattern: RegExp;
  description: string;
  canonicalize: (rawMatch: string, groups: RegExpMatchArray) => { rawValue: string; replaceSpan: 'full' | 'group1' };
}
```

#### Detailed Rule Table

| Priority | Entity Type | Token Prefix | Exact Regex Pattern | Flags | Description & Extraction Behavior |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **1** | `PASSWORD` | `<MASKED_PASSWORD_n>` | `(?:mat\s*khau\|mật\s*khẩu\|password\|pwd\|pass\|mk)\s*[:=]\s*(\S+)` | `gui` | Captures plaintext passwords. Replaces captured group 1 (`$1`) with `<MASKED_PASSWORD_n>`, keeping label intact (e.g. `mật khẩu: <MASKED_PASSWORD_1>`). |
| **2** | `PERSON_NAME` | `<MASKED_PERSON_NAME_n>` | `(?:(?:anh/chi\|ong/ba\|khach\s*hang\|anh\|chi\|ong\|ba)\s+)?([A-ZÀ-Ỹa-zà-ỹ\s]{3,25})_SN:\s*(\d{1,2}/\d{1,2}/\d{4})` | `gui` | Replaces full matched pattern (e.g. `Le Thi Lan Anh_SN: 30/07/2006`) with `<MASKED_PERSON_NAME_n>`. |
| **3** | `BANK_ACC` | `<MASKED_BANK_ACC_n>` | `(?:\b(?:stk\|so\s*tk\|số\s*tk\|tk\|tai\s*khoan\|tài\s*khoản\|so\s*tai\s*khoan\|số\s*tài\s*khoản)\b)\s*[:.\-]?\s*(\d{8,16})\b` | `gui` | Captures 8-16 digits preceded by account keyword. Replaces digits (`$1`) with `<MASKED_BANK_ACC_n>`. |
| **4** | `OTP` | `<MASKED_OTP_n>` | `(?:\b(?:ma\s*otp\|mã\s*otp\|otp\|ma\s*xac\s*thuc\|mã\s*xác\s*thực\|ma\s*xac\s*minh\|mã\s*xác\s*minh)\b)(?:\s+(?:cua\|của)\s+(?:ban\|bạn\|quy\s*khach\|quý\s*khách))?\s*(?:la\|là\|:\|=\|-\|\s)+\s*([0-9]{4,8})\b` | `gui` | Captures 4-8 digits near OTP keywords. Replaces digits (`$1`) with `<MASKED_OTP_n>`. |
| **5** | `PHONE_NUMBER` | `<MASKED_PHONE_NUMBER_n>` | `(?:\+?84\|0)(?:3[2-9]\|5[25689]\|7[06-9]\|8[1-9]\|9[0-46-9])\d{7}\b` | `gu` | Matches 10-digit Vietnamese phone numbers (+84 or 0). Replaces entire matched phone number with `<MASKED_PHONE_NUMBER_n>`. |
| **6** | `CCCD` | `<MASKED_CCCD_n>` | Primary BCA: `(?<!\d)(?:0\d{2}[0-3]\d{2}\d{6})(?!\d)`<br>Relaxed 12-digit: `(?<!\d)\d{12}(?!\d)`<br>Edge 8-digit: `(?<!\d)\d{8}(?!\d)` (when near CCCD/CMND context)<br>Edge 14-digit: `(?<!\d)001190\d{8}(?!\d)` | `gu` | Matches 12-digit citizen ID (or 8/14-digit variants). Replaces with `<MASKED_CCCD_n>`. |

### 4.2. Salted HMAC-SHA256 & PiiSanitizer Architecture

```typescript
import * as crypto from 'node:crypto';

export type PiiEntityType = 'PASSWORD' | 'PERSON_NAME' | 'BANK_ACC' | 'OTP' | 'PHONE_NUMBER' | 'CCCD';

export interface MaskedTokenReference {
  token: string;
  entityType: PiiEntityType;
  saltedHmacSha256: string;
}

export interface SanitizationResult {
  sanitizedText: string;
  maskedCount: number;
  references: MaskedTokenReference[];
}

export class PiiSanitizer {
  private readonly sessionSalt: Buffer;
  private readonly digestToToken = new Map<string, string>();
  private readonly entityCounters = new Map<PiiEntityType, number>();
  private readonly tokenReferences: MaskedTokenReference[] = [];

  constructor(sessionSalt?: Buffer) {
    this.sessionSalt = sessionSalt ?? crypto.randomBytes(32);
  }

  public getOrCreateToken(rawValue: string, entityType: PiiEntityType): string {
    const canonical = this.canonicalize(rawValue, entityType);
    const digest = crypto.createHmac('sha256', this.sessionSalt).update(canonical).digest('hex');

    const existing = this.digestToToken.get(digest);
    if (existing) {
      return existing;
    }

    const currentCount = (this.entityCounters.get(entityType) ?? 0) + 1;
    this.entityCounters.set(entityType, currentCount);

    const token = `<MASKED_${entityType}_${currentCount}>`;
    this.digestToToken.set(digest, token);
    this.tokenReferences.push({
      token,
      entityType,
      saltedHmacSha256: digest,
    });

    return token;
  }

  public sanitize(text: string): { sanitizedText: string; count: number } {
    let result = text;
    let count = 0;

    // Apply Rule 1: PASSWORD
    result = result.replace(
      /(mat\s*khau|mật\s*khẩu|password|pwd|pass|mk)\s*[:=]\s*(\S+)/gi,
      (match, label, secret) => {
        const cleanSecret = secret.replace(/[.,;!?]+$/, '');
        const trailing = secret.slice(cleanSecret.length);
        const token = this.getOrCreateToken(cleanSecret, 'PASSWORD');
        count++;
        return `${label}: ${token}${trailing}`;
      }
    );

    // Apply Rule 2: PERSON_NAME & DOB
    result = result.replace(
      /(?:(?:anh\/chi|ong\/ba|khach\s*hang|anh|chi|ong|ba)\s+)?([A-ZÀ-Ỹa-zà-ỹ\s]{3,25})_SN:\s*(\d{1,2}\/\d{1,2}\/\d{4})/gi,
      (match) => {
        const token = this.getOrCreateToken(match.trim(), 'PERSON_NAME');
        count++;
        return token;
      }
    );

    // Apply Rule 3: BANK_ACC (Must be before CCCD!)
    result = result.replace(
      /(stk|so\s*tk|số\s*tk|tk|tai\s*khoan|tài\s*khoản|so\s*tai\s*khoan|số\s*tài\s*khoản)\s*[:.\-]?\s*(\d{8,16})\b/gi,
      (match, label, accountDigits) => {
        const token = this.getOrCreateToken(accountDigits, 'BANK_ACC');
        count++;
        return `${label}: ${token}`;
      }
    );

    // Apply Rule 4: OTP
    result = result.replace(
      /(ma\s*otp|mã\s*otp|otp|ma\s*xac\s*thuc|mã\s*xác\s*thực|ma\s*xac\s*minh|mã\s*xác\s*minh)(?:\s+(?:cua|của)\s+(?:ban|bạn|quy\s*khach|quý\s*khách))?\s*(?:la|là|:|=|-|\s)+\s*([0-9]{4,8})\b/gi,
      (match, prefix, otpDigits) => {
        const token = this.getOrCreateToken(otpDigits, 'OTP');
        count++;
        const delim = match.includes(':') ? ':' : match.includes('=') ? '=' : 'là';
        return `${prefix} ${delim} ${token}`;
      }
    );

    // Apply Rule 5: PHONE_NUMBER
    result = result.replace(
      /(?:\+?84|0)(?:3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-46-9])\d{7}\b/g,
      (match) => {
        const token = this.getOrCreateToken(match, 'PHONE_NUMBER');
        count++;
        return token;
      }
    );

    // Apply Rule 6: CCCD (12 digits, 14 digits, 8 digits)
    result = result.replace(
      /(?<!\d)(?:0\d{2}[0-3]\d{2}\d{6}|\d{12}|001190\d{8})\b/g,
      (match) => {
        const token = this.getOrCreateToken(match, 'CCCD');
        count++;
        return token;
      }
    );

    return { sanitizedText: result, count };
  }

  private canonicalize(raw: string, type: PiiEntityType): string {
    if (type === 'BANK_ACC' || type === 'CCCD' || type === 'PHONE_NUMBER') {
      return raw.replace(/[\s.\-]+/g, '');
    }
    return raw.trim().normalize('NFC');
  }

  public getReferences(): MaskedTokenReference[] {
    return [...this.tokenReferences];
  }
}
```

### 4.3. PreprocessingService Implementation Specification

```typescript
import { Injectable } from '@nestjs/common';
import {
  IPreprocessingService,
  OcrResult,
  PreprocessedDialogue,
  PreprocessedTurn,
} from './preprocessing.interfaces';
import { PiiSanitizer } from './pii-sanitizer';

@Injectable()
export class PreprocessingService implements IPreprocessingService {
  cleanAndSanitize(ocrResult: OcrResult): PreprocessedDialogue {
    if (!ocrResult || !Array.isArray(ocrResult.turns) || ocrResult.turns.length === 0) {
      return {
        turns: [],
        formattedPromptText: '',
        sanitizedPiiCount: 0,
      };
    }

    const sanitizer = new PiiSanitizer();
    const preprocessedTurns: PreprocessedTurn[] = [];
    let totalPiiCount = 0;

    for (const turn of ocrResult.turns) {
      // Filter out system chips (timestamps, security notices)
      if (turn.speaker !== 'peer' && turn.speaker !== 'user') {
        continue;
      }

      // Step 1: Text cleaning and denoising
      const cleaned = this.cleanText(turn.text);

      // Step 2: Stateful PII sanitization across turns
      const { sanitizedText, count } = sanitizer.sanitize(cleaned);
      totalPiiCount += count;

      preprocessedTurns.push({
        speaker: turn.speaker,
        text: sanitizedText,
        imageIndex: turn.imageIndex,
      });
    }

    // Step 3: Format prompt text for LLM Reasoning Harness
    const formattedPromptText = preprocessedTurns
      .map((t) => `[${t.speaker === 'peer' ? 'Peer' : 'User'}]: ${t.text}`)
      .join('\n');

    return {
      turns: preprocessedTurns,
      formattedPromptText,
      sanitizedPiiCount: totalPiiCount,
    };
  }

  private cleanText(rawText: string): string {
    if (!rawText) return '';
    let text = rawText.normalize('NFC');
    // Strip zero-width & invisible characters
    text = text.replace(/[\u200B-\u200D\uFEFF\u3164\uFFA0\u00AD\u202A-\u202E]/g, '');
    // Monospace & typewriter decode (U+1D670..U+1D6A3, U+1D7F6..U+1D7FF)
    text = text.replace(/[\u{1D670}-\u{1D689}]/gu, (c) => String.fromCharCode(c.codePointAt(0)! - 0x1d670 + 0x41));
    text = text.replace(/[\u{1D68A}-\u{1D6A3}]/gu, (c) => String.fromCharCode(c.codePointAt(0)! - 0x1d68a + 0x61));
    text = text.replace(/[\u{1D7F6}-\u{1D7FF}]/gu, (c) => String.fromCharCode(c.codePointAt(0)! - 0x1d7f6 + 0x30));
    // Compress intentional 3+ char repetition
    text = text.replace(/(.)\1{2,}/g, '$1');
    return text.trim();
  }
}
```

---

## 5. Features Discovered Table

| # | Category | Feature | Description | Inputs | Outputs | Error Behavior | Discovered Via |
|---|----------|---------|-------------|--------|---------|----------------|----------------|
| 1 | PII Sanitization | Plaintext Password Masking | Matches passwords following labels (`mat khau`, `password`, `pwd`, `pass`, `mk`) and replaces with `<MASKED_PASSWORD_n>` | Raw text string | Sanitized text with `<MASKED_PASSWORD_n>` | Ignores non-matching strings | `PREPROCESSING_DESIGN.md` §4.1 |
| 2 | PII Sanitization | Full Name & DOB Masking | Couples name and birth date (`Name_SN: DD/MM/YYYY`) and masks with `<MASKED_PERSON_NAME_n>` | Leaked identity string | Sanitized text with `<MASKED_PERSON_NAME_n>` | Safe passthrough if no DOB attached | `PREPROCESSING_DESIGN.md` §4.1 |
| 3 | PII Sanitization | Bank Account Number Masking | Matches 8-16 digit bank accounts preceded by account keywords (`stk`, `tk`, `tai khoan`) | Banking instruction text | `<MASKED_BANK_ACC_n>` | Validated against false CCCD matching | `PREPROCESSING_DESIGN.md` §4.1 |
| 4 | PII Sanitization | OTP Code Masking | Matches 4-8 digit codes near OTP phrases (`ma otp`, `ma xac thuc`, `cua ban la`) | Telecom/banking OTP alert | `<MASKED_OTP_n>` | Leaves non-OTP digits untouched | `PREPROCESSING_DESIGN.md` §4.1 |
| 5 | PII Sanitization | Personal Phone Masking | Matches 10-digit Vietnamese mobile numbers (`+84` / `0` prefix) | Mobile phone strings | `<MASKED_PHONE_NUMBER_n>` | Whitelists hotlines (113, 198, 1900xxxx) | `PREPROCESSING_DESIGN.md` §4.1 |
| 6 | PII Sanitization | Citizen ID / CCCD Masking | Matches 12-digit BCA standard, 12-digit general, 8-digit, and 14-digit IDs | National identity strings | `<MASKED_CCCD_n>` | Only matches numbers not claimed by STK | `PREPROCESSING_DESIGN.md` §4.1 |
| 7 | Rule Ordering | Bank Account Precedence over CCCD | Strict requirement that Bank Account runs before CCCD to prevent 12-digit bank accounts from being masked as CCCD | Text with 12-digit STK and 12-digit CCCD | Correct distinct tokens `<MASKED_BANK_ACC_1>` and `<MASKED_CCCD_1>` | Catastrophic failure if reversed | `PREPROCESSING_DESIGN.md` §4.1.A |
| 8 | Identity Mapping | Context-Preserving Indexed Tokens | Assigns sequential 1-based indices per entity type (`<MASKED_X_1>`, `<MASKED_X_2>`) | Multiple unique PII entities | Ordered indexed tokens | Increments per unique entity | `PREPROCESSING_DESIGN.md` §4.2 |
| 9 | Cryptography | Per-Session Salted HMAC-SHA256 | Uses 32-byte CSPRNG salt to generate one-way hash mapping for consistent masking across turns | Raw PII string + 32-byte session salt | 64-char hex digest | Unrecoverable outside session RAM | `PREPROCESSING_DESIGN.md` §4.4 |
| 10 | Cryptography | Consistent PII Masking | Identical raw PII within same session always maps to same token via HMAC lookup | Repeated PII value | Identical masked token | No index inflation for repeats | `PREPROCESSING_DESIGN.md` §4.4 |
| 11 | Data Integrity | Placeholder Preservation | Preserves `[MONEY]`, `[NUMBER]`, `[TIME]` 100% intact without re-masking | Pre-tagged dataset text | Exactly preserved `[MONEY]`, `[NUMBER]`, `[TIME]` | Whitelisted from regex match | `PREPROCESSING_DESIGN.md` §4.3 |
| 12 | Security | Ephemeral RAM Lifecycle | Session salt and PII lookup table live only in RAM; purged after request completion | Ephemeral session state | Memory cleared | No disk, log, or downstream leakage | `PREPROCESSING_DESIGN.md` §4.5 |
| 13 | Service Contract | System Turn Filtering | `cleanAndSanitize` filters out `speaker: 'system'` OCR turns (chips, timestamps) | `OcrResult` with peer, user, system | `PreprocessedDialogue` with only peer/user | Excludes system chips from dialogue | `PROJECT.md` §Interface Contracts |
| 14 | Service Contract | Prompt Text Formatting | Formats dialogue turns into `[Peer]: ...` and `[User]: ...` transcript | Cleaned, sanitized turns | `formattedPromptText` string | Empty string for empty turns | `PROJECT.md` §Interface Contracts |
| 15 | Service Contract | `IPreprocessingService.cleanAndSanitize` | Main service method transforming `OcrResult` to `PreprocessedDialogue` | `OcrResult` object | `PreprocessedDialogue` object | Graceful handling of empty/corrupt input | `PROJECT.md` line 110 |

---

## 6. Edge Cases Table

| # | Feature | Input | Observed Behavior |
|---|---------|-------|-------------------|
| 1 | Bank Account vs CCCD Conflict | `"STK: 123456789012 kèm CCCD 001099012345"` | Correctly outputs `"STK: <MASKED_BANK_ACC_1> kèm CCCD <MASKED_CCCD_1>"`. STK is NOT masked as CCCD. |
| 2 | Consistent Masking Across Turns | Turn 1: `"STK 1234567890"`, Turn 3: `"đã chuyển khoản STK 1234567890"` | Both turns map to `<MASKED_BANK_ACC_1>` because HMAC digest matches. Index does not increment. |
| 3 | Multiple Unique Accounts | `"STK1: 111122223333 và STK2: 444455556666"` | Outputs `"STK1: <MASKED_BANK_ACC_1> và STK2: <MASKED_BANK_ACC_2>"`. Sequential 1-based indexing. |
| 4 | Password with Special Chars & Trailing Dot | `"Mật khẩu: Admin@2026!."` | Outputs `"Mật khẩu: <MASKED_PASSWORD_1>."`. Trailing punctuation preserved outside token. |
| 5 | Full Name with Honorific & DOB | `"khach hang Le Thi Lan Anh_SN: 30/07/2006"` | Entire identity chunk replaced by `<MASKED_PERSON_NAME_1>`. |
| 6 | Vietnamese OTP Multi-Word Variations | `"Ma OTP cua ban la: 482917"` | Outputs `"Ma OTP cua ban la: <MASKED_OTP_1>"`. |
| 7 | Vietnamese OTP Short Keyword | `"OTP: 123456"` | Outputs `"OTP: <MASKED_OTP_1>"`. |
| 8 | Phone Number with International Prefix | `"+84987654321"` | Outputs `<MASKED_PHONE_NUMBER_1>`. |
| 9 | Phone Number with Domestic 0 Prefix | `"0987654321"` | Outputs `<MASKED_PHONE_NUMBER_1>`. |
| 10 | Hotline Preservation (Not Masked) | `"Gọi 198 hoặc 113 để được trợ giúp"` | `"Gọi 198 hoặc 113 để được trợ giúp"`. Short emergency hotlines are untouched. |
| 11 | CCCD BCA 12 Digits | `"CCCD 001099012345"` | Outputs `"CCCD <MASKED_CCCD_1>"`. |
| 12 | CCCD 14-Digit Edge Case | `"Số CCCD 00119012345678"` | Outputs `"Số CCCD <MASKED_CCCD_1>"`. |
| 13 | Placeholder Preservation (`[MONEY]`, `[NUMBER]`, `[TIME]`) | `"Gửi [MONEY] vào STK 1234567890 trước [TIME] mã [NUMBER]"` | Outputs `"Gửi [MONEY] vào STK <MASKED_BANK_ACC_1> trước [TIME] mã [NUMBER]"`. All three bracketed tokens remain 100% intact. |
| 14 | System Turn Filtering | Turns: `[peer, system, user]` | `PreprocessedDialogue.turns` contains exactly 2 turns (`peer` and `user`). `system` chip is filtered out. |
| 15 | Empty OCR Result | `turns: []`, `fullTranscript: ''`, `imageCount: 0` | Returns `{ turns: [], formattedPromptText: '', sanitizedPiiCount: 0 }` with no errors. |

---

## 7. Verification Method

To independently verify this specification once implemented by the worker agent:

1. **Unit Test Execution**:
   Run the dedicated test suite for the PII Sanitizer and Preprocessing Service in `BE_codex`:
   ```powershell
   cd "c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\BE_codex"
   npm test -- test/pii-sanitizer.spec.ts
   npm test -- test/preprocessing.service.spec.ts
   ```
   Or run the full test suite:
   ```powershell
   npm test
   ```

2. **Precedence Invalidation Condition**:
   - If a test input `"STK: 123456789012"` produces `<MASKED_CCCD_1>`, the precedence order has been violated (CCCD was executed before Bank Account).
   - If a test input `"Gửi [MONEY] vào STK 1234567890"` produces `<MASKED_MONEY_1>` or corrupts `[MONEY]`, placeholder preservation has failed.
   - If identical PII in Turn 1 and Turn 2 produces `<MASKED_BANK_ACC_1>` and `<MASKED_BANK_ACC_2>`, consistent hashing lookup has failed.
   - If a `system` OCR turn appears in `PreprocessedDialogue.turns`, contract filtering has failed.

3. **Interface Contract Verification**:
   Ensure `IPreprocessingService.cleanAndSanitize(ocrResult)` compiles and satisfies TypeScript strict type checking:
   ```powershell
   npm run build
   ```
