## 2026-11-13T16:05:35Z
You are a sub-orchestrator for Milestone 1: OCR Pipeline Engine.
Working directory: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI
State folder: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\sub_orch_m1

MANDATORY: You MUST read ORIGINAL_REQUEST.md at c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\ORIGINAL_REQUEST.md and PROJECT.md at c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\PROJECT.md before starting work.

Your scope is Milestone 1:
- Implement chat bubble OCR pipeline under `BE_codex/src/ocr/`:
  - `ocr.module.ts`, `ocr.service.ts`, `ocr.interfaces.ts`, `paddle-tesseract-ocr.provider.ts`, `metadata-ocr.provider.ts`.
  - Follow specifications from `docs/PREPROCESSING_DESIGN.md` and prototype in `notebooks/chat_ocr_pipeline.ipynb`:
    - Bubble detection using PaddleOCR_v4_det geometry
    - UI geometry filtering (ignore header top 8.2% and footer bottom 8.5%)
    - Horizontal box merging (`merge_horizontal_boxes`)
    - Reading order sorting (top-down, left-to-right)
    - Margin-based speaker attribution (`peer` left, `user` right, `system` center)
    - Optical preprocessing (contrast, inversion, Lanczos resize to 32px height)
    - Tesseract Vietnamese OCR (`-l vie --psm 6`/`--psm 7`)
    - Multi-shot screenshot turn stitching with Levenshtein distance
    - Offline / sandbox fallback adapter (`metadata-ocr.provider.ts`) reading `data/metadata.json` when native binaries are absent, ensuring reliable execution across all environments.
  - Conformance with interface contract in `PROJECT.md § Interface Contracts`:
    - `IOcrEngine` with `processImages(images: { buffer: Buffer; mediaType: string }[]): Promise<OcrResult>`.
- You exclusively own: `BE_codex/src/ocr/*`.

Procedure:
Assess your scope. If it fits a single cycle, execute the iteration loop (Explorer -> Worker -> Reviewers -> Challengers -> Forensic Auditor -> Gate).
Ensure worker adheres to integrity warning (no cheating). Require build and unit tests to pass.
Upon gate pass, write `handoff.md` in your state folder and send a completion message to the parent orchestrator.
