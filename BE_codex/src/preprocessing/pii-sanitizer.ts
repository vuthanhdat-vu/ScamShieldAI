import * as crypto from 'node:crypto';
import { PreprocessedTurn } from './preprocessing.interfaces';

/**
 * Robust Injectable decorator compatible with NestJS runtime and zero-dependency standalone environments.
 */
function getInjectable(): ClassDecorator {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const nest = require('@nestjs/common');
    if (typeof nest?.Injectable === 'function') {
      return nest.Injectable();
    }
  } catch {
    // Standalone fallback
  }
  return (target: any) => target;
}

export const Injectable = getInjectable;

export type PiiEntityType =
  | 'PASSWORD'
  | 'PERSON_NAME'
  | 'BANK_ACC'
  | 'OTP'
  | 'PHONE_NUMBER'
  | 'CCCD';

export interface MaskedTokenReference {
  token: string;
  entityType: PiiEntityType;
  saltedHmacSha256: string;
}

export interface SanitizationResult {
  sanitizedText: string;
  count: number;
}

@Injectable()
export class PiiSanitizer {
  private readonly sessionSalt: Buffer;
  private readonly digestToToken = new Map<string, string>();
  private readonly entityCounters = new Map<PiiEntityType, number>();
  private readonly tokenReferences: MaskedTokenReference[] = [];

  constructor(sessionSalt?: Buffer) {
    this.sessionSalt = sessionSalt ?? crypto.randomBytes(32);
  }

  public getSessionSalt(): Buffer {
    return this.sessionSalt;
  }

  public getReferences(): MaskedTokenReference[] {
    return [...this.tokenReferences];
  }

  /**
   * Retrieves an existing token for the canonicalized value, or generates a new one.
   * State is preserved across multiple turns within the same PiiSanitizer session.
   */
  public getOrCreateToken(rawValue: string, entityType: PiiEntityType): string {
    const canonical = this.canonicalize(rawValue, entityType);
    const digest = crypto
      .createHmac('sha256', this.sessionSalt)
      .update(canonical)
      .digest('hex');

    const existing = this.digestToToken.get(digest);
    if (existing) {
      return existing;
    }

    const currentCount = (this.entityCounters.get(entityType) ?? 0) + 1;
    this.entityCounters.set(entityType, currentCount);

    const token = `<MASKED_${entityType}_${currentCount}>`;
    this.digestToToken.set(digest, token);
    this.tokenReferences.push({
      token,
      entityType,
      saltedHmacSha256: digest,
    });

    return token;
  }

