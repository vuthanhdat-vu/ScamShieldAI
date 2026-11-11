import type { IconName } from '@/components/ui/Icon';

import type { RiskLevel, ScamCategory, SignalType, UrlSignal } from './analysisResult';

export const riskCopy = {
  SAFE: { title: 'Chưa thấy dấu hiệu đáng ngờ', icon: 'magnify' },
  SUSPICIOUS: { title: 'Có dấu hiệu đáng ngờ', icon: 'alert-outline' },
  DANGER: { title: 'Rủi ro cao', icon: 'alert-octagon-outline' },
  UNABLE_TO_ASSESS: { title: 'Chưa thể đánh giá', icon: 'help-circle-outline' },
} as const satisfies Record<RiskLevel, { title: string; icon: IconName }>;

export const categoryLabels: Record<ScamCategory, string> = {
  BANK_IMPERSONATION: 'Mạo danh ngân hàng',
  GOVERNMENT_IMPERSONATION: 'Mạo danh cơ quan nhà nước',
  PHISHING: 'Lừa lấy thông tin',
  OTP_THEFT: 'Đánh cắp mã OTP',
  FINANCIAL_FRAUD: 'Lừa đảo tài chính',
  FAKE_RECRUITMENT: 'Tuyển dụng giả mạo',
  FAKE_DELIVERY: 'Giao hàng giả mạo',
  SOCIAL_ENGINEERING: 'Thao túng để lấy thông tin hoặc tiền',
  OTHER: 'Hình thức khác',
  NONE: 'Chưa xác định',
};

export const signalLabels: Record<SignalType, string> = {
  URGENCY: 'Gây áp lực thời gian',
  THREAT: 'Đe dọa',
  CREDENTIAL_REQUEST: 'Yêu cầu thông tin xác thực',
  MONEY_REQUEST: 'Yêu cầu chuyển tiền',
  IMPERSONATION: 'Có dấu hiệu mạo danh',
  SUSPICIOUS_URL: 'Đường dẫn đáng ngờ',
  TOO_GOOD_TO_BE_TRUE: 'Hứa hẹn lợi ích khó tin',
  OTHER: 'Dấu hiệu khác',
};

export const urlSignalLabels: Record<UrlSignal, string> = {
  IP_HOST: 'Dùng địa chỉ IP thay cho tên miền',
  PUNYCODE: 'Tên miền có ký tự được mã hóa',
  SHORTENER: 'Đường dẫn rút gọn',
  MISLEADING_SUBDOMAIN: 'Tên miền phụ dễ gây nhầm lẫn',
  USERINFO_AT: 'Có phần thông tin người dùng trước dấu @',
  LONG_URL: 'Đường dẫn dài bất thường',
  HTTP_ONLY: 'Dùng HTTP không mã hóa',
};
