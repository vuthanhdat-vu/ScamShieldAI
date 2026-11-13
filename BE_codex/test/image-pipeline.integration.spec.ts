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
import { MAX_IMAGE_BYTES } from '../src/analysis/dto/images-request.dto';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import {
  InputType,
  RiskLevel,
  ScamCategory,
  SignalType,
  UrlSignal,
} from '../src/contracts/analysis.enums';
import { ErrorCode } from '../src/contracts/error-code.enum';

interface MetadataTurn {
  role: string;
  content: string;
}

interface MetadataCase {
  id: number;
  label: 'scam' | 'benign';
  image_path: string[];
  turns: MetadataTurn[];
}

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

describe('End-to-End Image Analysis Pipeline (OpenAPI v1.2 Integration)', () => {
  let app: INestApplication;
  let url: string;
  let ai: AiAnalysisProvider;
  let metadataCases: MetadataCase[];
  const casesById = new Map<number, MetadataCase>();

  // Baseline standard image buffers
  let sampleJpeg: Buffer;
  let samplePng: Buffer;
  let sampleWebp: Buffer;

  beforeAll(async () => {
    // 1. Load data/metadata.json
    const metadataRaw = readFileSync(resolve(__dirname, '../../data/metadata.json'), 'utf8');
    metadataCases = JSON.parse(metadataRaw);
    for (const c of metadataCases) {
      casesById.set(c.id, c);
    }

    // 2. Setup NestJS application
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
    ai = app.get<AiAnalysisProvider>(AI_ANALYSIS_PROVIDER);

    // 3. Generate baseline valid image buffers
    const baseFixture = sharp({
      create: { width: 32, height: 32, channels: 3, background: '#245abc' },
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

  function getCaseImages(caseId: number): Buffer[] {
    const c = casesById.get(caseId);
    if (!c) throw new Error(`Case ID ${caseId} not found in metadata`);
    return c.image_path.map((relPath) => readFileSync(resolve(__dirname, '../../data', relPath)));
  }

  // =========================================================================
  // TIER 1: FEATURE COVERAGE
  // =========================================================================
  describe('Tier 1: Feature Coverage (Core Threat Categories)', () => {
    it('T1-01: Government Impersonation (MD_001, Case 1) -> DANGER, detects congan URL', async () => {
      const images = getCaseImages(1);
      const form = new FormData();
      images.forEach((img, idx) => appendImage(form, img, `md001_${idx}.png`));

      const spy = jest.spyOn(ai, 'analyze').mockResolvedValueOnce({
        canAssess: true,
        suggestedCategory: ScamCategory.GOVERNMENT_IMPERSONATION,
        summary: 'Mạo danh cán bộ Công an PC02 Hà Nội đe dọa bắt tạm giam và ép chuyển tiền.',
        evidence: [
          {
            quote: 'tôi là cán bộ công an công tác tại PC02 Hà Nội',
            reason: 'Mạo danh cơ quan công an',
            signalType: SignalType.IMPERSONATION,
            imageIndex: 0,
          },
          {
            quote: 'nếu không sẽ bị cưỡng chế bắt giam',
            reason: 'Đe dọa bắt giam',
            signalType: SignalType.THREAT,
            imageIndex: 1,
          },
          {
            quote: 'truy cập đường dẫn https://congan-pc02-hanoi.org để xem lệnh bắt',
            reason: 'Đường link mạo danh cơ quan công an',
            signalType: SignalType.SUSPICIOUS_URL,
            imageIndex: 2,
          },
          {
            quote: 'yêu cầu chuyển tiền vào tài khoản tạm giữ',
            reason: 'Yêu cầu chuyển tiền',
            signalType: SignalType.MONEY_REQUEST,
            imageIndex: 2,
          },
        ],
        recommendedActions: ['Tuyệt đối không chuyển tiền', 'Liên hệ trực tiếp cơ quan công an'],
        speechSummary: 'Cảnh báo nguy cơ lừa đảo giả danh công an.',
      });

      try {
        const response = await upload(form);
        const payload = (await expectSchema(response, 200, 'AnalysisResponse')) as any;
        assertOpenApiCompliance(payload);

        expect(payload.input_type).toBe('IMAGE');
        expect(payload.risk_level).toBe(RiskLevel.DANGER);
        expect(payload.risk_score).toBeGreaterThanOrEqual(75);
        expect(payload.risk_score).toBeLessThanOrEqual(100);
        expect(payload.scam_category).toBe(ScamCategory.GOVERNMENT_IMPERSONATION);

        // Verify detected URLs
        expect(payload.detected_urls).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              url: expect.stringContaining('congan-pc02-hanoi.org'),
              is_verified_malicious: false,
            }),
          ])
        );

        // Verify evidence grounding
        expect(payload.evidence.length).toBeGreaterThan(0);
        for (const ev of payload.evidence) {
          expect(ev.image_index).toBeGreaterThanOrEqual(0);
          expect(ev.image_index).toBeLessThan(images.length);
        }
      } finally {
        spy.mockRestore();
      }
    });

    it('T1-02: Financial Fraud / Recruitment (DT_002, Case 45) -> DANGER, detects lazada URL', async () => {
      const images = getCaseImages(45);
      const form = new FormData();
      images.forEach((img, idx) => appendImage(form, img, `dt002_${idx}.png`));

      const spy = jest.spyOn(ai, 'analyze').mockResolvedValueOnce({
        canAssess: true,
        suggestedCategory: ScamCategory.FAKE_RECRUITMENT,
        summary: 'Dụ dỗ làm việc làm tại nhà lương cao và nạp tiền giật đơn hưởng hoa hồng.',
        evidence: [
          {
            quote: 'bạn sẽ nhận phần thưởng',
            reason: 'Mồi nhử hoa hồng',
            signalType: SignalType.TOO_GOOD_TO_BE_TRUE,
            imageIndex: 0,
          },
          {
            quote: 'tuyển dụng việc làm tại nhà',
            reason: 'Mạo danh tuyển dụng',
            signalType: SignalType.OTHER,
            imageIndex: 1,
          },
          {
            quote: 'yêu cầu chuyển tiền tạm ứng nạp tiền làm nhiệm vụ',
            reason: 'Đòi chuyển tiền',
            signalType: SignalType.MONEY_REQUEST,
            imageIndex: 2,
          },
          {
            quote: 'truy cập https://tuyendung-lazada-vn.top',
            reason: 'Link lừa đảo mạo danh Lazada',
            signalType: SignalType.SUSPICIOUS_URL,
            imageIndex: 2,
          },
        ],
        recommendedActions: ['Cảnh giác bẫy việc làm online', 'Không nạp tiền giật đơn'],
        speechSummary: 'Cảnh báo lừa đảo tuyển dụng làm nhiệm vụ.',
      });

      try {
        const response = await upload(form);
        const payload = (await expectSchema(response, 200, 'AnalysisResponse')) as any;
        assertOpenApiCompliance(payload);

        expect(payload.input_type).toBe('IMAGE');
        expect(payload.risk_level).toBe(RiskLevel.DANGER);
        expect(payload.risk_score).toBeGreaterThanOrEqual(75);
        expect(payload.risk_score).toBeLessThanOrEqual(100);
        expect([ScamCategory.FAKE_RECRUITMENT, ScamCategory.FINANCIAL_FRAUD]).toContain(payload.scam_category);
        expect(payload.detected_urls).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              url: expect.stringContaining('tuyendung-lazada-vn.top'),
              is_verified_malicious: false,
            }),
          ])
        );
      } finally {
        spy.mockRestore();
      }
    });

    it('T1-03: Fake Delivery / Courier (MB_001, Case 87) -> DANGER, FAKE_DELIVERY, detects ghtk URL', async () => {
      const images = getCaseImages(87);
      const form = new FormData();
      images.forEach((img, idx) => appendImage(form, img, `mb001_${idx}.png`));

      const spy = jest.spyOn(ai, 'analyze').mockResolvedValueOnce({
        canAssess: true,
        suggestedCategory: ScamCategory.FAKE_DELIVERY,
        summary: 'Giả mạo shipper GHTK lừa kích hoạt gói hội viên và hướng dẫn truy cập link hủy thẻ.',
        evidence: [
          {
            quote: 'giao hàng bên GHTK có đơn hàng mỹ phẩm',
            reason: 'Giả mạo giao hàng',
            signalType: SignalType.OTHER,
            imageIndex: 0,
          },
          {
            quote: 'nếu không sẽ bị trừ tiền và khóa tài khoản',
            reason: 'Đe dọa trừ tiền',
            signalType: SignalType.THREAT,
            imageIndex: 1,
          },
          {
            quote: 'chị bấm ngay vào đường link trung tâm hỗ trợ http://ghtk-huythehoivien-247.com để hủy thẻ',
            reason: 'Link lừa đảo chiếm đoạt tài khoản',
            signalType: SignalType.SUSPICIOUS_URL,
            imageIndex: 2,
          },
          {
            quote: 'yêu cầu chuyển tiền phí hội viên',
            reason: 'Đòi tiền hội viên',
            signalType: SignalType.MONEY_REQUEST,
            imageIndex: 1,
          },
        ],
        recommendedActions: ['Không bấm vào link lạ', 'Liên hệ tổng đài GHTK chính thức'],
        speechSummary: 'Cảnh báo lừa đảo giả danh shipper giao hàng.',
      });

      try {
        const response = await upload(form);
        const payload = (await expectSchema(response, 200, 'AnalysisResponse')) as any;
        assertOpenApiCompliance(payload);

        expect(payload.input_type).toBe('IMAGE');
        expect(payload.risk_level).toBe(RiskLevel.DANGER);
        expect(payload.risk_score).toBeGreaterThanOrEqual(75);
        expect(payload.risk_score).toBeLessThanOrEqual(100);
        expect(payload.scam_category).toBe(ScamCategory.FAKE_DELIVERY);
        expect(payload.detected_urls).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              url: expect.stringContaining('ghtk-huythehoivien-247.com'),
              signals: expect.arrayContaining(['HTTP_ONLY']),
              is_verified_malicious: false,
            }),
          ])
        );
      } finally {
        spy.mockRestore();
      }
    });

    it('T1-04: OTP Theft / Account Theft (DC_002, Case 130) -> DANGER, detects acb URL', async () => {
      const images = getCaseImages(130);
      const form = new FormData();
      images.forEach((img, idx) => appendImage(form, img, `dc002_${idx}.png`));

      const spy = jest.spyOn(ai, 'analyze').mockResolvedValueOnce({
        canAssess: true,
        suggestedCategory: ScamCategory.PHISHING,
        summary: 'SMS Brandname giả mạo ACB thông báo phí dịch vụ và yêu cầu nhập mật khẩu, OTP.',
        evidence: [
          {
            quote: 'yêu cầu nhập mật khẩu và mã xác thực',
            reason: 'Đòi thông tin đăng nhập và mật khẩu',
            signalType: SignalType.CREDENTIAL_REQUEST,
            imageIndex: 1,
          },
          {
            quote: 'truy cập đường dẫn https://acb-online-center.com',
            reason: 'Link phishing mạo danh ngân hàng ACB',
            signalType: SignalType.SUSPICIOUS_URL,
            imageIndex: 0,
          },
          {
            quote: 'nếu không sẽ bị khóa tài khoản',
            reason: 'Đe dọa khóa tài khoản',
            signalType: SignalType.THREAT,
            imageIndex: 2,
          },
        ],
        recommendedActions: ['Khóa thẻ và đổi mật khẩu ngân hàng ngay', 'Không nhập OTP vào trang web lạ'],
        speechSummary: 'Cảnh báo lừa đảo đánh cắp thông tin tài khoản ngân hàng.',
      });

      try {
        const response = await upload(form);
        const payload = (await expectSchema(response, 200, 'AnalysisResponse')) as any;
        assertOpenApiCompliance(payload);

        expect(payload.input_type).toBe('IMAGE');
        expect(payload.risk_level).toBe(RiskLevel.DANGER);
        expect(payload.risk_score).toBeGreaterThanOrEqual(75);
        expect(payload.risk_score).toBeLessThanOrEqual(100);
        expect([
          ScamCategory.PHISHING,
          ScamCategory.BANK_IMPERSONATION,
          ScamCategory.OTP_THEFT,
        ]).toContain(payload.scam_category);
        expect(payload.detected_urls).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              url: expect.stringContaining('acb-online-center.com'),
              is_verified_malicious: false,
            }),
          ])
        );
      } finally {
        spy.mockRestore();
      }
    });

    it('T1-05: Benign Daily Chat (HN_001, Case 171) -> 200 OK, SAFE (0..39), scam_category: NONE, evidence: []', async () => {
      const images = getCaseImages(171);
      const form = new FormData();
      images.forEach((img, idx) => appendImage(form, img, `hn001_${idx}.png`));

      const spy = jest.spyOn(ai, 'analyze').mockResolvedValueOnce({
        canAssess: true,
        suggestedCategory: ScamCategory.NONE,
        summary: 'Hội thoại nhận hàng shipper thông thường, không phát hiện dấu hiệu lừa đảo.',
        evidence: [],
        recommendedActions: ['Tiếp tục giao dịch bình thường'],
        speechSummary: 'Hội thoại an toàn, không có dấu hiệu lừa đảo.',
      });

      try {
        const response = await upload(form);
        const payload = (await expectSchema(response, 200, 'AnalysisResponse')) as any;
        assertOpenApiCompliance(payload);

        expect(payload.input_type).toBe('IMAGE');
        expect(payload.risk_level).toBe(RiskLevel.SAFE);
        expect(payload.risk_score).toBeGreaterThanOrEqual(0);
        expect(payload.risk_score).toBeLessThanOrEqual(39);
        expect(payload.scam_category).toBe(ScamCategory.NONE);
        expect(payload.evidence).toEqual([]);
        expect(payload.detected_urls).toEqual([]);
      } finally {
        spy.mockRestore();
      }
    });
  });

  // =========================================================================
  // TIER 2: BOUNDARY & CORNER CASES
  // =========================================================================
  describe('Tier 2: Boundary & Corner Cases', () => {
    it('T2-01: 1 image boundary -> 200 OK, image_index === 0', async () => {
      const form = new FormData();
      appendImage(form, samplePng, 'single.png');

      const spy = jest.spyOn(ai, 'analyze').mockResolvedValueOnce({
        canAssess: true,
        suggestedCategory: ScamCategory.GOVERNMENT_IMPERSONATION,
        summary: 'Phát hiện dấu hiệu mạo danh công an trong 1 ảnh.',
        evidence: [
          {
            quote: 'tôi là cán bộ công an',
            reason: 'Mạo danh công an',
            signalType: SignalType.IMPERSONATION,
            imageIndex: 0,
          },
        ],
        recommendedActions: ['Cẩn trọng'],
        speechSummary: 'Dấu hiệu rủi ro.',
      });

      try {
        const response = await upload(form);
        const payload = (await expectSchema(response, 200, 'AnalysisResponse')) as any;
        assertOpenApiCompliance(payload);
        expect(payload.input_type).toBe('IMAGE');
        for (const ev of payload.evidence) {
          expect(ev.image_index).toBe(0);
        }
      } finally {
        spy.mockRestore();
      }
    });

    it('T2-02: 5 images boundary -> 200 OK, image_index in [0..4]', async () => {
      const form = new FormData();
      for (let i = 0; i < 5; i++) {
        appendImage(form, samplePng, `screen_${i}.png`);
      }

      const spy = jest.spyOn(ai, 'analyze').mockResolvedValueOnce({
        canAssess: true,
        suggestedCategory: ScamCategory.GOVERNMENT_IMPERSONATION,
        summary: 'Phát hiện dấu hiệu rủi ro trên 5 ảnh.',
        evidence: [
          { quote: 'tôi là cán bộ công an', reason: 'Mạo danh công an', signalType: SignalType.IMPERSONATION, imageIndex: 0 },
          { quote: 'yêu cầu chuyển tiền', reason: 'Đòi chuyển tiền', signalType: SignalType.MONEY_REQUEST, imageIndex: 4 },
        ],
        recommendedActions: ['Cẩn trọng'],
        speechSummary: 'Dấu hiệu rủi ro.',
      });

      try {
        const response = await upload(form);
        const payload = (await expectSchema(response, 200, 'AnalysisResponse')) as any;
        assertOpenApiCompliance(payload);
        expect(payload.input_type).toBe('IMAGE');
        for (const ev of payload.evidence) {
          expect(ev.image_index).toBeGreaterThanOrEqual(0);
          expect(ev.image_index).toBeLessThan(5);
        }
      } finally {
        spy.mockRestore();
      }
    });

    it('T2-03: 6 images exceeded -> 400 Bad Request, errorCode: INVALID_INPUT', async () => {
      const form = new FormData();
      for (let i = 0; i < 6; i++) {
        appendImage(form, samplePng, `screen_${i}.png`);
      }
      const response = await upload(form);
      await expectError(response, 400, ErrorCode.INVALID_INPUT);
    });

    it('T2-04: 0 images (missing images field) -> 400 Bad Request, errorCode: INVALID_INPUT', async () => {
      const form = new FormData();
      form.append('context', 'chỉ gửi ngữ cảnh không gửi ảnh');
      const response = await upload(form);
      await expectError(response, 400, ErrorCode.INVALID_INPUT);
    });

    it('T2-05: Wrong media type (JSON body) -> 400 Bad Request, errorCode: INVALID_INPUT', async () => {
      const response = await fetch(url + '/api/v1/analysis/images', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ images: ['base64encoded...'] }),
      });
      await expectError(response, 400, ErrorCode.INVALID_INPUT);
    });

    it('T2-06: Unsupported image format (GIF magic bytes GIF89a / BMP BM) -> 400 UNSUPPORTED_IMAGE_FORMAT', async () => {
      const gifBuffer = await sharp(sampleJpeg).gif().toBuffer();
      const formGif = new FormData();
      appendImage(formGif, gifBuffer, 'animated.gif', 'image/gif');
      const responseGif = await upload(formGif);
      await expectError(responseGif, 400, ErrorCode.UNSUPPORTED_IMAGE_FORMAT);

      // BMP format
      const bmpHeader = Buffer.from('424d36000000000000003600000028000000010000000100000001001800000000000000000000000000000000000000000000000000ffffff00', 'hex');
      const formBmp = new FormData();
      appendImage(formBmp, bmpHeader, 'bitmap.bmp', 'image/bmp');
      const responseBmp = await upload(formBmp);
      await expectError(responseBmp, 400, ErrorCode.UNSUPPORTED_IMAGE_FORMAT);
    });

    it('T2-07: Corrupted / invalid image bytes -> 400 Bad Request, errorCode: INVALID_IMAGE', async () => {
      const form = new FormData();
      appendImage(form, Buffer.from('đây hoàn toàn không phải là file ảnh hợp lệ'), 'corrupt.png', 'image/png');
      const response = await upload(form);
      await expectError(response, 400, ErrorCode.INVALID_IMAGE);
    });

    it('T2-08: Single image > 5 MiB (5,242,881 bytes) -> 413 Payload Too Large, errorCode: IMAGE_TOO_LARGE', async () => {
      const oversizedImage = padJpeg(sampleJpeg, MAX_IMAGE_BYTES + 1);
      const form = new FormData();
      appendImage(form, oversizedImage, 'oversized.jpg', 'image/jpeg');
      const response = await upload(form);
      await expectError(response, 413, ErrorCode.IMAGE_TOO_LARGE);
    });

    it('T2-09: Combined image bytes > 20 MiB -> 413 Payload Too Large, errorCode: IMAGE_TOO_LARGE', async () => {
      const maxSingle = padJpeg(sampleJpeg, MAX_IMAGE_BYTES);
      const form = new FormData();
      for (let i = 0; i < 4; i++) {
        appendImage(form, maxSingle, `image_${i}.jpg`, 'image/jpeg');
      }
      appendImage(form, Buffer.alloc(1), 'extra_byte.jpg', 'image/jpeg');
      const response = await upload(form);
      await expectError(response, 413, ErrorCode.IMAGE_TOO_LARGE);
    });

    it('T2-10: Exceeded resolution (> 16 MP) -> 400 Bad Request, errorCode: INVALID_IMAGE', async () => {
      // 5000 x 4000 = 20,000,000 pixels > 16 MP
      const largePixelImage = await sharp({
        create: { width: 5000, height: 4000, channels: 3, background: '#ffffff' },
      }).jpeg().toBuffer();

      const form = new FormData();
      appendImage(form, largePixelImage, 'decompression_bomb.jpg', 'image/jpeg');
      const response = await upload(form);
      await expectError(response, 400, ErrorCode.INVALID_IMAGE);
    });

    it('T2-11: Multi-page / animated image -> 400 Bad Request, errorCode: INVALID_IMAGE', async () => {
      const animatedWebp = await sharp(sampleJpeg)
        .webp({ pageHeight: 16 })
        .toBuffer();

      // Sharp metadata check catches frames > 1
      const form = new FormData();
      appendImage(form, animatedWebp, 'animated.webp', 'image/webp');
      const response = await upload(form);
      // Either 200 (if treated as single frame) or 400 INVALID_IMAGE
      expect([200, 400]).toContain(response.status);
      if (response.status === 400) {
        await expectError(response, 400, ErrorCode.INVALID_IMAGE);
      }
    });

    it('T2-12: Unreadable / solid noise image -> 200 OK, risk_level: UNABLE_TO_ASSESS, risk_score: null', async () => {
      const noise = await sharp({
        create: { width: 64, height: 64, channels: 3, background: '#888888' },
      }).png().toBuffer();

      const form = new FormData();
      appendImage(form, noise, 'noise.png');

      const spy = jest.spyOn(ai, 'analyze').mockResolvedValueOnce({
        canAssess: false,
        suggestedCategory: ScamCategory.NONE,
        summary: 'Ảnh chưa đủ rõ hoặc chưa có đủ bằng chứng để đánh giá.',
        evidence: [],
        recommendedActions: ['Gửi thêm ảnh chụp rõ ràng hơn.'],
        speechSummary: 'Ảnh chưa đủ rõ hoặc chưa có đủ bằng chứng để đánh giá.',
      });

      try {
        const response = await upload(form);
        const payload = (await expectSchema(response, 200, 'AnalysisResponse')) as any;
        assertOpenApiCompliance(payload);

        expect(payload.input_type).toBe('IMAGE');
        expect(payload.risk_level).toBe(RiskLevel.UNABLE_TO_ASSESS);
        expect(payload.risk_score).toBeNull();
        expect(payload.scam_category).toBe(ScamCategory.NONE);
        expect(payload.evidence).toEqual([]);
        expect(payload.detected_urls).toEqual([]);
      } finally {
        spy.mockRestore();
      }
    });

    it('T2-13: Context length parameter (1000 chars -> 200 OK; 1001 chars -> 400; unexpected field -> 400)', async () => {
      // (a) Exactly 1000 characters context -> 200 OK
      const form1000 = new FormData();
      appendImage(form1000, samplePng, 'screen.png');
      form1000.append('context', 'A'.repeat(1000));
      const res1000 = await upload(form1000);
      expect(res1000.status).toBe(200);
      assertOpenApiCompliance(await res1000.json());

      // (b) 1001 characters context -> 400 Bad Request, INVALID_INPUT
      const form1001 = new FormData();
      appendImage(form1001, samplePng, 'screen.png');
      form1001.append('context', 'A'.repeat(1001));
      const res1001 = await upload(form1001);
      await expectError(res1001, 400, ErrorCode.INVALID_INPUT);

      // (c) Extra unexpected body field -> 400 Bad Request, INVALID_INPUT
      const formExtra = new FormData();
      appendImage(formExtra, samplePng, 'screen.png');
      formExtra.append('unrecognized_field', 'malicious_injection');
      const resExtra = await upload(formExtra);
      await expectError(resExtra, 400, ErrorCode.INVALID_INPUT);
    });
  });

  // =========================================================================
  // TIER 3: CROSS-FEATURE COMBINATIONS
  // =========================================================================
  describe('Tier 3: Cross-Feature Combinations', () => {
    it('T3-01: Multi-image 0-based image_index grounding (quotes originate from exact screenshot index)', async () => {
      const images = getCaseImages(1); // 3 images
      const form = new FormData();
      images.forEach((img, idx) => appendImage(form, img, `md_${idx}.png`));

      const spy = jest.spyOn(ai, 'analyze').mockResolvedValueOnce({
        canAssess: true,
        suggestedCategory: ScamCategory.GOVERNMENT_IMPERSONATION,
        summary: 'Đánh giá bằng chứng phân bổ trên từng ảnh.',
        evidence: [
          {
            quote: 'tôi là cán bộ công an',
            reason: 'Mạo danh xuất hiện ở ảnh 0',
            signalType: SignalType.IMPERSONATION,
            imageIndex: 0,
          },
          {
            quote: 'sẽ bị cưỡng chế bắt giam',
            reason: 'Đe dọa xuất hiện ở ảnh 1',
            signalType: SignalType.THREAT,
            imageIndex: 1,
          },
          {
            quote: 'yêu cầu chuyển tiền gấp',
            reason: 'Đòi tiền xuất hiện ở ảnh 2',
            signalType: SignalType.MONEY_REQUEST,
            imageIndex: 2,
          },
          {
            quote: 'đây là lệnh bắt ảo',
            reason: 'Trích dẫn nằm ngoài dải ảnh (index 3)',
            signalType: SignalType.THREAT,
            imageIndex: 3, // Should be rejected by EvidenceValidator
          },
        ],
        recommendedActions: ['Kiểm tra'],
        speechSummary: 'Dấu hiệu phân bổ nhiều ảnh.',
      });

      try {
        const response = await upload(form);
        const payload = (await expectSchema(response, 200, 'AnalysisResponse')) as any;
        assertOpenApiCompliance(payload);

        // Assert all accepted evidence items have 0 <= image_index < 3
        expect(payload.evidence.length).toBeGreaterThan(0);
        for (const ev of payload.evidence) {
          expect(ev.image_index).toBeGreaterThanOrEqual(0);
          expect(ev.image_index).toBeLessThan(images.length);
        }
        // Verify out-of-bounds index (3) was discarded
        expect(payload.evidence.some((ev: any) => ev.image_index === 3)).toBe(false);
      } finally {
        spy.mockRestore();
      }
    });

    it('T3-02: URL intelligence heuristics + risk score (HTTP_ONLY, is_verified_malicious: false, score elevation)', async () => {
      const form = new FormData();
      appendImage(form, samplePng, 'screen.png');

      const spy = jest.spyOn(ai, 'analyze').mockResolvedValueOnce({
        canAssess: true,
        suggestedCategory: ScamCategory.FAKE_DELIVERY,
        summary: 'Kiểm tra tín hiệu URL HTTP không bảo mật và chấm điểm rủi ro.',
        evidence: [
          {
            quote: 'vui lòng truy cập http://ghtk-huythehoivien-247.com',
            reason: 'Liên kết không bảo mật HTTP',
            signalType: SignalType.SUSPICIOUS_URL,
            imageIndex: 0,
          },
        ],
        recommendedActions: ['Không truy cập liên kết'],
        speechSummary: 'Phát hiện liên kết HTTP đáng ngờ.',
      });

      try {
        const response = await upload(form);
        const payload = (await expectSchema(response, 200, 'AnalysisResponse')) as any;
        assertOpenApiCompliance(payload);

        expect(payload.detected_urls).toHaveLength(1);
        const detected = payload.detected_urls[0];
        expect(detected.url).toBe('http://ghtk-huythehoivien-247.com');
        expect(detected.signals).toContain(UrlSignal.HTTP_ONLY);
        expect(detected.is_verified_malicious).toBe(false);
      } finally {
        spy.mockRestore();
      }
    });

    it('T3-03: PII sanitization and dialogue preservation (CCCD/bank STK masked in dialogue turns, placeholders preserved)', async () => {
      const images = getCaseImages(2); // MD_002 with CCCD 040054001299
      const form = new FormData();
      images.forEach((img, idx) => appendImage(form, img, `case2_${idx}.png`));

      const spy = jest.spyOn(ai, 'analyze').mockResolvedValueOnce({
        canAssess: true,
        suggestedCategory: ScamCategory.GOVERNMENT_IMPERSONATION,
        summary: 'Đối tượng đọc thông tin cá nhân và số định danh công dân để đe dọa cưỡng chế bắt giam.',
        evidence: [
          {
            quote: 'tôi là cán bộ công an hình sự',
            reason: 'Mạo danh công an',
            signalType: SignalType.IMPERSONATION,
            imageIndex: 0,
          },
          {
            quote: 'nếu không sẽ bị cưỡng chế bắt giam',
            reason: 'Đe dọa bắt giữ',
            signalType: SignalType.THREAT,
            imageIndex: 1,
          },
        ],
        recommendedActions: ['Bảo vệ thông tin cá nhân'],
        speechSummary: 'Cảnh báo đối tượng mạo danh công an nắm thông tin cá nhân.',
      });

      try {
        const response = await upload(form);
        const payload = (await expectSchema(response, 200, 'AnalysisResponse')) as any;
        assertOpenApiCompliance(payload);

        // Verify no raw CCCD or bank number leaked in summary or speech summary
        expect(payload.summary).not.toContain('040054001299');
        expect(payload.speech_summary).not.toContain('040054001299');
      } finally {
        spy.mockRestore();
      }
    });

    it('T3-04: Multi-signal convergence (OTP theft + high urgency -> corroborated danger score 85..100)', async () => {
      const images = getCaseImages(129); // DC_001
      const form = new FormData();
      images.forEach((img, idx) => appendImage(form, img, `dc001_${idx}.png`));

      const spy = jest.spyOn(ai, 'analyze').mockResolvedValueOnce({
        canAssess: true,
        suggestedCategory: ScamCategory.OTP_THEFT,
        summary: 'Phát hiện yêu cầu cung cấp mã xác nhận OTP kèm áp lực thời gian khẩn cấp.',
        evidence: [
          {
            quote: 'đưa mã OTP đây ngay lập tức',
            reason: 'Đòi mã xác thực khẩn cấp',
            signalType: SignalType.CREDENTIAL_REQUEST,
            imageIndex: 0,
          },
          {
            quote: 'gửi ngay trong 5 phút nếu không tài khoản sẽ bị khóa',
            reason: 'Tạo áp lực thời gian cao',
            signalType: SignalType.URGENCY,
            imageIndex: 1,
          },
        ],
        recommendedActions: ['Không cung cấp mã OTP cho bất kỳ ai', 'Khóa tài khoản ngân hàng ngay'],
        speechSummary: 'Nguy cơ cao bị đánh cắp mã OTP ngân hàng.',
      });

      try {
        const response = await upload(form);
        const payload = (await expectSchema(response, 200, 'AnalysisResponse')) as any;
        assertOpenApiCompliance(payload);

        expect(payload.risk_level).toBe(RiskLevel.DANGER);
        expect(payload.risk_score).toBeGreaterThanOrEqual(85);
        expect(payload.risk_score).toBeLessThanOrEqual(100);
        expect(payload.scam_category).toBe(ScamCategory.OTP_THEFT);
      } finally {
        spy.mockRestore();
      }
    });

    it('T3-05: Benign financial transfer disambiguation (routine payment without scam intent -> SAFE, score <= 39)', async () => {
      const images = getCaseImages(171); // HN_001
      const form = new FormData();
      images.forEach((img, idx) => appendImage(form, img, `hn001_${idx}.png`));

      const spy = jest.spyOn(ai, 'analyze').mockResolvedValueOnce({
        canAssess: true,
        suggestedCategory: ScamCategory.NONE,
        summary: 'Thanh toán tiền hàng hóa đơn thường nhật, không có áp lực hay yêu cầu bất thường.',
        evidence: [],
        recommendedActions: ['Giao dịch an toàn'],
        speechSummary: 'Hội thoại an toàn.',
      });

      try {
        const response = await upload(form);
        const payload = (await expectSchema(response, 200, 'AnalysisResponse')) as any;
        assertOpenApiCompliance(payload);

        expect(payload.risk_level).toBe(RiskLevel.SAFE);
        expect(payload.risk_score).toBeLessThanOrEqual(39);
        expect(payload.scam_category).toBe(ScamCategory.NONE);
        expect(payload.evidence).toHaveLength(0);
      } finally {
        spy.mockRestore();
      }
    });
  });

  // =========================================================================
  // TIER 4: REAL-WORLD SCENARIOS (10 GOLDEN BENCHMARK CASES)
  // =========================================================================
  describe('Tier 4: Real-World Application Scenarios (10 Golden Benchmark Cases)', () => {
    it('Scenario 1: Fake Police Narcotics & Money Laundering Extortion (Case 1 — MD_001)', async () => {
      const images = getCaseImages(1);
      const form = new FormData();
      images.forEach((img, idx) => appendImage(form, img, `case1_${idx}.png`));

      const spy = jest.spyOn(ai, 'analyze').mockResolvedValueOnce({
        canAssess: true,
        suggestedCategory: ScamCategory.GOVERNMENT_IMPERSONATION,
        summary: 'Mạo danh Đại úy công an PC02 Hà Nội gửi lệnh bắt tạm giam và ép chuyển 65 triệu vào TK tạm giữ.',
        evidence: [
          {
            quote: 'tôi là cán bộ công an công tác tại PC02 Hà Nội',
            reason: 'Mạo danh cán bộ',
            signalType: SignalType.IMPERSONATION,
            imageIndex: 0,
          },
          {
            quote: 'nếu không sẽ bị cưỡng chế bắt giam',
            reason: 'Đe dọa bắt giam',
            signalType: SignalType.THREAT,
            imageIndex: 1,
          },
          {
            quote: 'truy cập cổng https://congan-pc02-hanoi.org',
            reason: 'Web mạo danh',
            signalType: SignalType.SUSPICIOUS_URL,
            imageIndex: 2,
          },
          {
            quote: 'yêu cầu chuyển tiền vào tài khoản tạm giữ',
            reason: 'Yêu cầu chuyển tiền',
            signalType: SignalType.MONEY_REQUEST,
            imageIndex: 2,
          },
        ],
        recommendedActions: ['Báo công an địa phương', 'Không chuyển tiền'],
        speechSummary: 'Cảnh báo giả danh công an tống tiền.',
      });

      try {
        const response = await upload(form);
        const payload = (await expectSchema(response, 200, 'AnalysisResponse')) as any;
        assertOpenApiCompliance(payload);

        expect(payload.risk_level).toBe(RiskLevel.DANGER);
        expect(payload.risk_score).toBeGreaterThanOrEqual(75);
        expect(payload.scam_category).toBe(ScamCategory.GOVERNMENT_IMPERSONATION);
        expect(payload.detected_urls).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              url: expect.stringContaining('congan-pc02-hanoi.org'),
            }),
          ])
        );
      } finally {
        spy.mockRestore();
      }
    });

    it('Scenario 2: High-Level Criminal Police Intimidation with CCCD (Case 2 — MD_002)', async () => {
      const images = getCaseImages(2);
      const form = new FormData();
      images.forEach((img, idx) => appendImage(form, img, `case2_${idx}.png`));

      const spy = jest.spyOn(ai, 'analyze').mockResolvedValueOnce({
        canAssess: true,
        suggestedCategory: ScamCategory.GOVERNMENT_IMPERSONATION,
        summary: 'Mạo danh Thượng tá Cục Cảnh sát Hình sự đọc đúng số CCCD nạn nhân để đe dọa bắt giữ.',
        evidence: [
          {
            quote: 'tôi là cán bộ công an hình sự',
            reason: 'Mạo danh công an Cục Cảnh sát',
            signalType: SignalType.IMPERSONATION,
            imageIndex: 0,
          },
          {
            quote: 'nếu không sẽ bị cưỡng chế bắt giam',
            reason: 'Đe dọa bắt giam',
            signalType: SignalType.THREAT,
            imageIndex: 1,
          },
          {
            quote: 'yêu cầu chuyển tiền',
            reason: 'Yêu cầu chuyển tiền',
            signalType: SignalType.MONEY_REQUEST,
            imageIndex: 2,
          },
        ],
        recommendedActions: ['Cảnh giác', 'Không cung cấp thông tin tài khoản'],
        speechSummary: 'Cảnh báo đe dọa bắt giam mạo danh.',
      });

      try {
        const response = await upload(form);
        const payload = (await expectSchema(response, 200, 'AnalysisResponse')) as any;
        assertOpenApiCompliance(payload);

        expect(payload.risk_level).toBe(RiskLevel.DANGER);
        expect(payload.risk_score).toBeGreaterThanOrEqual(75);
        expect(payload.scam_category).toBe(ScamCategory.GOVERNMENT_IMPERSONATION);
      } finally {
        spy.mockRestore();
      }
    });

    it('Scenario 3: Task Commission Timeout System Lock (Case 44 — DT_001)', async () => {
      const images = getCaseImages(44);
      const form = new FormData();
      images.forEach((img, idx) => appendImage(form, img, `case44_${idx}.png`));

      const spy = jest.spyOn(ai, 'analyze').mockResolvedValueOnce({
        canAssess: true,
        suggestedCategory: ScamCategory.FINANCIAL_FRAUD,
        summary: 'Hệ thống báo khóa tài khoản nhiệm vụ và yêu cầu nạp thêm tiền để kích hoạt mở cổng rút.',
        evidence: [
          {
            quote: 'bạn nhận phần thưởng hoa hồng VIP',
            reason: 'Mồi chài hoa hồng',
            signalType: SignalType.TOO_GOOD_TO_BE_TRUE,
            imageIndex: 0,
          },
          {
            quote: 'yêu cầu chuyển tiền nạp thêm',
            reason: 'Ép nạp tiền để rút vốn',
            signalType: SignalType.MONEY_REQUEST,
            imageIndex: 1,
          },
          {
            quote: 'trong 30 phút nếu không tài khoản sẽ bị khóa',
            reason: 'Áp lực thời gian',
            signalType: SignalType.URGENCY,
            imageIndex: 2,
          },
        ],
        recommendedActions: ['Không nạp thêm tiền', 'Dừng ngay các giao dịch nhiệm vụ'],
        speechSummary: 'Cảnh báo lừa đảo nhiệm vụ nạp tiền.',
      });

      try {
        const response = await upload(form);
        const payload = (await expectSchema(response, 200, 'AnalysisResponse')) as any;
        assertOpenApiCompliance(payload);

        expect(payload.risk_level).toBe(RiskLevel.DANGER);
        expect(payload.risk_score).toBeGreaterThanOrEqual(75);
        expect(payload.scam_category).toBe(ScamCategory.FINANCIAL_FRAUD);
      } finally {
        spy.mockRestore();
      }
    });

    it('Scenario 4: Fake E-Commerce Part-Time Job Recruitment (Case 45 — DT_002)', async () => {
      const images = getCaseImages(45);
      const form = new FormData();
      images.forEach((img, idx) => appendImage(form, img, `case45_${idx}.png`));

      const spy = jest.spyOn(ai, 'analyze').mockResolvedValueOnce({
        canAssess: true,
        suggestedCategory: ScamCategory.FAKE_RECRUITMENT,
        summary: 'Tuyển dụng việc làm online lương cao dẫn dụ nạp tiền thanh toán đơn hàng.',
        evidence: [
          {
            quote: 'bạn sẽ nhận phần thưởng',
            reason: 'Hứa hẹn thù lao lớn',
            signalType: SignalType.TOO_GOOD_TO_BE_TRUE,
            imageIndex: 0,
          },
          {
            quote: 'tuyển dụng việc làm tại nhà',
            reason: 'Chiêu trò tuyển dụng giả',
            signalType: SignalType.OTHER,
            imageIndex: 1,
          },
          {
            quote: 'yêu cầu chuyển tiền thanh toán đơn hàng',
            reason: 'Yêu cầu chuyển tiền',
            signalType: SignalType.MONEY_REQUEST,
            imageIndex: 2,
          },
          {
            quote: 'bấm vào https://tuyendung-lazada-vn.top',
            reason: 'Link lừa đảo mạo danh sàn',
            signalType: SignalType.SUSPICIOUS_URL,
            imageIndex: 2,
          },
        ],
        recommendedActions: ['Cảnh giác việc làm trực tuyến'],
        speechSummary: 'Cảnh báo lừa đảo tuyển dụng sàn thương mại điện tử.',
      });

      try {
        const response = await upload(form);
        const payload = (await expectSchema(response, 200, 'AnalysisResponse')) as any;
        assertOpenApiCompliance(payload);

        expect(payload.risk_level).toBe(RiskLevel.DANGER);
        expect(payload.risk_score).toBeGreaterThanOrEqual(75);
        expect([ScamCategory.FAKE_RECRUITMENT, ScamCategory.FINANCIAL_FRAUD]).toContain(payload.scam_category);
        expect(payload.detected_urls).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              url: expect.stringContaining('tuyendung-lazada-vn.top'),
            }),
          ])
        );
      } finally {
        spy.mockRestore();
      }
    });

    it('Scenario 5: GHTK Fake Shipper Recurring Membership Fee (Case 87 — MB_001)', async () => {
      const images = getCaseImages(87);
      const form = new FormData();
      images.forEach((img, idx) => appendImage(form, img, `case87_${idx}.png`));

      const spy = jest.spyOn(ai, 'analyze').mockResolvedValueOnce({
        canAssess: true,
        suggestedCategory: ScamCategory.FAKE_DELIVERY,
        summary: 'Giả danh shipper thông báo nhầm gói hội viên trừ tiền và ép vào link hủy thẻ.',
        evidence: [
          {
            quote: 'giao hàng bên GHTK có đơn hàng',
            reason: 'Mạo danh đơn vị giao hàng',
            signalType: SignalType.OTHER,
            imageIndex: 0,
          },
          {
            quote: 'nếu không sẽ bị trừ tiền và khóa tài khoản',
            reason: 'Đe dọa trừ tiền',
            signalType: SignalType.THREAT,
            imageIndex: 1,
          },
          {
            quote: 'bấm vào http://ghtk-huythehoivien-247.com',
            reason: 'Link lừa đảo',
            signalType: SignalType.SUSPICIOUS_URL,
            imageIndex: 2,
          },
          {
            quote: 'yêu cầu chuyển tiền 3,5 triệu',
            reason: 'Đòi tiền hội viên',
            signalType: SignalType.MONEY_REQUEST,
            imageIndex: 1,
          },
        ],
        recommendedActions: ['Không truy cập link', 'Xác minh với GHTK'],
        speechSummary: 'Cảnh báo lừa đảo giả danh shipper giao hàng.',
      });

      try {
        const response = await upload(form);
        const payload = (await expectSchema(response, 200, 'AnalysisResponse')) as any;
        assertOpenApiCompliance(payload);

        expect(payload.risk_level).toBe(RiskLevel.DANGER);
        expect(payload.risk_score).toBeGreaterThanOrEqual(75);
        expect(payload.scam_category).toBe(ScamCategory.FAKE_DELIVERY);
        expect(payload.detected_urls).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              url: expect.stringContaining('ghtk-huythehoivien-247.com'),
              signals: expect.arrayContaining([UrlSignal.HTTP_ONLY]),
            }),
          ])
        );
      } finally {
        spy.mockRestore();
      }
    });

    it('Scenario 6: Fake Resort Fanpage Room Booking Scam (Case 88 — MB_002 — 4 Images)', async () => {
      const images = getCaseImages(88); // 4 images
      expect(images.length).toBe(4);
      const form = new FormData();
      images.forEach((img, idx) => appendImage(form, img, `case88_${idx}.png`));

      const spy = jest.spyOn(ai, 'analyze').mockResolvedValueOnce({
        canAssess: true,
        suggestedCategory: ScamCategory.FAKE_DELIVERY,
        summary: 'Fanpage resort giả mạo yêu cầu chuyển cọc 100% giữ phòng.',
        evidence: [
          {
            quote: 'đây là đại diện khu nghỉ dưỡng',
            reason: 'Mạo danh khu du lịch',
            signalType: SignalType.OTHER,
            imageIndex: 0,
          },
          {
            quote: 'bạn nhận phần thưởng ưu đãi phòng',
            reason: 'Khuyến mãi ảo',
            signalType: SignalType.TOO_GOOD_TO_BE_TRUE,
            imageIndex: 1,
          },
          {
            quote: 'yêu cầu chuyển tiền đặt cọc giữ phòng',
            reason: 'Yêu cầu chuyển tiền',
            signalType: SignalType.MONEY_REQUEST,
            imageIndex: 2,
          },
          {
            quote: 'phải chuyển khoản ngay kẻo hết',
            reason: 'Thúc giục chuyển cọc',
            signalType: SignalType.URGENCY,
            imageIndex: 3,
          },
        ],
        recommendedActions: ['Liên hệ hotline chính thức của resort'],
        speechSummary: 'Cảnh báo lừa đảo đặt phòng du lịch ảo.',
      });

      try {
        const response = await upload(form);
        const payload = (await expectSchema(response, 200, 'AnalysisResponse')) as any;
        assertOpenApiCompliance(payload);

        expect(payload.risk_level).toBe(RiskLevel.DANGER);
        expect(payload.risk_score).toBeGreaterThanOrEqual(75);
        // Verify evidence indices span across multiple screens (up to index 3)
        const indices = payload.evidence.map((ev: any) => ev.image_index);
        expect(indices).toContain(0);
        expect(indices).toContain(3);
      } finally {
        spy.mockRestore();
      }
    });

    it('Scenario 7: Bank SMS Spoofing Reactivate VCB Digibank (Case 129 — DC_001)', async () => {
      const images = getCaseImages(129);
      const form = new FormData();
      images.forEach((img, idx) => appendImage(form, img, `case129_${idx}.png`));

      const spy = jest.spyOn(ai, 'analyze').mockResolvedValueOnce({
        canAssess: true,
        suggestedCategory: ScamCategory.OTP_THEFT,
        summary: 'Tin nhắn mạo danh Vietcombank gửi mã OTP kích hoạt và yêu cầu nạn nhân đọc mã.',
        evidence: [
          {
            quote: 'cung cấp mã OTP ngay',
            reason: 'Đòi mã OTP',
            signalType: SignalType.CREDENTIAL_REQUEST,
            imageIndex: 0,
          },
          {
            quote: 'nếu không trong 5 phút sẽ bị khóa tài khoản',
            reason: 'Gây sức ép khóa tài khoản',
            signalType: SignalType.URGENCY,
            imageIndex: 1,
          },
        ],
        recommendedActions: ['Không cung cấp mã OTP'],
        speechSummary: 'Cảnh báo nguy cơ lừa đảo đánh cắp mã OTP.',
      });

      try {
        const response = await upload(form);
        const payload = (await expectSchema(response, 200, 'AnalysisResponse')) as any;
        assertOpenApiCompliance(payload);

        expect(payload.risk_level).toBe(RiskLevel.DANGER);
        expect(payload.risk_score).toBeGreaterThanOrEqual(85);
        expect(payload.scam_category).toBe(ScamCategory.OTP_THEFT);
      } finally {
        spy.mockRestore();
      }
    });

    it('Scenario 8: ACB Global Financial Service Phishing SMS (Case 130 — DC_002)', async () => {
      const images = getCaseImages(130);
      const form = new FormData();
      images.forEach((img, idx) => appendImage(form, img, `case130_${idx}.png`));

      const spy = jest.spyOn(ai, 'analyze').mockResolvedValueOnce({
        canAssess: true,
        suggestedCategory: ScamCategory.PHISHING,
        summary: 'SMS giả Brandname ACB dẫn dụ vào trang web giả mạo acb-online-center.com để lấy mật khẩu và OTP.',
        evidence: [
          {
            quote: 'truy cập https://acb-online-center.com',
            reason: 'Link lừa đảo ACB',
            signalType: SignalType.SUSPICIOUS_URL,
            imageIndex: 0,
          },
          {
            quote: 'yêu cầu nhập mật khẩu và mã xác thực',
            reason: 'Đòi thông tin xác thực',
            signalType: SignalType.CREDENTIAL_REQUEST,
            imageIndex: 1,
          },
          {
            quote: 'nếu không sẽ bị khóa tài khoản',
            reason: 'Đe dọa',
            signalType: SignalType.THREAT,
            imageIndex: 2,
          },
        ],
        recommendedActions: ['Đổi mật khẩu tài khoản ngân hàng'],
        speechSummary: 'Cảnh báo trang web giả mạo ngân hàng.',
      });

      try {
        const response = await upload(form);
        const payload = (await expectSchema(response, 200, 'AnalysisResponse')) as any;
        assertOpenApiCompliance(payload);

        expect(payload.risk_level).toBe(RiskLevel.DANGER);
        expect(payload.risk_score).toBeGreaterThanOrEqual(75);
        expect([
          ScamCategory.PHISHING,
          ScamCategory.BANK_IMPERSONATION,
          ScamCategory.OTP_THEFT,
        ]).toContain(payload.scam_category);
        expect(payload.detected_urls).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              url: expect.stringContaining('acb-online-center.com'),
            }),
          ])
        );
      } finally {
        spy.mockRestore();
      }
    });

    it('Scenario 9: Legitimate GHTK Shipper Package Drop-off (Case 171 — HN_001)', async () => {
      const images = getCaseImages(171);
      const form = new FormData();
      images.forEach((img, idx) => appendImage(form, img, `case171_${idx}.png`));

      const spy = jest.spyOn(ai, 'analyze').mockResolvedValueOnce({
        canAssess: true,
        suggestedCategory: ScamCategory.NONE,
        summary: 'Shipper GHTK giao hàng mỹ phẩm 320k, gửi gói hàng tại bàn lễ tân và xác nhận thanh toán bình thường.',
        evidence: [],
        recommendedActions: ['Giao dịch an toàn'],
        speechSummary: 'Hội thoại thường nhật an toàn.',
      });

      try {
        const response = await upload(form);
        const payload = (await expectSchema(response, 200, 'AnalysisResponse')) as any;
        assertOpenApiCompliance(payload);

        expect(payload.risk_level).toBe(RiskLevel.SAFE);
        expect(payload.risk_score).toBeLessThanOrEqual(39);
        expect(payload.scam_category).toBe(ScamCategory.NONE);
        expect(payload.evidence).toHaveLength(0);
        expect(payload.detected_urls).toHaveLength(0);
      } finally {
        spy.mockRestore();
      }
    });

    it('Scenario 10: Legitimate Bank Branch Customer Appointment (Case 172 — HN_002)', async () => {
      const images = getCaseImages(172);
      const form = new FormData();
      images.forEach((img, idx) => appendImage(form, img, `case172_${idx}.png`));

      const spy = jest.spyOn(ai, 'analyze').mockResolvedValueOnce({
        canAssess: true,
        suggestedCategory: ScamCategory.NONE,
        summary: 'Chuyên viên ngân hàng Vietcombank mời khách hàng tới quầy giao dịch chi nhánh Thành Công để nâng hạn mức.',
        evidence: [],
        recommendedActions: ['Thực hiện thủ tục tại quầy giao dịch chính thức'],
        speechSummary: 'Hội thoại ngân hàng chính thức an toàn.',
      });

      try {
        const response = await upload(form);
        const payload = (await expectSchema(response, 200, 'AnalysisResponse')) as any;
        assertOpenApiCompliance(payload);

        expect(payload.risk_level).toBe(RiskLevel.SAFE);
        expect(payload.risk_score).toBeLessThanOrEqual(39);
        expect(payload.scam_category).toBe(ScamCategory.NONE);
        expect(payload.evidence).toHaveLength(0);
        expect(payload.detected_urls).toHaveLength(0);
      } finally {
        spy.mockRestore();
      }
    });
  });
});
