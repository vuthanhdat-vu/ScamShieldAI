# Scope: Milestone 1 - OCR Pipeline Engine

## Architecture
Chat bubble OCR pipeline under `BE_codex/src/ocr/`:
- `ocr.module.ts`: NestJS module exporting OCR engine provider and OcrService
- `ocr.service.ts`: Orchestrates image processing, turn stitching across multiple screenshots, delegation to OCR provider
- `ocr.interfaces.ts`: Interface definitions (IOcrEngine, OcrResult, OcrTurn, OcrBoundingBox)
- `paddle-tesseract-ocr.provider.ts`: Executes PaddleOCR_v4_det for bounding box detection, UI geometry filtering (header 8.2%, footer 8.5%), horizontal merging, reading order sorting, margin-based speaker attribution, optical preprocessing (contrast, inversion, Lanczos resize 32px), Tesseract Vietnamese OCR (`-l vie --psm 6`/`--psm 7`)
- `metadata-ocr.provider.ts`: Fallback / sandbox provider reading `data/metadata.json` when native binaries are absent

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 5 | PaddleOCR_v4_det Bubble Detection | Text bubble localization with UI geometry filtering (top 8.2%, bottom 8.5%) | M1 | PREPROCESSING_DESIGN.md |
| 6 | Horizontal Box Merging & Reading Order | Merges adjacent boxes and sorts top-down, left-to-right into chat bubbles | M1 | PREPROCESSING_DESIGN.md |
| 7 | Margin-based Speaker Attribution | Classifies bubble speaker: peer/scammer (left), user (right), system (center) | M1 | PREPROCESSING_DESIGN.md |
| 8 | Optical Preprocessing & Tesseract OCR | Contrast enhancement, polarity inversion, Lanczos resize, Tesseract vie (psm 6/7) | M1 | PREPROCESSING_DESIGN.md |
| Fallback | Offline / Sandbox Metadata Adapter | Fallback adapter reading data/metadata.json for reliable test/dev execution | M1 | PROJECT.md |

## Milestones / Work Breakdown
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1.1 | OCR Exploration & Design Mapping | Investigate prototype notebook, PREPROCESSING_DESIGN.md, metadata.json, and BE_codex NestJS layout | none | IN_PROGRESS |
| 1.2 | OCR Implementation & Unit Tests | Implement ocr.interfaces.ts, metadata-ocr.provider.ts, paddle-tesseract-ocr.provider.ts, ocr.service.ts, ocr.module.ts, and unit tests | 1.1 | PLANNED |
| 1.3 | Review, Challenge & Forensic Audit | 2 Reviewers, 2 Challengers, 1 Forensic Auditor, Gate Verification | 1.2 | PLANNED |

## Interface Contracts
### M1 (OCR) ↔ M2/M3 (Preprocessing & Analysis)
- `BE_codex/src/ocr/ocr.interfaces.ts`:
```typescript
export interface OcrBoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface OcrTurn {
  speaker: 'peer' | 'user' | 'system';
  text: string;
  imageIndex: number;
  confidence: number;
  boundingBoxes?: OcrBoundingBox[];
}

export interface OcrResult {
  turns: OcrTurn[];
  fullTranscript: string;
  imageCount: number;
}

export interface IOcrEngine {
  processImages(images: { buffer: Buffer; mediaType: string }[]): Promise<OcrResult>;
}
```

## Code Layout
- Exclusive ownership: `BE_codex/src/ocr/*`
- Associated tests: `BE_codex/src/ocr/*.spec.ts` or `BE_codex/test/ocr/*.spec.ts`
