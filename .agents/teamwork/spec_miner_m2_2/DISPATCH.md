## 2026-11-13T16:07:44Z
You are a Spec Miner for Milestone 2: Preprocessing & PII Sanitization Module.
Working directory: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI
State folder: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\spec_miner_m2_2

MANDATORY READING:
- Read ORIGINAL_REQUEST.md at: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\ORIGINAL_REQUEST.md
- Read PROJECT.md at: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\PROJECT.md
- Read SCOPE.md at: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\sub_orch_m2\SCOPE.md
- Read PREPROCESSING_DESIGN.md at: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\docs\PREPROCESSING_DESIGN.md

Your task:
Deeply analyze Section 3 of `docs/PREPROCESSING_DESIGN.md` ("QUY TRÌNH KHỬ NHIỄU, CHỐNG NGỤY TRANG ĐỐI KHÁNG & CHUẨN HÓA TIẾNG VIỆT"):
1. Unicode NFC & NFKC normalization rules.
2. Invisible & zero-width characters stripping (full list of unicode codepoints: \u200B-\u200D, \uFEFF, \u3164, \uFFA0, \u00AD, \u202A-\u202E, etc.).
3. Mathematical monospace and special font transcoding (exact Unicode ranges and ASCII offset formulas for monospace lowercase/uppercase/digits, bold, italic, fullwidth).
4. Character stuttering / repetition compression (>=3 identical chars to 1, alternating case patterns, preserving Vietnamese double vowels/consonants like 'oo', 'qu', 'ng').
5. Adversarial spaced-out broken URL reconstruction (e.g., "http : //", "domain .com", "https ://", fixing schemes, merging spaces).
6. Telex typo repair (dd -> đ, aa -> â, oo -> ô, ee -> ê, as -> á, etc.).
7. Vietnamese SMS slang dictionary normalization (stk -> số tài khoản, tk -> tài khoản, cccd -> căn cước công dân, mk -> mật khẩu, ko/k -> không, dc/đc -> được, etc.).
8. Risk-preserving stopword retention: NEVER remove conditional/urgency words ("nếu", "thì", "ngay", "phải", "trước", "trong", etc.).
9. Placeholder preservation: 100% intact guarantee for `[MONEY]`, `[NUMBER]`, `[TIME]`.

Deliver a concrete, comprehensive implementation specification with precise regex patterns, substitution dictionaries, and edge-case handling rules for the Worker in your handoff report:
`c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\spec_miner_m2_2\handoff.md`.
Update `progress.md` in your state folder during execution and send a completion message back to parent when done.
