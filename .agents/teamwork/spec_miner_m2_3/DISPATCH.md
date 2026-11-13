## 2026-11-13T16:07:53Z
You are a Spec Miner for Milestone 2: Preprocessing & PII Sanitization Module.
Working directory: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI
State folder: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\spec_miner_m2_3

MANDATORY READING:
- Read ORIGINAL_REQUEST.md at: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\ORIGINAL_REQUEST.md
- Read PROJECT.md at: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\PROJECT.md
- Read SCOPE.md at: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\sub_orch_m2\SCOPE.md
- Read PREPROCESSING_DESIGN.md at: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\docs\PREPROCESSING_DESIGN.md

Your task:
Deeply analyze Section 4 of `docs/PREPROCESSING_DESIGN.md` ("QUY TRÌNH BẢO MẬT & ẨN DANH HÓA DỮ LIỆU CÁ NHÂN (PII SANITIZATION ENGINE)") and Interface Contracts in `PROJECT.md`:
1. Vietnamese PII Detection Rules and STRICT Priority Ordering:
   - Priority 1: Plaintext Password -> `<MASKED_PASSWORD_n>`
   - Priority 2: Full Name & DOB (`Le Thi Lan Anh_SN: 30/07/2006`) -> `<MASKED_PERSON_NAME_n>`
   - Priority 3: Bank Account Number (8-16 digits with prefixes like STK, TK, so tai khoan) -> `<MASKED_BANK_ACC_n>`
   - Priority 4: OTP Verification Code (4-8 digits near OTP keywords like "ma otp", "ma xac thuc", "cua ban la", "cua quy khach la") -> `<MASKED_OTP_n>`
   - Priority 5: Personal Phone Number (10 digits starting with Vietnamese prefixes +84 / 0) -> `<MASKED_PHONE_NUMBER_n>`
   - Priority 6: Citizen ID / CCCD (12 digits BCA format `0\d{2}[0-3]\d{2}\d{6}`, regex `\b\d{12}\b`, plus edge cases 8-digit or 14-digit) -> `<MASKED_CCCD_n>`
   - CRITICAL PRECEDENCE REQUIREMENT: Explain and specify why Bank Account MUST be scanned before CCCD to prevent 12-digit bank accounts from being falsely masked as CCCD.
2. Context-preserving indexed tokens (`<MASKED_X_1>`, `<MASKED_X_2>`).
3. Salted HMAC-SHA256 reference mapping:
   - Per-session 32-byte crypto random salt (`crypto.randomBytes(32)`).
   - Consistent masking: identical raw PII within the same session maps to the same masked token using HMAC-SHA256 digest lookup.
4. Absolute preservation of existing placeholders: `[MONEY]`, `[NUMBER]`, `[TIME]` must NEVER be matched or re-masked by PII rules.
5. In-memory ephemeral lifecycle.
6. Interface conformance:
   - Interface `IPreprocessingService` in `PROJECT.md`:
     `cleanAndSanitize(ocrResult: OcrResult): PreprocessedDialogue`
     PreprocessedDialogue structure:
     `turns: PreprocessedTurn[]` (with `speaker: 'peer' | 'user'`, `text`, `imageIndex`)
     `formattedPromptText: string` (e.g. formatted dialogue turns ready for reasoning harness prompt)
     `sanitizedPiiCount: number`

Deliver a concrete, comprehensive implementation specification with exact regexes, precedence validation rules, hashing data structure, and test cases in your handoff report:
`c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\spec_miner_m2_3\handoff.md`.
Update `progress.md` in your state folder during execution and send a completion message back to parent when done.
