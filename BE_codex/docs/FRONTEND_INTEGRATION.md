# Tích hợp frontend ScamShield AI

Tài liệu hướng dẫn này đi kèm [OpenAPI v1.2](ScamShield_AI_OpenAPI_v1.2.yaml), [đặc tả API](ScamShield_AI_API_Spec_v1.2.docx) và [các quyết định hợp đồng](CONTRACT_DECISIONS.md).

## Chạy backend

Dùng Node.js 22 trở lên. Tại thư mục gốc dự án trong PowerShell, chạy:

```powershell
npm ci
npm run start:dev
```

| Biến môi trường backend | Giá trị phát triển |
| --- | --- |
| `PORT` | Mặc định `3000`. |
| `MOCK_AI` | Mặc định `true`, chạy offline và không cần key. |
| `OPENAI_API_KEY`, `OPENAI_MODEL` | Để trống ở mock mode. Cả hai bắt buộc ở real mode. |
| `OPENAI_TIMEOUT_MS` | `45000`. Khởi động từ chối giá trị khác theo v1.2. |
| `CORS_ORIGINS` | Mặc định để trống. Đặt danh sách origin phân cách bằng dấu phẩy cho frontend web khác origin. Ví dụ `http://localhost:5173,http://127.0.0.1:5173`. |

Swagger UI ở `http://localhost:3000/api/docs` và gửi request đến cùng origin với trang đang mở. `/api/docs-json` phục vụ bản OpenAPI v1.2 đã duyệt. Giữ thư mục `docs` cạnh `dist` khi chạy bản build.

## Chọn base URL

| Môi trường | Base URL ví dụ |
| --- | --- |
| Trình duyệt hoặc ứng dụng cùng máy với backend | `http://localhost:3000/api/v1` |
| Android Emulator chuẩn trên máy chạy backend | `http://10.0.2.2:3000/api/v1` |
| iOS Simulator trên cùng máy Mac với backend | `http://localhost:3000/api/v1` |
| Điện thoại thật hoặc simulator trên máy khác cùng mạng | `http://192.168.1.20:3000/api/v1`, thay bằng IP LAN của máy chạy backend |

Trên điện thoại thật, `localhost` trỏ vào chính điện thoại. Nếu backend chạy trên Windows còn iOS Simulator chạy trên Mac, dùng IP LAN của Windows. Kiểm tra thiết bị cùng mạng và firewall cho phép truy cập cổng backend. HTTP nội bộ có thể cần cấu hình debug của Android hoặc iOS. Dùng HTTPS cho bản phát hành.

React Native native dùng networking của thiết bị và không chịu CORS của trình duyệt. Với React Native Web hoặc ứng dụng web, đưa origin của frontend vào `CORS_ORIGINS` và khởi động lại backend. Origin gồm scheme, host và port, không có path hoặc dấu gạch chéo cuối. Browser preflight cho origin được phép nhận HTTP 204. Browser có thể đọc các header `X-Request-Id` và `Retry-After`. API không yêu cầu token hay cookie.

## Bốn endpoint

Các đường dẫn dưới đây nối tiếp base URL có sẵn `/api/v1`.

| Method và đường dẫn | Dữ liệu gửi | Thành công |
| --- | --- | --- |
| `GET /health` | Không có body | `200`, trạng thái tiến trình và timestamp UTC. Health không kiểm tra kết nối OpenAI. |
| `POST /analysis/text` | `application/json` với `{"text":"Gửi OTP"}` | `200`, kết quả phân tích. |
| `POST /analysis/images` | `multipart/form-data` với 1–5 phần `images` và `context` tùy chọn | `200`, kết quả phân tích. |
| `POST /guidance/emergency` | `application/json` với `{"scenario":"CLICKED_LINK","scam_category":"PHISHING"}` | `200`, hướng dẫn tiếng Việt cố định theo tình huống. `scam_category` có thể bỏ. |

