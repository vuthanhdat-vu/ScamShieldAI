import { SignalType } from '../contracts/analysis.enums';

// Shared narrow lexical checks for explicit requests and recognizable defensive wording.
const requestPrefix = String.raw`(?:^[\s"“']*|(?:hãy|vui lòng|yêu cầu|cần|phải|đề nghị|và|\bplease|\bmust|\byou should)\s+)`;
const credentialRequest = new RegExp(
  requestPrefix + String.raw`(?:\b(?:send|share|enter|provide|give)\b|gửi|đưa|cung cấp|nhập|đọc|tiết lộ)[^.!?;\n]{0,60}?(?:\botp\b|mã xác thực|mã xác minh|mật khẩu|\bpassword\b)`, 'iu',
);
const moneyRequest = new RegExp(
  requestPrefix + String.raw`(?:chuyển tiền|chuyển khoản|\bwire transfer\b|\btransfer (?:the )?money\b)`, 'iu',
);
const urgency = /ngay lập tức|khẩn cấp|trong \d+ phút|(?:gửi|chuyển tiền|chuyển khoản|nhập|cung cấp)[^.!?;]{0,32}\bngay\b|\burgent(?:ly)?\b/iu;
const threat = /(?:tránh|sẽ|nếu không)[^.!?;]{0,30}(?:bị khóa|khóa tài khoản|xử phạt|phạt tiền|bắt giữ)|\b(?:will be arrested|account will be (?:locked|suspended))\b/iu;
const incentive = /nhận (?:phần thưởng|tiền thưởng|quà tặng)|bạn (?:đã )?trúng thưởng|\b(?:claim your prize|receive a reward)\b/iu;
const impersonation = /(?:(?:tôi|chúng tôi) là|đây là|đại diện|giả danh|mạo danh|\b(?:we are|i am|this is|on behalf of)\b)[^.!?;]{0,50}(?:ngân hàng|công an|cảnh sát|tòa án|cơ quan|\bbank\b|\bpolice\b|\bgovernment\b)/iu;
const routinePayment = /(?:tiền điện|tiền nước|tiền thuê|hóa đơn|invoice|rent)/iu;
const defensiveDiscussion = /không bao giờ|không (?:(?:được|nên|cần|phải) )*(?:gửi|đưa|cung cấp|nhập|chuyển)|đừng|cảnh báo|ví dụ|minh họa|bài viết|giải thích cách|tôi vừa đọc|(?:đã|vừa) (?:chuyển tiền|chuyển khoản)|\b(?:never|do not|don't|warning|for example|already transferred)\b/iu;
const exampleIntroduction = /^(?:(?:đây là (?:một )?)?ví dụ|(?:this is an )?example|for example)[\s.!?:;]*$/iu;

export function normalizeEvidence(text: string): string {
  return text.normalize('NFC').replace(/\s+/gu, ' ').trim();
}

export function evidenceClauses(text: string): string[] {
  const parts = text.split(/(?<=[.!?;])\s+|\r?\n/u);
  const clauses: string[] = [];
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    if (index + 1 < parts.length && exampleIntroduction.test(part.trim())) {
      clauses.push(part + ' ' + parts[++index]);
    } else {
      clauses.push(part);
    }
  }
  return clauses;
}

export function supportsSignal(text: string, signal: SignalType): boolean {
  if (defensiveDiscussion.test(text)) return false;
  switch (signal) {
    case SignalType.CREDENTIAL_REQUEST: return credentialRequest.test(text);
    case SignalType.MONEY_REQUEST: return moneyRequest.test(text) && (!routinePayment.test(text) || threat.test(text));
    case SignalType.IMPERSONATION: return impersonation.test(text);
    case SignalType.URGENCY:
      return urgency.test(text) && (credentialRequest.test(text) || moneyRequest.test(text) || threat.test(text));
    case SignalType.THREAT: return threat.test(text);
    case SignalType.TOO_GOOD_TO_BE_TRUE: return incentive.test(text);
    case SignalType.SUSPICIOUS_URL: return /https?:\/\//iu.test(text);
    default: return true;
  }
}
