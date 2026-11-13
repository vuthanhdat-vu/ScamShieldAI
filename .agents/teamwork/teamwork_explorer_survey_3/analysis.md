# Repository Environment, Tooling & Implementation Architecture Survey

**Explorer**: `teamwork_explorer_survey_3`  
**Working Directory**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI`  
**State Folder**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\teamwork_explorer_survey_3\`  
**Timestamp**: `2026-11-12T15:03:30+07:00`  
**Status**: COMPLETE (Read-Only Investigation)

---

## 1. Executive Summary

This survey provides a comprehensive audit of the execution environment, repository structure, Python runtime, tooling, and dataset characteristics for the `ScamShieldAI` project. The immediate task for the upcoming milestone is:
1. Merging 38 multi-turn Vietnamese scam conversations from 5 source directories into `data_demo/merged_conversations.json` while strictly preserving original directories and conversation schemas.
2. Deduplicating 3 CSV datasets (`dataset_url.csv`, `No_scam.csv`, `Scam.csv`) in-place based on their primary content column and producing a comprehensive duplicate and cross-overlap report.
3. Establishing an independent verification script to audit both deliverables against acceptance criteria.

**Key Technical Discoveries**:
- **Python Runtime**: Global Python 3.13.15 is installed with `uv` (0.11.5) and `pip` (26.2.1). No project-local virtual environment (`.venv`) is activated.
- **Installed Libraries**: `pandas` (3.0.5), `numpy` (2.5.2), `pydantic` (2.14.3), `jsonschema` (4.26.0), `regex` (2026.9.29), and standard Python libraries (`json`, `csv`, `unicodedata`, `hashlib`, `unittest`) are immediately available.
- **Testing Framework**: No `pytest` package is installed globally; existing repo tests (`tests/stress_testing/`) use standalone Python scripts with native assertions and `__main__` entrypoints. Future test scripts should use standard Python scripts / `unittest` to run cleanly without extra dependency installation.
- **Critical CSV Encoding Trap**: `No_scam.csv` uses UTF-8 with BOM (`utf-8-sig`). `Scam.csv` uses single-byte Windows-1252 / ISO-8859-1 encoding with raw diacritic bytes (e.g. `\xf4` for `ô`, `\xe1` for `á`); attempting to read `Scam.csv` with standard `utf-8` triggers an immediate `UnicodeDecodeError`!
- **Critical CSV Multi-line Field Trap**: 587 rows in `No_scam.csv` and 27 rows in `Scam.csv` contain embedded newline (`\n`) characters inside quoted fields. Any naive line-by-line reading (`readlines()`) will corrupt the dataset. Standard RFC 4180 parsing via `csv.reader` or `pandas.read_csv` is mandatory.
- **Git State**: The git repo is on branch `main`. Crucial assets (`data_demo/`, `docs/`, `tests/`, `PROJECT.md`, `.agents/`) are currently **untracked** in git.

---

## 2. Repository Layout & Existing Subprojects

The `ScamShieldAI` workspace contains three co-existing system layers:

```
c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\
├── .agents/                          # Teamwork orchestration metadata & agent state (UNTRACKED)
├── .git/                             # Git repository metadata
├── .gitignore                        # Standard ignore rules
├── BE_codex/                         # Existing Backend API subproject (TRACKED)
│   ├── src/                          # NestJS TypeScript backend (controllers, services, guards)
│   ├── test/                         # Jest unit & e2e test suites
│   ├── package.json                  # Node.js dependencies
│   └── docs/                         # OpenAPI v1.1/1.2 specs & Risk Engine design
├── FE_codex/                         # Existing Frontend Mobile subproject (TRACKED)
│   ├── src/                          # Expo / React Native TypeScript mobile client
│   ├── tests/                        # Node test runner specs
│   └── package.json                  # React Native dependencies
├── data_demo/                        # Demo datasets & source data (UNTRACKED)
│   ├── Lừa đảo từ thiện/core.json    # 5 conversations
│   ├── Lừa đảo đầu tư tiền ảo/core.json# 3 conversations
│   ├── Lừa đảo đặt bàn ăn/core.json  # 10 conversations
│   ├── Lừa đảo đặt phòng khách sạn/core.json # 10 conversations
│   ├── Lừa đảo định danh cccd/core.json# 10 conversations
│   ├── dataset_url.csv               # 53,116 URL records (tracked/clean)
│   ├── No_scam.csv                   # 2,204 benign message records (added 2:27 PM)
│   ├── Scam.csv                      # 1,430 scam message records (added 2:26 PM)
│   └── images/                       # Supporting image assets
├── docs/                             # Architecture specifications (UNTRACKED)
│   ├── EDA_REPORT.md                 # 87 KB non-coding EDA report
│   ├── PREPROCESSING_DESIGN.md       # 85 KB data preprocessing & schema design
│   └── REASONING_HARNESS_DESIGN.md   # 77 KB ADK reasoning engine & SLM blueprint
├── tests/                            # Python verification & stress tests (UNTRACKED)
│   └── stress_testing/               # Existing standalone test scripts
├── PROJECT.md                        # Master project index & design document (UNTRACKED)
└── README.md                         # Top-level repo readme (TRACKED)
```

---

## 3. Python Runtime, Virtualenv & Tooling Environment

| Tool / Binary | Detected Path | Version | Status / Notes |
|---|---|---|---|
| `python.exe` | `C:\Users\leemi\AppData\Local\Programs\Python\Python313\python.exe` | 3.13.15 64-bit | Active global interpreter |
| `py.exe` | `C:\WINDOWS\py.exe` | Windows Python Launcher | Functional |
| `pip.exe` | `C:\Users\leemi\AppData\Local\Programs\Python\Python313\Scripts\pip.exe` | 26.2.1 | Available |
| `uv.exe` | `C:\Users\leemi\.local\bin\uv.exe` | 0.11.5 | Available on PATH |
| Virtualenv | None (`.venv`, `venv`, `env` absent) | N/A | Commands run directly in Python 3.13 environment |
| `pytest` | N/A | Not installed | `python -m pytest` fails (`No module named pytest`) |
| `unittest` | Python Standard Library | Built-in | Available for native test suites |

**Recommendation on Tooling**:
Because `pytest` is not installed, all test/verification scripts should be executable via:
`python tests/verify_datasets.py`
using standard Python assertions or `unittest.TestCase`, exiting with code 0 on success and non-zero on assertion failure.

---

## 4. Installed Python Libraries

The Python 3.13 runtime has a rich set of data science and machine learning packages installed:

| Library | Version | Applicability to Current Tasks |
|---|---|---|
| `pandas` | 3.0.5 | Ideal for RFC 4180 CSV parsing, duplicate detection, and in-place export |
| `numpy` | 2.5.2 | Numerical operations and array indexing |
| `pydantic` | 2.14.3 | Data schema validation |
| `jsonschema` | 4.26.0 | Draft 2020-12 schema validation |
| `regex` | 2026.9.29 | Advanced Unicode and pattern matching |
| `tqdm` | 4.70.0 | Progress bar for high-volume iteration |
| `csv` | Built-in | Native RFC 4180 CSV reader/writer |
| `json` | Built-in | Native JSON encoder/decoder |
| `unicodedata`| Built-in | Unicode normalization (NFC) |
| `hashlib` | Built-in | MD5/SHA256 fingerprinting for duplicate auditing |

---

## 5. Existing Scripts, Utilities & Test Frameworks

The repo contains existing Python tests in `tests/stress_testing/`:
- `tests/stress_testing/test_schema_boundaries.py`
- `tests/stress_testing/test_obfuscation_defenses.py`
- `tests/stress_testing/test_prompt_injection.py`

**Design Pattern of Existing Tests**:
- Direct execution via `python tests/stress_testing/<test_file>.py`.
- Self-contained assertion functions called from `if __name__ == "__main__":`.
- Clear console progress reporting.
- Any new verification script for the JSON merger and CSV deduplication should follow this exact pattern in `tests/` (e.g., `tests/verify_datasets.py`).

---

## 6. Git Status & Repository Hygiene

- **Current Branch**: `main` (synchronized with `origin/main`).
- **Untracked Directories & Files**:
  - `data_demo/` (Target of input data and output `merged_conversations.json`)
  - `docs/`
  - `tests/`
  - `PROJECT.md`
  - `.agents/`
- **Safety Constraints**:
  - Per agent rules, no git mutative commands (`git commit`, `git push`, `git add`) may be issued without explicit user request.
  - The 5 original JSON directories and files in `data_demo/` must remain completely untouched.
  - No temporary files or test files should be placed inside `.agents/teamwork/` other than agent metadata.

---

## 7. Deep-Dive Dataset Survey (`data_demo`)

### A. Conversation JSON Datasets (5 Folders)

| Directory | File | Conversations | Total Turns | `_id` Sequence | Turn Schema |
|---|---|---|---|---|---|
| `Lừa đảo từ thiện` | `core.json` | 5 | 74 | `[1, 2, 3, 4, 5]` | `{"role": "người gọi"/"người nhận", "content": "..."}` |
| `Lừa đảo đầu tư tiền ảo`| `core.json` | 3 | 46 | `[1, 2, 3]` | `{"role": "người gọi"/"người nhận", "content": "..."}` |
| `Lừa đảo đặt bàn ăn` | `core.json` | 10 | 170 | `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]` | `{"role": "người gọi"/"người nhận", "content": "..."}` |
| `Lừa đảo đặt phòng khách sạn`| `core.json`| 10 | 176 | `[1, 2, 3, 4, 5, 6, 7, 8, 9, 13]` | `{"role": "người gọi"/"người nhận", "content": "..."}` |
| `Lừa đảo định danh cccd` | `core.json` | 10 | 162 | `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]` | `{"role": "người gọi"/"người nhận", "content": "..."}` |
| **TOTAL** | **5 files** | **38** | **628** | *(IDs collide across folders; gap 10-12 in hotel)* | **Strictly binary roles: `người gọi`, `người nhận`** |

**Crucial Nuances**:
1. In `Lừa đảo đặt phòng khách sạn`, the IDs skip numbers 10, 11, 12 (ending at 13).
2. Each folder resets IDs starting at 1. If naive `_id` is retained without global re-indexing, IDs 1 through 3 will collide 5 times!
3. Acceptance Criteria requires: `mỗi bản ghi trong file gộp có cấu trúc gồm trường "id" và trường "dialogue"`. Notice the field name is `"id"` (without underscore), with unique indexing (1 to 38) while keeping `"dialogue"` schema intact.

### B. Tabular CSV Datasets (3 Files)

| File Name | Size (Bytes) | Header Columns | Primary Content Column | Total Rows | Unique Content Rows | Duplicate Rows to Remove | Encoding Detected | Multi-line Rows |
|---|---|---|---|---|---|---|---|---|
| `dataset_url.csv` | 2,011,503 | `['channel', 'label', 'url_norm']` | `url_norm` | 53,116 | 53,116 | **0** | UTF-8 / ASCII | 0 |
| `No_scam.csv` | 578,408 | `['message']` | `message` | 2,204 | 1,930 | **274** | UTF-8 with BOM (`utf-8-sig`) | 587 |
| `Scam.csv` | 196,670 | `['message']` | `message` | 1,430 | 1,319 | **111** | Windows-1252 / ISO-8859-1 | 27 |

### C. Cross-Dataset Overlap Census
- `No_scam.csv` vs `Scam.csv`: **0 overlapping messages**.
- `dataset_url.csv` (`url_norm`) vs `No_scam.csv` (`message`): **0 overlapping records**.
- `dataset_url.csv` (`url_norm`) vs `Scam.csv` (`message`): **0 overlapping records**.

---

## 8. Implementation Best Practices & Architectural Guidance

### Best Practice 1: JSON Conversation Merger (`data_demo/merged_conversations.json`)
1. **Read Strategy**:
   - Iterate deterministically over the 5 directories in stable order (e.g. alphabetical or defined list).
   - Use `open(..., 'r', encoding='utf-8')` and `json.load(f)`.
   - Never write to or mutate the original 5 `core.json` files.
2. **Transform Strategy**:
   - Standardize record structure:
     ```json
     {
       "id": 1,
       "dialogue": [
         {
           "role": "người gọi",
           "content": "..."
         },
         {
           "role": "người nhận",
           "content": "..."
         }
       ]
     }
     ```
   - Assign a clean, unique global `id` from 1 to 38 (or 1..N).
   - Preserve exact turn objects inside `dialogue` without modifying speaker text or roles.
3. **Write Strategy**:
   - Save to `data_demo/merged_conversations.json`.
   - Use `ensure_ascii=False` to preserve Vietnamese UTF-8 text directly instead of `\uXXXX` escape sequences.
   - Use `indent=2` for readability and deterministic diffing.
   - Perform an atomic write (write to temporary file, then rename) or direct write with post-write JSON schema validation.

### Best Practice 2: CSV Deduplicator (`dataset_url.csv`, `No_scam.csv`, `Scam.csv`)
1. **Encoding Handling**:
   - `dataset_url.csv`: Read with `encoding='utf-8'`.
   - `No_scam.csv`: Read with `encoding='utf-8-sig'` to gracefully consume the leading UTF-8 Byte Order Mark (`\xef\xbb\xbf`).
   - `Scam.csv`: Read with `encoding='windows-1252'` (or `encoding='latin-1'`). Do NOT read with plain `utf-8`, which crashes at byte offset 91825 (`0xf4`).
   - **Output Encoding**: When writing back the cleaned files in-place, save `No_scam.csv` and `Scam.csv` in standard UTF-8 (or `utf-8-sig`), converting `Scam.csv`'s Windows-1252 characters into valid UTF-8 so future consumers can read it seamlessly.
2. **Multi-line Field Safety**:
   - Use `pandas.read_csv` or Python's `csv.reader(..., quoting=csv.QUOTE_MINIMAL)`.
   - Never use `readlines()` or `split('\n')`.
   - When writing with pandas, use `df.to_csv(..., index=False, quoting=csv.QUOTE_MINIMAL, encoding='utf-8')`.
3. **Deduplication Logic**:
   - For each dataframe, deduplicate on the primary content column (`subset=['url_norm']` for `dataset_url.csv`, `subset=['message']` for `No_scam.csv` and `Scam.csv`).
   - Keep the first occurrence (`keep='first'`).
   - Verify row count expectations before overwriting:
     - `dataset_url.csv`: 53,116 -> 53,116 rows (0 dropped).
     - `No_scam.csv`: 2,204 -> 1,930 rows (274 dropped).
     - `Scam.csv`: 1,430 -> 1,319 rows (111 dropped).
4. **Safety & Audit Trail**:
   - Keep in-memory backups or `.bak` temporary files during write operations.
   - Record exact deduplication statistics (initial rows, duplicates removed, final rows) in a markdown survey report for M2.

### Best Practice 3: Independent Verification Script (`tests/verify_datasets.py`)
1. **Design**:
   - Placed in `tests/verify_datasets.py`.
   - Executable with `python tests/verify_datasets.py`.
2. **Audit Checks**:
   - **JSON Verification**:
     - `data_demo/merged_conversations.json` exists and parses cleanly.
     - Total conversation count is exactly 38.
     - Total dialogue turn count is exactly 628.
     - Every conversation contains `"id"` and `"dialogue"`.
     - Every turn contains `"role"` and `"content"`.
     - Roles are restricted to `"người gọi"` and `"người nhận"`.
     - The 5 original source folders and `core.json` files still exist with untouched contents and sizes.
   - **CSV Verification**:
     - All 3 CSV files exist and parse cleanly without encoding errors.
     - `dataset_url.csv` has exactly 53,116 rows and 0 duplicate `url_norm`.
     - `No_scam.csv` has exactly 1,930 rows and 0 duplicate `message`.
     - `Scam.csv` has exactly 1,319 rows and 0 duplicate `message`.
     - Columns and headers match required schemas.
     - Exit code 0 on all passes, 1 on any assertion failure.

---

## 9. Risk Matrix & Pitfalls to Avoid

| Risk | Consequence | Mitigation Strategy |
|---|---|---|
| Reading `Scam.csv` with `utf-8` | `UnicodeDecodeError` at byte 91825 (`0xf4`) crashing execution | Must specify `encoding='windows-1252'` on read; convert to UTF-8 on write |
| Reading `No_scam.csv` with plain `utf-8` | Header becomes `['\ufeffmessage']` instead of `['message']` | Must specify `encoding='utf-8-sig'` |
| Naive line-based CSV parsing | Corrupts 587 rows in `No_scam.csv` and 27 rows in `Scam.csv` | Must use RFC 4180 parser (`pandas` or `csv.reader`) |
| ID collisions in JSON merger | Duplicate conversation IDs 1..3 across categories | Re-index sequentially `1..38` under `"id"` |
| ASCII escaping Vietnamese in JSON | Generates unreadable `\uXXXX` sequences, balloons file size | Always specify `ensure_ascii=False` in `json.dump` |
| Overwriting or modifying original JSON files | Violates explicit acceptance criteria | Open original `core.json` strictly with read mode (`'r'`) |
| Relying on `pytest` | Script fails because `pytest` is not installed | Use standalone script with `assert` and `python <script>.py` |

---
*Report prepared by `teamwork_explorer_survey_3` for the ScamShieldAI Teamwork Orchestrator.*
