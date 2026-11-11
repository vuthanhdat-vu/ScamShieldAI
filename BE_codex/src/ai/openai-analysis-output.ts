import Ajv from 'ajv';
import { ScamCategory, SignalType } from '../contracts/analysis.enums';
import type { AiEvidence } from './ai-analysis-provider';

export interface OpenAiAnalysisOutput {
  canAssess: boolean;
  suggestedCategory: ScamCategory;
  summary: string;
  evidence: AiEvidence[];
  speechSummary: string;
}

export const OPENAI_ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['canAssess', 'suggestedCategory', 'summary', 'evidence', 'speechSummary'],
  properties: {
    canAssess: { type: 'boolean' },
    suggestedCategory: { type: 'string', enum: Object.values(ScamCategory) },
    summary: { type: 'string' },
    speechSummary: { type: 'string' },
    evidence: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['quote', 'reason', 'signalType', 'imageIndex'],
        properties: {
          quote: { type: 'string' },
          reason: { type: 'string' },
          signalType: { type: 'string', enum: Object.values(SignalType) },
          imageIndex: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
        },
      },
    },
  },
};

export const validateOpenAiOutput = new Ajv().compile<OpenAiAnalysisOutput>(OPENAI_ANALYSIS_SCHEMA);
