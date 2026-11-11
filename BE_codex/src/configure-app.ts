import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { ApiException } from './common/http/api-exception';
import { ApiExceptionFilter } from './common/http/api-exception.filter';
import { requestContext } from './common/http/request-context';
import type { Environment } from './config/environment';
import { ErrorCode } from './contracts/error-code.enum';

export function configureApp(app: INestApplication): void {
  app.use(requestContext);
  const origins = app.get(ConfigService<Environment, true>).get('CORS_ORIGINS', { infer: true });
  if (origins?.length) {
    app.enableCors({
      origin: origins,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
      exposedHeaders: ['X-Request-Id', 'Retry-After'],
    });
  }
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    exceptionFactory: () => new ApiException(ErrorCode.INVALID_INPUT),
  }));
  app.useGlobalFilters(new ApiExceptionFilter());

  const contract = readFileSync(resolve(__dirname, '../docs/ScamShield_AI_OpenAPI_v1.2.yaml'), 'utf8');
  const specification = parse(contract) as OpenAPIObject;
  SwaggerModule.setup('api/docs', app, specification, {
    useGlobalPrefix: false,
    swaggerOptions: {
      spec: { ...specification, servers: [{ url: '/api/v1', description: 'Same origin as Swagger UI' }] },
      validatorUrl: null,
    },
  });
}
