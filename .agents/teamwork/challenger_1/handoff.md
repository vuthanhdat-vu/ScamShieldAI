# Handoff Report — Empirical Adversarial Challenge: Preprocessing Design & Data Schemas

**Agent**: `challenger_1` (EMPIRICAL CHALLENGER — critic, specialist)  
**Task**: Empirical code-executing adversarial challenge of Data Schemas, Preprocessing Design (`docs/PREPROCESSING_DESIGN.md`), and Data Assets in `data_demo/`  
**Verdict**: **REQUEST_CHANGES** (Actionable technical fixes required for production readiness)  
**Date**: 2026-11-12T10:49:00Z  

---

## 1. Observation

All observations below are derived from direct execution of `tests/test_empirical_challenge.py` and empirical exploration of `data_demo/` and `docs/PREPROCESSING_DESIGN.md`.

### 1.1. Schema Extraction & Meta-Schema Conformance
- **Extracted Target**: The JSON Schema in `docs/PREPROCESSING_DESIGN.md` Section 5.1 (`UnifiedScamInspectionPayload`, Draft 2020-12 / OpenAPI 3.1) was successfully extracted and checked with `jsonschema.Draft202012Validator.check_schema(schema)`. It is a valid, well-formed meta-schema.
- **Fixtures Validation**: All 5 concrete payload fixtures in Section 5.3 validated with 0 errors against the extracted schema.
- **Real Data Validation**:
  * `data_demo/conservations.json`: All 38 dialogues (628 turns total) conform to the adapted schema.
  * `data_demo/dataset_url_sampled.csv`: All 19 pattern groups (3,192 URLs) conform to the schema.
  * `data_demo/Scam.csv`: Sample scam messages conform to the schema.
  * `data_demo/No_scam.csv`: Sample safe messages conform to the schema.
  * `data_demo/single_images/metadata.json`: All 50 screenshot test cases conform to the schema.

### 1.2. Defect 1: Image Directory Path Discrepancy Breaks Independent Audit Command
- **Observation in Document**:
  * In `docs/PREPROCESSING_DESIGN.md` line 1432, the independent audit script specifies:
    ```python
    img_base = Path('data_demo/single_image') if Path('data_demo/single_image').exists() else Path('data_demo/images')
    assert len(meta) == 50, f'Expected 50 metadata entries, got {len(meta)}'
    ```
  * In line 362: *"tại data_demo/single_image/ (được alias chuẩn hóa là data_demo/images/)"*.
- **Empirical Execution**:
  ```powershell
  python -c "from pathlib import Path; img_base = Path('data_demo/single_image') if Path('data_demo/single_image').exists() else Path('data_demo/images'); assert img_base.exists(), 'Path does not exist!'"
  ```
  **Result**:
  ```
  AssertionError: Path does not exist!
  img_base exists? False path: data_demo\images
  ```
- **On-Disk Reality**: The actual directory on disk is `data_demo/single_images/` (plural). Neither `data_demo/single_image/` nor `data_demo/images/` exists.

### 1.3. Defect 2: Table 4.1 OTP Regex Fails on Colloquial Vietnamese Banking Alerts
- **Observation in Document**:
  * `docs/PREPROCESSING_DESIGN.md` Section 4.1 Table specifies:
    ```python
    re_otp = re.compile(r"(?i)(?:ma\s*otp|otp|ma\s*xac\s*thuc)\s*(?:la|:|=)?\s*([0-9]{4,8})\b")
    ```
- **Empirical Execution**:
  * `"Ma OTP la 482917"` $\rightarrow$ Matches `482917` (Pass)
  * `"Ma OTP la: 482917"` $\rightarrow$ `None` (FAILS because `(?:la|:|=)?` matches `la` but fails on subsequent `:`)
  * `"Ma OTP cua ban la: 482917"` $\rightarrow$ `None` (FAILS because possessive `"cua ban"` is unhandled)
  * `"Ma xac thuc cua Quy khach la: 654321"` $\rightarrow$ `None` (FAILS because `"cua Quy khach"` is unhandled)

### 1.4. Defect 3: PII Rule-Ordering Collision (12-Digit Bank Account Swallowed as CCCD)
- **Observation in Document**:
  * Section 4.1 Table lists CCCD first with loose regex `\b\d{12}\b`, and Bank Account second with regex `(?i)(?:stk|tk|tai\s*khoan|so\s*tk|so\s*tai\s*khoan)\s*[:.\-]?\s*(\d{8,16})\b`.
