import { Inject, Injectable, Logger } from '@nestjs/common';
import { MetadataOcrProvider } from './metadata-ocr.provider';
import { type IOcrEngine, type ImageInput, OCR_ENGINE, type OcrResult, type OcrTurn } from './ocr.interfaces';

@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);

  constructor(
    @Inject(OCR_ENGINE) private readonly engine: IOcrEngine,
    private readonly metadataProvider: MetadataOcrProvider,
  ) {}

  /**
   * Orchestrates multi-image OCR processing with multi-shot turn stitching and provider fallback.
   */
  async processImages(images: ImageInput[]): Promise<OcrResult> {
    if (!images || images.length === 0) {
      return {
        turns: [],
        fullTranscript: '',
        imageCount: 0,
      };
    }

    let rawResult: OcrResult;
    try {
      rawResult = await this.engine.processImages(images);
    } catch (err) {
      this.logger.warn(`Primary OCR engine execution failed, falling back to MetadataOcrProvider: ${(err as Error).message}`);
      rawResult = await this.metadataProvider.processImages(images);
    }

    // Apply multi-shot screenshot turn stitching and deduplication across screenshots
    const stitchedTurns = images.length > 1 ? this.stitchMultiShotTurns(rawResult.turns) : rawResult.turns;

    // Filter to dialogue turns only (peer and user)
    const dialogueTurns = stitchedTurns.filter((t) => t.speaker === 'peer' || t.speaker === 'user');

    const fullTranscript = dialogueTurns
      .map((t) => `${t.speaker === 'peer' ? 'Đối phương' : 'Người dùng'}: ${t.text}`)
      .join('\n');

    return {
      turns: dialogueTurns,
      fullTranscript,
      imageCount: images.length,
    };
  }

  /**
   * Multi-Shot Screenshot Turn Stitching (Specification 8).
   * Deduplicates overlapping boundary turns across sequential screenshots using Levenshtein CER (<= 0.18)
   * and repairs viewport boundary truncations by updating existing turns in place.
   */
  stitchMultiShotTurns(turns: OcrTurn[], cerThresh = 0.18): OcrTurn[] {
    if (!turns || turns.length <= 1) return turns || [];

    // Group turns by imageIndex
    const shotsMap = new Map<number, OcrTurn[]>();
    for (const turn of turns) {
      const list = shotsMap.get(turn.imageIndex) || [];
      list.push(turn);
      shotsMap.set(turn.imageIndex, list);
    }

    const sortedShotIndices = Array.from(shotsMap.keys()).sort((a, b) => a - b);
    if (sortedShotIndices.length <= 1) {
      return turns;
    }

    const fullConversation: OcrTurn[] = [...(shotsMap.get(sortedShotIndices[0]) || [])];

    for (let sIdx = 1; sIdx < sortedShotIndices.length; sIdx++) {
      const shotTurns = shotsMap.get(sortedShotIndices[sIdx]) || [];
      let startAddIdx = 0;

      for (let k = 0; k < shotTurns.length; k++) {
        const newTurn = shotTurns[k];
        let isDuplicate = false;

        // Compare against last 3 turns of fullConversation
        const lookbackStart = Math.max(0, fullConversation.length - 3);
        for (let e = lookbackStart; e < fullConversation.length; e++) {
          const existingTurn = fullConversation[e];

          if (existingTurn.speaker === newTurn.speaker) {
            const cer = this.calculateCer(existingTurn.text, newTurn.text);

            // Case A: Identical or near-identical duplicate
            if (cer <= cerThresh || existingTurn.text.includes(newTurn.text)) {
              isDuplicate = true;
              break;
            }

            // Case B: Truncated turn update (viewport edge repair)
            if (newTurn.text.includes(existingTurn.text) && newTurn.text.length > existingTurn.text.length) {
              existingTurn.text = newTurn.text;
              if (newTurn.confidence) {
                existingTurn.confidence = newTurn.confidence;
              }
              isDuplicate = true;
              break;
            }
          }
        }

        if (isDuplicate) {
          startAddIdx = k + 1;
        } else {
          // Break deduplication scan: subsequent turns in this shot are novel
          break;
        }
      }

      fullConversation.push(...shotTurns.slice(startAddIdx));
    }

    return fullConversation;
  }

  /**
   * Computes normalized Character Error Rate (CER) via Levenshtein edit distance.
   */
  calculateCer(s1: string, s2: string): number {
    const n = s1.length;
    const m = s2.length;
    if (n === 0) return m === 0 ? 0 : 1;
    if (m === 0) return 1;

    const d: number[][] = [];
    for (let i = 0; i <= n; i++) {
      d[i] = [i];
    }
    for (let j = 0; j <= m; j++) {
      d[0][j] = j;
    }

    for (let i = 1; i <= n; i++) {
      for (let j = 1; j <= m; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      }
    }

    const maxLen = Math.max(n, m);
    return maxLen === 0 ? 0 : d[n][m] / maxLen;
  }
}
