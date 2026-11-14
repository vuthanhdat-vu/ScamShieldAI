import { type ExecutionContext, type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import Ajv, { type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { parse } from 'yaml';
import { AI_ANALYSIS_PROVIDER, type AiAnalysisProvider } from '../src/ai/ai-analysis-provider';
import { AnalysisRateLimitGuard } from '../src/analysis/analysis-rate-limit.guard';
import { MAX_IMAGE_BYTES } from '../src/analysis/dto/images-request.dto';
import { AppModule } from '../src/app.module';
import { ApiException } from '../src/common/http/api-exception';
import { configureApp } from '../src/configure-app';
import { EmergencyScenario } from '../src/contracts/guidance.enums';
import { ErrorCode } from '../src/contracts/error-code.enum';

const spec = parse(readFileSync(resolve(__dirname, '../docs/ScamShield_AI_OpenAPI_v1.2.yaml'), 'utf8')) as {
  components: { schemas: Record<string, object> };
};
const ajv = new Ajv({ strict: false, allErrors: true });
addFormats(ajv);
const responseValidators: Record<string, ValidateFunction> = {};
for (const name of ['AnalysisResponse', 'EmergencyResponse', 'HealthResponse', 'ErrorResponse']) {
  responseValidators[name] = ajv.compile({ ...spec, $ref: '#/components/schemas/' + name });
}

async function expectSchema(response: Response, status: number, schema: string): Promise<unknown> {
  expect(response.status).toBe(status);
  expect(response.headers.get('content-type')).toMatch(/^application\/json(?:;|$)/iu);
  const payload: unknown = await response.json();
  const validator = responseValidators[schema];
  if (!validator(payload)) {
    throw new Error(ajv.errorsText(validator.errors));
  }
  return payload;
}

async function expectError(response: Response, status: number, errorCode: ErrorCode): Promise<void> {
  const payload = await expectSchema(response, status, 'ErrorResponse');
  expect(payload).toMatchObject({ statusCode: status, errorCode, requestId: response.headers.get('x-request-id') });
}

function appendImage(form: FormData, bytes: Buffer, name = 'screen.jpg', mime = 'image/jpeg', field = 'images'): void {
  form.append(field, new Blob([Uint8Array.from(bytes)], { type: mime }), name);
}

// JPEG COM markers pad a real image to the exact byte boundary without changing its pixels.
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

describe('v1.2 mock API', () => {
  let app: INestApplication;
  let url: string;
  let jpeg: Buffer;
  let png: Buffer;
  let webp: Buffer;
  let ai: AiAnalysisProvider;

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication({ logger: false });
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
    ai = app.get<AiAnalysisProvider>(AI_ANALYSIS_PROVIDER);
    const fixture = sharp({ create: { width: 16, height: 16, channels: 3, background: '#245abc' } });
    [jpeg, png, webp] = await Promise.all([
      fixture.clone().jpeg().toBuffer(), fixture.clone().png().toBuffer(), fixture.clone().webp().toBuffer(),
    ]);
  });

  afterAll(async () => {
    await app?.close();
  });

  function postJson(path: string, body: unknown): Promise<Response> {
    return fetch(url + '/api/v1' + path, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
  }

  function upload(form: FormData): Promise<Response> {
    return fetch(url + '/api/v1/analysis/images', { method: 'POST', body: form });
  }

  it('preserves health and publishes the exact approved Swagger document', async () => {
    const health = await fetch(url + '/api/v1/health');
    expect(await expectSchema(health, 200, 'HealthResponse')).toMatchObject({
      status: 'ok', service: 'scamshield-backend',
    });
    const swagger = await fetch(url + '/api/docs-json');
    expect(swagger.status).toBe(200);
    expect(await swagger.json()).toEqual(spec);
    const ui = await fetch(url + '/api/docs/swagger-ui-init.js');
    expect(ui.status).toBe(200);
    expect(await ui.text()).toContain('"url": "/api/v1"');
  });

  it('omits CORS permission by default while allowing same-origin and native clients', async () => {
    const response = await fetch(url + '/api/v1/health', { headers: { Origin: 'http://localhost:5173' } });
    expect(response.headers.has('access-control-allow-origin')).toBe(false);
    await expectSchema(response, 200, 'HealthResponse');
  });

  it.each([
    ['safe', '  Hẹn gặp ở thư viện.  ', 'SAFE'],
    ['suspicious', 'Chuyển tiền ngay', 'SUSPICIOUS'],
    ['danger', 'Gửi OTP', 'DANGER'],
    ['unable to assess', '...', 'UNABLE_TO_ASSESS'],
    ['trimmed 5000-character boundary', ' ' + 'a'.repeat(5000) + ' ', 'SAFE'],
  ])('returns a contract-valid text result for %s', async (_fixture, text, risk_level) => {
    const response = await postJson('/analysis/text', { text });
    expect(await expectSchema(response, 200, 'AnalysisResponse')).toMatchObject({ input_type: 'TEXT', risk_level });
  });

  it.each([
    ['Không bao giờ cung cấp OTP cho người lạ.', 'SAFE', 0, 'NONE'],
    ['Đừng đưa mã OTP cho người lạ.', 'SAFE', 0, 'NONE'],
    ['Không cần phải đưa mã OTP.', 'SAFE', 0, 'NONE'],
    ['đưa mã OTP đây', 'DANGER', 85, 'OTP_THEFT'],
    ['Đây là một ví dụ. Gửi mã OTP ngay.', 'SAFE', 0, 'NONE'],
    ['Không cần phải gửi OTP.', 'SAFE', 0, 'NONE'],
    ['Ngân hàng thông báo bảo trì hệ thống tối nay.', 'SAFE', 0, 'NONE'],
    ['Tôi vừa đọc bài viết giải thích cách kẻ gian giả danh công an để lừa tiền.', 'SAFE', 0, 'NONE'],
    ['Vui lòng chuyển tiền hóa đơn tháng này.', 'SAFE', 0, 'NONE'],
    ['Gửi mã OTP ngay để tránh bị khóa tài khoản.', 'DANGER', 100, 'OTP_THEFT'],
    ['Truy cập liên kết này và nhập mật khẩu để nhận phần thưởng.', 'DANGER', 100, 'PHISHING'],
    ['Chuyển tiền ngay nếu không sẽ bị xử phạt.', 'DANGER', 75, 'FINANCIAL_FRAUD'],
    ['Xem thông tin tại https://bit.ly/example', 'SAFE', 25, 'NONE'],
    ['OTP', 'UNABLE_TO_ASSESS', null, 'NONE'],
    ['Urgent', 'UNABLE_TO_ASSESS', null, 'NONE'],
  ])('uses the context of %s', async (text, risk_level, risk_score, scam_category) => {
    const response = await postJson('/analysis/text', { text });
    expect(await expectSchema(response, 200, 'AnalysisResponse'))
      .toMatchObject({ input_type: 'TEXT', risk_level, risk_score, scam_category });
  });

  it('returns a single local URL observation for repeated suspicious URLs', async () => {
    const response = await postJson('/analysis/text', { text: 'Xem HTTP://PAYPAL.EXAMPLE.COM/a và http://paypal.example.com/a' });
    expect(await expectSchema(response, 200, 'AnalysisResponse')).toMatchObject({
      risk_level: 'SUSPICIOUS', risk_score: 45, scam_category: 'NONE',
      detected_urls: [{
        url: 'HTTP://PAYPAL.EXAMPLE.COM/a', signals: ['MISLEADING_SUBDOMAIN', 'HTTP_ONLY'],
        is_verified_malicious: false,
      }],
    });
  });

  it.each([
    {}, { text: '  ' }, { text: 7 }, { text: null }, { text: 'a'.repeat(5001) }, { text: 'ok', extra: true },
    { text: 'ok', constructor: 'invalid' }, [], null,
  ].map((body): [unknown] => [body]))('rejects invalid text request %#', async (body) => {
    await expectError(await postJson('/analysis/text', body), 400, ErrorCode.INVALID_INPUT);
  });

  it('rejects malformed JSON and a non-JSON text request', async () => {
    await expectError(await fetch(url + '/api/v1/analysis/text', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"text":',
    }), 400, ErrorCode.INVALID_INPUT);
    await expectError(await fetch(url + '/api/v1/analysis/text', {
      method: 'POST', body: 'text=hello',
    }), 400, ErrorCode.INVALID_INPUT);
  });

  it('counts Unicode code points after trimming and preserves Vietnamese evidence', async () => {
    const quote = 'Gửi mã OTP ngay để tránh bị khóa tài khoản.';
    const text = quote + ' ' + '🛡'.repeat(5000 - [...quote].length - 1);
    const response = await postJson('/analysis/text', { text: ' \n' + text + '\t ' });
    expect(await expectSchema(response, 200, 'AnalysisResponse')).toMatchObject({
      risk_level: 'DANGER',
      evidence: expect.arrayContaining([expect.objectContaining({ quote, image_index: null })]) as unknown,
    });
    await expectError(await postJson('/analysis/text', { text: text + '🛡' }), 400, ErrorCode.INVALID_INPUT);
    await expectSchema(await postJson('/analysis/text', { text: '  ế  ' }), 200, 'AnalysisResponse');
  });

  it('accepts JPEG, PNG, and WebP in submission order, ignoring declared MIME and extension', async () => {
    const form = new FormData();
    appendImage(form, png, 'first.jpg', 'image/jpeg');
    appendImage(form, webp, 'second.png', 'image/png');
    appendImage(form, jpeg, 'third.webp', 'image/webp');
    form.append('context', '🛡'.repeat(1000));
    const spy = jest.spyOn(ai, 'analyze');
    try {
      const response = await upload(form);
      expect(await expectSchema(response, 200, 'AnalysisResponse')).toMatchObject({
        input_type: 'IMAGE', risk_level: 'UNABLE_TO_ASSESS', risk_score: null, evidence: [], detected_urls: [],
      });
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy.mock.calls[0][0]).toEqual(expect.objectContaining({
        inputType: 'IMAGE',
        images: [
          { bytes: png, mediaType: 'image/png' },
          { bytes: webp, mediaType: 'image/webp' },
          { bytes: jpeg, mediaType: 'image/jpeg' },
        ],
        context: '🛡'.repeat(1000),
        dialogue: expect.objectContaining({
          formattedPromptText: expect.any(String),
          turns: expect.any(Array),
        }),
        ocrResult: expect.objectContaining({
          fullTranscript: expect.any(String),
          turns: expect.any(Array),
        }),
      }));
    } finally {
      spy.mockRestore();
    }
  });

  it.each([1, 5])('accepts %d images without context', async (count) => {
    const form = new FormData();
    for (let index = 0; index < count; index++) appendImage(form, jpeg);
    await expectSchema(await upload(form), 200, 'AnalysisResponse');
  });

  it('accepts four 5 MiB images and rejects a single extra combined byte', async () => {
    const maximum = padJpeg(jpeg, MAX_IMAGE_BYTES);
    const form = new FormData();
    for (let index = 0; index < 4; index++) appendImage(form, maximum);
    await expectSchema(await upload(form), 200, 'AnalysisResponse');

    const oversize = new FormData();
    for (let index = 0; index < 4; index++) appendImage(oversize, maximum);
    appendImage(oversize, Buffer.alloc(1));
    await expectError(await upload(oversize), 413, ErrorCode.IMAGE_TOO_LARGE);
  });

  it('rejects a single image one byte over 5 MiB', async () => {
    const form = new FormData();
    appendImage(form, padJpeg(jpeg, MAX_IMAGE_BYTES + 1));
    await expectError(await upload(form), 413, ErrorCode.IMAGE_TOO_LARGE);
  });

  it('rejects missing and excess images, invalid context, and unexpected or repeated fields', async () => {
    const missing = new FormData();
    missing.append('context', 'no files');
    await expectError(await upload(missing), 400, ErrorCode.INVALID_INPUT);

    const excess = new FormData();
    for (let index = 0; index < 6; index++) appendImage(excess, jpeg);
    await expectError(await upload(excess), 400, ErrorCode.INVALID_INPUT);

    for (const fields of [
      [['context', 'a'.repeat(1001)]], [['context', '🛡'.repeat(1001)]],
      [['context', 'one'], ['context', 'two']], [['other', 'unexpected']], [['images', 'not a file']],
      [['context[0]', 'not a string field']],
    ]) {
      const form = new FormData();
      appendImage(form, jpeg);
      for (const [key, value] of fields) form.append(key, value);
      await expectError(await upload(form), 400, ErrorCode.INVALID_INPUT);
    }

    const wrongKey = new FormData();
    appendImage(wrongKey, jpeg, 'image.jpg', 'image/jpeg', 'file');
    await expectError(await upload(wrongKey), 400, ErrorCode.INVALID_INPUT);
  });

  it('rejects malformed multipart and JSON sent to the image route', async () => {
    await expectError(await fetch(url + '/api/v1/analysis/images', {
      method: 'POST', headers: { 'content-type': 'multipart/form-data' }, body: 'missing boundary',
    }), 400, ErrorCode.INVALID_INPUT);
    await expectError(await fetch(url + '/api/v1/analysis/images', {
      method: 'POST', headers: { 'content-type': 'multipart/form-data; boundary=boundary' },
      body: '--boundary\r\nContent-Disposition: form-data; name="context"\r\n\r\nIncomplete',
    }), 400, ErrorCode.INVALID_INPUT);
    await expectError(await postJson('/analysis/images', { images: ['fake'] }), 400, ErrorCode.INVALID_INPUT);
  });

  it('rejects unsupported request content types with the current v1.2 error envelope', async () => {
    for (const path of ['/analysis/text', '/analysis/images', '/guidance/emergency']) {
      const response = await fetch(url + '/api/v1' + path, {
        method: 'POST',
        headers: { 'content-type': 'application/pdf' },
        body: '%PDF-1.7',
      });
      await expectError(response, 400, ErrorCode.INVALID_INPUT);
    }
  });

  it('distinguishes unsupported images, invalid signatures, and truncated data', async () => {
    const gif = await sharp(jpeg).gif().toBuffer();
    for (const [bytes, code] of [
      [gif, ErrorCode.UNSUPPORTED_IMAGE_FORMAT],
      [Buffer.from('not an image'), ErrorCode.INVALID_IMAGE],
      [png.subarray(0, png.length - 25), ErrorCode.INVALID_IMAGE],
      [jpeg.subarray(0, jpeg.length - 2), ErrorCode.INVALID_IMAGE],
      [Buffer.alloc(0), ErrorCode.INVALID_IMAGE],
    ] as const) {
      const form = new FormData();
      appendImage(form, bytes);
      await expectError(await upload(form), 400, code);
    }
  });

  it.each(Object.values(EmergencyScenario))('serves deterministic %s guidance independently of AI', async (scenario) => {
    const spy = jest.spyOn(ai, 'analyze').mockRejectedValue(new Error('AI unavailable'));
    try {
      const first = await postJson('/guidance/emergency', { scenario });
      const second = await postJson('/guidance/emergency', { scenario, scam_category: 'PHISHING' });
      const guidance = await expectSchema(first, 200, 'EmergencyResponse');
      expect(guidance).toMatchObject({ scenario });
      expect(await expectSchema(second, 200, 'EmergencyResponse')).toEqual(guidance);
      expect(spy).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it.each([
    {}, { scenario: 'UNKNOWN' }, { scenario: 'CLICKED_LINK', scam_category: null },
    { scenario: 'CLICKED_LINK', scam_category: 'UNKNOWN' }, { scenario: 'CLICKED_LINK', otp: 'secret' },
  ])('rejects invalid guidance request %#', async (body) => {
    await expectError(await postJson('/guidance/emergency', body), 400, ErrorCode.INVALID_INPUT);
  });

  it('uses the error envelope for provider and unexpected failures', async () => {
    const spy = jest.spyOn(ai, 'analyze')
      .mockRejectedValueOnce(new ApiException(ErrorCode.AI_PROVIDER_ERROR, { providerUnavailable: true }))
      .mockRejectedValueOnce(new Error('sensitive failure'));
    try {
      await expectError(await postJson('/analysis/text', { text: 'Test' }), 503, ErrorCode.AI_PROVIDER_ERROR);
      const response = await postJson('/analysis/text', { text: 'Test' });
      expect(await expectSchema(response, 500, 'ErrorResponse')).toMatchObject({
        errorCode: ErrorCode.INTERNAL_ERROR, message: 'Đã xảy ra lỗi nội bộ.',
      });
    } finally {
      spy.mockRestore();
    }
  });

  it('throttles only analysis and supplies Retry-After', async () => {
    const limiter = app.get(AnalysisRateLimitGuard);
    const ip = '127.0.0.1';
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({ ip }),
        getResponse: () => ({ setHeader: jest.fn() }),
      }),
    } as unknown as ExecutionContext;
    // Fill the IPv4 key that the running app receives from fetch.
    try {
      for (let index = 0; index < 60; index++) limiter.canActivate(context);
    } catch (error) {
      expect(error).toMatchObject({ errorCode: ErrorCode.RATE_LIMIT_EXCEEDED });
    }
    const response = await postJson('/analysis/text', { text: 'Test' });
    expect(Number(response.headers.get('retry-after'))).toBeGreaterThan(0);
    await expectError(response, 429, ErrorCode.RATE_LIMIT_EXCEEDED);
    await expectSchema(await postJson('/guidance/emergency', { scenario: 'CLICKED_LINK' }), 200, 'EmergencyResponse');
  });
});