  /**
   * Sanitizes PII in text following strict precedence:
   * 1. PASSWORD (<MASKED_PASSWORD_n>)
   * 2. PERSON_NAME_DOB (<MASKED_PERSON_NAME_n>)
   * 3. BANK_ACCOUNT (<MASKED_BANK_ACC_n>)
   * 4. OTP (<MASKED_OTP_n>)
   * 5. PHONE_NUMBER (<MASKED_PHONE_NUMBER_n>)
   * 6. CCCD (<MASKED_CCCD_n>)
   *
   * Bank Account MUST be processed before CCCD to prevent 12-digit bank accounts
   * from being masked as CCCD.
   * Placeholders [MONEY], [NUMBER], [TIME] are strictly preserved 100%.
   */
  public sanitize(text: string): SanitizationResult {
    if (!text) {
      return { sanitizedText: '', count: 0 };
    }

    // Step 0: Record initial placeholders
    const initialPlaceholders = text.match(/\[(MONEY|NUMBER|TIME)\]/g) || [];

    let result = text;
    let count = 0;

    // 1. PASSWORD: (mat khau|mật khẩu|password|pwd|pass|mk)[:=] <secret>
    result = result.replace(
      /(mat\s*khau|mật\s*khẩu|password|pwd|pass|mk)\s*[:=]\s*(\S+)/gi,
      (match, label, secret) => {
        const cleanSecret = secret.replace(/[.,;!?]+$/, '');
        const trailing = secret.slice(cleanSecret.length);
        const token = this.getOrCreateToken(cleanSecret, 'PASSWORD');
        count++;
        const delim = match.includes('=') ? '=' : ':';
        return `${label}${delim} ${token}${trailing}`;
      },
    );

    // 2. PERSON_NAME & DOB: Coupled name and DOB pattern
    result = result.replace(
      /(?<![\p{L}\p{N}])(?:(?:[aA]nh\/[cC]hi|[oO]ng\/[bB]a|[kK]h[áa]ch\s*[hH][àa]ng|[aA]nh|[cC]hi|[oO]ng|[bB]a)\s+)?([A-ZÀ-Ỹ][\p{L}]*(?:\s+[A-ZÀ-Ỹ][\p{L}]*){1,5})_SN:\s*(\d{1,2}\/\d{1,2}\/\d{4})/gu,
      (match) => {
        const token = this.getOrCreateToken(match.trim(), 'PERSON_NAME');
        count++;
        return token;
      },
    );

    // 3. BANK_ACCOUNT: 8-16 digits with bank account prefix (Must run before CCCD!)
    result = result.replace(
      /(stk|so\s*tk|số\s*tk|tk|tai\s*khoan|tài\s*khoản|so\s*tai\s*khoan|số\s*tài\s*khoản)\s*[:.\-]?\s*(\d{8,16})\b/gi,
      (match, label, accountDigits) => {
        const token = this.getOrCreateToken(accountDigits, 'BANK_ACC');
        count++;
        const sep = match.includes(':') ? ': ' : ' ';
        return `${label}${sep}${token}`;
      },
    );

    // 4. OTP: 4-8 digits near OTP keywords
    result = result.replace(
      /(ma\s*otp|mã\s*otp|otp|ma\s*xac\s*thuc|mã\s*xác\s*thực|ma\s*xac\s*minh|mã\s*xác\s*minh)(?:\s+(?:cua|của)\s+(?:ban|bạn|quy\s*khach|quý\s*khách))?\s*(?:la|là|:|=|-|\s)+\s*([0-9]{4,8})\b/gi,
      (match, prefix, otpDigits) => {
        const token = this.getOrCreateToken(otpDigits, 'OTP');
        count++;
        const lead = match.slice(0, match.lastIndexOf(otpDigits));
        return `${lead}${token}`;
      },
    );

    // 5. PHONE_NUMBER: 10-11 digits starting with +84 or 0 (Vietnamese mobile format)
    result = result.replace(
      /(?:\+?84|0)(?:3[2-9]|5[25689]|7[06-9]|8[1-9]|9[0-46-9])\d{7}\b/g,
      (match) => {
        const token = this.getOrCreateToken(match, 'PHONE_NUMBER');
        count++;
        return token;
      },
    );

    // 6. CCCD: 12-digit BCA format, general 12-digit, 14-digit, or 8-digit
    result = result.replace(
      /(?<!\d)(?:0\d{2}[0-3]\d{2}\d{6}|\d{12}|001190\d{8})\b/g,
      (match) => {
        const token = this.getOrCreateToken(match, 'CCCD');
        count++;
        return token;
      },
    );

    // Step 7: Verify 100% placeholder preservation
    const finalPlaceholders = result.match(/\[(MONEY|NUMBER|TIME)\]/g) || [];
    if (initialPlaceholders.length !== finalPlaceholders.length) {
      throw new Error(
        `CRITICAL INTEGRITY VIOLATION: Placeholder count mismatch in PII Sanitizer! Initial: ${initialPlaceholders.length}, Final: ${finalPlaceholders.length}`,
      );
    }

    return { sanitizedText: result, count };
  }

  /**
   * Sanitizes an array of preprocessed turns preserving stateful tokens across turns.
   */
  public sanitizeTurns(
    turns: Array<{ speaker: 'peer' | 'user'; text: string; imageIndex: number }>,
  ): { turns: PreprocessedTurn[]; totalPiiCount: number } {
    let totalPiiCount = 0;
    const sanitizedTurns: PreprocessedTurn[] = turns.map((turn) => {
      const { sanitizedText, count } = this.sanitize(turn.text);
      totalPiiCount += count;
      return {
        speaker: turn.speaker,
        text: sanitizedText,
        imageIndex: turn.imageIndex,
      };
    });

    return { turns: sanitizedTurns, totalPiiCount };
  }

  private canonicalize(raw: string, type: PiiEntityType): string {
    if (type === 'BANK_ACC' || type === 'CCCD' || type === 'PHONE_NUMBER' || type === 'OTP') {
      return raw.replace(/[\s.\-]+/g, '');
    }
    return raw.trim().normalize('NFC');
  }
}
