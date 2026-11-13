import * as fs from 'node:fs';
import * as path from 'node:path';
import sharp from 'sharp';
import { MetadataOcrProvider } from '../src/ocr/metadata-ocr.provider';
import type { RawBoundingBox } from '../src/ocr/ocr.interfaces';
import { OcrService } from '../src/ocr/ocr.service';
import { PaddleTesseractOcrProvider } from '../src/ocr/paddle-tesseract-ocr.provider';

describe('OCR Pipeline Engine (Milestone 1)', () => {
  let paddleProvider: PaddleTesseractOcrProvider;
  let metadataProvider: MetadataOcrProvider;
  let ocrService: OcrService;

  beforeAll(() => {
    paddleProvider = new PaddleTesseractOcrProvider();
    metadataProvider = new MetadataOcrProvider();
    metadataProvider.loadMetadata();
    ocrService = new OcrService(metadataProvider, metadataProvider);
  });

  describe('1. UI Geometry & Size Filtering', () => {
    const H = 1000;
    const yHeaderCutoff = Math.floor(0.082 * H); // 82
    const yFooterCutoff = Math.floor(0.915 * H); // 915

    it('should exclude status bar elements in the top 8.2% header band', () => {
      const topBarBox: RawBoundingBox = [100, 20, 200, 70]; // ymin=20 < 82
      const validBox: RawBoundingBox = [100, 150, 400, 220]; // ymin=150, ymax=220
      const filtered = paddleProvider.filterSystemBars([topBarBox, validBox], H);

      expect(filtered).toHaveLength(1);
      expect(filtered[0]).toEqual(validBox);
    });

    it('should exclude navigation/input bar elements in the bottom 8.5% footer band', () => {
      const bottomBarBox: RawBoundingBox = [50, 920, 500, 960]; // ymax=960 > 915
      const validBox: RawBoundingBox = [50, 800, 450, 860];
      const filtered = paddleProvider.filterSystemBars([bottomBarBox, validBox], H);

      expect(filtered).toHaveLength(1);
      expect(filtered[0]).toEqual(validBox);
    });

    it('should exclude noise boxes smaller than 10px width or 8px height', () => {
      const narrowBox: RawBoundingBox = [100, 200, 105, 250]; // width = 5 < 10
      const shortBox: RawBoundingBox = [100, 200, 150, 205]; // height = 5 < 8
      const validBox: RawBoundingBox = [100, 200, 200, 250]; // 100x50
      const filtered = paddleProvider.filterSystemBars([narrowBox, shortBox, validBox], H);

      expect(filtered).toHaveLength(1);
      expect(filtered[0]).toEqual(validBox);
    });
  });

  describe('2. Horizontal Box Merging', () => {
    it('should merge fragmented bounding boxes on the same line when gap <= 35px', () => {
      const word1: RawBoundingBox = [100, 200, 180, 240];
      const word2: RawBoundingBox = [195, 202, 280, 242]; // gap = 195 - 180 = 15 <= 35
      const merged = paddleProvider.mergeHorizontalBoxes([word1, word2], 1080);

      expect(merged).toHaveLength(1);
      expect(merged[0][0]).toBe(100);
      expect(merged[0][1]).toBe(200);
      expect(merged[0][2]).toBe(280);
      expect(merged[0][3]).toBe(242);
    });

    it('should not merge boxes when horizontal gap > 35px', () => {
      const bubbleLeft: RawBoundingBox = [50, 200, 200, 240];
      const bubbleRight: RawBoundingBox = [350, 200, 550, 240]; // gap = 150 > 35
      const merged = paddleProvider.mergeHorizontalBoxes([bubbleLeft, bubbleRight], 1080);

      expect(merged).toHaveLength(2);
    });

    it('should return input unchanged if 0 or 1 box provided', () => {
      expect(paddleProvider.mergeHorizontalBoxes([], 1080)).toEqual([]);
      const single: RawBoundingBox[] = [[10, 20, 50, 60]];
      expect(paddleProvider.mergeHorizontalBoxes(single, 1080)).toEqual(single);
    });
  });

  describe('3. Reading Order Sorting', () => {
    it('should sort boxes in natural reading order (top-to-bottom, left-to-right)', () => {
      const boxRow2Right: RawBoundingBox = [400, 300, 600, 340];
      const boxRow2Left: RawBoundingBox = [100, 302, 300, 342];
      const boxRow1: RawBoundingBox = [150, 100, 350, 140];

      const sorted = paddleProvider.sortReadingOrder([boxRow2Right, boxRow1, boxRow2Left], 1000);

      expect(sorted).toHaveLength(3);
      expect(sorted[0]).toEqual(boxRow1);
      expect(sorted[1]).toEqual(boxRow2Left);
      expect(sorted[2]).toEqual(boxRow2Right);
    });
  });

  describe('4. Margin-Based Speaker Attribution & Smoothing', () => {
    const W = 1000;

    it('should classify centered elements as system chips', () => {
      // center = 500, width = 200 (<600), left = 400 (>180), right = 400 (>180)
      const dateChip: RawBoundingBox = [400, 150, 600, 190];
      const speaker = paddleProvider.classifySpeaker(dateChip, W);
      expect(speaker).toBe('system');
    });

    it('should classify right-docked elements as user turns', () => {
      // left = 550 (>150), right = 1000 - 950 = 50 (<100)
      const userBubble: RawBoundingBox = [550, 300, 950, 360];
      const speaker = paddleProvider.classifySpeaker(userBubble, W);
      expect(speaker).toBe('user');
    });

    it('should classify left-docked elements as peer turns', () => {
      // left = 80 (<180), right = 1000 - 600 = 400 (>120)
      const peerBubble: RawBoundingBox = [80, 200, 600, 260];
      const speaker = paddleProvider.classifySpeaker(peerBubble, W);
      expect(speaker).toBe('peer');
    });

    it('should smooth adjacent lines within same bubble', () => {
      const lines = [
        { box: [80, 200, 500, 240] as RawBoundingBox, speaker: 'peer' as const },
        { box: [80, 245, 450, 285] as RawBoundingBox, speaker: 'user' as const }, // slight misattribution
      ];
      const smoothed = paddleProvider.smoothBubbleSpeakers(lines, W);
      expect(smoothed[0].speaker).toBe('peer');
      expect(smoothed[1].speaker).toBe('peer');
    });
  });

  describe('5. UI Garbage Regex Filter', () => {
    it('should identify system chrome and input field placeholders as garbage', () => {
      expect(paddleProvider.isUiGarbage('Nhập tin nhắn...')).toBe(true);
      expect(paddleProvider.isUiGarbage('Đang hoạt động')).toBe(true);
      expect(paddleProvider.isUiGarbage('Đã xem')).toBe(true);
      expect(paddleProvider.isUiGarbage('12:45 CH')).toBe(true);
      expect(paddleProvider.isUiGarbage('Hôm nay')).toBe(true);
      expect(paddleProvider.isUiGarbage('Tin nhắn SMS')).toBe(true);
      expect(paddleProvider.isUiGarbage('Viettel')).toBe(true);
      expect(paddleProvider.isUiGarbage('a')).toBe(true);
    });

    it('should retain valid conversational message texts', () => {
      expect(paddleProvider.isUiGarbage('Chào anh, em gửi hợp đồng nhé')).toBe(false);
      expect(paddleProvider.isUiGarbage('Số tài khoản là 1903456789012')).toBe(false);
      expect(paddleProvider.isUiGarbage('?')).toBe(false);
    });
  });

  describe('6. Optical Preprocessing with Sharp', () => {
    it('should process crop with padding, polarity inversion, and Lanczos resize', async () => {
      // Create a test 100x100 dark blue image (like Zalo user bubble)
      const darkBuffer = await sharp({
        create: {
          width: 100,
          height: 100,
          channels: 3,
          background: { r: 20, g: 30, b: 60 },
        },
      })
        .png()
        .toBuffer();

      const cropBox: RawBoundingBox = [10, 10, 80, 28]; // height = 18 < 30px
      const processed = await paddleProvider.preprocessCrop(darkBuffer, cropBox, 100, 100);

      expect(processed).toBeInstanceOf(Buffer);
      const meta = await sharp(processed).metadata();
      // Should be resized to target height 32px
      expect(meta.height).toBe(32);
      expect(meta.width).toBeGreaterThanOrEqual(16);
    });
  });

  describe('7. Vietnamese Typography & Confusion Lexicon', () => {
    it('should normalize quotes, dashes, tone marks, and spacing', () => {
      const raw = '“Chào bạn” ,tài khoản hòa mạng ...';
      const cleaned = paddleProvider.cleanVietnameseText(raw);

      expect(cleaned).toContain('"Chào bạn"');
      expect(cleaned).toContain(', tài khoản');
      expect(cleaned).toContain('hoà mạng');
    });

    it('should correct common mobile OCR confusion pairs', () => {
      const raw = 'chảo bạn, dụ vàng tôi chuyển 2.5 triệu vào ngàn hàng theo smant contract';
      const cleaned = paddleProvider.cleanVietnameseText(raw);

      expect(cleaned).toContain('chào bạn');
      expect(cleaned).toContain('Dạ vâng');
      expect(cleaned).toContain('2,5 triệu');
      expect(cleaned).toContain('ngân hàng');
      expect(cleaned).toContain('smart contract');
    });
  });

  describe('8. Multi-Shot Turn Stitching & Levenshtein Deduplication', () => {
    it('should deduplicate overlapping turns across screenshots using CER <= 0.18', () => {
      const turns = [
        { speaker: 'peer' as const, text: 'Anh gửi tiền vào số tài khoản này nhé', imageIndex: 0, confidence: 0.9 },
        { speaker: 'user' as const, text: 'Vâng tôi đang chuyển', imageIndex: 0, confidence: 0.9 },
        // Shot 1 boundary overlap: user turn repeated with minor OCR noise
        { speaker: 'user' as const, text: 'Vâng tôi đang chuyển.', imageIndex: 1, confidence: 0.95 },
        { speaker: 'peer' as const, text: 'Chụp lại biên lai giúp em', imageIndex: 1, confidence: 0.9 },
      ];

      const stitched = ocrService.stitchMultiShotTurns(turns);
      expect(stitched).toHaveLength(3);
      expect(stitched[0].text).toBe('Anh gửi tiền vào số tài khoản này nhé');
      expect(stitched[1].text).toContain('Vâng tôi đang chuyển');
      expect(stitched[2].text).toBe('Chụp lại biên lai giúp em');
    });

    it('should repair viewport boundary truncated turns in place', () => {
      const turns = [
        { speaker: 'peer' as const, text: 'Anh chuyển ngay vào', imageIndex: 0, confidence: 0.8 }, // Truncated by viewport edge
        // Shot 1 has complete message
        { speaker: 'peer' as const, text: 'Anh chuyển ngay vào số tài khoản 123456', imageIndex: 1, confidence: 0.95 },
        { speaker: 'user' as const, text: 'Đã nhận được', imageIndex: 1, confidence: 0.9 },
      ];

      const stitched = ocrService.stitchMultiShotTurns(turns);
      expect(stitched).toHaveLength(2);
      expect(stitched[0].text).toBe('Anh chuyển ngay vào số tài khoản 123456');
      expect(stitched[1].text).toBe('Đã nhận được');
    });
  });

  describe('9. MetadataOcrProvider with Dataset Images', () => {
    it('should resolve ground truth turns from data/images/ by SHA-256 hash', async () => {
      const samplePath = path.resolve(process.cwd(), 'data/images/MD_001_1.png');
      if (fs.existsSync(samplePath)) {
        const buffer = fs.readFileSync(samplePath);
        const result = await metadataProvider.processImages([{ buffer, mediaType: 'image/png' }]);

        expect(result.imageCount).toBe(1);
        expect(result.turns.length).toBeGreaterThan(0);
        expect(result.fullTranscript.length).toBeGreaterThan(0);
        // All turns must have imageIndex = 0 for 1 input image
        for (const turn of result.turns) {
          expect(turn.imageIndex).toBe(0);
          expect(['peer', 'user']).toContain(turn.speaker);
          expect(turn.confidence).toBe(1.0);
        }
      }
    });

    it('should distribute turns sequentially across multiple images so 0 <= imageIndex < images.length', async () => {
      const samplePath = path.resolve(process.cwd(), 'data/images/MD_001_1.png');
      if (fs.existsSync(samplePath)) {
        const buf = fs.readFileSync(samplePath);
        const result = await metadataProvider.processImages([
          { buffer: buf, mediaType: 'image/png' },
          { buffer: buf, mediaType: 'image/png' },
          { buffer: buf, mediaType: 'image/png' },
        ]);

        expect(result.imageCount).toBe(3);
        const indices = new Set(result.turns.map((t) => t.imageIndex));
        for (const idx of indices) {
          expect(idx).toBeGreaterThanOrEqual(0);
          expect(idx).toBeLessThan(3);
        }
      }
    });

    it('should provide safe fallback for unmatched synthetic images', async () => {
      const synthetic = await sharp({
        create: { width: 50, height: 50, channels: 3, background: { r: 128, g: 128, b: 128 } },
      })
        .png()
        .toBuffer();

      const result = await metadataProvider.processImages([{ buffer: synthetic, mediaType: 'image/png' }]);
      expect(result.imageCount).toBe(1);
      expect(result.turns).toHaveLength(1);
      expect(result.turns[0].imageIndex).toBe(0);
      expect(result.turns[0].speaker).toBe('peer');
    });
  });

  describe('10. OcrService End-to-End & Fallback Delegation', () => {
    it('should delegate to engine and format transcript', async () => {
      const synthetic = await sharp({
        create: { width: 60, height: 60, channels: 3, background: { r: 200, g: 200, b: 200 } },
      })
        .png()
        .toBuffer();

      const result = await ocrService.processImages([{ buffer: synthetic, mediaType: 'image/png' }]);
      expect(result.imageCount).toBe(1);
      expect(result.turns.length).toBeGreaterThan(0);
      expect(result.fullTranscript).toContain('Đối phương:');
    });

    it('should return empty result for empty image array', async () => {
      const result = await ocrService.processImages([]);
      expect(result.imageCount).toBe(0);
      expect(result.turns).toEqual([]);
      expect(result.fullTranscript).toBe('');
    });
  });
});
