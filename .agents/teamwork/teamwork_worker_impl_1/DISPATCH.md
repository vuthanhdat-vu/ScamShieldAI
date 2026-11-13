# Worker Implementation 1 Dispatch
Target: Implement R1 JSON conversation merge, R2 CSV deduplication and survey report, and independent verification script.
Original request: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\ORIGINAL_REQUEST.md
PROJECT.md: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\PROJECT.md
Working directory: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI
State folder: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\teamwork_worker_impl_1\
Explorer 1 Report: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\teamwork_explorer_survey_1\analysis.md
Explorer 2 Report: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\teamwork_explorer_survey_2\analysis.md
Explorer 3 Report: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\teamwork_explorer_survey_3\analysis.md


## 2026-11-12T08:07:54Z
You are a teamwork_worker subagent.
Read the mandatory original request at:
c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\ORIGINAL_REQUEST.md
Also read the project single-source-of-truth:
c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\PROJECT.md
And review the survey reports:
- c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\teamwork_explorer_survey_1\analysis.md
- c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\teamwork_explorer_survey_2\analysis.md
- c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\teamwork_explorer_survey_3\analysis.md

Your state folder: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\teamwork_worker_impl_1\
Working directory: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI

File Ownership:
You have exclusive write ownership of:
- `scripts/merge_conversations.py`
- `scripts/deduplicate_csvs.py`
- `tests/test_dataset_verification.py`
- `data_demo/merged_conversations.json`
- `data_demo/dataset_url.csv` (in-place modification)
- `data_demo/No_scam.csv` (in-place modification)
- `data_demo/Scam.csv` (in-place modification)
- `docs/CSV_SURVEY_REPORT.md` and `data_demo/DEDUPLICATION_REPORT.md`
You MUST NOT delete, rename, or modify any files inside the 5 original JSON subdirectories (`Lừa đảo từ thiện`, `Lừa đảo đầu tư tiền ảo`, `Lừa đảo đặt bàn ăn`, `Lừa đảo đặt phòng khách sạn`, `Lừa đảo định danh cccd`).

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Tasks:
1. Implement `scripts/merge_conversations.py` to merge all 38 conversations (628 dialogue turns) from the 5 original JSON folders into `data_demo/merged_conversations.json`.
   - Each conversation must have `"id"` (sequential integer 1..38) and `"dialogue"` (array of turn objects with `"role"` and `"content"` preserving the caller `"người gọi"` and receiver `"người nhận"` annotations and schema).
   - Use `ensure_ascii=False` with UTF-8 encoding.
   - Run the script to produce `data_demo/merged_conversations.json`.

2. Implement `scripts/deduplicate_csvs.py` to survey and deduplicate the 3 CSV files in-place:
   - `dataset_url.csv`: Primary column `url_norm`. 53,116 rows. Write back in-place.
   - `No_scam.csv`: Primary column `message`. Read with `utf-8-sig` (BOM handling). Standard RFC 4180 CSV reader (preserve 587 multiline fields!). Deduplicate on `message` (keep first occurrence, removing 274 duplicates -> 1,930 unique rows). Write back in-place as UTF-8.
   - `Scam.csv`: Primary column `message`. Read with `windows-1252` encoding (handling byte 0x96 and latin-1 characters). Standard RFC 4180 CSV reader (preserve 27 multiline fields!). Deduplicate on `message` (keep first occurrence, removing 111 duplicates -> 1,319 unique rows). Write back in-place as UTF-8.
   - Write a detailed survey report to both `docs/CSV_SURVEY_REPORT.md` and `data_demo/DEDUPLICATION_REPORT.md` covering:
     - Initial rows, duplicate rows removed, final unique rows for each file.
     - Cross-file duplicate analysis (No_scam vs Scam, CSV vs URLs).
     - Encoding transformations and multiline safety details.
   - Run the script to perform the in-place deduplication and generate the report.

3. Implement `tests/test_dataset_verification.py`:
   - An independent standalone verification script checking:
     - `data_demo/merged_conversations.json` exists, valid JSON, contains 38 conversations, 628 turns, correct schema, no nulls.
     - Original 5 folders and `core.json` files are completely intact and unmodified.
     - `dataset_url.csv`, `No_scam.csv`, `Scam.csv` exist, valid UTF-8, no decode errors, headers intact, row counts match expected (53,116 / 1,930 / 1,319), 0 duplicates on primary content columns.
     - Multiline integrity verified.
     - Report file exists with complete statistics.
   - Run `python tests/test_dataset_verification.py` and verify all checks PASS with exit code 0.

Document all commands, code changes, before/after statistics, and verification results in `handoff.md` in your state folder. When finished, send a completion message back.