Text được trim rồi kiểm tra độ dài 1–5000 ký tự. Gửi JSON UTF-8 và chỉ gửi trường được khai báo. Hướng dẫn chấp nhận `NOT_INTERACTED`, `CLICKED_LINK`, `SHARED_CREDENTIALS`, `SHARED_OTP`, `TRANSFERRED_MONEY` và `INSTALLED_APP`.

### Ví dụ gửi request từ React Native

```js
const API_BASE = 'http://10.0.2.2:3000/api/v1'; // Android Emulator trên máy backend

async function callApi(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch(API_BASE + path, {
      ...options,
      signal: controller.signal,
    });
    return {
      ok: response.ok,
      status: response.status,
      requestId: response.headers.get('X-Request-Id'),
      data: await response.json(),
    };
  } finally {
    clearTimeout(timer);
  }
}

const health = await callApi('/health');
const text = await callApi('/analysis/text', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'Gửi OTP' }),
});
const guidance = await callApi('/guidance/emergency', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ scenario: 'CLICKED_LINK', scam_category: 'PHISHING' }),
});

// screenshots được xếp từ cũ tới mới, mỗi phần có uri, name và type.
const form = new FormData();
for (const { uri, name, type } of screenshots) {
  form.append('images', { uri, name, type });
}
form.append('context', 'Nội dung trò chuyện gần đây'); // có thể bỏ

const images = await callApi('/analysis/images', { method: 'POST', body: form });
```

Trên web, append mỗi đối tượng `File` từ input vào cùng key `images`. Không gửi mảng JSON, `images[]` hoặc base64. Để fetch tự đặt `Content-Type` và boundary. Giới hạn là **5 MiB/ảnh và 20 MiB tổng dữ liệu ảnh**. Context tối đa 1000 ký tự. Backend kiểm tra byte thực và chỉ nhận JPEG, PNG, WebP. Giới hạn bảo vệ bộ giải mã là 16 triệu pixel mỗi file, tính cả các frame. Bằng chứng ảnh có `image_index` bắt đầu từ 0 theo thứ tự gửi. Bằng chứng text có `image_index: null`.

### Ví dụ response thành công

Health:

```json
{"status":"ok","service":"scamshield-backend","timestamp":"2026-11-10T08:00:00.000Z"}
```

Text với `{"text":"Gửi OTP"}` trong mock mode:

```json
{
  "analysis_id": "ee071ff4-391b-421d-af7e-5c92ba7b2b88",
  "input_type": "TEXT",
  "risk_score": 85,
  "risk_level": "DANGER",
  "scam_category": "OTP_THEFT",
  "summary": "Tin nhắn yêu cầu cung cấp mã OTP.",
  "evidence": [{"quote":"Gửi OTP","reason":"Tin nhắn yêu cầu mã xác thực.","signal_type":"CREDENTIAL_REQUEST","image_index":null}],
  "detected_urls": [],
  "recommended_actions": ["Xác minh thông tin qua kênh chính thức trước khi thực hiện yêu cầu."],
  "speech_summary": "Không cung cấp mã OTP.",
  "analyzed_at": "2026-11-10T08:00:00.000Z"
}
```

Ảnh hợp lệ ở mock mode. UI hiển thị trạng thái thiếu thông tin riêng với kết quả `SAFE`.

```json
{
  "analysis_id": "ee071ff4-391b-421d-af7e-5c92ba7b2b88",
  "input_type": "IMAGE",
  "risk_score": null,
  "risk_level": "UNABLE_TO_ASSESS",
  "scam_category": "NONE",
  "summary": "Ảnh chưa đủ rõ hoặc chưa có đủ bằng chứng để đánh giá.",
  "evidence": [],
  "detected_urls": [],
  "recommended_actions": ["Gửi nội dung hội thoại dưới dạng văn bản."],
  "speech_summary": "Ảnh chưa đủ rõ hoặc chưa có đủ bằng chứng để đánh giá.",
  "analyzed_at": "2026-11-10T08:00:00.000Z"
}
```

