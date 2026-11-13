# Handoff Report: Environment, Tooling & Implementation Architecture Survey

**Agent**: `teamwork_explorer_survey_3`  
**State Folder**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\teamwork_explorer_survey_3\`  
**Date**: 2026-11-12T15:04:30+07:00  
**Type**: Hard Handoff (Investigation Complete)

---

## 1. Observation

### 1.1 Repository Structure and Files
- Working directory `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI` contains:
  - `.agents/` (teamwork state, untracked in git)
  - `.git/` (git repository metadata)
  - `BE_codex/` (NestJS backend API with TypeScript, ESLint, Jest, Swagger docs)
  - `FE_codex/` (React Native Expo frontend client with TypeScript)
  - `data_demo/` (datasets folder, untracked in git)
  - `docs/` (contains `EDA_REPORT.md` [87,830 bytes], `PREPROCESSING_DESIGN.md` [85,368 bytes], `REASONING_HARNESS_DESIGN.md` [77,937 bytes], untracked)
  - `tests/` (contains `tests/stress_testing/`, untracked)
  - `PROJECT.md` (master architecture, untracked)
  - `README.md` (top-level readme, tracked)
  - `.gitignore` (tracked)

### 1.2 Python Runtime & Tooling
- Python interpreter command: `python --version`
  - Output: `Python 3.13.15`
  - Binary path: `C:\Users\leemi\AppData\Local\Programs\Python\Python313\python.exe`
- Package manager:
  - `pip`: 26.2.1 (`C:\Users\leemi\AppData\Local\Programs\Python\Python313\Scripts\pip.exe`)
  - `uv`: uv 0.11.5 (`C:\Users\leemi\.local\bin\uv.exe`)
- Virtual environment:
  - `Test-Path .\.venv, .\venv, .\env` returned `False, False, False`. No local virtualenv exists.
- Testing frameworks:
  - `python -m pytest --version` returned: `C:\Users\leemi\AppData\Local\Programs\Python\Python313\python.exe: No module named pytest` (exit code 1).
  - Standard library `unittest` is available.
  - Existing stress tests in `tests/stress_testing/` (`test_schema_boundaries.py`, etc.) are runnable via `python tests/stress_testing/<test>.py` with `assert` statements.

### 1.3 Installed Python Libraries
- `pip list` confirmed presence of:
  - `pandas` 3.0.5
  - `numpy` 2.5.2
  - `pydantic` 2.14.3
  - `jsonschema` 4.26.0
  - `regex` 2026.9.29
  - `tqdm` 4.70.0
  - `scikit-learn` 1.9.0
  - Standard library modules `json`, `csv`, `unicodedata`, `re`, `hashlib`, `unittest` are fully functional.

### 1.4 Conversation JSON Datasets
- 5 folders under `data_demo/`:
  - `data_demo\Lừa đảo từ thiện\core.json`: 5 conversations, 74 turns, IDs: `[1, 2, 3, 4, 5]`
  - `data_demo\Lừa đảo đầu tư tiền ảo\core.json`: 3 conversations, 46 turns, IDs: `[1, 2, 3]`
  - `data_demo\Lừa đảo đặt bàn ăn\core.json`: 10 conversations, 170 turns, IDs: `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]`
  - `data_demo\Lừa đảo đặt phòng khách sạn\core.json`: 10 conversations, 176 turns, IDs: `[1, 2, 3, 4, 5, 6, 7, 8, 9, 13]` (ID gap: skips 10, 11, 12)
  - `data_demo\Lừa đảo định danh cccd\core.json`: 10 conversations, 162 turns, IDs: `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]`
- Total: 38 conversations, 628 turns.
- All conversation records share schema: `{"_id": int, "dialogue": [{"role": "người gọi"|"người nhận", "content": str}]}`.

### 1.5 Tabular CSV Datasets & Encodings
- `dataset_url.csv`:
  - Header: `['channel', 'label', 'url_norm']`
  - Total rows: 53,116; Unique `url_norm`: 53,116; Duplicate rows: 0.
  - Multi-line rows: 0. Encoding: UTF-8 / ASCII.
- `No_scam.csv`:
  - First bytes: `b'\xef\xbb\xbfm'` (UTF-8 Byte Order Mark).
  - Header: `['\ufeffmessage']` if decoded with plain UTF-8; `['message']` when decoded with `utf-8-sig`.
  - Total rows: 2,204; Unique `message`: 1,930; Duplicate rows: 274.
  - Multi-line rows with embedded newline `\n`: 587 rows.
- `Scam.csv`:
  - Attempting `pd.read_csv('data_demo/Scam.csv', encoding='utf-8')` produced verbatim error:
    `UnicodeDecodeError: 'utf-8' codec can't decode byte 0xf4 in position 91825: invalid continuation byte`
  - Inspection revealed byte sequence `b'Th\xf4ng b\xe1o t? VIETINBANK: B?n d\xf9ng vui l\xf2ng...'` at line 776.
  - Lines 0 to 775 contain pure ASCII (<128). Lines 776 to end contain single-byte Windows-1252 / ISO-8859-1 diacritics. There are zero multi-byte UTF-8 sequences in the entire file.
  - Decoding with `windows-1252` succeeded across all 196,670 bytes without error.
  - Header: `['message']`.
  - Total rows: 1,430; Unique `message`: 1,319; Duplicate rows: 111.
  - Multi-line rows with embedded newline `\n`: 27 rows.
