import type { UploadedImage } from '../analysis/dto/images-request.dto';
import type { InputType, ScamCategory, SignalType } from '../contracts/analysis.enums';

export const AI_ANALYSIS_PROVIDER = Symbol('AI_ANALYSIS_PROVIDER');
export const OPENAI_UPSTREAM_TIMEOUT_MS = 45_000;

export type AiAnalysisInput =
  | { readonly inputType: InputType.TEXT; readonly text: string }
  | {
      readonly inputType: InputType.IMAGE;
      readonly images: readonly UploadedImage[];
      readonly context?: string;
    };

export interface AiEvidence {
  readonly quote: string;
  readonly reason: string;
  readonly signalType: SignalType;
  readonly imageIndex: number | null;
}

export interface AiAnalysisCandidate {
  readonly canAssess: boolean;
  readonly suggestedCategory: ScamCategory;
  readonly summary: string;
  readonly evidence: readonly AiEvidence[];
  readonly recommendedActions: readonly string[];
  readonly speechSummary: string;
}

// Both adapters return candidates. Evidence verification and final risk scoring stay in the backend.
export interface AiAnalysisProvider {
  analyze(input: AiAnalysisInput, signal: AbortSignal): Promise<AiAnalysisCandidate>;
}
