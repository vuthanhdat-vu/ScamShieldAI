import { Body, Controller, Get, type INestApplication, Logger, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TextRequestDto } from '../src/analysis/dto/text-request.dto';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/configure-app';
import { ApiException } from '../src/common/http/api-exception';
import { ErrorCode } from '../src/contracts/error-code.enum';

@Controller('test-fixture')
class TestController {
  @Post('text')
  text(@Body() body: TextRequestDto): TextRequestDto {
    return body;
  }

  @Get('unexpected-error')
  unexpectedError(): never {
    throw new Error('secret provider failure');
  }

  @Get('image-too-large')
  imageTooLarge(): never {
    throw new ApiException(ErrorCode.IMAGE_TOO_LARGE);
  }
}

describe('HTTP foundation', () => {
  let app: INestApplication;
  let url: string;
  const uuid = /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i;
  const utc = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [TestController],
    }).compile();
    app = module.createNestApplication({ logger: false });
    configureApp(app);
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
  });

  afterAll(async () => {
    await app?.close();
  });

  async function expectError(response: Response, statusCode: number, errorCode: ErrorCode): Promise<void> {
    expect(response.status).toBe(statusCode);
    const requestId = response.headers.get('x-request-id');
    expect(requestId).toMatch(uuid);
    expect(await response.json()).toEqual({
      statusCode,
      errorCode,
      message: expect.any(String) as unknown,
      requestId,
      timestamp: expect.stringMatching(utc) as unknown,
    });
  }

  it('serves the prefixed health endpoint and generates a fresh request ID', async () => {
    const first = await fetch(url + '/api/v1/health', { headers: { 'X-Request-Id': 'untrusted' } });
    const second = await fetch(url + '/api/v1/health');
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({
      status: 'ok',
      service: 'scamshield-backend',
      timestamp: expect.stringMatching(utc) as unknown,
    });
    expect(first.headers.get('x-request-id')).toMatch(uuid);
    expect(second.headers.get('x-request-id')).toMatch(uuid);
    expect(second.headers.get('x-request-id')).not.toBe(first.headers.get('x-request-id'));
    await second.arrayBuffer();
    await expectError(await fetch(url + '/health'), 404, ErrorCode.INVALID_INPUT);
  });

  it('serves Swagger for the implemented health endpoint', async () => {
    const ui = await fetch(url + '/api/docs');
    expect(ui.status).toBe(200);
    expect(await ui.text()).toContain('Swagger UI');

    const specification = await fetch(url + '/api/docs-json');
    expect(specification.status).toBe(200);
    expect(await specification.json()).toMatchObject({
      paths: { '/health': { get: { operationId: 'getHealth' } } },
    });
  });

  it('trims text before validation', async () => {
    const response = await fetch(url + '/api/v1/test-fixture/text', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: '  hello  ' }),
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ text: 'hello' });
  });

  it.each(['{"text":"   "}', '{"text":"hello","other":"secret"}', '{"text":', '{"text":7}'])(
    'standardizes invalid requests (%s)',
    async (body) => {
      const response = await fetch(url + '/api/v1/test-fixture/text', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
      });
      await expectError(response, 400, ErrorCode.INVALID_INPUT);
    },
  );

  it('preserves the explicit image size error', async () => {
    await expectError(await fetch(url + '/api/v1/test-fixture/image-too-large'), 413, ErrorCode.IMAGE_TOO_LARGE);
  });

  it('omits sensitive details from the response and log on unexpected errors', async () => {
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    try {
      const response = await fetch(url + '/api/v1/test-fixture/unexpected-error?token=secret');
      const requestId = response.headers.get('x-request-id');
      expect(response.status).toBe(500);
      const body = await response.text();
      expect(body).toContain(ErrorCode.INTERNAL_ERROR);
      expect(body).not.toContain('secret');
      expect(log).toHaveBeenCalledWith(expect.stringContaining(requestId ?? 'missing'));
      expect(JSON.stringify(log.mock.calls)).not.toContain('secret');
    } finally {
      log.mockRestore();
    }
  });
});
