import { SignalType } from '../contracts/analysis.enums';

// Shared narrow lexical checks for explicit requests and recognizable defensive wording.
const requestPrefix = String.raw`(?:^[\s"“'\[(]*|(?:(?:anh|chị|em|bạn|quý khách|ông|bà)\s+)?(?:hãy|vui lòng|yêu cầu|cần|phải|đề nghị|và|\bplease|\bmust|\byou should)?\s*)`;
const credentialRequest = new RegExp(
  requestPrefix + String.raw`(?:\b(?:send|share|enter|provide|give|fill)\b|gửi|đưa|cung cấp|nhập|điền|đọc|tiết lộ|xác nhận)[^.!?;\n]{0,80}?(?:\botp\b|mã xác thực|mã xác minh|mật khẩu|tên đăng nhập|\bpassword\b|cccd|căn cước)`, 'iu',
);
const moneyRequest = new RegExp(
  requestPrefix + String.raw`(?:\b(?:wire transfer|transfer (?:the )?money)\b|chuyển (?:toàn bộ\s+|khoản\s+)?tiền|chuyển khoản|nạp tiền|nộp phạt|nộp tiền|đóng phí|thanh toán (?:khoản|phí|tiền)?|chuyển [^.!?;\n]{0,35}?(?:vào tài khoản|stk|triệu|nghìn|vnd|đ\b))`, 'iu',
);
const urgency = /ngay lập tức|khẩn cấp|trong \d+\s*(?:phút|phut|giờ|gio|tiếng|tieng|h)|trước \d+\s*(?:giờ|gio|tiếng|tieng)|se bi tru|sẽ bị trừ|(?:gửi|chuyển (?:toàn bộ\s+)?tiền|chuyển khoản|nhập|cung cấp|hủy)[^.!?;]{0,32}\bngay\b|\burgent(?:ly)?\b/iu;
const threat = /(?:tránh|sẽ|nếu không|hiện đã có)[^.!?;]{0,40}(?:bị khóa|khóa tài khoản|xử phạt|phạt tiền|bắt giữ|lệnh bắt|tạm giam|trại giam|khởi tố|bị tạm giữ|tạm giữ phương tiện|bị trừ|trừ tiền|phong tỏa)|\b(?:will be arrested|account will be (?:locked|suspended))\b/iu;
const incentive = /nhận (?:phần thưởng|tiền thưởng|quà tặng)|bạn (?:đã )?trúng thưởng|\b(?:claim your prize|receive a reward)\b/iu;
const impersonation = /(?:(?:tôi|chúng tôi) là|đây là|đại diện|giả danh|mạo danh|thông báo quý khách|kết nối sang|công tác tại|hỗ trợ khách hàng|cục|bộ|ban|phòng|đội|\[?(?:acb|vcb|vietcombank|bidv|agribank|vietinbank|techcombank|mbbank|tpbank)\]?|\b(?:we are|i am|this is|on behalf of)\b)[^.!?;]{0,50}(?:ngân hàng|công an|cảnh sát|tòa án|cơ quan|viện kiểm sát|vksnd|pc02|c02|c06|bưu điện|\bbank\b|\bpolice\b|\bgovernment\b|vcb|acb|vietcombank)/iu;
const routinePayment = /(?:tiền điện|tiền nước|tiền thuê|hóa đơn|invoice|rent)/iu;
const defensiveDiscussion = /không bao giờ|không (?:(?:được|nên|cần|phải) )*(?:gửi|đưa|cung cấp|nhập|chuyển)|đừng|cảnh báo|ví dụ|minh họa|bài viết|giải thích cách|tôi vừa đọc|(?:đã|vừa) (?:chuyển tiền|chuyển khoản)|\b(?:never|do not|don't|warning|for example|already transferred)\b/iu;
const exampleIntroduction = /^(?:(?:đây là (?:một )?)?ví dụ|(?:this is an )?example|for example)[\s.!?:;]*$/iu;

export function normalizeEvidence(text: string): string {
  if (!text) return '';
  return text.normalize('NFC').replace(/\s+/gu, ' ').trim();
}

export function evidenceClauses(text: string): string[] {
  if (!text) return [];
  const parts = text.split(/(?<=[.!?;])\s+|\r?\n/u);
  const clauses: string[] = [];
  for (let index = 0; index < parts.length; index++) {
    const part = parts[index];
    if (!part) continue;
    if (index + 1 < parts.length && exampleIntroduction.test(part.trim())) {
      const next = parts[++index];
      clauses.push(next ? `${part} ${next}` : part);
    } else {
      clauses.push(part);
    }
  }
  return clauses.filter(Boolean);
}

export function supportsSignal(text: string, signal: SignalType): boolean {
  if (defensiveDiscussion.test(text)) return false;
  switch (signal) {
    case SignalType.CREDENTIAL_REQUEST: return credentialRequest.test(text);
    case SignalType.MONEY_REQUEST: return moneyRequest.test(text) && (!routinePayment.test(text) || threat.test(text));
    case SignalType.IMPERSONATION: return impersonation.test(text);
    case SignalType.URGENCY:
      return urgency.test(text) && (credentialRequest.test(text) || moneyRequest.test(text) || threat.test(text) || /phi dich vu|tru trong|bi tru|tạm giữ|phạt/iu.test(text));
    case SignalType.THREAT: return threat.test(text);
    case SignalType.TOO_GOOD_TO_BE_TRUE: return incentive.test(text);
    case SignalType.SUSPICIOUS_URL: return /https?:\/\//iu.test(text);
    default: return true;
  }
}
