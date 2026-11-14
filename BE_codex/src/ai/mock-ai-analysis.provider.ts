import { Injectable } from '@nestjs/common';
import { evidenceClauses, normalizeEvidence, supportsSignal } from '../analysis/evidence-context';
import { InputType, ScamCategory, SignalType } from '../contracts/analysis.enums';
import type {
  AiAnalysisCandidate, AiAnalysisInput, AiAnalysisProvider, AiEvidence,
} from './ai-analysis-provider';

const mockRules = [
  [SignalType.CREDENTIAL_REQUEST, 'Nội dung yêu cầu cung cấp thông tin xác thực.'],
  [SignalType.MONEY_REQUEST, 'Nội dung yêu cầu chuyển tiền.'],
  [SignalType.URGENCY, 'Nội dung tạo áp lực về thời gian.'],
  [SignalType.THREAT, 'Nội dung đưa ra hậu quả để gây áp lực.'],
  [SignalType.TOO_GOOD_TO_BE_TRUE, 'Nội dung hứa hẹn phần thưởng.'],
] as const;

@Injectable()
export class MockAiAnalysisProvider implements AiAnalysisProvider {
  analyze(input: AiAnalysisInput, signal: AbortSignal): Promise<AiAnalysisCandidate> {
    signal.throwIfAborted();

    if (input.inputType === InputType.IMAGE) {
      const turns = input.dialogue?.turns ?? [];
      const validTurns = turns.filter(
        (turn) => turn.text && turn.text !== 'Tin nhắn không xác định từ ảnh chụp màn hình.' && /[\p{L}\p{N}]/u.test(turn.text),
      );
      if (validTurns.length === 0) {
        return Promise.resolve({
          canAssess: false,
          suggestedCategory: ScamCategory.NONE,
          summary: 'Chế độ mô phỏng chưa đọc được nội dung trong ảnh.',
          evidence: [],
          recommendedActions: ['Gửi nội dung hội thoại dưới dạng văn bản.'],
          speechSummary: 'Chế độ mô phỏng chưa đọc được nội dung trong ảnh.',
        });
      }

      const evidence: AiEvidence[] = [];
      for (const turn of validTurns) {
        const clauses = evidenceClauses(turn.text).map((clause) => clause.trim());
        for (const [signalType, reason] of mockRules) {
          const quote = clauses.find((clause) => supportsSignal(normalizeEvidence(clause), signalType));
          if (quote) {
            evidence.push({ quote, reason, signalType, imageIndex: turn.imageIndex });
          }
        }
      }

      const summary = evidence.length
        ? 'Phát hiện dấu hiệu rủi ro theo quy tắc mô phỏng từ ảnh.'
        : 'Chưa thấy dấu hiệu trong các mẫu văn bản mô phỏng từ ảnh.';

      return Promise.resolve({
        canAssess: true,
        suggestedCategory: ScamCategory.NONE,
        summary,
        evidence,
        recommendedActions: ['Xác minh thông tin qua kênh chính thức trước khi thực hiện yêu cầu.'],
        speechSummary: summary,
      });
    }

    if (
      !/[\p{L}\p{N}]/u.test(input.text) ||
      /^(?:otp|ngân hàng|công an|tiền|chuyển tiền|chuyển khoản|bank|police|money|urgent|khẩn cấp)[.!?]*$/iu.test(normalizeEvidence(input.text))
    ) {
      const summary = 'Tin nhắn không đủ thông tin để đánh giá.';
      return Promise.resolve({
        canAssess: false,
        suggestedCategory: ScamCategory.NONE,
        summary,
        evidence: [],
        recommendedActions: ['Gửi thêm nội dung tin nhắn.'],
        speechSummary: summary,
      });
    }

    const clauses = evidenceClauses(input.text).map((clause) => clause.trim());
    const evidence = mockRules.flatMap(([signalType, reason]) => {
      const quote = clauses.find((clause) => supportsSignal(normalizeEvidence(clause), signalType));
      return quote ? [{ quote, reason, signalType, imageIndex: null }] : [];
    });
    const summary = evidence.length
      ? 'Phát hiện dấu hiệu rủi ro theo quy tắc mô phỏng.'
      : 'Chưa thấy dấu hiệu trong các mẫu văn bản mô phỏng.';
    return Promise.resolve({
      canAssess: true,
      suggestedCategory: ScamCategory.NONE,
      summary,
      evidence,
      recommendedActions: ['Xác minh thông tin qua kênh chính thức trước khi thực hiện yêu cầu.'],
      speechSummary: summary,
    });
  }
}

