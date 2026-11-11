import { Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import type { NextFunction, Request, Response } from 'express';
import type { ErrorCode } from '../../contracts/error-code.enum';

export const REQUEST_ID_HEADER = 'X-Request-Id';

export type HttpResponse = Response<unknown, { errorCode?: ErrorCode }>;

const logger = new Logger('HTTP');

export function requestContext(_request: Request, response: HttpResponse, next: NextFunction): void {
  const requestId = randomUUID();
  response.setHeader(REQUEST_ID_HEADER, requestId);
  const startedAt = performance.now();

  response.once('finish', () => {
    const message = JSON.stringify({
      requestId,
      statusCode: response.statusCode,
      durationMs: Math.round(performance.now() - startedAt),
      errorCode: response.locals.errorCode,
    });

    if (response.statusCode >= 500) {
      logger.error(message);
    } else if (response.statusCode >= 400) {
      logger.warn(message);
    } else {
      logger.log(message);
    }
  });
  next();
}