- **Empirical Execution**:
  * Input string: `"Chị gửi tiền vào STK: 123456789012 kèm số CCCD 001099012345 số tiền là [MONEY] nhé."`
  * When executing CCCD before Bank Account:
    Output: `"Chị gửi tiền vào STK: <MASKED_CCCD_1> kèm số CCCD <MASKED_CCCD_2> số tiền là [MONEY] nhé."`
    The 12-digit bank account number was erroneously classified as a CCCD token!
  * When executing Bank Account before CCCD:
    Output: `"Chị gửi tiền vào STK: <MASKED_BANK_ACC_1> kèm số CCCD <MASKED_CCCD_1> số tiền là [MONEY] nhé."` (Correct)

### 1.5. Defect 4: Schema `session_id` Format Validation Bypass
- **Observation in Document**:
  * Section 5.1 specifies:
    ```json
    "session_id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique UUID v4 tracking the inspection transaction across Gateway and AI Service."
    }
    ```
- **Empirical Execution**:
  * Unlike `file_hash_sha256` (`"pattern": "^[0-9a-f]{64}$"`), `session_id` lacks an explicit regex `pattern`.
  * In standard JSON Schema Draft 2020-12 / OpenAPI 3.1 validators that do not enable optional format assertions, `"session_id": "not-a-valid-uuid-string"` evaluates to `valid = True`.

### 1.6. RFC 4180 Multiline & Placeholder Verification
- **`Scam.csv`**:
  * Parsed via `csv.reader`: Exactly 1,319 records (+1 header = 1,320).
  * Multiline records with embedded `\n` inside quotes: Exactly 27 records.
  * Naive `readlines()`: Produces 1,387 lines (record fragmentation verified).
  * Placeholder counts: `[MONEY]` = 236, `[NUMBER]` = 204, `[TIME]` = 48.
  * Mock domains: Exactly 748 records (56.71%) contain `sim.example.vn`.
- **`No_scam.csv`**:
  * Parsed via `csv.reader`: Exactly 1,930 records (+1 header = 1,931).
  * Multiline records with embedded `\n` inside quotes: Exactly 524 records (27.15%).
  * Naive `readlines()`: Produces 3,279 lines (fragmentation of 1,349 lines verified).
  * Placeholder counts: `[MONEY]` = 1,341, `[NUMBER]` = 1,172, `[TIME]` = 590.
- **Caller Handover in `conservations.json`**:
  * Exactly 1 consecutive same-role occurrence exists across all 38 conversations and 628 turns: Conversation ID 9, turns index 10 and 11 (0-indexed, corresponding to 1-indexed turns 11 and 12).
  * Turn 10 regex match: `r"(?i)(?:chuyển máy|nối máy|chị ấy sẽ hướng dẫn)"` triggers on `"Để em chuyển máy cho chị kế toán..."`.
  * Turn 11: `"Alo, chào chị. Em là Hạnh, kế toán trưởng..."` triggers `actor_switch: true`.

---

## 2. Logic Chain

1. **Path Consistency Logic**:
   - Observation 1.2 proves that `data_demo/single_images/` is the true directory name on disk, while `data_demo/single_image/` and `data_demo/images/` do not exist.
   - When the independent audit command in line 1432 of `PREPROCESSING_DESIGN.md` is executed, it raises `AssertionError: Path does not exist!`.
   - Therefore, the documentation and audit scripts must be aligned with the plural directory name `data_demo/single_images/`.

2. **Regex Robustness Logic**:
   - Observation 1.3 proves that the design's OTP regex fails to parse standard Vietnamese banking OTP messages where `la:` or `cua ban la:` appears.
   - Since OTP theft is a primary scam category in ScamShieldAI (`OTP_THEFT`), failing to match the OTP code leaves the raw 6-digit OTP exposed in prompts and logs, violating Decree 13/2023/NĐ-CP.
   - Therefore, the regex must support optional possessive qualifiers and trailing punctuation:
     `r"(?i)(?:ma\s*otp|otp|ma\s*xac\s*thuc)(?:\s+(?:cua\s+)?(?:ban|quy\s*khach))?\s*(?:la|:|=|\s)+\s*([0-9]{4,8})\b"`.

