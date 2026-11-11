import { Injectable } from '@nestjs/common';
import type { AiAnalysisInput, AiEvidence } from '../ai/ai-analysis-provider';
import { InputType, SignalType } from '../contracts/analysis.enums';
import { evidenceClauses, normalizeEvidence, supportsSignal } from './evidence-context';

const approvedSignals = new Set<unknown>(Object.values(SignalType));

function supportedText(source: string, quote: string, signal: SignalType): boolean {
  // Check the enclosing clause, so a substring of a warning cannot become an active request.
  const clauses = evidenceClauses(source).map(normalizeEvidence);
  const matches = clauses.filter((clause) => clause.includes(quote));
  if (matches.length > 0) {
    return matches.every((clause) => supportsSignal(clause, signal)) && supportsSignal(quote, signal);
  }
  return normalizeEvidence(source).includes(quote) && supportsSignal(source, signal) && supportsSignal(quote, signal);
}

@Injectable()
export class EvidenceValidator {
  validate(input: AiAnalysisInput, items: readonly AiEvidence[]): { accepted: AiEvidence[]; rejected: boolean } {
    const accepted: AiEvidence[] = [];
    const seen = new Set<string>();
    let rejected = false;

    for (const item of items) {
      if (
        !item || typeof item.quote !== 'string' || typeof item.reason !== 'string' ||
        !item.reason.trim() || !approvedSignals.has(item.signalType)
      ) {
        rejected = true;
        continue;
      }

      const quote = normalizeEvidence(item.quote);
      const index = item.imageIndex;
      const grounded = input.inputType === InputType.TEXT
        ? index === null && supportedText(input.text, quote, item.signalType)
        : index !== null && Number.isInteger(index) && index >= 0 && index < input.images.length &&
          supportsSignal(quote, item.signalType);
      if (!quote || !grounded) {
        rejected = true;
        continue;
      }

      // Keep separate observations from different screenshots and separate signal types.
      const key = JSON.stringify([index, item.signalType, quote]);
      if (!seen.has(key)) {
        seen.add(key);
        accepted.push(item);
      }
    }

    return { accepted, rejected };
  }
}
