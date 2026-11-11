import { UrlSignal } from '../src/contracts/analysis.enums';
import { UrlIntelligenceService } from '../src/intelligence/url-intelligence.service';

describe('local URL intelligence', () => {
  const intelligence = new UrlIntelligenceService();
  it.each([
    ['http://127.0.0.1/a', [UrlSignal.IP_HOST, UrlSignal.HTTP_ONLY]],
    ['https://[2001:db8::1]/', [UrlSignal.IP_HOST]],
    ['https://xn--bcher-kva.example/a', [UrlSignal.PUNYCODE]],
    ['https://bit.ly/x', [UrlSignal.SHORTENER]],
    ['https://paypal.evil.co.uk/x', [UrlSignal.MISLEADING_SUBDOMAIN]],
    ['https://paypal.co.uk/x', []],
    ['https://google.example.vn/x', [UrlSignal.MISLEADING_SUBDOMAIN]],
    ['https://google.com.vn/x', []],
    ['https://user:pass@example.com', [UrlSignal.USERINFO_AT]],
    ['https://@example.com', [UrlSignal.USERINFO_AT]],
    ['https://example.com/' + 'x'.repeat(131), [UrlSignal.LONG_URL]],
    ['http://example.com/', [UrlSignal.HTTP_ONLY]],
    ['https://example.com/', []],
  ] satisfies Array<[string, UrlSignal[]]>)('classifies %s', (url, signals) => {
    expect(intelligence.detect(url)).toEqual([{ url, signals, is_verified_malicious: false }]);
  });

  it('ignores malformed URLs, email and non-HTTP schemes', () => {
    expect(intelligence.detect('mail support@example.com, https://[not-an-ip], https://%zz, ftp://example.com')).toEqual([]);
  });

  it('deduplicates only equivalent scheme/host casing and preserves the first original URL and exact tail', () => {
    expect(intelligence.detect('HTTPS://Example.com/A?x=%2F! https://example.com/A?x=%2F! https://example.com/a?x=%2F!'))
      .toEqual(['HTTPS://Example.com/A?x=%2F!', 'https://example.com/a?x=%2F!']
        .map((url) => ({ url, signals: [], is_verified_malicious: false })));
  });

  it('analyzes network-looking URLs without calling fetch', () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network forbidden'));
    try {
      expect(intelligence.detect('http://127.0.0.1/admin https://bit.ly/x')).toHaveLength(2);
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      fetch.mockRestore();
    }
  });
});
