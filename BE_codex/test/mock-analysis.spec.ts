import { ApiException } from '../src/common/http/api-exception';
import { MockAiAnalysisProvider } from '../src/ai/mock-ai-analysis.provider';
import { AnalysisService } from '../src/analysis/analysis.service';
import { EvidenceValidator } from '../src/analysis/evidence-validator';
import { validateImage } from '../src/analysis/image-upload';
import { InputType, RiskLevel, SignalType, UrlSignal } from '../src/contracts/analysis.enums';
import { ErrorCode } from '../src/contracts/error-code.enum';
import { EmergencyScenario, EmergencyUrgency } from '../src/contracts/guidance.enums';
import { GuidanceService } from '../src/guidance/guidance.service';
import { UrlIntelligenceService } from '../src/intelligence/url-intelligence.service';
import { RiskService } from '../src/risk/risk.service';

describe('mock analysis', () => {
  const risk = new RiskService();
  const service = new AnalysisService(new MockAiAnalysisProvider(), risk, new UrlIntelligenceService(), new EvidenceValidator());

  it.each([
    ['Hẹn gặp ở thư viện.', RiskLevel.SAFE, 0],
    ['Vui lòng chuyển tiền.', RiskLevel.SUSPICIOUS, 55],
    ['Gửi mã OTP trong 15 phút.', RiskLevel.DANGER, 100],
    ['...', RiskLevel.UNABLE_TO_ASSESS, null],
  ])('classifies %s deterministically', async (text, risk_level, risk_score) => {
    const analyze = () => service.analyze({ inputType: InputType.TEXT, text });
    const result = await analyze();
    expect(await analyze()).toEqual({
      ...result,
      analysis_id: expect.any(String) as unknown,
      analyzed_at: expect.any(String) as unknown,
    });
    expect(result).toMatchObject({ risk_level, risk_score });
    for (const item of result.evidence) {
      expect(text).toContain(item.quote);
      expect(item.image_index).toBeNull();
    }
  });

  it('deduplicates signals before scoring and caps the score at 100', () => {
    expect(risk.assess([SignalType.URGENCY, SignalType.URGENCY])).toEqual({
      risk_score: 45, risk_level: RiskLevel.SUSPICIOUS,
    });
    expect(risk.assess([SignalType.URGENCY, SignalType.CREDENTIAL_REQUEST]).risk_score).toBe(100);
  });

  it('reports only observed URLs, with local signals and no malicious verification', async () => {
    const text = 'Mở http://127.0.0.1/check rồi xem https://example.com.';
    const result = await service.analyze({ inputType: InputType.TEXT, text });
    expect(result.detected_urls).toEqual([
      { url: 'http://127.0.0.1/check', signals: [UrlSignal.IP_HOST, UrlSignal.HTTP_ONLY], is_verified_malicious: false },
      { url: 'https://example.com', signals: [], is_verified_malicious: false },
    ]);
    expect(result.risk_level).toBe(RiskLevel.SUSPICIOUS);
  });

  it('rejects unsupported formats and corrupt data with distinct codes', async () => {
    await expect(validateImage(Buffer.from('GIF89a'))).rejects.toMatchObject({
      errorCode: ErrorCode.UNSUPPORTED_IMAGE_FORMAT,
    } satisfies Partial<ApiException>);
    await expect(validateImage(Buffer.from([0xff, 0xd8, 0xff]))).rejects.toMatchObject({
      errorCode: ErrorCode.INVALID_IMAGE,
    } satisfies Partial<ApiException>);
  });
});

describe('guidance', () => {
  const guidance = new GuidanceService();
  it.each([
    EmergencyScenario.SHARED_CREDENTIALS, EmergencyScenario.SHARED_OTP, EmergencyScenario.TRANSFERRED_MONEY,
  ])('prioritizes %s', (scenario) => {
    expect(guidance.forScenario(scenario).urgency).toBe(EmergencyUrgency.HIGH);
  });

  it('does not expose mutable shared steps', () => {
    const first = guidance.forScenario(EmergencyScenario.CLICKED_LINK);
    first.steps.length = 0;
    expect(guidance.forScenario(EmergencyScenario.CLICKED_LINK).steps.length).toBeGreaterThan(0);
  });
});
