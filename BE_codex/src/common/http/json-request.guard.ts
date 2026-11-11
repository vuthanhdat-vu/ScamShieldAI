import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { ErrorCode } from '../../contracts/error-code.enum';
import { ApiException } from './api-exception';

@Injectable()
export class JsonRequestGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const body: unknown = request.body;
    // Transformation can discard prototype keys before whitelist validation.
    if (
      !request.is('application/json') || !body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).some((key) => Object.hasOwn(Object.prototype, key))
    ) {
      throw new ApiException(ErrorCode.INVALID_INPUT);
    }
    return true;
  }
}
