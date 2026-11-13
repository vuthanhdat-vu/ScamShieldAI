# Handoff Report — Preprocessing Remediation (Round 2)

**Agent**: `worker_m1_r2` (Preprocessing Remediation Worker — implementer, qa, specialist)  
**Task**: Apply 4 specific technical adjustments to `docs/PREPROCESSING_DESIGN.md` as requested by Challenger 1  
**Target File**: `docs/PREPROCESSING_DESIGN.md` (Exclusive write ownership respected; 0 modifications to `data_demo/` or `docs/REASONING_HARNESS_DESIGN.md`)  
**Verdict**: **READY FOR AUDIT / ACCEPTANCE**  
**Date**: 2026-11-12T11:03:45Z  

---

## 1. Observation

All 4 defects highlighted in Challenger 1's adversarial review report (`.agents/teamwork/challenger_1/handoff.md`) were inspected, reproduced, and remediated in `docs/PREPROCESSING_DESIGN.md`:

### 1.1. Defect 1: Image Directory Path Discrepancy
- **Before Remediation**:
  * Line 1432 of `docs/PREPROCESSING_DESIGN.md` specified:
    ```python
    img_base = Path('data_demo/single_image') if Path('data_demo/single_image').exists() else Path('data_demo/images')
    ```
  * Running this snippet on disk produced `AssertionError: Path does not exist!` because the on-disk directory is plural: `data_demo/single_images/`.
- **Applied Remediation**:
  * Updated lines 140, 362, 451, 1202, 1420, and 1459 of `docs/PREPROCESSING_DESIGN.md`.
  * Audit verification command at line 1459 now uses robust multi-path fallback:
    ```python
    img_base = Path('data_demo/single_images') if Path('data_demo/single_images').exists() else (Path('data_demo/single_image') if Path('data_demo/single_image').exists() else Path('data_demo/images'))
    ```
  * Line 362 and related prose now explicitly cite: `data_demo/single_images/` with aliases `data_demo/images/` and `data_demo/single_image/`.

### 1.2. Defect 2: Table 4.1 OTP Regex Colloquial Vietnamese Handling
- **Before Remediation**:
  * Table 4.1 specified: `(?i)(?:ma\s*otp|otp|ma\s*xac\s*thuc)\s*(?:la|:|=)?\s*([0-9]{4,8})\b`.
  * Testing against colloquial Vietnamese alert patterns failed on:
    * `"Ma OTP la: 482917"` $\rightarrow$ Returned `None` (failed due to composite connector `"la:"`).
    * `"Ma OTP cua ban la: 482917"` $\rightarrow$ Returned `None` (failed due to unhandled possessive `"cua ban"`).
    * `"Ma xac thuc cua Quy khach la: 654321"` $\rightarrow$ Returned `None` (failed due to unhandled `"cua Quy khach"`).
- **Applied Remediation**:
  * Updated Table 4.1 to robust regex:
    ```python
    re.compile(r"(?i)(?:ma\s*otp|otp|ma\s*xac\s*thuc)(?:\s+(?:cua\s+)?(?:ban|quy\s*khach))?\s*(?:la|:|=|\s)+\s*([0-9]{4,8})\b")
    ```
  * Empirical execution verifies $100\%$ detection across all standard and colloquial Vietnamese patterns (`482917`, `654321`, `123456`, `998877`).

### 1.3. Defect 3: PII Rule-Ordering Specification (Bank Account vs. Bare CCCD)
- **Before Remediation**:
  * Table 4.1 listed CCCD before Bank Account without specifying execution order.
  * In Vietnamese banking, account numbers commonly have 12 digits (e.g. Vietcombank, Techcombank, BIDV).
  * Executing bare 12-digit CCCD regex (`\b\d{12}\b`) before Bank Account regex (`STK:\s*(\d{8,16})`) greedily swallowed `"STK: 123456789012"` into `<MASKED_CCCD_1>`, destroying the financial transfer recipient entity needed by the downstream SLM and `RiskService`.
- **Applied Remediation**:
  * Re-ordered Table 4.1 by explicit execution priority (Order 1: Password $\rightarrow$ Order 2: Name & DOB $\rightarrow$ Order 3: Contextual Bank Account $\rightarrow$ Order 4: OTP $\rightarrow$ Order 5: Phone Number $\rightarrow$ Order 6: CCCD).
  * Added Section 4.1.A: *Đặc tả Thứ tự Thực thi Bắt buộc & Phân giải Xung đột Thực thể (Mandatory PII Rule-Ordering Specification)*, providing mathematical and algorithmic justification for why contextual Bank Account detection MUST execute prior to bare 12-digit CCCD masking.

### 1.4. Defect 4: Schema `session_id` Defense-in-Depth Pattern
- **Before Remediation**:
  * Section 5.1 JSON Schema defined `session_id` solely with `"format": "uuid"`.
  * Standard JSON Schema Draft 2020-12 / OpenAPI 3.1 validators that do not enable format assertions by default accepted non-UUID strings (`"session_id": "not-a-valid-uuid-string"`).
- **Applied Remediation**:
  * Updated Section 5.1 JSON Schema to include strict regex pattern defense-in-depth:
    ```json
    "session_id": {
      "type": "string",
      "format": "uuid",
      "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
      "description": "Unique UUID v4 tracking the inspection transaction across Gateway and AI Service."
    }
    ```
  * Updated Section 5.2 Field Dictionary to document both `format: uuid` and `pattern` constraints.

---

## 2. Logic Chain

