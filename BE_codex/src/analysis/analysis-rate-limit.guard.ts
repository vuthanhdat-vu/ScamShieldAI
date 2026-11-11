import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiException } from '../common/http/api-exception';
import { ErrorCode } from '../contracts/error-code.enum';

const WINDOW_MS = 60_000;
const REQUESTS_PER_IP = 60;
const MAX_TRACKED_IPS = 10_000;

@Injectable()
export class AnalysisRateLimitGuard implements CanActivate {
  private resetAt = 0;
  private readonly requestCounts = new Map<string, number>();

  canActivate(context: ExecutionContext): boolean {
    const now = Date.now();
    if (now >= this.resetAt) {
      this.requestCounts.clear();
      this.resetAt = now + WINDOW_MS;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const address = request.ip ?? request.socket.remoteAddress ?? 'unknown';
    const count = this.requestCounts.get(address) ?? 0;
    if (count >= REQUESTS_PER_IP || (count === 0 && this.requestCounts.size >= MAX_TRACKED_IPS)) {
      context.switchToHttp().getResponse<Response>()
        .setHeader('Retry-After', Math.ceil((this.resetAt - now) / 1000));
      throw new ApiException(ErrorCode.RATE_LIMIT_EXCEEDED);
    }

    this.requestCounts.set(address, count + 1);
    return true;
  }
}
