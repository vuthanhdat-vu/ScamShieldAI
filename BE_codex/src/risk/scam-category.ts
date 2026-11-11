import type { AiEvidence } from '../ai/ai-analysis-provider';
import { ScamCategory, SignalType } from '../contracts/analysis.enums';

export function selectScamCategory(
  suggested: ScamCategory, evidence: readonly AiEvidence[], hasUrlIndicators: boolean,
): ScamCategory {
  const has = (signal: SignalType) => evidence.some(({ signalType }) => signalType === signal);
  const mentions = (signal: SignalType, pattern: RegExp) =>
    evidence.some(({ signalType, quote }) => signalType === signal && pattern.test(quote));
  const credentials = has(SignalType.CREDENTIAL_REQUEST);
  const money = has(SignalType.MONEY_REQUEST);
  const corroboratedMoney = money && (
    has(SignalType.THREAT) || has(SignalType.IMPERSONATION) || has(SignalType.TOO_GOOD_TO_BE_TRUE) || hasUrlIndicators
  );
  const otp = mentions(SignalType.CREDENTIAL_REQUEST, /\botp\b|mã xác thực|mã xác minh/iu);

  switch (suggested) {
    case ScamCategory.OTP_THEFT:
      if (otp) return suggested;
      break;
    case ScamCategory.BANK_IMPERSONATION:
      if ((credentials || money || has(SignalType.THREAT)) &&
          mentions(SignalType.IMPERSONATION, /ngân hàng|\bbank\b/iu)) return suggested;
      break;
    case ScamCategory.GOVERNMENT_IMPERSONATION:
      if ((credentials || money || has(SignalType.THREAT)) &&
          mentions(SignalType.IMPERSONATION, /công an|cảnh sát|cơ quan|tòa án|\bpolice\b/iu)) return suggested;
      break;
    case ScamCategory.FAKE_RECRUITMENT:
      if ((credentials || corroboratedMoney) && evidence.some(({ quote }) => /tuyển dụng|việc làm|tuyển nhân viên/iu.test(quote))) return suggested;
      break;
    case ScamCategory.FAKE_DELIVERY:
      if ((credentials || corroboratedMoney) && evidence.some(({ quote }) => /giao hàng|đơn hàng|bưu kiện/iu.test(quote))) return suggested;
      break;
    case ScamCategory.SOCIAL_ENGINEERING:
      if ((credentials || money) && (has(SignalType.URGENCY) || has(SignalType.THREAT))) return suggested;
      break;
    case ScamCategory.OTHER:
      if (has(SignalType.OTHER)) return suggested;
      break;
  }

  const asksToOpenLink = evidence.some(({ quote }) =>
    /(?:truy cập|bấm|nhấp|mở)[^.!?;]{0,30}(?:liên kết|đường dẫn|link)|\b(?:click|open|visit) (?:the |this )?link\b/iu.test(quote));
  if (credentials && (hasUrlIndicators || asksToOpenLink)) return ScamCategory.PHISHING;
  if (otp) return ScamCategory.OTP_THEFT;
  if (corroboratedMoney) return ScamCategory.FINANCIAL_FRAUD;
  return ScamCategory.NONE;
}
