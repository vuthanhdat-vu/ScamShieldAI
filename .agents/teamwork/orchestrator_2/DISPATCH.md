# Dispatch History

## 2026-11-12T10:03:38Z
Rà soát các thay đổi trong tập dữ liệu tinh gọn tại `data_demo/` và cập nhật tối ưu hai tài liệu thiết kế `docs/PREPROCESSING_DESIGN.md` và `docs/REASONING_HARNESS_DESIGN.md` phù hợp với cấu trúc dữ liệu mới, ràng buộc phần cứng (Intel Core i5, NVIDIA GeForce RTX 4050 6GB VRAM) và kiến trúc microservice (NestJS Gateway + FastAPI AI Service).

Working directory: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI
Integrity mode: development

## Requirements

### R1. Rà soát cấu trúc dữ liệu mới
Khảo sát chi tiết cấu trúc, trường dữ liệu và đặc tính của các tệp dữ liệu đã tinh gọn trong `data_demo/` gồm:
- `conservations.json`: Đoạn hội thoại đa lượt có các trường `id`, `dialogue` (`role`, `content`).
- `dataset_url_sampled.csv`: Nhãn `label` (`phishing` hoặc `benign`) và đường dẫn `url_norm`.
- `Scam.csv`: Tin nhắn văn bản lừa đảo đơn lẻ (không phải hội thoại).
- `No_scam.csv`: Tin nhắn văn bản dịch vụ/quảng cáo hợp lệ không phải lừa đảo (không phải hội thoại).
- `DEDUPLICATION_REPORT.md`: Báo cáo làm sạch dữ liệu và loại bỏ trùng lặp.
- Thư mục `images/`: 50 ca kiểm thử ảnh chụp màn hình đa nền tảng kèm siêu dữ liệu.

### R2. Cập nhật thiết kế tiền xử lý (docs/PREPROCESSING_DESIGN.md)
Cập nhật tài liệu `docs/PREPROCESSING_DESIGN.md` để đặc tả toàn diện quy trình tiền xử lý dữ liệu cho 4 tệp dữ liệu văn bản/URL và dữ liệu hình ảnh, bao gồm:
- Quy chuẩn hóa schema đầu vào và cấu trúc chuẩn hóa cho từng loại dữ liệu (hội thoại đa lượt, tin nhắn đơn, URL, ảnh chụp màn hình).
- Cơ chế làm sạch, chuẩn hóa văn bản tiếng Việt và URL.
- Phương án trích xuất đặc trưng và embedding tương thích với kiến trúc microservice.

### R3. Cập nhật thiết kế khung suy luận và đánh giá (docs/REASONING_HARNESS_DESIGN.md)
Cập nhật tài liệu `docs/REASONING_HARNESS_DESIGN.md` để thiết kế chi tiết quy trình kiểm thử suy luận (reasoning harness) và đánh giá mô hình, đảm bảo:
- Tối ưu hóa chặt chẽ cho cấu hình phần cứng mục tiêu: CPU Intel Core i5 và GPU NVIDIA GeForce RTX 4050 (ngân sách 6GB VRAM), bao gồm chiến lược phân bổ bộ nhớ (VRAM budget table), kích thước batch và kỹ thuật nạp mô hình.
- Phù hợp với kiến trúc microservice song song: NestJS BE_codex đóng vai trò API Gateway và Python FastAPI Service đóng vai trò AI Reasoning Engine.
- Thiết kế các kịch bản kiểm thử (test harness suites) bao phủ cả 4 nguồn dữ liệu văn bản và tập ảnh kiểm thử đa nền tảng.
- Thiết lập bộ chỉ số đo lường hiệu năng và độ chính xác (latency, VRAM consumption, precision/recall cho từng kịch bản lừa đảo).

## Acceptance Criteria

### Phản ánh đầy đủ cấu trúc dữ liệu nguồn
- [ ] Tài liệu `docs/PREPROCESSING_DESIGN.md` đặc tả schema chi tiết và luồng tiền xử lý tương ứng cho từng tệp dữ liệu trong `data_demo/` (`conservations.json`, `dataset_url_sampled.csv`, `Scam.csv`, `No_scam.csv`) và thư mục `images/`.
- [ ] Quy trình tiền xử lý phân tách rõ ràng luồng xử lý hội thoại (`conservations.json`) với luồng xử lý tin nhắn đơn lẻ (`Scam.csv`, `No_scam.csv`) và luồng kiểm tra URL (`dataset_url_sampled.csv`).

### Tương thích kiến trúc và ràng buộc phần cứng
- [ ] Tài liệu `docs/REASONING_HARNESS_DESIGN.md` phân ranh giới trách nhiệm rõ ràng giữa NestJS API Gateway và Python FastAPI AI Reasoning Service.
- [ ] Tài liệu `docs/REASONING_HARNESS_DESIGN.md` có bảng phân bổ bộ nhớ chi tiết (VRAM budget table) chứng minh mô hình và quy trình kiểm thử vận hành ổn định trong giới hạn 6GB VRAM của RTX 4050.
- [ ] Quy trình harness bao gồm các ca kiểm thử và chỉ số đánh giá cụ thể cho từng loại dữ liệu (hội thoại, tin nhắn lừa đảo đơn, tin nhắn an toàn, URL độc hại, và ảnh chụp màn hình).

### Tính toàn vẹn và phạm vi bàn giao
- [ ] Cả hai tệp `docs/PREPROCESSING_DESIGN.md` và `docs/REASONING_HARNESS_DESIGN.md` được cập nhật đồng bộ, không mâu thuẫn lẫn nhau về schema dữ liệu và kiến trúc hệ thống.
- [ ] Các tệp dữ liệu nguồn trong `data_demo/` không bị thay đổi hoặc sửa đổi nội dung.
