# Thiết kế Risk Engine Phase 4

Đây là tài liệu kỹ thuật nội bộ. [OpenAPI v1.2](ScamShield_AI_OpenAPI_v1.2.yaml), [đặc tả v1.2](ScamShield_AI_API_Spec_v1.2.docx) và [các quyết định hợp đồng](CONTRACT_DECISIONS.md) quy định giao diện và hành vi công khai.

## Luồng xử lý

DTO và kiểm tra file → provider Mock hoặc OpenAI → kết quả AI nội bộ → kiểm tra bằng chứng → phân tích URL → Risk Engine → chọn danh mục → ánh xạ AnalysisResponse.

Cả hai provider dùng cùng luồng sau bước AI. OpenAI vẫn dùng schema nội bộ của Phase 3. Điểm, mức rủi ro và danh mục công khai do backend quyết định. Backend tạo UUID và timestamp cho mỗi response. Hai metadata này thay đổi giữa các lần gọi, còn quyết định rủi ro cố định với cùng đầu vào và kết quả AI nội bộ.

## Chính sách chấm điểm

Điểm thể hiện mức độ nghiêm trọng theo heuristic. Các trọng số là giả định MVP cần kiểm định bằng dữ liệu, không phải xác suất lừa đảo.

| Tín hiệu đã được chấp nhận | Điểm cơ sở |
| --- | ---: |
| `CREDENTIAL_REQUEST` | 85 |
| `MONEY_REQUEST` | 55 |
| `IMPERSONATION` | 50 |
| `THREAT` | 50 |
| `URGENCY` | 45 |
| `TOO_GOOD_TO_BE_TRUE` | 45 |
| `OTHER` | 15 |
| URL có `IP_HOST`, `USERINFO_AT` hoặc `MISLEADING_SUBDOMAIN` | 45 |
| URL chỉ có một hoặc nhiều chỉ báo cấu trúc còn lại | 25 |
| Nội dung đủ để đánh giá, không có tín hiệu | 0 |

Điểm cơ sở là **giá trị lớn nhất** trong các tín hiệu và URL được chấp nhận. Nhãn `SUSPICIOUS_URL` từ AI không có điểm riêng. Chỉ báo URL đến từ phân tích cục bộ.

Cộng **20 điểm tối đa một lần** khi có yêu cầu thông tin xác thực hoặc chuyển tiền và có thêm ít nhất một hành vi giả danh, đe dọa, hứa thưởng hoặc URL thuộc nhóm 45 điểm. Áp lực thời gian cũng kích hoạt điểm cộng nếu đi kèm yêu cầu thông tin xác thực. Chuyển tiền chỉ kèm áp lực thời gian vẫn ở 55. Các hành vi có thể xuất hiện cùng một câu nhưng mỗi nhãn phải có dấu hiệu tương ứng trong trích dẫn. Thêm nhiều bằng chứng cùng nhãn hoặc nhiều URL không làm tăng điểm cơ sở hay số lần cộng. Ví dụ OTP và thúc ép là 100 sau khi giới hạn, chuyển tiền và đe dọa là 75, còn nhiều URL rút gọn chỉ đạt 25.

Giới hạn điểm số trong 0–100. Ánh xạ 0–39 thành `SAFE`, 40–74 thành `SUSPICIOUS` và 75–100 thành `DANGER`. `SAFE` nghĩa là điểm dưới ngưỡng cảnh báo theo luật hiện tại. Nó không xác minh nội dung hoặc đường dẫn là an toàn.

Trả `UNABLE_TO_ASSESS` với điểm `null` khi provider báo thiếu dữ liệu, hoặc khi toàn bộ bằng chứng được đề xuất bị loại và không có chỉ báo URL độc lập. Một tin nhắn đủ thông tin nhưng không có dấu hiệu có thể nhận 0. Lỗi provider, lỗi schema và timeout giữ mã lỗi theo hợp đồng.

## Kiểm tra bằng chứng

