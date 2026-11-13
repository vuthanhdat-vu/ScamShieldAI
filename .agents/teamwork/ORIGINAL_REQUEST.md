# Original User Request

## Initial Request — 2026-11-13T15:46:35Z

Triển khai pipeline phân tích và phát hiện lừa đảo từ hình ảnh cho sản phẩm thực tế: nhận đầu vào là ảnh, sử dụng model PaddleOCR_v4_det để xác định vùng bóng chat và Tesseract để chuyển thành văn bản tiếng Việt, đưa qua preprocessing và reasoning harness sử dụng Cloud LLM API theo cấu hình sẵn có của BE_codex, tích hợp vào NestJS backend và tuân thủ tuyệt đối đặc tả OpenAPI v1.2.

Working directory: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI
Integrity mode: development

Reference material:
- Kiến trúc & Đặc tả API: BE_codex/docs/ScamShield_AI_OpenAPI_v1.2.yaml, BE_codex/docs/CONTRACT_DECISIONS.md, BE_codex/docs/FRONTEND_INTEGRATION.md, FE_codex/src/lib/api/contracts.ts
- Tài liệu thiết kế xử lý: docs/PREPROCESSING_DESIGN.md, docs/REASONING_HARNESS_DESIGN.md
- Dữ liệu kiểm thử: data/images/, data/metadata.json

## Requirements

### R1. Rà soát cấu trúc BE_codex và tuân thủ đặc tả hợp đồng API
Đọc kỹ toàn bộ thư mục BE_codex trước khi cài đặt mã nguồn để tránh xung đột cấu trúc hoặc phá vỡ các thành phần hiện có. Tích hợp pipeline vào backend NestJS của BE_codex sao cho toàn bộ luồng xử lý và kết quả đầu ra tuân thủ tuyệt đối đặc tả API giữa BE và FE theo BE_codex/docs/ScamShield_AI_OpenAPI_v1.2.yaml và FE_codex/src/lib/api/contracts.ts.

### R2. Xây dựng pipeline xử lý ảnh OCR (PaddleOCR_v4_det + Tesseract)
Nhận đầu vào là ảnh chụp màn hình hội thoại/tin nhắn, sử dụng model PaddleOCR_v4_det để phát hiện vùng các bong bóng chat và sử dụng Tesseract để nhận dạng chuyển đổi thành văn bản tiếng Việt.

### R3. Tiền xử lý và suy luận phát hiện lừa đảo (Preprocessing + Reasoning Harness)
Xử lý văn bản trích xuất từ OCR qua các bước tiền xử lý và suy luận theo tài liệu thiết kế tại docs/PREPROCESSING_DESIGN.md và docs/REASONING_HARNESS_DESIGN.md. Sử dụng Cloud LLM API từ cấu hình và biến môi trường hiện có trong BE_codex (.env) để phân tích dấu hiệu lừa đảo và cấu trúc hóa kết quả (không sử dụng model local/pretrain tự host).

### R4. Kiểm thử tích hợp tự động với tập dữ liệu kiểm thử
Xây dựng kịch bản kiểm thử tích hợp tự động (integration tests) thực thi toàn bộ pipeline (PaddleOCR detection -> Tesseract recognition -> Preprocessing -> LLM Reasoning) với các ca ảnh mẫu từ data/images/ và đối chiếu metadata từ data/metadata.json, đảm bảo phản hồi trả về hợp lệ và khớp 100% với schema OpenAPI v1.2.

## Acceptance Criteria

### API Contract & Architecture Integrity
- [ ] Thư mục BE_codex được khảo sát đầy đủ trước khi thêm mã nguồn; mã mới tích hợp vào cấu trúc NestJS hiện có mà không gây xung đột cấu trúc, không làm hỏng build hoặc các endpoint đã có.
- [ ] Schema request/response của endpoint nhận ảnh và trả về kết quả phân tích tuân thủ đầy đủ đặc tả OpenAPI v1.2 (BE_codex/docs/ScamShield_AI_OpenAPI_v1.2.yaml) và hợp đồng frontend (FE_codex/src/lib/api/contracts.ts).

### OCR & Reasoning Execution
- [ ] Pipeline nhận ảnh đầu vào từ data/images/, khoanh vùng chính xác các bong bóng chat bằng PaddleOCR_v4_det.
- [ ] Tesseract nhận dạng và trích xuất thành công nội dung văn bản tiếng Việt từ các vùng bong bóng chat đã phát hiện.
- [ ] Văn bản được đưa qua preprocessing và reasoning harness theo đúng thiết kế tại docs/PREPROCESSING_DESIGN.md và docs/REASONING_HARNESS_DESIGN.md.
- [ ] Module suy luận gọi thành công Cloud LLM API thông qua cấu hình môi trường của BE_codex, trích xuất kết quả đánh giá nguy cơ lừa đảo không lỗi.

### Verification
- [ ] Bộ kiểm thử tích hợp tự động chạy thành công qua các ca ảnh mẫu trong data/images/ kèm dữ liệu đối chiếu trong data/metadata.json.
- [ ] Toàn bộ payload trả về từ bài test tích hợp vượt qua validation đối chiếu với schema OpenAPI v1.2 mà không có lỗi schema hay thiếu trường dữ liệu bắt buộc.