1. **Path Resolution Logic**:
   - `Test-Path data_demo/single_images` evaluates to `True` on disk; `data_demo/single_image` evaluates to `False`.
   - By structuring the path resolver as `img_base = Path('data_demo/single_images') if Path('data_demo/single_images').exists() else (Path('data_demo/single_image') if Path('data_demo/single_image').exists() else Path('data_demo/images'))`, the audit commands execute deterministically on disk without throwing `FileNotFoundError` or `AssertionError`.
2. **Regex Precedence & Grammar Logic**:
   - Vietnamese banking notifications include colloquial connectives (`"la:"`, `"cua ban la:"`, `"cua Quy khach la:"`).
   - Using `(?:la|:|=|\s)+` allows consuming composite punctuation (`la:`) without stalling the regex pointer before digits.
   - Ordering contextual entities (`STK: \d{8,16}`) before unanchored entities (`\b\d{12}\b`) guarantees that entity disambiguation preserves semantics for downstream LLM/SLM risk analysis.
3. **Draft 2020-12 Specification Logic**:
   - RFC Draft 2020-12 Section 7 states that `format` keyword validation is an annotation and implementation-dependent unless format assertions are explicitly configured.
   - The `pattern` keyword is an active assertion in all compliant Draft 2020-12 engines. Pairing `format: uuid` with the regex pattern provides universal, defense-in-depth validation regardless of validator runtime settings.

---

## 3. Caveats

- **Exclusive Write Scope**: Modifications were strictly confined to `docs/PREPROCESSING_DESIGN.md`. No changes were made to `data_demo/` or `docs/REASONING_HARNESS_DESIGN.md`.
- **Existing Test Assets**: The test suite `tests/test_empirical_challenge.py` authored by Challenger 1 in `tests/` remains intact and was leveraged as the definitive regression benchmark.

---

## 4. Conclusion

All 4 technical remediation points raised by Challenger 1 have been implemented in `docs/PREPROCESSING_DESIGN.md`.
- Image path discrepancies resolved with multi-path fallback (`single_images/` supported).
- Table 4.1 OTP regex updated to handle colloquial Vietnamese patterns.
- PII rule ordering explicitly specified and documented (Bank Account before bare CCCD).
- `session_id` in JSON Schema hardened with strict UUID regex pattern.
- The document is fully compliant with the project integrity mandate and ready for forensic audit.

---

## 5. Verification Method

Run the following commands from the project root (`c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI`):

```powershell
# 1. Run the complete empirical challenge test suite
python tests/test_empirical_challenge.py
# Expected output: Ran 10 tests ... OK

# 2. Run the updated on-disk data integrity verification script
python -c "
import json, csv
from pathlib import Path

# A. conservations.json (38 dialogues, 628 turns)
with open('data_demo/conservations.json', 'r', encoding='utf-8') as f:
    convs = json.load(f)
assert len(convs) == 38, f'Expected 38 dialogues, got {len(convs)}'
turns = sum(len(c['dialogue']) for c in convs)
assert turns == 628, f'Expected 628 turns, got {turns}'

# B. dataset_url_sampled.csv (3,192 URLs)
with open('data_demo/dataset_url_sampled.csv', 'r', encoding='utf-8') as f:
    urls = list(csv.reader(f))
assert len(urls) == 3193, f'Expected 3193 lines (inc header), got {len(urls)}'

# C. Scam.csv (1,319 rows) & No_scam.csv (1,930 rows)
with open('data_demo/Scam.csv', 'r', encoding='utf-8') as f:
    scams = list(csv.reader(f))
with open('data_demo/No_scam.csv', 'r', encoding='utf-8') as f:
    no_scams = list(csv.reader(f))
assert len(scams) == 1320, f'Expected 1320 lines (inc header), got {len(scams)}'
assert len(no_scams) == 1931, f'Expected 1931 lines (inc header), got {len(no_scams)}'

# D. images dataset (50 images, 50 transcripts, 50 metadata entries)
img_base = Path('data_demo/single_images') if Path('data_demo/single_images').exists() else (Path('data_demo/single_image') if Path('data_demo/single_image').exists() else Path('data_demo/images'))
with open(img_base / 'metadata.json', 'r', encoding='utf-8') as f:
    meta = json.load(f)
assert len(meta) == 50, f'Expected 50 metadata entries, got {len(meta)}'
assert len(list((img_base / 'images').glob('*'))) == 50, 'Expected 50 image files'
assert len(list((img_base / 'texts').glob('*.txt'))) == 50, 'Expected 50 transcript files'

print('SUCCESS: All 5 streamlined data sources verified with 100% integrity!')
"

# 3. Verify schema session_id pattern defense-in-depth with plain validator (no FormatChecker)
python -c "
import json
from jsonschema import Draft202012Validator

with open('docs/PREPROCESSING_DESIGN.md', 'r', encoding='utf-8') as f:
    text = f.read()

prefix = 'https://json-schema.org/draft/2020-12/schema'
idx = text.find(prefix)
start = text.rfind('{\n', 0, idx)
end = text.find('```', start)
schema = json.loads(text[start:end])
plain_validator = Draft202012Validator(schema)

f_idx = text.find('#### Fixture 2:')
code_start = text.find('```json\n', f_idx) + len('```json\n')
code_end = text.find('```', code_start)
fixture2 = json.loads(text[code_start:code_end])

assert plain_validator.is_valid(fixture2), 'Valid fixture must pass'
invalid_f2 = dict(fixture2)
invalid_f2['session_id'] = 'not-a-valid-uuid-string'
assert not plain_validator.is_valid(invalid_f2), 'Plain validator must reject invalid session_id due to pattern regex'
print('SUCCESS: Schema session_id pattern defense-in-depth confirmed!')
"
```
