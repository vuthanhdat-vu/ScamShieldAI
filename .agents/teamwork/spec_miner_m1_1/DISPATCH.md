## 2026-11-13T16:06:49Z
You are a Spec Miner for Milestone 1: OCR Pipeline Engine.
Your working directory: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI
Your state folder: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\spec_miner_m1_1

MANDATORY FIRST STEPS:
1. You MUST read ORIGINAL_REQUEST.md at: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\ORIGINAL_REQUEST.md
2. You MUST read PROJECT.md at: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\PROJECT.md
3. You MUST read SCOPE.md at: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\sub_orch_m1\SCOPE.md

Your mission:
Investigate authoritative design documentation and prototypes:
- `docs/PREPROCESSING_DESIGN.md`
- `notebooks/chat_ocr_pipeline.ipynb`

Extract and document precise specifications:
1. Bubble detection geometry: PaddleOCR_v4_det parameters, bounding box format.
2. UI geometry filtering: Exact exclusion percentages (top header 8.2%, bottom footer 8.5%), coordinate calculations.
3. Horizontal box merging (`merge_horizontal_boxes`): Thresholds, vertical distance, horizontal overlap, bounding box union.
4. Reading order sorting: Algorithm for ordering boxes top-to-bottom, left-to-right.
5. Margin-based speaker attribution: Exact thresholds for `peer` (left-aligned), `user` (right-aligned), `system` (centered/full-width chip).
6. Optical preprocessing: Contrast adjustments, polarity inversion, Lanczos resize (height 32px), aspect ratio preservation.
7. Tesseract OCR execution: Command/API flags (`-l vie --psm 6`, `--psm 7`), confidence scores, output parsing.
8. Multi-shot screenshot turn stitching: How consecutive screenshots are deduplicated and merged using Levenshtein distance on turn texts.

Do NOT write code or modify files.
Write your complete specification report to `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\spec_miner_m1_1\handoff.md` and send a completion message with your findings.
