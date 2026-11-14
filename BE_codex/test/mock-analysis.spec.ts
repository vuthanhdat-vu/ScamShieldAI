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

  it('evaluates dialogue turns with imageIndex in MockAiAnalysisProvider', async () => {
    const mockProvider = new MockAiAnalysisProvider();
    const signal = new AbortController().signal;

    // 1. Empty turns -> canAssess: false
    const emptyRes = await mockProvider.analyze({
      inputType: InputType.IMAGE,
      images: [{ bytes: Buffer.alloc(10), mediaType: 'image/png' }],
    }, signal);
    expect(emptyRes.canAssess).toBe(false);
    expect(emptyRes.summary).toBe('Chế độ mô phỏng chưa đọc được nội dung trong ảnh.');

    // 2. Turns with fallback unreadable text -> canAssess: false
    const fallbackRes = await mockProvider.analyze({
      inputType: InputType.IMAGE,
      images: [{ bytes: Buffer.alloc(10), mediaType: 'image/png' }],
      dialogue: {
        turns: [{ speaker: 'peer', text: 'Tin nhắn không xác định từ ảnh chụp màn hình.', imageIndex: 0 }],
        formattedPromptText: '[Peer]: Tin nhắn không xác định từ ảnh chụp màn hình.',
        sanitizedPiiCount: 0,
      },
    }, signal);
    expect(fallbackRes.canAssess).toBe(false);

    // 3. Turns with scam signals -> canAssess: true with evidence
    const scamRes = await mockProvider.analyze({
      inputType: InputType.IMAGE,
      images: [{ bytes: Buffer.alloc(10), mediaType: 'image/png' }, { bytes: Buffer.alloc(10), mediaType: 'image/png' }],
      dialogue: {
        turns: [
          { speaker: 'peer', text: 'Gửi mã OTP ngay để tránh bị khóa tài khoản.', imageIndex: 0 },
          { speaker: 'peer', text: 'Vui lòng chuyển tiền vào tài khoản tạm giữ.', imageIndex: 1 },
        ],
        formattedPromptText: '...',
        sanitizedPiiCount: 0,
      },
    }, signal);
    expect(scamRes.canAssess).toBe(true);
    expect(scamRes.evidence.length).toBeGreaterThanOrEqual(2);
    expect(scamRes.evidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          signalType: SignalType.CREDENTIAL_REQUEST,
          imageIndex: 0,
        }),
        expect.objectContaining({
          signalType: SignalType.MONEY_REQUEST,
          imageIndex: 1,
        }),
      ]),
    );

    // 4. Turns with benign text -> canAssess: true with empty evidence
    const benignRes = await mockProvider.analyze({
      inputType: InputType.IMAGE,
      images: [{ bytes: Buffer.alloc(10), mediaType: 'image/png' }],
      dialogue: {
        turns: [{ speaker: 'peer', text: 'Xin chào bạn, hôm nay thời tiết rất đẹp.', imageIndex: 0 }],
        formattedPromptText: '...',
        sanitizedPiiCount: 0,
      },
    }, signal);
    expect(benignRes.canAssess).toBe(true);
    expect(benignRes.evidence).toHaveLength(0);
    expect(benignRes.summary).toBe('Chưa thấy dấu hiệu trong các mẫu văn bản mô phỏng từ ảnh.');
  });

  it('wires OCR and preprocessing into effectiveInput for image analysis in AnalysisService', async () => {
    const mockOcr: any = {
      processImages: jest.fn().mockResolvedValue({
        turns: [{ speaker: 'peer', text: 'Gửi mã OTP để xác nhận giao dịch.', imageIndex: 0, confidence: 1 }],
        fullTranscript: 'Đối phương: Gửi mã OTP để xác nhận giao dịch.',
        imageCount: 1,
      }),
    };
    const mockPreprocessing: any = {
      cleanAndSanitize: jest.fn().mockReturnValue({
        turns: [{ speaker: 'peer', text: 'Gửi mã OTP để xác nhận giao dịch.', imageIndex: 0 }],
        formattedPromptText: '[Peer]: Gửi mã OTP để xác nhận giao dịch.',
        sanitizedPiiCount: 0,
      }),
    };
    const mockProvider = new MockAiAnalysisProvider();
    const wiredService = new AnalysisService(mockProvider, risk, new UrlIntelligenceService(), new EvidenceValidator(), mockOcr, mockPreprocessing);
    const result = await wiredService.analyze({
      inputType: InputType.IMAGE,
      images: [{ bytes: Buffer.from('test-image'), mediaType: 'image/png' }],
    });
    expect(mockOcr.processImages).toHaveBeenCalledWith([{ buffer: Buffer.from('test-image'), mediaType: 'image/png' }]);
    expect(mockPreprocessing.cleanAndSanitize).toHaveBeenCalled();
    expect(result.input_type).toBe('IMAGE');
    expect(result.risk_level).toBe(RiskLevel.DANGER);
    expect(result.evidence).toEqual([
      expect.objectContaining({
        signal_type: SignalType.CREDENTIAL_REQUEST,
        image_index: 0,
      }),
    ]);
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
