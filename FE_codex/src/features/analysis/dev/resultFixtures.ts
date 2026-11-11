import type { AnalysisResponse, RiskLevel } from '../analysisResult';

const sampleBase = {
  analyzed_at: '2026-11-10T11:30:00.000Z',
  evidence: [],
  detected_urls: [],
  recommended_actions: [],
} satisfies Partial<AnalysisResponse>;

const fixtures = {
  SAFE: {
    ...sampleBase,
    analysis_id: '00000000-0000-4000-8000-000000000001',
    input_type: 'TEXT',
    risk_level: 'SAFE',
    risk_score: 12,
    scam_category: 'NONE',
    summary: 'Tin nhắn nhắc lịch hẹn và chưa cho thấy dấu hiệu đáng ngờ trong nội dung đã gửi.',
    recommended_actions: ['Xác minh qua kênh chính thức trước khi làm theo yêu cầu.'],
    speech_summary: 'Chưa thấy dấu hiệu đáng ngờ. Hãy xác minh nếu còn phân vân.',
  },
  SUSPICIOUS: {
    ...sampleBase,
    analysis_id: '00000000-0000-4000-8000-000000000002',
    input_type: 'IMAGE',
    risk_level: 'SUSPICIOUS',
    risk_score: 61,
    scam_category: 'FAKE_DELIVERY',
    summary: 'Cuộc trò chuyện có yêu cầu đóng phí giao hàng qua đường dẫn lạ.',
    evidence: [
      { quote: 'Chuyển phí để nhận hàng.', reason: 'Người gửi yêu cầu trả thêm phí.', signal_type: 'MONEY_REQUEST', image_index: 2 },
      { quote: 'Xác nhận trong 10 phút.', reason: 'Thời hạn ngắn gây áp lực.', signal_type: 'URGENCY', image_index: 0 },
    ],
    detected_urls: [
      { url: 'http://delivery.example.invalid/phi-giao-hang', signals: ['HTTP_ONLY'], is_verified_malicious: false },
    ],
    recommended_actions: ['Tra cứu đơn hàng trong ứng dụng bạn đã đặt hàng.'],
    speech_summary: 'Có dấu hiệu đáng ngờ. Hãy kiểm tra đơn hàng qua ứng dụng chính thức.',
  },
  DANGER: {
    ...sampleBase,
    analysis_id: '00000000-0000-4000-8000-000000000003',
    input_type: 'TEXT',
    risk_level: 'DANGER',
    risk_score: 91,
    scam_category: 'OTP_THEFT',
    summary: 'Người gửi yêu cầu cung cấp mã OTP và đe dọa khóa tài khoản. Đây là dấu hiệu rủi ro cao.',
    evidence: [
      {
        quote: 'Gửi mã OTP ngay để tránh khóa tài khoản. ' +
          'Người gửi tiếp tục hối thúc và yêu cầu giữ kín cuộc trò chuyện. '.repeat(5).trimEnd(),
        reason: 'Yêu cầu mã xác thực và tạo áp lực để người nhận hành động ngay.',
        signal_type: 'CREDENTIAL_REQUEST',
        image_index: null,
      },
    ],
    recommended_actions: ['Dừng trao đổi và giữ kín mã OTP.', 'Liên hệ ngân hàng qua ứng dụng chính thức.'],
    speech_summary: 'Rủi ro cao. Dừng trao đổi và liên hệ ngân hàng qua kênh chính thức.',
  },
  UNABLE_TO_ASSESS: {
    ...sampleBase,
    analysis_id: '00000000-0000-4000-8000-000000000004',
    input_type: 'IMAGE',
    risk_level: 'UNABLE_TO_ASSESS',
    risk_score: null,
    scam_category: 'NONE',
    summary: 'Ảnh bị mờ và thiếu phần nội dung cần để nhận diện dấu hiệu.',
    recommended_actions: ['Gửi ảnh rõ hơn hoặc nhập nội dung tin nhắn dưới dạng văn bản.'],
    speech_summary: 'Chưa thể đánh giá từ ảnh này. Hãy thử gửi nội dung rõ hơn.',
  },
} satisfies Record<RiskLevel, AnalysisResponse>;

export function getResultFixture(key: string | string[] | undefined): AnalysisResponse | undefined {
  if (typeof key !== 'string' || !Object.hasOwn(fixtures, key)) return undefined;
  return fixtures[key as keyof typeof fixtures];
}