3. **Entity Disambiguation Logic**:
   - Observation 1.4 proves that executing a bare 12-digit number regex (`\b\d{12}\b`) before Bank Account regex causes 12-digit bank accounts to be mislabeled as `<MASKED_CCCD_n>`.
   - The downstream SLM reasoning engine relies on typed tokens to deduce malicious intent (e.g., asking to transfer money to `<MASKED_BANK_ACC_1>`). Mislabeled tokens distort the reasoning prompt scaffolding.
   - Therefore, the preprocessing engine must either enforce execution order (Bank Account with prefix *before* bare 12-digit CCCD) or add negative lookbehinds to the loose CCCD regex.

4. **Schema Defense-in-Depth Logic**:
   - Observation 1.5 proves that `format: "uuid"` alone does not prevent malformed strings in standard Draft 2020-12 validators without format-checker plugins.
   - Adding `"pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"` guarantees that every compliant JSON parser will enforce UUID integrity regardless of runtime configuration.

---

## 3. Caveats

- **Test Suite Location**: The verification suite `tests/test_empirical_challenge.py` was authored and executed in `tests/` pursuant to Project Layout rules (preventing source/test contamination under `.agents/teamwork/`).
- **Data Integrity**: Zero files under `data_demo/` or `docs/` were modified by this challenger.
- **Multimodal OCR**: Image OCR tests simulated layout transcript extraction against ground truth metadata rather than spinning up PaddleOCR ONNX runtime, as OCR model weights are not committed to git repository.

---

## 4. Conclusion

**Verdict: REQUEST_CHANGES**

While the Preprocessing Design (`docs/PREPROCESSING_DESIGN.md`) is structurally sound, mathematically rigorous, and fully aligned with the streamlined datasets, the following 4 technical fixes must be applied to achieve production readiness:

1. **Fix Image Path References**: Update lines 26, 140, 362, 1393, and 1432 from `single_image/` to `single_images/` to prevent `FileNotFoundError` during automated auditing.
2. **Update OTP Regex**: Broaden Table 4.1 OTP regex to:
   `r"(?i)(?:ma\s*otp|otp|ma\s*xac\s*thuc)(?:\s+(?:cua\s+)?(?:ban|quy\s*khach))?\s*(?:la|:|=|\s)+\s*([0-9]{4,8})\b"`
3. **Explicit Rule-Ordering Requirement**: In Section 4.1 and Section 4.2, explicitly document the mandatory rule-ordering: **Bank Account detection MUST execute before bare 12-digit CCCD detection** to prevent 12-digit account numbers with `STK:` prefixes from being captured as Citizen IDs.
4. **Harden `session_id` in Schema**: Add explicit regex pattern:
   `"pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"` to Section 5.1.

---

## 5. Verification Method

To independently reproduce and verify all observations, empirical stress-test results, and edge case findings:

```powershell
# 1. Execute the complete empirical challenge test suite
python tests/test_empirical_challenge.py

# 2. Verify on-disk image directory name
powershell -Command "Test-Path data_demo/single_images/metadata.json"  # True
powershell -Command "Test-Path data_demo/single_image/metadata.json"   # False

# 3. Verify RFC 4180 multiline counts in Scam.csv and No_scam.csv
python -c "
import csv
scam = list(csv.reader(open('data_demo/Scam.csv', encoding='utf-8')))[1:]
noscam = list(csv.reader(open('data_demo/No_scam.csv', encoding='utf-8')))[1:]
print('Scam rows:', len(scam), 'Multiline:', sum(1 for r in scam if '\n' in r[0]))
print('No_scam rows:', len(noscam), 'Multiline:', sum(1 for r in noscam if '\n' in r[0]))
"

# 4. Verify caller handover turn 10-11 in Conv ID 9
python -c "
import json
convs = json.load(open('data_demo/conservations.json', encoding='utf-8'))
c9 = [c for c in convs if c['id'] == 9][0]
print('Turn 11:', c9['dialogue'][10]['role'], '->', c9['dialogue'][10]['content'][:60])
print('Turn 12:', c9['dialogue'][11]['role'], '->', c9['dialogue'][11]['content'][:60])
"
```
