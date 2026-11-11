import type { AiAnalysisCandidate, AiAnalysisInput, AiEvidence } from '../src/ai/ai-analysis-provider';
import { AnalysisService } from '../src/analysis/analysis.service';
import { EvidenceValidator } from '../src/analysis/evidence-validator';
import { InputType, RiskLevel, ScamCategory, SignalType, UrlSignal } from '../src/contracts/analysis.enums';
import { UrlIntelligenceService } from '../src/intelligence/url-intelligence.service';
import { RiskService, toRiskLevel } from '../src/risk/risk.service';
import { selectScamCategory } from '../src/risk/scam-category';

const item = (quote: string, signalType = SignalType.CREDENTIAL_REQUEST, imageIndex: number | null = null): AiEvidence =>
  ({ quote, signalType, imageIndex, reason: 'Lý do trong kết quả nội bộ.' });

describe('deterministic severity policy', () => {
  const risk = new RiskService();

  it.each([
    [0, RiskLevel.SAFE], [39, RiskLevel.SAFE], [40, RiskLevel.SUSPICIOUS],
    [74, RiskLevel.SUSPICIOUS], [75, RiskLevel.DANGER], [100, RiskLevel.DANGER],
    [null, RiskLevel.UNABLE_TO_ASSESS],
  ])('maps %s to %s', (score, expected) => expect(toRiskLevel(score)).toBe(expected));

  it.each([
    [[], [], 0],
    [[SignalType.CREDENTIAL_REQUEST, SignalType.URGENCY], [], 100],
    [[SignalType.CREDENTIAL_REQUEST, SignalType.IMPERSONATION], [], 100],
    [[SignalType.MONEY_REQUEST, SignalType.THREAT], [], 75],
    [[SignalType.MONEY_REQUEST, SignalType.URGENCY], [], 55],
    [[SignalType.CREDENTIAL_REQUEST], [UrlSignal.IP_HOST], 100],
    [[SignalType.URGENCY, SignalType.URGENCY, SignalType.OTHER, SignalType.TOO_GOOD_TO_BE_TRUE], [], 45],
    [[SignalType.SUSPICIOUS_URL], [], 0],
    [[], [UrlSignal.SHORTENER, UrlSignal.SHORTENER, UrlSignal.HTTP_ONLY], 25],
  ] satisfies Array<[SignalType[], UrlSignal[], number]>)('scores %j with URL indicators %j at %i', (signals, urls, expected) => {
    expect(risk.assess(signals, true, urls).risk_score).toBe(expected);
    expect(risk.assess([...signals].reverse(), true, [...urls].reverse())).toEqual(risk.assess(signals, true, urls));
  });

  it('gives an explicitly unassessable result no score', () => {
    expect(risk.assess([SignalType.CREDENTIAL_REQUEST], false, [UrlSignal.IP_HOST])).toEqual({
      risk_score: null, risk_level: RiskLevel.UNABLE_TO_ASSESS,
    });
  });
});

describe('evidence validation', () => {
  const validator = new EvidenceValidator();
  const text = { inputType: InputType.TEXT, text: 'Gửi mã   OTP. Vui lòng chuyển tiền.' } as const;

  it('uses NFC and whitespace matching and keeps first distinct supported observations', () => {
    const otp = item('Gửi mã OTP'.normalize('NFD'));
    const transfer = item('Vui lòng chuyển tiền', SignalType.MONEY_REQUEST);
    expect(validator.validate(text, [otp, item('Gửi mã  OTP'), transfer])).toEqual({
      accepted: [otp, transfer], rejected: false,
    });
  });

  it.each([
    item('Gửi mã khác'), item('Gửi mã OTP', SignalType.CREDENTIAL_REQUEST, 0),
    { ...item('Gửi mã OTP'), signalType: 'INVENTED' as SignalType },
    { ...item('Gửi mã OTP'), reason: '  ' }, { ...item('Gửi mã OTP'), reason: null },
    { ...item('Gửi mã OTP'), quote: null }, item('   '),
    item('Gửi mã OTP', SignalType.THREAT),
  ].map((evidence): [AiEvidence] => [evidence as AiEvidence]))('drops unsupported or malformed items %#', (evidence) => {
    expect(validator.validate(text, [evidence])).toEqual({ accepted: [], rejected: true });
  });

  it('rejects an active-looking substring taken from a warning', () => {
    expect(validator.validate({
      inputType: InputType.TEXT, text: 'Không bao giờ cung cấp OTP cho người lạ.',
    }, [item('cung cấp OTP')])).toEqual({ accepted: [], rejected: true });
  });

  it('keeps image order and distinct origins, discarding null, fractional, and out-of-range indices', () => {
    const image = { bytes: Buffer.alloc(0), mediaType: 'image/png' } as const;
    const first = item('Gửi mã OTP', SignalType.CREDENTIAL_REQUEST, 0);
    const second = item('Gửi mã OTP', SignalType.CREDENTIAL_REQUEST, 1);
    expect(validator.validate({ inputType: InputType.IMAGE, images: [image, image] }, [
      second, first, second, item('Gửi mã OTP'),
      item('Gửi mã OTP', SignalType.CREDENTIAL_REQUEST, 2),
      item('Gửi mã OTP', SignalType.CREDENTIAL_REQUEST, 0.5),
    ])).toEqual({ accepted: [second, first], rejected: true });
  });
});

