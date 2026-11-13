import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Environment } from '../config/environment';
import { MetadataOcrProvider } from './metadata-ocr.provider';
import { type IOcrEngine, OCR_ENGINE } from './ocr.interfaces';
import { OcrService } from './ocr.service';
import { PaddleTesseractOcrProvider } from './paddle-tesseract-ocr.provider';

@Module({
  providers: [
    MetadataOcrProvider,
    PaddleTesseractOcrProvider,
    OcrService,
    {
      provide: OCR_ENGINE,
      inject: [ConfigService, MetadataOcrProvider, PaddleTesseractOcrProvider],
      useFactory: (
        config: ConfigService<Environment, true>,
        metadataProvider: MetadataOcrProvider,
        nativeProvider: PaddleTesseractOcrProvider,
      ): IOcrEngine => {
        const mockAi = config.get('MOCK_AI', { infer: true });
        if (!mockAi && nativeProvider.isAvailable()) {
          return nativeProvider;
        }
        return metadataProvider;
      },
    },
  ],
  exports: [OcrService, OCR_ENGINE, MetadataOcrProvider, PaddleTesseractOcrProvider],
})
export class OcrModule {}