- Cross-dataset overlap:
  - `No_scam.csv` vs `Scam.csv`: 0 overlapping messages.
  - `dataset_url.csv` vs `No_scam.csv`: 0 overlapping entries.
  - `dataset_url.csv` vs `Scam.csv`: 0 overlapping entries.

---

## 2. Logic Chain

1. **Test Runner Selection**:
   - Observation 1.2 shows `pytest` is not installed, while `python` 3.13 and `unittest` are installed.
   - Observation 1.2 shows existing stress tests run as standalone python scripts.
   - *Inference*: Test and verification scripts must be written as standalone executable Python scripts (`python tests/verify_datasets.py`) using `assert` or `unittest`, avoiding a dependency on `pytest`.

2. **JSON Merger Strategy**:
   - Observation 1.4 confirms 38 conversations across 5 folders with 628 turns.
   - Observation 1.4 shows each folder resets `_id` to 1, and hotel bookings have an ID gap (`...9, 13`).
   - The user specification states: "mỗi bản ghi hội thoại bao gồm trường 'id' và trường 'dialogue'".
   - *Inference*: The merger script should iterate through the 5 folders in fixed order, map `_id` to sequential global integer `id` (1 to 38), preserve the exact `dialogue` array (`role` and `content`), and output to `data_demo/merged_conversations.json` with `ensure_ascii=False` and `indent=2`.

3. **CSV Deduplication & Encoding Strategy**:
   - Observation 1.5 shows `No_scam.csv` has a BOM (`\xef\xbb\xbf`) and 587 multi-line fields.
   - Observation 1.5 shows `Scam.csv` has Windows-1252 encoding and 27 multi-line fields.
   - *Inference 3a*: Naive line-based splitting (`split('\n')`) will break on multi-line rows. The deduplicator must use RFC 4180 parsing (`pandas.read_csv` or `csv.reader`).
   - *Inference 3b*: `No_scam.csv` must be read with `encoding='utf-8-sig'`.
   - *Inference 3c*: `Scam.csv` must be read with `encoding='windows-1252'` or `latin-1`.
   - *Inference 3d*: Both files must be rewritten in valid `utf-8` (or `utf-8-sig`) with `quoting=csv.QUOTE_MINIMAL` so future readers can read all files without encoding crashes.
   - *Inference 3e*: Deduplication must keep the first occurrence (`keep='first'`), resulting in exact final row counts: `dataset_url.csv` = 53,116, `No_scam.csv` = 1,930, `Scam.csv` = 1,319.