- Kiểm tra trích dẫn, lý do, enum và chỉ số ảnh. Bỏ chuỗi trống. Trích dẫn văn bản phải xuất hiện trong văn bản gốc sau chuẩn hóa NFC và gộp khoảng trắng. Chỉ số của văn bản phải là `null`. Không dùng so khớp gần đúng. Giữ nguyên trích dẫn được chấp nhận khi trả API.
- Với văn bản, kiểm tra cả trích dẫn và câu chứa nó. Kiểm tra các dấu hiệu yêu cầu hành động, tự xưng đại diện, đe dọa, thúc ép hoặc hứa thưởng. Một số mẫu phủ định, cảnh báo, ví dụ và thanh toán thông thường loại bỏ tín hiệu. Nếu cùng trích dẫn xuất hiện ở cả lời cảnh báo và yêu cầu, ưu tiên loại bỏ để tránh chấm sai.
- Với ảnh, cần có trích dẫn do model báo cáo và chỉ số nguyên từ 0 tới số ảnh trừ 1. YAML cho phép `null` ở schema dùng chung. DOCX §7.1 yêu cầu bỏ bằng chứng ảnh nếu không xác định được ảnh nguồn, nên backend áp dụng quy tắc đó. Kiểm tra chỉ số và nội dung trích dẫn không xác minh văn bản trực tiếp với pixel.
- Loại bản trùng theo chỉ số ảnh, loại tín hiệu và trích dẫn đã chuẩn hóa. Giữ thứ tự xuất hiện đầu tiên, cũng như quan sát ở ảnh khác hoặc mang tín hiệu khác. Các quan sát bị loại không tham gia chấm điểm. Lý do, tóm tắt và lời đọc công khai dùng nội dung tiếng Việt của backend để tránh lặp lại khẳng định chưa được kiểm chứng từ AI.

## URL và danh mục

Backend tìm URL HTTP(S) trong văn bản gốc hoặc trích dẫn ảnh đã được chấp nhận. Context ảnh không được dùng làm nguồn URL. URL được phân tích cục bộ bằng bộ phân tích URL của Node. Không truy cập URL, theo redirect, tra DNS hay gọi dịch vụ danh tiếng. `is_verified_malicious` luôn là `false`.

Khi loại trùng, chỉ gộp khác biệt hoa thường của scheme và host. Giữ bản xuất hiện đầu tiên và phân biệt path, query, fragment, cách percent-encode và userinfo. Bộ tách bỏ dấu câu sau hostname đứng riêng hoặc cặp dấu bao ngoài nhận diện được. Giữ nguyên phần sau hostname trong các trường hợp khác để tránh biến đổi đường dẫn. URL rút gọn được nhận diện theo danh sách `bit.ly`, `t.co`, `tinyurl.com`, `is.gd` và `ow.ly`. URL dài có hơn 150 ký tự. Phát hiện tên thương hiệu ở subdomain dùng danh sách nhỏ và một số hậu tố ghép phổ biến. Đây không phải xác minh quyền sở hữu hoặc danh sách hậu tố công cộng đầy đủ.

Danh mục được chọn riêng và không cộng điểm. Giữ đề xuất OTP nếu bằng chứng có yêu cầu mã OTP hoặc mã xác thực. Giữ đề xuất giả danh ngân hàng hoặc cơ quan khi có lời tự xưng phù hợp và hành vi đi kèm. Danh mục tuyển dụng hoặc giao hàng cần chủ đề tương ứng và yêu cầu xác thực hoặc chuyển tiền có dấu hiệu hỗ trợ. Các trường hợp còn lại ưu tiên phishing khi có yêu cầu xác thực kèm chỉ báo URL hoặc yêu cầu mở liên kết, sau đó xét OTP và gian lận tài chính. Chuyển tiền thông thường hoặc URL đứng riêng không đủ để gán danh mục. Dùng `NONE` khi thiếu căn cứ.

## Giới hạn và xác minh

Mock chạy không cần API key, dùng mẫu câu hạn chế và trả `UNABLE_TO_ASSESS` cho ảnh hợp lệ. Real mode cần key và model, sử dụng cùng pipeline và trả lỗi upstream nếu provider lỗi. Các ca Phase 4 giả lập SDK hoặc transport, không gọi OpenAI thật.

Thông báo có thúc ép hợp lệ hoặc website có cấu trúc hiếm có thể tạo dương tính giả. Cách viết biến thể, nhiều câu mang ngữ cảnh hỗn hợp, link không có scheme, thương hiệu ngoài danh sách và nội dung ảnh do model đọc sai có thể tạo âm tính giả. Chưa có OCR độc lập, tra cứu URL hay đo chất lượng trên dữ liệu thực. Cần kiểm chứng trên OpenAI thật về chất lượng nhận diện ngữ cảnh tiếng Việt, độ chính xác của trích dẫn ảnh, mức phù hợp của ngưỡng điểm và khả năng chịu prompt injection.