describe('scam category and public mapping', () => {
  it.each([
    [ScamCategory.OTP_THEFT, [], false, ScamCategory.NONE],
    [ScamCategory.OTP_THEFT, [item('Gửi mã OTP')], false, ScamCategory.OTP_THEFT],
    [ScamCategory.BANK_IMPERSONATION, [item('Gửi mã OTP')], false, ScamCategory.OTP_THEFT],
    [ScamCategory.BANK_IMPERSONATION, [item('Tôi là đại diện ngân hàng', SignalType.IMPERSONATION), item('Gửi mã OTP')], false, ScamCategory.BANK_IMPERSONATION],
    [ScamCategory.FINANCIAL_FRAUD, [item('Vui lòng chuyển tiền', SignalType.MONEY_REQUEST)], false, ScamCategory.NONE],
    [ScamCategory.FINANCIAL_FRAUD, [item('Chuyển tiền', SignalType.MONEY_REQUEST), item('Nếu không sẽ bị xử phạt', SignalType.THREAT)], false, ScamCategory.FINANCIAL_FRAUD],
    [ScamCategory.PHISHING, [], true, ScamCategory.NONE],
    [ScamCategory.NONE, [item('Gửi mã OTP')], true, ScamCategory.PHISHING],
  ] satisfies Array<[ScamCategory, AiEvidence[], boolean, ScamCategory]>)('selects a supported category from %s and %j', (category, evidence, url, expected) => {
    expect(selectScamCategory(category, evidence, url)).toBe(expected);
  });

  it('does not publish unsupported model claims and keeps the exact public fields', async () => {
    const input: AiAnalysisInput = { inputType: InputType.TEXT, text: 'Gửi mã OTP.' };
    const candidate: AiAnalysisCandidate = {
      canAssess: true, suggestedCategory: ScamCategory.BANK_IMPERSONATION,
      summary: 'Website verified malicious', speechSummary: 'Website verified malicious',
      recommendedActions: [],
      evidence: [
        { ...item('Gửi mã OTP'), reason: 'Website verified malicious' },
        item('Tôi là ngân hàng', SignalType.IMPERSONATION),
      ],
    };
    const service = new AnalysisService({ analyze: () => Promise.resolve(candidate) },
      new RiskService(), new UrlIntelligenceService(), new EvidenceValidator());
    const response = await service.analyze(input);
    expect(response).toEqual({
      analysis_id: expect.stringMatching(/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/u) as unknown,
      input_type: InputType.TEXT,
      risk_score: 85, risk_level: RiskLevel.DANGER, scam_category: ScamCategory.OTP_THEFT,
      summary: 'Tin nhắn yêu cầu cung cấp mã OTP.',
      evidence: [{ quote: 'Gửi mã OTP', reason: 'Tin nhắn yêu cầu mã xác thực.', signal_type: SignalType.CREDENTIAL_REQUEST, image_index: null }],
      detected_urls: [], recommended_actions: [], speech_summary: 'Không cung cấp mã OTP.',
      analyzed_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u) as unknown,
    });
    expect(new Date(response.analyzed_at).toISOString()).toBe(response.analyzed_at);
  });
});
