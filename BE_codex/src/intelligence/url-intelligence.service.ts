import { Injectable } from '@nestjs/common';
import { isIP } from 'node:net';
import type { DetectedUrlDto } from '../analysis/dto/analysis-response.dto';
import { UrlSignal } from '../contracts/analysis.enums';

const SHORTENERS = new Set(['bit.ly', 't.co', 'tinyurl.com', 'is.gd', 'ow.ly']);
const BRAND_LABELS = /^(?:paypal|google|microsoft|apple|facebook|amazon)$/i;
const COMPOUND_SUFFIXES = new Set(['co.uk', 'org.uk', 'com.vn', 'net.vn', 'org.vn', 'com.au', 'co.nz', 'co.jp']);
const LONG_URL_LENGTH = 150;

function extractCandidate(raw: string, previous: string | undefined): string {
  const unpunctuated = raw.replace(/[.,;!]+$/u, '');
  for (const [opening, closing] of [['(', ')'], ['[', ']'], ['{', '}']]) {
    if (previous === opening && unpunctuated.endsWith(closing) &&
        unpunctuated.split(closing).length > unpunctuated.split(opening).length) {
      return unpunctuated.slice(0, -1);
    }
  }
  // Bare host followed by sentence punctuation. Preserve paths, queries and fragments verbatim.
  return /^(?:https?):\/\/[^/?#]+$/iu.test(raw) ? unpunctuated : raw;
}

@Injectable()
export class UrlIntelligenceService {
  detect(text: string): DetectedUrlDto[] {
    const detected: DetectedUrlDto[] = [];
    const seen = new Set<string>();
    for (const match of text.matchAll(/(?<![\p{L}\p{N}_@])https?:\/\/[^\s<>"']+/giu)) {
      const url = extractCandidate(match[0], text[match.index - 1]);
      const parts = /^(https?):\/\/([^/?#\\]+)([^\\]*)$/iu.exec(url);
      if (!parts || !URL.canParse(url)) continue;

      const parsed = new URL(url);
      const [, scheme, authority, tail] = parts;
      const userinfoEnd = authority.lastIndexOf('@') + 1;
      const key = scheme.toLowerCase() + '://' + authority.slice(0, userinfoEnd) +
        authority.slice(userinfoEnd).toLowerCase() + tail;
      if (seen.has(key)) continue;
      seen.add(key);

      const hostname = parsed.hostname.replace(/\.$/u, '');
      const labels = hostname.split('.');
      const suffixSize = COMPOUND_SUFFIXES.has(labels.slice(-2).join('.')) ? 2 : 1;
      const signals: UrlSignal[] = [];
      if (isIP(hostname.replace(/^\[|\]$/gu, ''))) signals.push(UrlSignal.IP_HOST);
      if (labels.some((label) => label.startsWith('xn--'))) signals.push(UrlSignal.PUNYCODE);
      if (SHORTENERS.has(hostname)) signals.push(UrlSignal.SHORTENER);
      if (labels.slice(0, -(suffixSize + 1)).some((label) => BRAND_LABELS.test(label))) {
        signals.push(UrlSignal.MISLEADING_SUBDOMAIN);
      }
      if (userinfoEnd) signals.push(UrlSignal.USERINFO_AT);
      if (url.length > LONG_URL_LENGTH) signals.push(UrlSignal.LONG_URL);
      if (parsed.protocol === 'http:') signals.push(UrlSignal.HTTP_ONLY);
      detected.push({ url, signals, is_verified_malicious: false });
    }
    return detected;
  }
}
