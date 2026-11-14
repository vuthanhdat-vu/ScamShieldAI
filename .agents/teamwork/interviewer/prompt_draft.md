Hoàn thiện dự án ScamShield AI bằng cách thực hiện Milestone 3 (Reasoning Harness & NestJS Integration) và Milestone 4: ghép nối OCR Engine (BE_codex/src/ocr/) và Preprocessing Module (BE_codex/src/preprocessing/) vào NestJS AnalysisService/AnalysisModule, tích hợp 4-stage CoT reasoning với Cloud LLM API theo cấu hình sẵn có của BE_codex, hoàn thiện kiểm thử tích hợp Milestone 4 và đảm bảo 100% tuân thủ đặc tả OpenAPI v1.2.

Integrity mode: development

## Verification Resources
- Đặc tả OpenAPI v1.2 có sẵn trong dự án `BE_codex`.
- Cấu hình kết nối Cloud LLM API và các module hiện có trong thư mục `BE_codex`.

## Requirements

### R1. Ghép nối OCR Engine và Preprocessing Module vào NestJS
Tích hợp OCR Engine (`BE_codex/src/ocr/`) và Preprocessing Module (`BE_codex/src/preprocessing/`) vào NestJS `AnalysisService` và `AnalysisModule` để phục vụ phân tích dữ liệu đầu vào (hình ảnh, văn bản) của ScamShield AI.

### R2. Tích hợp quy trình 4-stage CoT Reasoning
Kết nối và vận hành quy trình 4-stage Chain-of-Thought (CoT) reasoning với Cloud LLM API theo cấu hình sẵn có của `BE_codex` trong luồng xử lý phân tích nguy cơ lừa đảo.

### R3. Tuân thủ 100% đặc tả OpenAPI v1.2
Các API endpoints, request schemas, response models và mã trạng thái HTTP trong hệ thống phải tuân thủ chính xác 100% theo đặc tả OpenAPI v1.2 của dự án.

### R4. Hoàn thiện kiểm thử tích hợp Milestone 4
Xây dựng và hoàn thiện bộ kiểm thử tích hợp Milestone 4 bao phủ toàn bộ pipeline từ input, tiền xử lý, OCR, CoT reasoning đến API response. Trong automated integration tests, sử dụng mock/stub cho các lệnh gọi LLM để đảm bảo tính ổn định và độc lập với mạng bên ngoài, đồng thời giữ nguyên khả năng gọi Cloud LLM API thực tế khi chạy môi trường thực tế.

## Acceptance Criteria

### Module Integration
- [ ] OCR Engine (`BE_codex/src/ocr/`) và Preprocessing Module (`BE_codex/src/preprocessing/`) được import và gọi thành công trong NestJS `AnalysisService`/`AnalysisModule`.
- [ ] Quy trình 4-stage CoT reasoning thực thi qua Cloud LLM API theo cấu hình sẵn có trong BE_codex và trả về kết quả phân tích theo đúng cấu trúc dữ liệu.

### OpenAPI v1.2 Compliance
- [ ] Toàn bộ các endpoints phân tích và dữ liệu phản hồi khớp chính xác 100% với đặc tả OpenAPI v1.2.

### Testing & Verification
- [ ] Bộ kiểm thử tích hợp Milestone 4 thực thi tự động (sử dụng mock/stub cho Cloud LLM API) và pass 100% các bài kiểm tra.
- [ ] Cấu hình gọi Cloud LLM API thực tế được tích hợp đầy đủ và sẵn sàng kích hoạt trong môi trường chạy thực tế.