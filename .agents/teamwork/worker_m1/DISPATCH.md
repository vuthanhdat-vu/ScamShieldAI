## 2026-11-13T16:18:22Z
You are the Worker for Milestone 1: OCR Pipeline Engine.
Working directory: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI
State folder: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\worker_m1

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

MANDATORY FIRST STEPS:
1. You MUST read ORIGINAL_REQUEST.md at: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\ORIGINAL_REQUEST.md
2. You MUST read PROJECT.md at: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\PROJECT.md
3. You MUST read SCOPE.md at: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\sub_orch_m1\SCOPE.md (or c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\sub_orch_m1\SCOPE.md)
4. You MUST read the handoff reports from the 3 explorers:
   - c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\spec_miner_m1_1\handoff.md
   - c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\explorer_m1_2\handoff.md
   - c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\explorer_m1_3\handoff.md

FILE WRITE OWNERSHIP:
You EXCLUSIVELY own:
- `BE_codex/src/ocr/ocr.interfaces.ts`
- `BE_codex/src/ocr/metadata-ocr.provider.ts`
- `BE_codex/src/ocr/paddle-tesseract-ocr.provider.ts`
- `BE_codex/src/ocr/ocr.service.ts`
- `BE_codex/src/ocr/ocr.module.ts`
- `BE_codex/test/ocr-pipeline.spec.ts`
Do NOT modify files outside this boundary (such as `src/app.module.ts` or `src/analysis/*` - those are reserved for M3).

IMPLEMENTATION REQUIREMENTS:
Implement the complete OCR pipeline engine per the mathematical specifications and NestJS blueprints:
1. `BE_codex/src/ocr/ocr.interfaces.ts`:
   - Export `OCR_ENGINE` injection token
   - Export `OcrBoundingBox`, `OcrTurn`, `OcrResult`, `ImageInput`, `IOcrEngine` exactly matching `PROJECT.md § Interface Contracts`.
2. `BE_codex/src/ocr/paddle-tesseract-ocr.provider.ts`:
   - Implement genuine OCR pipeline logic:
     - UI geometry filtering: top 8.2% header (`ymin >= 0.082 * H`), bottom 8.5% footer (`ymax <= 0.915 * H`).
     - `isUiGarbage` regex filter for residual UI chrome text.
     - Horizontal box merging (`mergeHorizontalBoxes`): `yThresh = 10`, vertical overlap `> 0.5 * minH`, `xGapThresh = 35`.
     - Natural reading order sorting (`sortReadingOrder`): dynamic band `yThreshold = Math.max(12, Math.floor(0.008 * H))`.
     - Margin-based speaker attribution (`classifySpeaker`): `system` (centered), `user` (right-docked), `peer` (left-docked), and margin proximity fallback.
     - Contextual bubble speaker smoothing across vertically adjacent lines (`vGap <= 1.3 * hRef`).
     - Optical preprocessing using `sharp`: padding 5px/4px, polarity inversion (if median or border luminance < 138), contrast 1.25x, Lanczos resize up to 32px height for crops < 30px.
     - Tesseract Vietnamese OCR execution helper (`-l vie --psm 6`/`--psm 7`), confidence extraction, phonetic confusion correction lexicon, and typography normalization.
     - Fallback / mock handling when native binaries are absent on host.
3. `BE_codex/src/ocr/metadata-ocr.provider.ts`:
   - Ultra-fast SHA-256 buffer lookup table mapping `data/images/` images to `data/metadata.json` cases.
   - Distribute turns sequentially across `0 <= imageIndex < images.length` so `EvidenceValidator` receives valid references.
   - Safe fallbacks for unmatched buffers.
4. `BE_codex/src/ocr/ocr.service.ts`:
   - Orchestrates `processImages(images: ImageInput[]): Promise<OcrResult>`.
   - Multi-shot screenshot turn stitching (`stitchMultiShotTurns`): Levenshtein distance deduplication (CER <= 0.18) and truncated turn update in place.
   - Provider delegation with automatic fallback from native provider to metadata provider.
5. `BE_codex/src/ocr/ocr.module.ts`:
   - Declare providers: `OcrService`, `MetadataOcrProvider`, `PaddleTesseractOcrProvider`.
   - Provide `OCR_ENGINE` factory selecting available engine.
   - Export `[OcrService, OCR_ENGINE]`.
6. `BE_codex/test/ocr-pipeline.spec.ts`:
   - Comprehensive unit test suite covering:
     - Bounding box filtering (UI top 8.2%, bottom 8.5% exclusions, size filtering).
     - Horizontal merging of fragmented bounding boxes.
     - Reading order sorting (top-to-bottom, left-to-right).
     - Speaker attribution (system centered, user right, peer left, smoothing).
     - Optical preprocessing functions (inversion, contrast, resize).
     - Vietnamese text cleaning & confusion lexicon.
     - Multi-shot stitching & Levenshtein deduplication.
     - `MetadataOcrProvider` lookups with real buffers from `data/images/`.
     - `OcrService` end-to-end integration with `IOcrEngine` compliance.

VERIFICATION:
You MUST run the following commands in `BE_codex/`:
- `npx jest test/ocr-pipeline.spec.ts` (or `npm test`)
- `npm run build`
All tests must pass and build must succeed without any TypeScript errors.
Document all commands, test output, and file changes in your handoff report:
`c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\worker_m1\handoff.md`.
Send a completion message when done.