4. **Independent Verification Script**:
   - Observations 1.4 and 1.5 establish exact expected counts and schemas.
   - *Inference*: A standalone verification script (`tests/verify_datasets.py`) can programmatically verify:
     - Existence and schema of `merged_conversations.json` (38 conversations, 628 turns).
     - Integrity of original 5 JSON directories and `core.json` files (must remain untouched).
     - Clean UTF-8 decodability and exact row counts for `dataset_url.csv` (53,116), `No_scam.csv` (1,930), and `Scam.csv` (1,319).
     - Zero internal duplicates in all 3 files.

---

## 3. Caveats

- **No Caveats**: All 5 JSON folders and all 3 CSV files were directly inspected, parsed, and verified down to byte offsets, encodings, and row counts.
- **Assumed Output Encoding**: We recommend writing cleaned CSVs in UTF-8 (`utf-8` or `utf-8-sig`) to permanently resolve the Windows-1252 decode error for downstream models. If any downstream system requires Windows-1252 specifically for `Scam.csv`, that would preserve the legacy encoding, but UTF-8 is the industry standard for AI datasets.

---

## 4. Conclusion

1. The repository environment is fully equipped for immediate execution using Python 3.13.15, `pandas` 3.0.5, and standard library `json`/`csv`.
2. The JSON merger task (M1) will combine 38 conversations across 5 directories into `data_demo/merged_conversations.json` with 628 total dialogue turns.
3. The CSV deduplication task (M2) will drop 0 rows from `dataset_url.csv`, 274 duplicate rows from `No_scam.csv` (yielding 1,930 clean rows), and 111 duplicate rows from `Scam.csv` (yielding 1,319 clean rows). Cross-dataset overlap across all three files is 0.
4. Specific encoding handlers (`utf-8-sig` for `No_scam.csv`, `windows-1252` for `Scam.csv`) and RFC 4180 multi-line quote handling are essential to prevent runtime crashes and data corruption.
5. Verification should be packaged as a standalone script `tests/verify_datasets.py` executed via `python tests/verify_datasets.py`.

---

## 5. Verification Method

To independently verify the observations and findings in this report, execute the following commands in PowerShell from the project root `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI`:

1. **Verify Python & uv versions**:
   ```powershell
   python --version
   uv --version
   ```
   *Expected*: `Python 3.13.15`, `uv 0.11.5`.

2. **Verify JSON files and conversation counts**:
   ```powershell
   python -c "import json, glob; print([(p, len(json.load(open(p, encoding='utf-8')))) for p in glob.glob('data_demo/Lừa đảo*/*.json')])"
   ```
   *Expected*: 5 items, counts: `5, 3, 10, 10, 10` (total 38).

3. **Verify CSV encodings and duplicate counts**:
   ```powershell
   python -c "import pandas as pd; u=pd.read_csv('data_demo/dataset_url.csv'); ns=pd.read_csv('data_demo/No_scam.csv', encoding='utf-8-sig'); s=pd.read_csv('data_demo/Scam.csv', encoding='windows-1252'); print('URL:', len(u), u['url_norm'].duplicated().sum()); print('No_scam:', len(ns), ns['message'].duplicated().sum()); print('Scam:', len(s), s['message'].duplicated().sum())"
   ```
   *Expected*:
   - URL: 53116 rows, 0 duplicates
   - No_scam: 2204 rows, 274 duplicates (yielding 1930 unique)
   - Scam: 1430 rows, 111 duplicates (yielding 1319 unique)

4. **Verify reproduction of Scam.csv utf-8 crash**:
   ```powershell
   python -c "import pandas as pd; pd.read_csv('data_demo/Scam.csv')"
   ```
   *Expected*: `UnicodeDecodeError: 'utf-8' codec can't decode byte 0xf4 in position 91825: invalid continuation byte`.
