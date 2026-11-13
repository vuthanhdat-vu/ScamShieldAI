import {
  IPreprocessingService,
  OcrResult,
  OcrTurn,
  PreprocessedDialogue,
  PreprocessedTurn,
} from './preprocessing.interfaces';
import { cleanText, denoiseText, DenoiseResult } from './text-cleaner';
import { PiiSanitizer } from './pii-sanitizer';

/**
 * Robust Injectable decorator compatible with NestJS runtime and zero-dependency standalone environments.
 */
function getInjectable(): ClassDecorator {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nest = require('@nestjs/common');
    if (typeof nest?.Injectable === 'function') {
      return nest.Injectable();
    }
  } catch {
    // Standalone fallback
  }
  return (target: any) => target;
}

/**
 * Robust Optional decorator compatible with NestJS runtime and zero-dependency standalone environments.
 */
function getOptional(): ParameterDecorator {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nest = require('@nestjs/common');
    if (typeof nest?.Optional === 'function') {
      return nest.Optional();
    }
  } catch {
    // Standalone fallback
  }
  return () => {};
}

export const Injectable = getInjectable;
export const Optional = getOptional;

@Injectable()
export class PreprocessingService implements IPreprocessingService {
  constructor(
    @Optional()
    private readonly defaultSanitizer?: PiiSanitizer,
  ) {}

  /**
   * Preprocesses OCR turns:
   * 1. Filters out non-dialogue 'system' chips (timestamps, encryption notices).
   * 2. Cleans text: Unicode NFC/NFKC, zero-width stripping, math fonts, un-stuttering,
   *    spaced URLs, telex typos, and SMS slang.
   * 3. Sanitizes PII in strict priority order with session-scoped HMAC-SHA256 masking.
   * 4. Formats prompt text for downstream LLM reasoning harness ([Peer]: ... / [User]: ...).
   */
  public cleanAndSanitize(
    ocrResult: OcrResult,
    customSanitizer?: PiiSanitizer,
  ): PreprocessedDialogue {
    if (!ocrResult || !Array.isArray(ocrResult.turns) || ocrResult.turns.length === 0) {
      return {
        turns: [],
        formattedPromptText: '',
        sanitizedPiiCount: 0,
      };
    }

    // Ephemeral per-session sanitizer with fresh 32-byte CSPRNG salt
    const sanitizer = customSanitizer ?? this.defaultSanitizer ?? new PiiSanitizer();

    // Filter out system chips (e.g. timestamps, security notices)
    const validTurns = ocrResult.turns.filter(
      (t): t is OcrTurn & { speaker: 'peer' | 'user' } =>
        t.speaker === 'peer' || t.speaker === 'user',
    );

    let totalPiiCount = 0;
    const preprocessedTurns: PreprocessedTurn[] = [];

    for (const turn of validTurns) {
      // 1. Denoise and normalize text
      const cleaned = cleanText(turn.text);

      // 2. Sanitize PII using stateful session sanitizer
      const { sanitizedText, count } = sanitizer.sanitize(cleaned);
      totalPiiCount += count;

      preprocessedTurns.push({
        speaker: turn.speaker,
        text: sanitizedText,
        imageIndex: turn.imageIndex,
      });
    }

    // 3. Construct formatted dialogue transcript for Reasoning Harness
    const formattedPromptText = preprocessedTurns
      .map((t) => `[${t.speaker === 'peer' ? 'Peer' : 'User'}]: ${t.text}`)
      .join('\n');

    return {
      turns: preprocessedTurns,
      formattedPromptText,
      sanitizedPiiCount: totalPiiCount,
    };
  }

  /**
   * Helper method to denoise a single string with detailed evasion diagnostic flags.
   */
  public denoiseSingle(text: string): DenoiseResult {
    return denoiseText(text);
  }
}
