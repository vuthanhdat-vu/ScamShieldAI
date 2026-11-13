## 2026-11-12T10:50:57Z
You are a teamwork_worker agent.
Role: Preprocessing Remediation Worker (Round 2)
Working directory: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI
State folder: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\worker_m1_r2\
Original request path: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\ORIGINAL_REQUEST.md
Scope document: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\orchestrator_2\SCOPE.md

You MUST read ORIGINAL_REQUEST.md and SCOPE.md before starting work.
Also read the Challenger 1 handoff report:
`c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\challenger_1\handoff.md`

EXCLUSIVE WRITE OWNERSHIP:
You own `docs/PREPROCESSING_DESIGN.md`. You MUST NOT modify any files in `data_demo/` or `docs/REASONING_HARNESS_DESIGN.md`.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Mission:
Apply the 4 specific technical adjustments to `docs/PREPROCESSING_DESIGN.md` as requested by Challenger 1:
1. Image Directory Path Discrepancy:
   - On disk, the directory is `data_demo/single_images/` (plural 's') or `data_demo/images/`.
   - Update line 1432 and line 362 (and all audit/verification commands) to robustly handle the on-disk directory:
     `img_base = Path('data_demo/single_images') if Path('data_demo/single_images').exists() else (Path('data_demo/single_image') if Path('data_demo/single_image').exists() else Path('data_demo/images'))`
     Ensure running the verification command in Python passes with 0 errors on disk.
2. Table 4.1 OTP Regex Enhancement:
   - Update the OTP regex to handle colloquial Vietnamese patterns:
     `re.compile(r"(?i)(?:ma\s*otp|otp|ma\s*xac\s*thuc)(?:\s+cua\s+(?:ban|quy\s+khach))?\s*(?:la|:|=)?\s*([0-9]{4,8})\b")`
     so that `"Ma OTP la: 482917"`, `"Ma OTP cua ban la: 482917"`, and `"Ma xac thuc cua Quy khach la: 654321"` match reliably.
3. Table 4.1 PII Rule-Ordering Specification:
   - Explicitly document and order the pipeline so that Contextual Bank Account masking (STK with prefix) is executed BEFORE bare 12-digit CCCD masking, preventing 12-digit bank accounts from being misclassified as CCCD tokens.
4. Schema `session_id` Defense-in-Depth Pattern:
   - In Section 5.1 JSON Schema Draft 2020-12, add `"pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"` to `session_id` alongside `"format": "uuid"` so validators without format assertions enforce strict UUID formatting.

Write your handoff report to:
`c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\worker_m1_r2\handoff.md`
When finished, notify the orchestrator via send_message to conversation ID: 432e0a44-5488-4ca3-b0fb-fd41e17d59f3.


## 2026-11-12T10:57:49Z
**Context**: Preprocessing Remediation (Round 2).
**Content**: Please report your progress on applying the 4 fixes to docs/PREPROCESSING_DESIGN.md (image directory path, OTP regex, PII rule-ordering, session_id pattern).
**Action**: Please let us know if edits are completed and deliver your handoff report.
