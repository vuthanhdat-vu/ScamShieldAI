import { randomUUID } from 'node:crypto';
import type { AiAnalysisCandidate, AiAnalysisInput, AiEvidence } from '../ai/ai-analysis-provider';
import { InputType, RiskLevel, ScamCategory, SignalType } from '../contracts/analysis.enums';
import type { AnalysisResponseDto, DetectedUrlDto } from './dto/analysis-response.dto';

type Assessment = Pick<AnalysisResponseDto, 'risk_score' | 'risk_level'>;

const publicReasons: Record<SignalType, string> = {
  [SignalType.CREDENTIAL_REQUEST]: 'Tin nhắn yêu cầu mã xác thực.',
  [SignalType.MONEY_REQUEST]: 'Nội dung yêu cầu chuyển tiền.',
  [SignalType.IMPERSONATION]: 'Nội dung có lời tự xưng hoặc đại diện cần được xác minh.',
  [SignalType.SUSPICIOUS_URL]: 'Đường dẫn có dấu hiệu cấu trúc cần lưu ý.',
  [SignalType.URGENCY]: 'Nội dung tạo áp lực thời gian.',
  [SignalType.THREAT]: 'Nội dung đề cập hậu quả để gây áp lực.',
  [SignalType.TOO_GOOD_TO_BE_TRUE]: 'Nội dung dùng lời hứa về phần thưởng.',
  [SignalType.OTHER]: 'Chi tiết cần được xem xét thêm.',
};

export function mapAnalysisResponse(
  input: AiAnalysisInput,
  candidate: AiAnalysisCandidate,
  evidence: readonly AiEvidence[],
  urls: DetectedUrlDto[],
  assessment: Assessment,
  category: ScamCategory,
): AnalysisResponseDto {
  const insufficient = assessment.risk_level === RiskLevel.UNABLE_TO_ASSESS;
  let summary = 'Chưa thấy dấu hiệu rủi ro được hỗ trợ bởi nội dung đã gửi.';
  let speech = summary;
  if (insufficient) {
    summary = input.inputType === InputType.IMAGE
      ? 'Ảnh chưa đủ rõ hoặc chưa có đủ bằng chứng để đánh giá.'
      : 'Không có đủ bằng chứng để đánh giá.';
    speech = summary;
  } else if (evidence.some(({ signalType }) => signalType === SignalType.CREDENTIAL_REQUEST)) {
    summary = 'Tin nhắn yêu cầu cung cấp thông tin xác thực.';
    if (category === ScamCategory.OTP_THEFT) summary = 'Tin nhắn yêu cầu cung cấp mã OTP.';
    speech = category === ScamCategory.OTP_THEFT ? 'Không cung cấp mã OTP.' : 'Không cung cấp thông tin xác thực.';
  } else if (evidence.length) {
    summary = 'Nội dung có dấu hiệu cần được kiểm tra qua kênh chính thức.';
    speech = summary;
  } else if (urls.some(({ signals }) => signals.length)) {
    summary = 'Đường dẫn có dấu hiệu rủi ro theo quy tắc kiểm tra cục bộ.';
    speech = summary;
  }

  return {
    analysis_id: randomUUID(),
    input_type: input.inputType,
    ...assessment,
    scam_category: category,
    summary,
    evidence: evidence.map(({ quote, signalType, imageIndex }) =>
      ({ quote, reason: publicReasons[signalType], signal_type: signalType, image_index: imageIndex })),
    detected_urls: insufficient ? [] : urls,
    recommended_actions: [...candidate.recommendedActions],
    speech_summary: speech,
    analyzed_at: new Date().toISOString(),
  };
}
