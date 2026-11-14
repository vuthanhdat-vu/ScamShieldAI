import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AI_ANALYSIS_PROVIDER, type AiAnalysisInput, type AiAnalysisProvider, OPENAI_UPSTREAM_TIMEOUT_MS,
} from '../ai/ai-analysis-provider';
import { InputType, SignalType } from '../contracts/analysis.enums';
import { UrlIntelligenceService } from '../intelligence/url-intelligence.service';
import type { ImageInput, OcrResult } from '../ocr/ocr.interfaces';
import { OcrService } from '../ocr/ocr.service';
import type { PreprocessedDialogue } from '../preprocessing/preprocessing.interfaces';
import { PreprocessingService } from '../preprocessing/preprocessing.service';
import { RiskService } from '../risk/risk.service';
import { selectScamCategory } from '../risk/scam-category';
import { mapAnalysisResponse } from './analysis-response.mapper';
import type { AnalysisResponseDto } from './dto/analysis-response.dto';
import { EvidenceValidator } from './evidence-validator';

@Injectable()
export class AnalysisService {
  constructor(
    @Inject(AI_ANALYSIS_PROVIDER) private readonly provider: AiAnalysisProvider,
    private readonly risk: RiskService,
    private readonly intelligence: UrlIntelligenceService,
    private readonly evidence: EvidenceValidator,
    @Optional() private readonly ocr?: OcrService,
    @Optional() private readonly preprocessing?: PreprocessingService,
  ) {}

  async analyze(input: AiAnalysisInput): Promise<AnalysisResponseDto> {
    let effectiveInput = input;

    if (input.inputType === InputType.IMAGE && this.ocr && this.preprocessing) {
      const ocrImages: ImageInput[] = input.images.map((img) => ({
        buffer: img.bytes,
        mediaType: img.mediaType,
      }));

      const ocrResult: OcrResult = await this.ocr.processImages(ocrImages);
      const dialogue: PreprocessedDialogue = this.preprocessing.cleanAndSanitize(ocrResult);

      effectiveInput = {
        ...input,
        dialogue,
        ocrResult,
      };
    }

    const candidate = await this.provider.analyze(effectiveInput, AbortSignal.timeout(OPENAI_UPSTREAM_TIMEOUT_MS));
    const { accepted, rejected } = this.evidence.validate(effectiveInput, candidate.canAssess ? candidate.evidence : []);
    const urls = candidate.canAssess
      ? this.intelligence.detect(
          effectiveInput.inputType === InputType.TEXT
            ? effectiveInput.text
            : accepted.map(({ quote }) => quote).join('\n'),
        )
      : [];

    const evidence = accepted.filter(
      ({ signalType, quote }) =>
        signalType !== SignalType.SUSPICIOUS_URL ||
        this.intelligence.detect(quote).some(({ signals }) => signals.length > 0),
    );
    const indicators = urls.flatMap(({ signals }) => signals);
    const hasUrlIndicators = indicators.length > 0;
    const signals = evidence.map(({ signalType }) => signalType);
    const unsupported = rejected || evidence.length < accepted.length;
    const canAssess = candidate.canAssess && (!unsupported || evidence.length > 0 || hasUrlIndicators);
    const risk = this.risk.assess(signals, canAssess, indicators);
    const category = selectScamCategory(candidate.suggestedCategory, evidence, hasUrlIndicators);
    return mapAnalysisResponse(effectiveInput, candidate, evidence, urls, risk, category);
  }
}

