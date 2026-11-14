import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { parse } from 'yaml';
import {
  AI_ANALYSIS_PROVIDER,
  type AiAnalysisCandidate,
  type AiAnalysisInput,
  type AiAnalysisProvider,
} from '../src/ai/ai-analysis-provider';
import { MockAiAnalysisProvider } from '../src/ai/mock-ai-analysis.provider';
import { AnalysisService } from '../src/analysis/analysis.service';
import { MAX_IMAGE_BYTES } from '../src/analysis/dto/images-request.dto';
import { EvidenceValidator } from '../src/analysis/evidence-validator';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import {
  InputType,
  RiskLevel,
  ScamCategory,
  SignalType,
} from '../src/contracts/analysis.enums';
import { ErrorCode } from '../src/contracts/error-code.enum';
import { UrlIntelligenceService } from '../src/intelligence/url-intelligence.service';
import { MetadataOcrProvider } from '../src/ocr/metadata-ocr.provider';
import { OcrService } from '../src/ocr/ocr.service';
import { PiiSanitizer } from '../src/preprocessing/pii-sanitizer';
import { PreprocessingService } from '../src/preprocessing/preprocessing.service';
import { RiskService } from '../src/risk/risk.service';

const spec = parse(
  readFileSync(resolve(__dirname, '../docs/ScamShield_AI_OpenAPI_v1.2.yaml'), 'utf8')
) as {
  components: { schemas: Record<string, object> };
};

const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);

const analysisResponseValidator: ValidateFunction = ajv.compile({
  ...spec,
  $ref: '#/components/schemas/AnalysisResponse',
});

const errorResponseValidator: ValidateFunction = ajv.compile({
  ...spec,
  $ref: '#/components/schemas/ErrorResponse',
});

function assertOpenApiCompliance(payload: unknown): void {
  const valid = analysisResponseValidator(payload);
  if (!valid) {
    throw new Error('OpenAPI v1.2 Schema Violation: ' + ajv.errorsText(analysisResponseValidator.errors));
  }
}

async function expectSchema(response: Response, status: number, schema: 'AnalysisResponse' | 'ErrorResponse'): Promise<unknown> {
  expect(response.status).toBe(status);
  expect(response.headers.get('content-type')).toMatch(/^application\/json(?:;|$)/iu);
  const payload: unknown = await response.json();
  const validator = schema === 'AnalysisResponse' ? analysisResponseValidator : errorResponseValidator;
  if (!validator(payload)) {
    throw new Error(`Schema Violation for ${schema}: ` + ajv.errorsText(validator.errors));
  }
  return payload;
}

async function expectError(
  response: Response,
  status: number,
  errorCode: ErrorCode
): Promise<void> {
  const payload = await expectSchema(response, status, 'ErrorResponse');
  expect(payload).toMatchObject({
    statusCode: status,
    errorCode,
    requestId: response.headers.get('x-request-id'),
  });
}

function appendImage(
  form: FormData,
  bytes: Buffer,
  name = 'screen.png',
  mime = 'image/png',
  field = 'images'
): void {
  form.append(field, new Blob([Uint8Array.from(bytes)], { type: mime }), name);
}

function padJpeg(jpeg: Buffer, length: number): Buffer {
  const segments: Buffer[] = [jpeg.subarray(0, 2)];
  let remaining = length - jpeg.length;
  while (remaining > 0) {
    const segmentLength = remaining <= 65_537 ? remaining : Math.min(65_537, remaining - 4);
    const segment = Buffer.alloc(segmentLength);
    segment.writeUInt16BE(0xfffe);
    segment.writeUInt16BE(segmentLength - 2, 2);
    segments.push(segment);
    remaining -= segmentLength;
  }
  return Buffer.concat([...segments, jpeg.subarray(2)]);
}

