import { Injectable } from '@nestjs/common';
import { EmergencyScenario, EmergencyUrgency } from '../contracts/guidance.enums';
import type { EmergencyResponseDto } from './dto/emergency.dto';

const guidance: Record<EmergencyScenario, Omit<EmergencyResponseDto, 'scenario'>> = {
  [EmergencyScenario.NOT_INTERACTED]: {
    title: 'Bạn chưa tương tác với nội dung đáng ngờ',
    urgency: EmergencyUrgency.LOW,
    steps: [
      'Không trả lời, mở liên kết hoặc tải tệp đính kèm.',
      'Xác minh người gửi qua kênh chính thức nếu cần.',
      'Chặn và báo cáo người gửi trên nền tảng bạn đang dùng.',
    ],
  },
  [EmergencyScenario.CLICKED_LINK]: {
    title: 'Bạn đã truy cập đường link đáng ngờ',
    urgency: EmergencyUrgency.MEDIUM,
    steps: [
      'Đóng trang đáng ngờ, không nhập thêm thông tin.',
      'Nếu đã cung cấp mật khẩu hoặc OTP, chọn tình huống tương ứng.',
      'Kiểm tra tài khoản qua ứng dụng hoặc website chính thức.',
    ],
  },
  [EmergencyScenario.SHARED_CREDENTIALS]: {
    title: 'Bạn đã cung cấp thông tin đăng nhập',
    urgency: EmergencyUrgency.HIGH,
    steps: [
      'Đổi ngay mật khẩu trên ứng dụng hoặc website chính thức từ thiết bị tin cậy.',
      'Đăng xuất các phiên lạ, bật xác thực hai bước và đổi mật khẩu ở nơi dùng lại.',
      'Liên hệ bộ phận hỗ trợ chính thức nếu mất quyền truy cập hoặc thấy hoạt động lạ.',
    ],
  },
  [EmergencyScenario.SHARED_OTP]: {
    title: 'Bạn đã cung cấp mã OTP',
    urgency: EmergencyUrgency.HIGH,
    steps: [
      'Liên hệ ngay ngân hàng hoặc dịch vụ phát hành mã qua kênh chính thức để khóa giao dịch hoặc tài khoản khi cần.',
      'Kiểm tra hoạt động gần đây và báo cáo giao dịch bất thường.',
      'Dừng trao đổi với người yêu cầu mã và không cung cấp thêm thông tin.',
    ],
  },
  [EmergencyScenario.TRANSFERRED_MONEY]: {
    title: 'Bạn đã chuyển tiền',
    urgency: EmergencyUrgency.HIGH,
    steps: [
      'Gọi ngay cho ngân hàng qua số chính thức và báo cáo giao dịch.',
      'Lưu chứng từ giao dịch và nội dung trao đổi để trình báo cơ quan có thẩm quyền.',
      'Dừng chuyển tiền và không trả phí cho lời hứa thu hồi tiền.',
    ],
  },
  [EmergencyScenario.INSTALLED_APP]: {
    title: 'Bạn đã cài ứng dụng đáng ngờ',
    urgency: EmergencyUrgency.HIGH,
    steps: [
      'Ngắt kết nối mạng trên thiết bị bị ảnh hưởng và dừng dùng thiết bị để đăng nhập.',
      'Dùng thiết bị tin cậy để liên hệ ngân hàng hoặc dịch vụ có thể bị ảnh hưởng.',
      'Gỡ ứng dụng đáng ngờ, thu hồi quyền đã cấp và nhờ hỗ trợ kỹ thuật nếu cần.',
    ],
  },
};

@Injectable()
export class GuidanceService {
  forScenario(scenario: EmergencyScenario): EmergencyResponseDto {
    const { title, urgency, steps } = guidance[scenario];
    return { scenario, title, urgency, steps: [...steps] };
  }
}
