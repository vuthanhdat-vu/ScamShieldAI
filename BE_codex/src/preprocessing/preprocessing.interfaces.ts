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

export interface PreprocessedTurn {
  speaker: 'peer' | 'user';
  text: string;
  imageIndex: number;
}

export interface PreprocessedDialogue {
  turns: PreprocessedTurn[];
  formattedPromptText: string;
  sanitizedPiiCount: number;
}

export interface IPreprocessingService {
  cleanAndSanitize(ocrResult: OcrResult): PreprocessedDialogue;
}
