import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { ErrorCode } from '../../contracts/error-code.enum';
import { ApiException, publicErrorMessage } from './api-exception';
import type { ErrorResponseDto } from './error-response.dto';
import { type HttpResponse, REQUEST_ID_HEADER } from './request-context';

const statusErrorCodes: Partial<Record<number, ErrorCode>> = {
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorCode.RATE_LIMIT_EXCEEDED,
  [HttpStatus.BAD_GATEWAY]: ErrorCode.AI_PROVIDER_ERROR,
  [HttpStatus.SERVICE_UNAVAILABLE]: ErrorCode.AI_PROVIDER_ERROR,
  [HttpStatus.GATEWAY_TIMEOUT]: ErrorCode.AI_TIMEOUT,
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<HttpResponse>();
    if (response.headersSent) {
      response.end();
      return;
    }

    const statusCode = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const errorCode = exception instanceof ApiException
      ? exception.errorCode
      : statusErrorCodes[statusCode] ??
        (statusCode < 500 ? ErrorCode.INVALID_INPUT : ErrorCode.INTERNAL_ERROR);

    const header = response.getHeader(REQUEST_ID_HEADER);
    const requestId = typeof header === 'string' ? header : randomUUID();
    response.setHeader(REQUEST_ID_HEADER, requestId);
    response.locals.errorCode = errorCode;
    const body: ErrorResponseDto = {
      statusCode,
      errorCode,
      message: publicErrorMessage(errorCode),
      requestId,
      timestamp: new Date().toISOString(),
    };
    response.status(statusCode).json(body);
  }
}