describe('Empirical Stress Harness: Image Analysis Pipeline (Challenger M3)', () => {
  let app: INestApplication;
  let url: string;
  let sampleJpeg: Buffer;
  let samplePng: Buffer;
  let sampleWebp: Buffer;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();

    const baseFixture = sharp({
      create: { width: 32, height: 32, channels: 3, background: '#123456' },
    });
    [sampleJpeg, samplePng, sampleWebp] = await Promise.all([
      baseFixture.clone().jpeg().toBuffer(),
      baseFixture.clone().png().toBuffer(),
      baseFixture.clone().webp().toBuffer(),
    ]);
  }, 30000);

  afterAll(async () => {
    await app?.close();
  });

  function upload(form: FormData): Promise<Response> {
    return fetch(url + '/api/v1/analysis/images', {
      method: 'POST',
      body: form,
    });
  }

  // =========================================================================
  // SECTION 1: ADVERSARIAL GROUNDING & EVIDENCE VALIDATOR ATTACK
  // =========================================================================
  describe('Adversarial Grounding & EvidenceValidator Stress', () => {
    const validator = new EvidenceValidator();

    it('strictly enforces 0-based integer imageIndex < images.length', () => {
      const mockInput: AiAnalysisInput = {
        inputType: InputType.IMAGE,
        images: [
          { bytes: Buffer.alloc(10), mediaType: 'image/png' },
          { bytes: Buffer.alloc(10), mediaType: 'image/png' },
          { bytes: Buffer.alloc(10), mediaType: 'image/png' },
        ], // length = 3, valid indices are 0, 1, 2
      };

      const adversarialEvidence = [
        // Valid grounded items
        { quote: 'yêu cầu chuyển tiền', reason: 'Valid 0', signalType: SignalType.MONEY_REQUEST, imageIndex: 0 },
        { quote: 'gửi mã OTP ngay', reason: 'Valid 1', signalType: SignalType.CREDENTIAL_REQUEST, imageIndex: 1 },
        { quote: 'gửi mã OTP ngay lập tức trong 15 phút', reason: 'Valid 2', signalType: SignalType.URGENCY, imageIndex: 2 },
        // Out of bounds / negative
        { quote: 'yêu cầu chuyển tiền', reason: 'Negative index', signalType: SignalType.MONEY_REQUEST, imageIndex: -1 },
        { quote: 'yêu cầu chuyển tiền', reason: 'Index equals length', signalType: SignalType.MONEY_REQUEST, imageIndex: 3 },
        { quote: 'yêu cầu chuyển tiền', reason: 'Index exceeds length', signalType: SignalType.MONEY_REQUEST, imageIndex: 99 },
        // Non-integer / special float values
        { quote: 'yêu cầu chuyển tiền', reason: 'Float index', signalType: SignalType.MONEY_REQUEST, imageIndex: 1.5 as any },
        { quote: 'yêu cầu chuyển tiền', reason: 'NaN index', signalType: SignalType.MONEY_REQUEST, imageIndex: NaN as any },
        { quote: 'yêu cầu chuyển tiền', reason: 'Infinity index', signalType: SignalType.MONEY_REQUEST, imageIndex: Infinity as any },
        // Null / string type coercion attempts
        { quote: 'yêu cầu chuyển tiền', reason: 'Null index on image', signalType: SignalType.MONEY_REQUEST, imageIndex: null as any },
        { quote: 'yêu cầu chuyển tiền', reason: 'String index "0"', signalType: SignalType.MONEY_REQUEST, imageIndex: '0' as any },
        // Invalid signal or missing reason/quote
        { quote: 'yêu cầu chuyển tiền', reason: 'Invalid signal', signalType: 'UNKNOWN_SIGNAL' as any, imageIndex: 0 },
        { quote: '', reason: 'Empty quote', signalType: SignalType.MONEY_REQUEST, imageIndex: 0 },
        { quote: 'yêu cầu chuyển tiền', reason: '   ', signalType: SignalType.MONEY_REQUEST, imageIndex: 0 },
      ];

      const { accepted, rejected } = validator.validate(mockInput, adversarialEvidence as any);

      expect(rejected).toBe(true);
      expect(accepted).toHaveLength(3);
      expect(accepted.map((e) => e.imageIndex)).toEqual([0, 1, 2]);
    });

    it('rejects imageIndex !== null when inputType is TEXT', () => {
      const textInput: AiAnalysisInput = {
        inputType: InputType.TEXT,
        text: 'Vui lòng gửi mã OTP ngay để kích hoạt tài khoản.',
      };

      const itemsWithImageIndex = [
        { quote: 'gửi mã OTP', reason: 'Text input with image index', signalType: SignalType.CREDENTIAL_REQUEST, imageIndex: 0 as any },
      ];

      const { accepted, rejected } = validator.validate(textInput, itemsWithImageIndex);
      expect(rejected).toBe(true);
      expect(accepted).toHaveLength(0);
    });

    it('deduplicates duplicate evidence observations across identical screenshots and signals', () => {
      const mockInput: AiAnalysisInput = {
        inputType: InputType.IMAGE,
        images: [{ bytes: Buffer.alloc(10), mediaType: 'image/png' }],
      };

      const duplicateItems = [
        { quote: 'yêu cầu chuyển tiền', reason: 'First occurrence', signalType: SignalType.MONEY_REQUEST, imageIndex: 0 },
        { quote: 'yêu cầu chuyển tiền', reason: 'Duplicate identical quote & index', signalType: SignalType.MONEY_REQUEST, imageIndex: 0 },
      ];

      const { accepted, rejected } = validator.validate(mockInput, duplicateItems);
      expect(rejected).toBe(false);
      expect(accepted).toHaveLength(1);
      expect(accepted[0].reason).toBe('First occurrence');
    });
  });

  // =========================================================================
  // SECTION 2: MULTI-IMAGE BOUNDARY CONDITIONS (1 to 5, 0, 6, PAYLOAD SIZES)
  // =========================================================================
  describe('Multi-Image Boundary Conditions', () => {
    it('accepts boundary minimum: exactly 1 valid image', async () => {
      const form = new FormData();
      appendImage(form, samplePng, 'single.png', 'image/png');

      const res = await upload(form);
      const payload = (await expectSchema(res, 200, 'AnalysisResponse')) as any;
      assertOpenApiCompliance(payload);
      expect(payload.input_type).toBe('IMAGE');
    });

    it('accepts boundary maximum: exactly 5 valid images with mixed formats (JPEG, PNG, WebP)', async () => {
      const form = new FormData();
      appendImage(form, sampleJpeg, 'img_0.jpg', 'image/jpeg');
      appendImage(form, samplePng, 'img_1.png', 'image/png');
      appendImage(form, sampleWebp, 'img_2.webp', 'image/webp');
      appendImage(form, sampleJpeg, 'img_3.jpg', 'image/jpeg');
      appendImage(form, samplePng, 'img_4.png', 'image/png');

      const res = await upload(form);
      const payload = (await expectSchema(res, 200, 'AnalysisResponse')) as any;
      assertOpenApiCompliance(payload);
      expect(payload.input_type).toBe('IMAGE');
    });

    it('rejects 0 images (no files attached) -> 400 INVALID_INPUT', async () => {
      const form = new FormData();
      form.append('context', 'chi gui text');
      const res = await upload(form);
      await expectError(res, 400, ErrorCode.INVALID_INPUT);
    });

    it('rejects 6 images (exceeding maximum 5 images) -> 400 INVALID_INPUT', async () => {
      const form = new FormData();
      for (let i = 0; i < 6; i++) {
        appendImage(form, samplePng, `extra_${i}.png`);
      }
      const res = await upload(form);
      await expectError(res, 400, ErrorCode.INVALID_INPUT);
    });

    it('accepts exact 5MB boundary image (5,242,880 bytes)', async () => {
      const exact5Mb = padJpeg(sampleJpeg, MAX_IMAGE_BYTES);
      const form = new FormData();
      appendImage(form, exact5Mb, 'exact_5mb.jpg', 'image/jpeg');
      const res = await upload(form);
      expect(res.status).toBe(200);
      assertOpenApiCompliance(await res.json());
    });

    it('rejects single image exceeding 5MB -> 413 IMAGE_TOO_LARGE', async () => {
      const oversized = padJpeg(sampleJpeg, MAX_IMAGE_BYTES + 1);
      const form = new FormData();
      appendImage(form, oversized, 'oversized.jpg', 'image/jpeg');
      const res = await upload(form);
      await expectError(res, 413, ErrorCode.IMAGE_TOO_LARGE);
    });

    it('rejects combined images exceeding 20MB -> 413 IMAGE_TOO_LARGE', async () => {
      const max4 = padJpeg(sampleJpeg, MAX_IMAGE_BYTES); // ~5MB
      const form = new FormData();
      for (let i = 0; i < 4; i++) {
        appendImage(form, max4, `chunk_${i}.jpg`, 'image/jpeg');
      }
      appendImage(form, Buffer.alloc(10), 'overflow.jpg', 'image/jpeg');
      const res = await upload(form);
      await expectError(res, 413, ErrorCode.IMAGE_TOO_LARGE);
    });
  });

  // =========================================================================
  // SECTION 3: MOCK AI DETERMINISM, FALLBACK, AND DIALOGUE EVALUATION
  // =========================================================================
  describe('Mock AI Evaluation & Fallback Semantics', () => {
    const mockAi = new MockAiAnalysisProvider();
    const abortSignal = new AbortController().signal;

    it('handles empty dialogue turns -> canAssess: false with explicit simulation message', async () => {
      const result = await mockAi.analyze({
        inputType: InputType.IMAGE,
        images: [{ bytes: Buffer.alloc(10), mediaType: 'image/png' }],
        dialogue: {
          turns: [],
          formattedPromptText: '',
          sanitizedPiiCount: 0,
        },
      }, abortSignal);

      expect(result.canAssess).toBe(false);
      expect(result.suggestedCategory).toBe(ScamCategory.NONE);
      expect(result.summary).toBe('Chế độ mô phỏng chưa đọc được nội dung trong ảnh.');
      expect(result.evidence).toEqual([]);
      expect(result.recommendedActions).toEqual(['Gửi nội dung hội thoại dưới dạng văn bản.']);
    });

    it('handles synthetic fallback OCR turns ("Tin nhắn không xác định...") -> canAssess: false', async () => {
      const result = await mockAi.analyze({
        inputType: InputType.IMAGE,
        images: [
          { bytes: Buffer.alloc(10), mediaType: 'image/png' },
          { bytes: Buffer.alloc(10), mediaType: 'image/png' },
        ],
        dialogue: {
          turns: [
            { speaker: 'peer', text: 'Tin nhắn không xác định từ ảnh chụp màn hình.', imageIndex: 0 },
            { speaker: 'peer', text: 'Tin nhắn không xác định từ ảnh chụp màn hình.', imageIndex: 1 },
          ],
          formattedPromptText: '...',
          sanitizedPiiCount: 0,
        },
      }, abortSignal);

      expect(result.canAssess).toBe(false);
      expect(result.summary).toBe('Chế độ mô phỏng chưa đọc được nội dung trong ảnh.');
      expect(result.evidence).toEqual([]);
    });

    it('correctly evaluates multi-image scam turns and preserves exact 0-based imageIndex', async () => {
      const result = await mockAi.analyze({
        inputType: InputType.IMAGE,
        images: [
          { bytes: Buffer.alloc(10), mediaType: 'image/png' },
          { bytes: Buffer.alloc(10), mediaType: 'image/png' },
          { bytes: Buffer.alloc(10), mediaType: 'image/png' },
          { bytes: Buffer.alloc(10), mediaType: 'image/png' },
        ],
        dialogue: {
          turns: [
            { speaker: 'peer', text: 'Tôi là đại diện ngân hàng thông báo trúng thưởng lớn.', imageIndex: 0 },
            { speaker: 'peer', text: 'Yêu cầu chuyển tiền 5 triệu phí hồ sơ ngay bây giờ.', imageIndex: 1 },
            { speaker: 'user', text: 'Tôi hiểu rồi.', imageIndex: 2 },
            { speaker: 'peer', text: 'Gửi mã OTP ngay lập tức trong 5 phút nếu không sẽ bị khóa tài khoản.', imageIndex: 3 },
          ],
          formattedPromptText: '...',
          sanitizedPiiCount: 0,
        },
      }, abortSignal);

      expect(result.canAssess).toBe(true);
      expect(result.evidence.length).toBeGreaterThanOrEqual(4);

      // Verify each evidence item points to the exact imageIndex of the turn that contained the signal
      const moneyEvidence = result.evidence.find((e) => e.signalType === SignalType.MONEY_REQUEST);
      expect(moneyEvidence).toBeDefined();
      expect(moneyEvidence?.imageIndex).toBe(1);

      const otpEvidence = result.evidence.find((e) => e.signalType === SignalType.CREDENTIAL_REQUEST);
      expect(otpEvidence).toBeDefined();
      expect(otpEvidence?.imageIndex).toBe(3);

      const urgencyEvidences = result.evidence.filter((e) => e.signalType === SignalType.URGENCY);
      expect(urgencyEvidences.length).toBeGreaterThanOrEqual(1);
      expect(urgencyEvidences.map((e) => e.imageIndex)).toContain(1);
      expect(urgencyEvidences.map((e) => e.imageIndex)).toContain(3);
    });

    it('strictly confines evidence imageIndex to turns where signals occur in a 5-image sequence', async () => {
      const result = await mockAi.analyze({
        inputType: InputType.IMAGE,
        images: Array.from({ length: 5 }, () => ({ bytes: Buffer.alloc(10), mediaType: 'image/png' })),
        dialogue: {
          turns: [
            { speaker: 'peer', text: 'Chào anh, tôi liên hệ hỗ trợ tài khoản.', imageIndex: 0 },
            { speaker: 'peer', text: 'Yêu cầu chuyển tiền 2 triệu để hoàn tất thủ tục.', imageIndex: 1 },
            { speaker: 'user', text: 'Sao lại mất tiền?', imageIndex: 2 },
            { speaker: 'peer', text: 'Nếu không sẽ bị khóa tài khoản vĩnh viễn.', imageIndex: 3 },
            { speaker: 'user', text: 'Để tôi hỏi lại người nhà.', imageIndex: 4 },
          ],
          formattedPromptText: '...',
          sanitizedPiiCount: 0,
        },
      }, abortSignal);

      expect(result.canAssess).toBe(true);
      expect(result.evidence.length).toBe(2);
      const indices = result.evidence.map((e) => e.imageIndex);
      expect(indices).toEqual([1, 3]);
      expect(indices).not.toContain(0);
      expect(indices).not.toContain(2);
      expect(indices).not.toContain(4);
    });

    it('de-obfuscates zero-width characters in dialogue turns via PreprocessingService before Mock AI', () => {
      const prep = new PreprocessingService();
      const rawOcrTurn = {
        speaker: 'peer' as const,
        text: 'c\u200Bh\u200Bu\u200By\u200Bể\u200Bn\u200B \u200Bt\u200Bi\u200Bề\u200Bn',
        imageIndex: 0,
      };
      const cleaned = prep.cleanAndSanitize({
        turns: [rawOcrTurn],
        fullTranscript: rawOcrTurn.text,
        imageCount: 1,
      });

      expect(cleaned.turns[0].text).toBe('chuyển tiền');
    });

    it('correctly evaluates completely benign dialogue turns -> canAssess: true, 0 evidence', async () => {
      const result = await mockAi.analyze({
        inputType: InputType.IMAGE,
        images: [
          { bytes: Buffer.alloc(10), mediaType: 'image/png' },
          { bytes: Buffer.alloc(10), mediaType: 'image/png' },
        ],
        dialogue: {
          turns: [
            { speaker: 'peer', text: 'Xin chào, tài liệu cuộc họp sáng nay đã gửi qua email.', imageIndex: 0 },
            { speaker: 'user', text: 'Cảm ơn bạn, tôi đã nhận được rồi nhé.', imageIndex: 1 },
          ],
          formattedPromptText: '...',
          sanitizedPiiCount: 0,
        },
      }, abortSignal);

      expect(result.canAssess).toBe(true);
      expect(result.evidence).toEqual([]);
      expect(result.summary).toBe('Chưa thấy dấu hiệu trong các mẫu văn bản mô phỏng từ ảnh.');
    });
  });

  // =========================================================================
  // SECTION 4: END-TO-END WIRED PIPELINE INTEGRATION WITH REAL MOCK PROVIDER
  // =========================================================================
  describe('Wired AnalysisService End-to-End Execution with Mock AI', () => {
    it('executes full pipeline: synthetic images -> MetadataOcr fallback -> Preprocessing -> MockAi -> OpenAPI response', async () => {
      // Create synthetic 16x16 PNG unknown to metadata.json
      const unknownPng = await sharp({
        create: { width: 16, height: 16, channels: 3, background: '#993311' },
      }).png().toBuffer();

      const form = new FormData();
      appendImage(form, unknownPng, 'unknown_1.png');
      appendImage(form, unknownPng, 'unknown_2.png');

      const res = await upload(form);
      const payload = (await expectSchema(res, 200, 'AnalysisResponse')) as any;
      assertOpenApiCompliance(payload);

      // Unknown images fallback to synthetic unreadable turns -> UNABLE_TO_ASSESS
      expect(payload.input_type).toBe('IMAGE');
      expect(payload.risk_level).toBe(RiskLevel.UNABLE_TO_ASSESS);
      expect(payload.risk_score).toBeNull();
      expect(payload.scam_category).toBe(ScamCategory.NONE);
      expect(payload.evidence).toEqual([]);
      expect(payload.analysis_id).toBeDefined();
      expect(payload.analyzed_at).toBeDefined();
    });

    it('executes full pipeline on indexed dataset image with scam keywords (Case 5) -> MetadataOcr match -> Preprocessing -> MockAi -> DANGER', async () => {
      // Load Case 5 from metadata (MD_005, EVN cut-off threat & money transfer request)
      const metadataPath = resolve(__dirname, '../../data/metadata.json');
      const cases = JSON.parse(readFileSync(metadataPath, 'utf8'));
      const case5 = cases.find((c: any) => c.id === 5);
      expect(case5).toBeDefined();

      const image0Path = resolve(__dirname, '../../data', case5.image_path[0]);
      const image0Buffer = readFileSync(image0Path);

      const form = new FormData();
      appendImage(form, image0Buffer, 'case5_0.png');

      const res = await upload(form);
      const payload = (await expectSchema(res, 200, 'AnalysisResponse')) as any;
      assertOpenApiCompliance(payload);

      expect(payload.input_type).toBe('IMAGE');
      // Case 5 has money transfer request and threat -> DANGER
      expect([RiskLevel.DANGER, RiskLevel.SUSPICIOUS]).toContain(payload.risk_level);
      expect(payload.risk_score).toBeGreaterThanOrEqual(40);
      expect(payload.evidence.length).toBeGreaterThan(0);
      for (const ev of payload.evidence) {
        expect(ev.image_index).toBe(0);
        expect(typeof ev.quote).toBe('string');
        expect(ev.quote.length).toBeGreaterThan(0);
      }
    });

    it('verifies determinism (idempotency): 3 identical calls yield identical risk assessment', async () => {
      const unknownPng = await sharp({
        create: { width: 16, height: 16, channels: 3, background: '#445566' },
      }).png().toBuffer();

      const callPipeline = async () => {
        const form = new FormData();
        appendImage(form, unknownPng, 'det.png');
        const res = await upload(form);
        return (await res.json()) as any;
      };

      const res1 = await callPipeline();
      const res2 = await callPipeline();
      const res3 = await callPipeline();

      expect(res1.risk_level).toBe(res2.risk_level);
      expect(res2.risk_level).toBe(res3.risk_level);
      expect(res1.risk_score).toBe(res2.risk_score);
      expect(res2.risk_score).toBe(res3.risk_score);
      expect(res1.scam_category).toBe(res2.scam_category);
      expect(res1.evidence).toEqual(res2.evidence);
    });
  });

  // =========================================================================
  // SECTION 5: PII SANITIZATION WITHIN IMAGE TRANSCRIPT
  // =========================================================================
  describe('PII Sanitization & Leakage Prevention in Image Dialogue', () => {
    it('sanitizes sensitive PII in dialogue turns with session HMAC tokens', () => {
      const sanitizer = new PiiSanitizer();
      const rawText = 'Số CCCD của bạn là 040054001299, mã OTP 948201 đã gửi về số 0912345678, chuyển vào STK 1903456789012.';
      const { sanitizedText, count } = sanitizer.sanitize(rawText);

      expect(count).toBeGreaterThanOrEqual(3);
      // Raw sensitive values must NOT be present in sanitized output
      expect(sanitizedText).not.toContain('040054001299');
      expect(sanitizedText).not.toContain('948201');
      expect(sanitizedText).not.toContain('1903456789012');
      // Redacted markers must be present
      expect(sanitizedText).toMatch(/<MASKED_(?:CCCD|OTP|BANK_ACC|PHONE_NUMBER)_\d+>/);
      const refs = sanitizer.getReferences();
      expect(refs.length).toBeGreaterThanOrEqual(3);
      for (const ref of refs) {
        expect(ref.saltedHmacSha256).toHaveLength(64); // 32-byte hex HMAC-SHA256
      }
    });
  });
});
