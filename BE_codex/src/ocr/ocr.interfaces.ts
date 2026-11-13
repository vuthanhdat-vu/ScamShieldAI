export const OCR_ENGINE = Symbol('OCR_ENGINE');

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

export interface ImageInput {
  buffer: Buffer;
  mediaType: string;
}

export interface IOcrEngine {
  processImages(images: ImageInput[]): Promise<OcrResult>;
}

export type RawBoundingBox = [number, number, number, number]; // [xmin, ymin, xmax, ymax]
