import type { EmergencyResponse, EmergencyScenario } from '../emergencyGuidance';

const fixtures = {
  NOT_INTERACTED: {
    scenario: 'NOT_INTERACTED',
    title: 'Bạn chưa tương tác với nội dung đáng ngờ',
    urgency: 'LOW',
    steps: [
      'Dừng trao đổi. Tránh mở liên kết hoặc tệp đính kèm.',
      'Nếu cần xác minh, hãy tự mở ứng dụng hoặc website chính thức của bên gửi.',
    ],
  },
  CLICKED_LINK: {
    scenario: 'CLICKED_LINK',
    title: 'Bạn đã mở một liên kết đáng ngờ',
    urgency: 'MEDIUM',
    steps: [
      'Đóng trang và dừng nhập thông tin.',
      'Nếu đã nhập mật khẩu hoặc mã OTP, quay lại và chọn tình huống tương ứng.',
      'Kiểm tra hoạt động tài khoản qua ứng dụng hoặc website chính thức.',
    ],
  },
  SHARED_CREDENTIALS: {
    scenario: 'SHARED_CREDENTIALS',
    title: 'Bạn đã cung cấp thông tin đăng nhập',
    urgency: 'HIGH',
    steps: [
      'Dùng thiết bị tin cậy để đổi mật khẩu qua ứng dụng hoặc website chính thức.',
      'Đăng xuất khỏi các phiên lạ và bật xác thực hai bước nếu có.',
      'Liên hệ bộ phận hỗ trợ chính thức nếu bạn mất quyền truy cập.',
    ],
  },
  SHARED_OTP: {
    scenario: 'SHARED_OTP',
    title: 'Bạn đã cung cấp mã OTP',
    urgency: 'HIGH',
    steps: [
      'Liên hệ ngay ngân hàng hoặc dịch vụ đã gửi mã qua kênh chính thức để được hỗ trợ bảo vệ tài khoản.',
      'Kiểm tra hoạt động gần đây và báo cáo giao dịch bạn không thực hiện.',
      'Dừng trao đổi và giữ kín mọi mã xác thực mới.',
    ],
  },
  TRANSFERRED_MONEY: {
    scenario: 'TRANSFERRED_MONEY',
    title: 'Bạn đã chuyển tiền',
    urgency: 'HIGH',
    steps: [
      'Gọi ngay cho ngân hàng qua số chính thức để báo giao dịch và hỏi các bước cần làm.',
      'Giữ chứng từ chuyển tiền và nội dung trao đổi để cung cấp khi trình báo.',
      'Dừng chuyển thêm tiền. Tránh trả phí cho người hứa lấy lại tiền.',
    ],
  },
  INSTALLED_APP: {
    scenario: 'INSTALLED_APP',
    title: 'Bạn đã cài ứng dụng đáng ngờ',
    urgency: 'HIGH',
    steps: [
      'Ngắt kết nối mạng trên thiết bị bị ảnh hưởng và tạm dừng đăng nhập trên thiết bị đó.',
      'Dùng thiết bị tin cậy để liên hệ ngân hàng hoặc dịch vụ có thể bị ảnh hưởng.',
      'Nhờ hỗ trợ kỹ thuật nếu cần kiểm tra quyền đã cấp và gỡ ứng dụng đáng ngờ.',
    ],
  },
} satisfies { [Scenario in EmergencyScenario]: EmergencyResponse & { scenario: Scenario } };

export function getEmergencyFixture(scenario: EmergencyScenario) {
  return fixtures[scenario];
}
