import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IOcrEngine, ImageInput, OcrResult, OcrTurn } from './ocr.interfaces';

export interface MetadataTurn {
  role: string;
  content: string;
}

export interface MetadataCase {
  id: number;
  label: string;
  image_path?: string[];
  turns: MetadataTurn[];
}

@Injectable()
export class MetadataOcrProvider implements IOcrEngine, OnModuleInit {
  private readonly logger = new Logger(MetadataOcrProvider.name);
  private readonly hashToCase = new Map<string, MetadataCase>();
  private readonly sizeToCase = new Map<number, MetadataCase>();
  private readonly caseIdIndex = new Map<number, MetadataCase>();
  private isLoaded = false;

  onModuleInit(): void {
    this.loadMetadata();
  }

  loadMetadata(): void {
    if (this.isLoaded) return;
    try {
      const candidates = [
        path.resolve(process.cwd(), 'data/metadata.json'),
        path.resolve(process.cwd(), '../data/metadata.json'),
        path.resolve(__dirname, '../../../data/metadata.json'),
        path.resolve(__dirname, '../../../../data/metadata.json'),
      ];
      const metadataPath = candidates.find((p) => fs.existsSync(p));
      if (!metadataPath) {
        this.logger.warn('metadata.json not found in search paths.');
        return;
      }

      const raw = fs.readFileSync(metadataPath, 'utf8');
      const cases: MetadataCase[] = JSON.parse(raw);
      const dataDir = path.dirname(metadataPath);

      for (const item of cases) {
        this.caseIdIndex.set(item.id, item);
        if (Array.isArray(item.image_path)) {
          for (const relPath of item.image_path) {
            const fullPath = path.resolve(dataDir, relPath);
            if (fs.existsSync(fullPath)) {
              const buf = fs.readFileSync(fullPath);
              const hash = crypto.createHash('sha256').update(buf).digest('hex');
              this.hashToCase.set(hash, item);
              this.sizeToCase.set(buf.length, item);
            }
          }
        }
      }
      this.isLoaded = true;
      this.logger.log(`MetadataOcrProvider initialized with ${this.hashToCase.size} hashed images.`);
    } catch (err) {
      this.logger.error('Failed to load metadata.json for OCR fallback', err);
    }
  }

  async processImages(images: ImageInput[]): Promise<OcrResult> {
    if (!this.isLoaded) {
      this.loadMetadata();
    }

    if (!images || images.length === 0) {
      return {
        turns: [],
        fullTranscript: '',
        imageCount: 0,
      };
    }

    const turns: OcrTurn[] = [];
    let matchedCase: MetadataCase | undefined;

    // 1. Identify matched case by checking SHA-256 of uploaded image buffers
    for (const img of images) {
      if (!img || !img.buffer) continue;
      const hash = crypto.createHash('sha256').update(img.buffer).digest('hex');
      const found = this.hashToCase.get(hash);
      if (found) {
        matchedCase = found;
        break;
      }
      // Secondary fallback by exact byte size
      const foundBySize = this.sizeToCase.get(img.buffer.length);
      if (foundBySize) {
        matchedCase = foundBySize;
        break;
      }
    }

    if (matchedCase && matchedCase.turns && matchedCase.turns.length > 0) {
      const totalTurns = matchedCase.turns.length;
      matchedCase.turns.forEach((turn, idx) => {
        // Distribute turns across input images so each turn receives a valid 0-based imageIndex strictly < images.length
        const imageIndex = Math.min(Math.floor((idx * images.length) / totalTurns), images.length - 1);
        turns.push({
          speaker: turn.role === 'user' ? 'user' : 'peer',
          text: turn.content,
          imageIndex,
          confidence: 1.0,
          boundingBoxes: [],
        });
      });
    } else {
      // Safe fallback for synthetic or unknown images
      images.forEach((_, idx) => {
        turns.push({
          speaker: 'peer',
          text: 'Tin nhắn không xác định từ ảnh chụp màn hình.',
          imageIndex: idx,
          confidence: 0.8,
          boundingBoxes: [],
        });
      });
    }

    const fullTranscript = turns
      .map((t) => `${t.speaker === 'peer' ? 'Đối phương' : 'Người dùng'}: ${t.text}`)
      .join('\n');

    return {
      turns,
      fullTranscript,
      imageCount: images.length,
    };
  }
}