Hướng dẫn khẩn cấp cho `CLICKED_LINK`. Frontend hiển thị nội dung nhận được trong `steps`.

```json
{
  "scenario": "CLICKED_LINK",
  "title": "Bạn đã truy cập đường link đáng ngờ",
  "urgency": "MEDIUM",
  "steps": [
    "Đóng trang đáng ngờ, không nhập thêm thông tin.",
    "Nếu đã cung cấp mật khẩu hoặc OTP, chọn tình huống tương ứng.",
    "Kiểm tra tài khoản qua ứng dụng hoặc website chính thức."
  ]
}
```

### Ví dụ response lỗi

```json
{
  "statusCode": 400,
  "errorCode": "INVALID_INPUT",
  "message": "Dữ liệu đầu vào không hợp lệ.",
  "requestId": "550e8400-e29b-41d4-a716-446655440003",
  "timestamp": "2026-11-10T08:00:00.000Z"
}
```

| Trường hợp | Xử lý |
| --- | --- |
| JSON sai, sai media type, thiếu ảnh, hơn 5 ảnh hoặc scenario sai | `400 INVALID_INPUT` theo hành vi backend hiện tại. |
| Ảnh lỗi hoặc định dạng ảnh không hỗ trợ | `400 INVALID_IMAGE` hoặc `400 UNSUPPORTED_IMAGE_FORMAT`. |
| Ảnh hoặc tổng dữ liệu ảnh vượt giới hạn | `413 IMAGE_TOO_LARGE`. |
| Rate limit | `429 RATE_LIMIT_EXCEEDED`. Đọc `Retry-After` nếu có. |
| Phản hồi AI sai, lỗi provider hoặc provider tạm thời không khả dụng | `502 AI_INVALID_RESPONSE`, `502 AI_PROVIDER_ERROR` hoặc `503 AI_PROVIDER_ERROR`. |
| OpenAI vượt thời hạn | `504 AI_TIMEOUT`. |
| Lỗi nội bộ | `500 INTERNAL_ERROR`. |

Dùng `errorCode` để quyết định hành vi và dùng `requestId` để đối chiếu log. Kiểm tra `response.ok` vì fetch vẫn resolve với HTTP 4xx và 5xx. Lỗi mạng, client tự hủy và lỗi proxy có thể không có JSON theo mẫu. Timeout frontend khuyến nghị **60 giây**, còn **45 giây** là hạn cho upstream OpenAI. Thời gian upload và xử lý ảnh nằm ngoài hạn upstream.

## Chuyển sang OpenAI khi có key

Đặt `MOCK_AI=false`, thêm `OPENAI_API_KEY` và `OPENAI_MODEL` vào `.env` của backend rồi khởi động lại. Chọn model mà project được phép dùng và có Responses API, image input và Structured Outputs. Key chỉ nằm ở backend. Khi thiếu key hoặc model, backend dừng khởi động. Khi provider lỗi, backend trả lỗi API. Mock vẫn phù hợp để tích hợp giao diện và xử lý lỗi. Chất lượng đọc ảnh, xác thực và độ trễ thật chưa được xác minh.

## Các lỗi tích hợp thường gặp

- Nối `/api/v1` hai lần hoặc dùng `10.0.2.2` trong browser trên máy phát triển.
- Tự đặt multipart boundary hoặc gửi nhiều ảnh dưới key `images[]`.
- Dùng kích thước base64 thay vì số byte file để tính giới hạn upload.
- Hiển thị `risk_score: null` thành 0 hoặc diễn giải điểm như xác suất lừa đảo.
- Sử dụng CORS để chẩn đoán lỗi kết nối native. Với native, kiểm tra hostname, port, mạng LAN và cấu hình HTTP debug trước.

