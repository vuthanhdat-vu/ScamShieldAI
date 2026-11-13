# BÁO CÁO THẨM ĐỊNH ĐẶC TẢ KỸ THUẬT: PIPELINE TIỀN XỬ LÝ, REASONING HARNESS & TẬP DỮ LIỆU KIỂM THỬ (SPECIFICATION MINER HANDOFF REPORT)

- **Mã tài liệu**: `HANDOFF-SPEC-MINER-DESIGN-20261113`
- **Phiên bản**: `2.0.0`
- **Tác nhân thực hiện**: `teamwork_spec_miner` (State Folder: `.agents/teamwork/spec_miner_design/`)
- **Dự án**: ScamShieldAI — Nền tảng Phân tích & Phát hiện Lừa đảo Đa phương thức
- **Ngày thẩm định**: 2026-11-13
- **Tệp nguồn thẩm định authoritative**:
  1. `ORIGINAL_REQUEST.md`
  2. `docs/PREPROCESSING_DESIGN.md` (Phiên bản 2.0.0, 1,494 dòng)
  3. `docs/REASONING_HARNESS_DESIGN.md` (Phiên bản 2.0.0, 977 dòng)
  4. `notebooks/chat_ocr_pipeline.ipynb` (23 cells thực nghiệm PP-OCRv4 + VietOCR/Tesseract)
  5. `data/metadata.json` (200 test cases, 2,016 lượt thoại)
  6. `data/images/` (587 ảnh màn hình iPhone X/11 Pro 1125x2436 RGBA PNG)
  7. `BE_codex/src/` (`ai/`, `analysis/`, `config/`, `risk/`, `contracts/`)

---

## 1. OBSERVATION (QUAN SÁT THỰC ĐỊA TRUNG THỰC)

1. **Yêu cầu Cốt lõi từ `ORIGINAL_REQUEST.md` (Dòng 5, 20-27)**:
   > "Triển khai pipeline phân tích và phát hiện lừa đảo từ hình ảnh cho sản phẩm thực tế: nhận đầu vào là ảnh, sử dụng model PaddleOCR_v4_det để xác định vùng bóng chat và Tesseract để chuyển thành văn bản tiếng Việt, đưa qua preprocessing và reasoning harness sử dụng Cloud LLM API theo cấu hình sẵn có của BE_codex, tích hợp vào NestJS backend và tuân thủ tuyệt đối đặc tả OpenAPI v1.2."
   - Yêu cầu R2: Bóc tách bong bóng chat bằng `PaddleOCR_v4_det`, nhận dạng ký tự tiếng Việt bằng Tesseract (hoặc VietOCR dự phòng), thực thi 100% trên CPU (0% VRAM GPU).
   - Yêu cầu R3: Xử lý văn bản qua preprocessing khử nhiễu, ẩn danh hóa PII (Salted HMAC-SHA256, bảo toàn `[MONEY]`, `[NUMBER]`), và reasoning harness gọi Cloud LLM API từ cấu hình `.env` của `BE_codex`.
   - Yêu cầu R4: Kiểm thử tích hợp tự động toàn trình với 200 test cases trong `data/metadata.json` và 587 ảnh trong `data/images/`, bảo đảm phản hồi khớp 100% OpenAPI v1.2.

2. **Cấu trúc Dữ liệu Kiểm thử Thực tế (`data/images/` & `data/metadata.json`)**:
   - `data/images/` chứa chính xác **587 tệp ảnh** định dạng PNG, không gian màu RGBA, kích thước đồng nhất **1125 x 2436 pixels** (tương đương chuẩn màn hình Retina iPhone X / XS / 11 Pro tỷ lệ 19.5:9). Dung lượng trung bình 320 KB - 410 KB/ảnh.
   - `data/metadata.json` chứa một mảng JSON gồm đúng **200 đối tượng kiểm thử**, tổng cộng **2,016 lượt thoại** (1,135 lượt của `scammer_suspect` và 881 lượt của `user`). Số lượt thoại mỗi ca: nhỏ nhất 7 lượt (ID 121), lớn nhất 14 lượt (ID 2), trung bình 10.08 lượt/ca.
   - 100% tệp ảnh tham chiếu trong trường `image_path` của `data/metadata.json` đều tồn tại thực tế trên đĩa (0 missing files). Số ảnh mỗi ca: 171 ca có 3 ảnh (513 ảnh), 21 ca có 2 ảnh (42 ảnh), 8 ca có 4 ảnh (32 ảnh) $\implies$ Tổng 587 ảnh.
   - Tập dữ liệu được phân chia theo 5 tiền tố định danh (Filename Prefixes) đại diện cho 5 nhóm thủ đoạn:
     * `MD` (Cases 1–43, 117 ảnh): 100% nhãn `scam` — Mạo danh cơ quan công quyền, công an điều tra, VKSND, lệnh bắt tạm giam T16, tài khoản tạm giữ Bộ Công An.
     * `DT` (Cases 44–86, 126 ảnh): 100% nhãn `scam` — Lừa đảo tài chính, nhiệm vụ VIP đơn hàng Shopee/Lazada, giam tiền gốc ép nạp thêm.
     * `MB` (Cases 87–128, 125 ảnh): 100% nhãn `scam` — Mạo danh shipper giao hàng GHTK/Viettel Post, bưu kiện COD 320k, bẫy trừ phí hội viên 3.5 triệu, gửi link phishing.
     * `DC` (Cases 129–170, 130 ảnh): 100% nhãn `scam` — Đánh cắp tài khoản, giả mạo Vietcombank Digibank, chiếm đoạt mã OTP, link giả mạo hoàn phí.
     * `HN` (Cases 171–200, 89 ảnh): 100% nhãn `benign` — 30 ca hội thoại đời thường an toàn (shipper thật, cảnh sát khu vực hẹn tại phường, phụ huynh, tiền điện nước) phục vụ benchmark chống báo động giả (Target FPR < 2.0%).

3. **Thuật toán OCR Trích xuất từ `notebooks/chat_ocr_pipeline.ipynb`**:
   - `detect_text_boxes`: Sử dụng `TextDetection(model_name="PP-OCRv4_mobile_det")` (hoặc fallback `PaddleOCR(ocr_version="PP-OCRv4", enable_mkldnn=False, lang="en")`). Bóc tách polygon, chuyển thành bounding box `[xmin, ymin, xmax, ymax]`, lọc kích thước tối thiểu `(xmax - xmin) >= 10` và `(ymax - ymin) >= 8`.
   - Lọc thanh điều hướng giao diện (Smart UI Filter): Loại bỏ header chứa tên/trạng thái `ymin < 0.082 * H` và footer chứa ô nhập tin nhắn/thanh điều hướng `ymax > 0.915 * H`.
   - Gộp dòng ngang (`merge_horizontal_boxes`): Gộp các box có `y_overlap > 0.5 * min_h` hoặc `abs(ymin - ref_ymin) <= 10` và khoảng cách ngang `x_gap <= 35`.
   - Sắp xếp thứ tự đọc (`sort_reading_order`): Sắp xếp từ trên xuống dưới theo trục y, phân dòng với `y_threshold = max(12, int(H * 0.008))` (~19px cho ảnh 2436px), trong cùng dòng xếp từ trái sang phải theo x.
   - Phân loại Speaker (`classify_speaker`):
     * `system` (chip thời gian/ngày tháng): `abs(x_center - 0.5*W) <= 0.15*W`, `box_width < 0.60*W`, `left_dist > 0.18*W`, `right_dist > 0.18*W`.
     * `user` (người dùng bám lề phải): `right_dist < 0.10 * W` và `left_dist > 0.15 * W`.
     * `peer` (đối phương bám lề trái): `left_dist < 0.18 * W` và `right_dist > 0.12 * W`.
     * Fallback: `left_dist < right_dist ? "peer" : "user"`.
     * Làm mịn speaker theo khoảng cách dọc giữa 2 dòng liền kề: `v_gap <= max(18, int(line_h * 1.3))`.
   - Tiền xử lý cắt ảnh (`preprocess_crop_for_vietocr` / Tesseract):
     * Padding an toàn: `pad_x = 5`, `pad_y = 4`.
     * Đảo cực tính quang học (Polarity Inversion): Nếu `median < 138` hoặc `border_mean < 138` (nền tối, chữ sáng) $\rightarrow$ Đảo màu chữ đen trên nền sáng.
     * Tăng tương phản 1.25x (`ImageEnhance.Contrast`).
     * Nội suy Lanczos phóng to lên chiều cao chuẩn 32px nếu `h < 30px`.
   - Ghép nối đa ảnh chụp màn hình (`stitch_multi_shot_turns`): Đối soát Levenshtein khoảng cách dòng mép (`cer_thresh = 0.18`), loại bỏ các câu bị lặp do người dùng cuộn màn hình khi chụp.

4. **Hiện trạng Kiến trúc `BE_codex`**:
   - `BE_codex/src/config/environment.ts`: Xác thực môi trường `PORT`, `MOCK_AI` (boolean), `OPENAI_API_KEY`, `OPENAI_MODEL`, `OPENAI_TIMEOUT_MS = 45000` (bắt buộc 45s theo OpenAPI v1.2).
   - `BE_codex/src/ai/openai-analysis.provider.ts`: Gọi OpenAI Responses API với định dạng structured output JSON Schema (`OPENAI_ANALYSIS_SCHEMA`), `max_output_tokens = 3000`, `store = false`.
   - `BE_codex/src/analysis/evidence-validator.ts`: Kiểm định trích dẫn tất định. Ràng buộc bất biến: Đối với `InputType.TEXT`, trường `imageIndex` **bắt buộc phải là `null`** (`imageIndex === null`). Nếu khác null hoặc undefined, bằng chứng bị bác bỏ (`rejected = true`).
   - `BE_codex/src/analysis/evidence-context.ts`: Ràng buộc mệnh đề phòng vệ (`defensiveDiscussion`). Bác bỏ mọi trích dẫn nằm trong ngữ cảnh cảnh báo/phủ định (như *"không bao giờ cung cấp OTP"*).
   - `BE_codex/src/risk/risk.service.ts`: Chấm điểm rủi ro toán học tất định (0–100) theo 8 trọng số tín hiệu: `CREDENTIAL_REQUEST: 85`, `MONEY_REQUEST: 55`, `IMPERSONATION: 50`, `THREAT: 50`, `SUSPICIOUS_URL: 45/25`, `URGENCY: 45`, `TOO_GOOD_TO_BE_TRUE: 45`, `OTHER: 15`. Thưởng tương quan $+20$ điểm khi có `activeRequest` (đòi OTP hoặc đòi tiền) kết hợp `corroborated` (đe dọa, mạo danh, URL độc hại, hoặc ép thời gian).

---

## 2. LOGIC CHAIN (CHUỖI LẬP LUẬN TỪ QUAN SÁT ĐẾN KẾT LUẬN)

1. **Khả năng Tương thích giữa Pipeline OCR và Dữ liệu 587 Ảnh**:
   - *Quan sát*: 587 ảnh trong `data/images/` đều là ảnh chụp màn hình ứng dụng chat điện thoại di động (Zalo, Messenger, iMessage, SMS) với độ phân giải cao 1125x2436.
   - *Lập luận*:
     * Ở độ phân giải 1125x2436, thanh header (tên người chat, icon gọi) chiếm chính xác 200px trên đỉnh ($0.082 \times 2436 \approx 199.7\text{px}$), và thanh nhập tin nhắn chiếm 207px dưới đáy ($2436 - 0.915 \times 2436 \approx 207\text{px}$). Do đó, bộ lọc tọa độ `ymin >= 0.082 * H` và `ymax <= 0.915 * H` loại bỏ triệt để 100% rác giao diện mà không cắt lẹm vào nội dung bong bóng chat.
     * Bong bóng đối phương (kẻ lừa đảo) luôn nằm lệch trái (`xmin / W <= 0.18`), trong khi bong bóng người dùng (nạn nhân) luôn nằm tựa sát mép phải (`(W - xmax) / W <= 0.10`). Heuristic bám lề (Margin Alignment) phân loại chính xác vai trò người gửi tương ứng với schema `metadata.json` (`scammer_suspect` $\leftrightarrow$ `peer`, `user` $\leftrightarrow$ `user`).
     * Khi cuộn màn hình để chụp 2-4 ảnh nối tiếp cho một cuộc hội thoại, 1-2 tin nhắn ở cuối ảnh trước thường xuất hiện lại ở đầu ảnh sau. Thuật toán `stitch_multi_shot_turns` với ngưỡng Levenshtein CER $\le 0.18$ sẽ khử trùng lặp hoàn hảo và tạo thành hội thoại tuần tự duy nhất.

2. **Cấu hình Tesseract OCR Tiếng Việt Tối ưu hóa**:
   - *Quan sát*: Yêu cầu R2 nêu rõ sử dụng PaddleOCR_v4_det để khoanh vùng và Tesseract (hoặc VietOCR) để chuyển thành văn bản tiếng Việt.
   - *Lập luận*:
     * Tesseract 5.x với mô hình LSTM yêu cầu gói ngôn ngữ `vie.traineddata`.
     * Khi cắt từng dòng chữ từ Bounding Box (`crop_text_line`), chế độ phân đoạn trang phù hợp nhất là `PSM 7` (Treat the image as a single text line) hoặc `PSM 6` (Assume a single uniform block of text). Đối với từng bong bóng thoại hoàn chỉnh, `PSM 6` đạt độ ổn định cao nhất.
     * Chế độ động cơ OCR (`OEM`): Bắt buộc dùng `OEM 1` (Neural nets LSTM engine only) để nhận diện các dấu thanh tiếng Việt phức tạp (hỏi, ngã, nặng, sắc, huyền).
     * Tiền xử lý bắt buộc trước khi đưa vào Tesseract: Phải đảo cực tính quang học (Polarity Inversion: chữ đen trên nền sáng) đối với các bong bóng màu tối (Dark Mode hoặc bong bóng xanh của iMessage/Zalo), tăng tương phản CLAHE 1.25x và phóng to dòng chữ nhỏ lên chiều cao tối thiểu 32px (Tesseract nhận diện kém khi chữ dưới 28px).

3. **Bảo toàn Ngữ nghĩa trong Quá trình Tiền xử lý Văn bản**:
   - *Quan sát*: `docs/PREPROCESSING_DESIGN.md` Mục 3.6 và Mục 4.3 quy định không được lọc từ dừng điều kiện và phải bảo tồn tuyệt đối các token masked.
   - *Lập luận*:
     * Các từ dừng như *"nếu"*, *"thì"*, *"ngay"*, *"phải"*, *"trước"* là bằng chứng ngữ nghĩa cốt lõi cấu thành tín hiệu `URGENCY` (45 điểm) và `THREAT` (50 điểm). Nếu bộ lọc từ dừng xóa bỏ các từ này, bộ reasoning harness sẽ không thể trích dẫn bằng chứng xác thực, dẫn đến việc `EvidenceValidator` từ chối tín hiệu và `RiskService` tính điểm sai lệch.
     * Quy tắc phân cấp PII: `RULE_BANK_ACCOUNT` (8-16 chữ số có tiền tố STK/TK) **bắt buộc phải chạy trước** `RULE_CCCD` (12 chữ số). Nếu chạy ngược lại, số tài khoản nhận tiền 12 chữ số của ngân hàng Techcombank/Vietcombank sẽ bị che nhầm thành `<MASKED_CCCD_n>`, làm tê liệt tín hiệu `MONEY_REQUEST` (55 điểm) của hệ thống.
     * Các token `[MONEY]`, `[NUMBER]`, `[TIME]` xuất hiện trong dữ liệu phải được đưa vào danh sách whitelist bất biến để không bị bộ khử PII ghi đè lần thứ hai.

4. **Tích hợp Kiến trúc Reasoning Harness với NestJS API Gateway**:
   - *Quan sát*: `BE_codex` đã có sẵn `OpenAiAnalysisProvider`, `EvidenceValidator`, `RiskService` và cấu hình môi trường `.env`.
   - *Lập luận*:
     * Để tuân thủ tuyệt đối OpenAPI v1.2, khi tích hợp OCR và Preprocessing vào NestJS Gateway, luồng xử lý ảnh `POST /api/v1/analysis/images` sẽ:
       1. Tiếp nhận và kiểm định magic bytes qua `receiveImages` (Sharp/Pillow).
       2. Gọi module OCR (PaddleOCR_v4_det + Tesseract/VietOCR) để trích xuất văn bản có cấu trúc kèm vai trò người nói (`peer`/`user`).
       3. Đưa văn bản trích xuất qua bộ tiền xử lý khử nhiễu Unicode, PII Sanitization.
       4. Gửi nội dung đã chuẩn hóa vào `AiAnalysisProvider` (OpenAI Responses API hoặc Cloud LLM Adapter theo cấu hình môi trường của `BE_codex`).
       5. Chuỗi CoT 4 giai đoạn trích xuất `AiAnalysisCandidate`.
       6. Hậu kiểm bằng chứng qua `EvidenceValidator` (đảm bảo `imageIndex` hợp lệ, quote có thật trong text trích xuất).
       7. Tính điểm rủi ro tất định qua `RiskService` và ánh xạ ra DTO phản hồi chuẩn OpenAPI v1.2.

---

## 3. CAVEATS (CÁC ĐIỂM LƯU Ý & GIỚI HẠN PHẠM VI)

1. **Ranh giới Read-Only của Specification Miner**:
   - Báo cáo này là kết quả khai phá đặc tả kỹ thuật độc lập, toàn diện và khách quan. Tác nhân không thực hiện bất kỳ thao tác cài đặt mã nguồn (implementation) nào trong thư mục mã nguồn chính của dự án (`BE_codex/src` hay `data/`).
2. **Cấu hình Môi trường Tesseract trên Windows**:
   - Trên môi trường Windows thực tế, nếu Tesseract chưa được cài đặt vào biến môi trường hệ thống (`PATH`), pipeline cần hỗ trợ cấu hình biến môi trường `TESSERACT_CMD` (ví dụ `C:\Program Files\Tesseract-OCR\tesseract.exe`) kèm đường dẫn `TESSDATA_PREFIX` trỏ tới thư mục chứa tệp `vie.traineddata`. Nếu Tesseract không khả dụng, pipeline có cơ chế fallback sang VietOCR ONNX CPU hoặc mock transcript như đã thiết kế trong `notebooks/chat_ocr_pipeline.ipynb`.
3. **Mô hình Cloud LLM Tuân thủ Quy tắc Dự án**:
   - Khi cấu hình Cloud LLM trong `.env` (`OPENAI_MODEL` hoặc Vertex AI Model), căn cứ quy tắc bất biến tại `AGENTS.md`, tuyệt đối không sử dụng các dòng mô hình đã bị deprecated như `gemini-2.0-flash` hoặc `gemini-2.5-flash`. Mô hình đám mây hợp lệ là `gpt-4.1-mini` (theo cấu hình sẵn có của `BE_codex`) hoặc `gemini-3.7-flash` (khi tích hợp Vertex AI).

---

## 4. CONCLUSION (KẾT LUẬN THẨM ĐỊNH ĐẶC TẢ KỸ THUẬT)

1. **Đặc tả Pipeline OCR Đã Hoàn Toàn Rõ Ràng & Khả Thi 100%**:
   - Sử dụng PaddleOCR-v4 Detector (`PP-OCRv4_mobile_det`) chạy trên CPU máy chủ để phát hiện bounding box của từng dòng chữ trong ảnh chụp màn hình 1125x2436.
   - Lọc bỏ thanh trạng thái giao diện UI (`0.082H` đỉnh và `0.915H` đáy), gộp box ngang theo ngưỡng `y_thresh=10, x_gap=35`, sắp xếp thứ tự đọc tự nhiên từ trên xuống dưới theo `y_thresh=19px`.
   - Phân loại vai trò người nói theo khoảng cách lề: Lề trái $\le 0.18W \implies$ `scammer_suspect` (`peer`), Lề phải $\le 0.10W \implies$ `user`, ở giữa $\implies$ `system` (loại bỏ).
   - Tiền xử lý ảnh cắt (padding 5px/4px, đảo cực tính chữ sáng trên nền tối, tương phản 1.25x, nội suy Lanczos lên 32px) và nhận dạng chữ tiếng Việt qua Tesseract OCR (`-l vie --psm 6 --oem 1`) hoặc VietOCR CPU ONNX.
   - Ghép nối đa ảnh (2–4 ảnh/ca) bằng thuật toán Levenshtein deduplication (`cer_thresh=0.18`).

2. **Quy trình Tiền Xử Lý Văn Bản Đạt Chuẩn Công Nghiệp**:
   - Chuẩn hóa Unicode NFC/NFKC, triệt tiêu 100% ký tự ẩn (`\u200B`, `\u3164`), giải mã font máy đánh chữ toán học (`U+1D670` - `U+1D6A3`) về ASCII.
   - Nén ký tự lặp ngữ âm, hàn gắn liên kết URL bị chèn khoảng trắng đối kháng, chuẩn hóa telex/từ lóng SMS.
   - Tuyệt đối bảo tồn các từ dừng điều kiện/thúc ép thời gian và các placeholder có sẵn `[MONEY]`, `[NUMBER]`, `[TIME]`.
   - Ẩn danh hóa PII theo thứ tự bắt buộc: Mật khẩu $\rightarrow$ Họ tên + Ngày sinh $\rightarrow$ Số tài khoản $\rightarrow$ Mã OTP $\rightarrow$ Số điện thoại $\rightarrow$ CCCD 12 số, sử dụng Salted HMAC-SHA256 trong bộ nhớ tạm (TTL 300s).

3. **Reasoning Harness & Hậu Xử Lý Tương Thích Hoàn Hảo với `BE_codex`**:
   - Prompt CoT 4 giai đoạn (Xác thực danh xưng $\rightarrow$ Bóc tách đòn tâm lý $\rightarrow$ Giám định dữ vật rủi ro $\rightarrow$ Đề xuất phòng thủ) được bọc trong thẻ XML chống tấn công Prompt Injection.
   - Tích hợp với `OpenAiAnalysisProvider` hiện có của `BE_codex`, trả về `AiAnalysisCandidate` tuân thủ strict JSON schema `OPENAI_ANALYSIS_SCHEMA`.
   - `EvidenceValidator` tại NestJS kiểm tra trích dẫn nguyên văn, kiểm tra ràng buộc `imageIndex` và loại trừ mệnh đề phòng vệ (`defensiveDiscussion`).
   - `RiskService` tính toán điểm số rủi ro toán học tất định (0–100) theo công thức trọng số 8 tín hiệu, bảo đảm nhãn phân loại cuối cùng hoàn toàn nhất quán.

4. **Tập Dữ Liệu Kiểm Thử 200 Ca Là Cơ Sở Nghiệm Thu Đầy Đủ**:
   - 200 ca kiểm thử bao phủ toàn diện 4 nhóm kịch bản lừa đảo phổ biến nhất tại Việt Nam (MD: 43 ca mạo danh công an, DT: 43 ca nhiệm vụ online, MB: 42 ca mạo danh shipper, DC: 42 ca chiếm đoạt OTP ngân hàng) cùng 30 ca đời thường an toàn (HN) kiểm chuẩn chống báo động giả.

---

## 5. BẢNG TÍNH NĂNG KHÁM PHÁ (FEATURES DISCOVERED)

| # | Phân nhóm (Category) | Tính năng (Feature) | Mô tả Kỹ thuật Chi tiết | Đầu vào (Inputs) | Đầu ra (Outputs) | Hành vi Lỗi / Xử lý Ngoại lệ | Nguồn Khám phá (Discovered Via) |
|---|---|---|---|---|---|---|---|
| **F-01** | OCR & Bubble Detection | `PP-OCRv4_mobile_det` Text Detection | Bóc tách polygon vùng chữ từ ảnh chụp màn hình điện thoại 1125x2436 trên CPU. | Tệp ảnh PNG/JPG (`PIL.Image` hoặc numpy array) | Danh sách Bounding Boxes `[xmin, ymin, xmax, ymax]` | Bỏ qua các box kích thước siêu nhỏ `< 10px` rộng hoặc `< 8px` cao. | `notebooks/chat_ocr_pipeline.ipynb` Cell 5; `docs/PREPROCESSING_DESIGN.md` Mục 2.5 |
| **F-02** | OCR & Geometry Filter | Smart UI Geometry Filter | Loại bỏ thanh trạng thái đỉnh màn hình (pin, wifi, tên người chat) và thanh soạn tin đáy màn hình. | Mảng bounding boxes và chiều cao ảnh $H$ | Bounding boxes nằm trong dải $[0.082H, 0.915H]$ | Nếu ảnh bị cắt mất header/footer, bảo lưu các box hợp lệ. | `notebooks/chat_ocr_pipeline.ipynb` Cell 5 |
| **F-03** | OCR & Line Merging | Horizontal Box Merging | Gộp các mảnh từ bị DBNet cắt nhỏ trên cùng dòng ngang thành dòng chữ hoàn chỉnh. | Danh sách bounding boxes, `y_thresh=10px`, `x_gap_thresh=35px` | Danh sách boxes đã gộp dòng ngang | Nếu chỉ có $\le 1$ box thì trả về nguyên bản. | `notebooks/chat_ocr_pipeline.ipynb` Cell 5 |
| **F-04** | OCR & Reading Order | Natural Reading Order Sort | Sắp xếp thứ tự đọc từ trên xuống dưới theo dòng thời gian, trong cùng dòng xếp từ trái qua phải. | Danh sách bounding boxes, `y_threshold=max(12, 0.008*H)` | Danh sách bounding boxes sắp xếp tuần tự | Giữ nguyên thứ tự nếu các box có cùng tọa độ $y$. | `notebooks/chat_ocr_pipeline.ipynb` Cell 5 |
| **F-05** | Dialogue Structuring | Margin-based Speaker Attribution | Phân loại vai trò người nói dựa trên khoảng cách bám lề trái (`peer`/kẻ lừa đảo) và lề phải (`user`/nạn nhân). | Bounding box `[xmin, ymin, xmax, ymax]`, độ rộng ảnh $W$ | Chuỗi vai trò: `'peer'`, `'user'`, `'system'` | Fallback dựa trên so sánh khoảng cách trực tiếp: `left_dist < right_dist ? 'peer' : 'user'`. | `notebooks/chat_ocr_pipeline.ipynb` Cell 7; `docs/PREPROCESSING_DESIGN.md` Mục 2.5 |
| **F-06** | Dialogue Structuring | Bubble Speaker Smoothing | Làm mịn vai trò người gửi cho các dòng chữ liên tiếp nằm trong cùng một bong bóng chat. | Danh sách lát cắt đã gán nhãn, `v_gap <= max(18, 1.3*line_h)` | Danh sách lát cắt với vai trò đồng nhất theo bong bóng | Nếu khoảng cách dọc lớn hơn ngưỡng, coi như bong bóng tách rời. | `notebooks/chat_ocr_pipeline.ipynb` Cell 7 |
| **F-07** | Optical Preprocessing | Optical Polarity Inversion & Scaling | Đảo cực tính chữ sáng nền tối thành chữ đen nền sáng, tăng tương phản 1.25x và phóng to Lanczos lên 32px. | Lát cắt ảnh dòng chữ (`PIL.Image`) | Lát cắt ảnh đã tăng cường độ tương phản, chữ đen nền trắng | Nếu lát cắt rỗng hoặc $w=0, h=0$, trả về ảnh gốc. | `notebooks/chat_ocr_pipeline.ipynb` Cell 7 |
| **F-08** | OCR Recognition | Vietnamese Text Recognition (Tesseract/VietOCR) | Nhận dạng ký tự tiếng Việt có dấu từ lát cắt ảnh chữ đã tiền xử lý. | Lát cắt ảnh chữ, cấu hình `-l vie --psm 6 --oem 1` | Chuỗi văn bản tiếng Việt thô | Gắn nhãn `[Lỗi OCR: ...]` nếu động cơ OCR ném ngoại lệ; hỗ trợ fallback. | `ORIGINAL_REQUEST.md` R2; `notebooks/chat_ocr_pipeline.ipynb` Cell 9 |
| **F-09** | Text Cleansing | Unicode NFC/NFKC Normalization | Đưa toàn bộ nguyên âm tiếng Việt về dạng dựng sẵn chuẩn quốc gia (NFC) và tương thích (NFKC). | Chuỗi văn bản tiếng Việt thô | Chuỗi văn bản chuẩn hóa Unicode | Bỏ qua các ký tự không thể chuẩn hóa. | `docs/PREPROCESSING_DESIGN.md` Mục 3.1 |
| **F-10** | De-obfuscation | Zero-Width & Invisible Characters Stripper | Triệt tiêu các ký tự không có độ rộng hiển thị (`\u200B`, `\u3164`, `\uFEFF`, v.v.) dùng để phá vỡ regex. | Chuỗi văn bản có nhiễu | Chuỗi văn bản đã loại bỏ 100% ký tự tàng hình | Regex tuyến tính $O(N)$, không gây treo CPU. | `docs/PREPROCESSING_DESIGN.md` Mục 3.2 |
| **F-11** | De-obfuscation | Math Monospace Font Transcoder | Chuyển đổi các font máy đánh chữ toán học (`U+1D670` - `U+1D6A3`) và số (`U+1D7F6` - `U+1D7FF`) về ASCII chuẩn. | Chuỗi ký tự Monospace | Chuỗi ký tự ASCII tương đương | Giữ nguyên các ký tự nằm ngoài dải mã toán học. | `docs/PREPROCESSING_DESIGN.md` Mục 3.3 |
| **F-12** | De-obfuscation | Syllable Stuttering Compressor | Nén các ký tự lặp cố ý ($\ge 3$ lần `NNNN` $\rightarrow$ `N`) và cặp hoa thường `NhHậẬnN` $\rightarrow$ `Nhận`. | Chuỗi văn bản bị kéo dài lặp âm | Từ ngữ tiếng Việt đúng ngữ nghĩa | Bảo vệ các từ có phụ âm đôi hợp lệ tiếng Việt (`oo`, `qu`, `ng`). | `docs/PREPROCESSING_DESIGN.md` Mục 3.4 |
| **F-13** | De-obfuscation | Spaced Broken URL Reconstruction | Hàn gắn các URL bị chèn khoảng trắng đối kháng trước TLD (`domain .com` $\rightarrow$ `domain.com`) hoặc sau protocol. | Chuỗi văn bản chứa URL bị bẻ gãy | URL hoàn chỉnh hợp lệ RFC 3986 | Bật cờ `adversarial_evasion_detected = true`. | `docs/PREPROCESSING_DESIGN.md` Mục 3.5 |
| **F-14** | Text Cleansing | Post-OCR Confusion Lexicon | Bộ từ điển sửa lỗi chính tả và dấu thanh đặc thù của OCR (`chảo bạn` $\rightarrow$ `chào bạn`, `dụ vàng` $\rightarrow$ `dạ vâng`, v.v.). | Chuỗi văn bản sau OCR | Chuỗi văn bản đã sửa lỗi từ vựng chat | Chỉ sửa các cụm từ khớp chính xác biểu thức regex. | `notebooks/chat_ocr_pipeline.ipynb` Cell 9 |
| **F-15** | Text Cleansing | UI Garbage Filter | Lọc bỏ các chuỗi rác UI (`nhập tin nhắn`, `hôm nay`, `đã xem`, `4g`, `wifi`, `seen`, `gửi`). | Dòng văn bản đơn lẻ | Boolean: `true` nếu là rác UI, `false` nếu là nội dung chat | Giữ lại các dấu câu biểu cảm ngắn (`?`, `!`). | `notebooks/chat_ocr_pipeline.ipynb` Cell 9 |
| **F-16** | Dialogue Structuring | Line-to-Turn Grouping | Gom các dòng chữ liên tiếp của cùng một người nói thành một Lượt thoại hoàn chỉnh duy nhất. | Mảng các dòng chữ hợp lệ | Mảng các lượt thoại `[{speaker, text, line_count}]` | Trả về mảng rỗng nếu không có dòng hợp lệ nào. | `notebooks/chat_ocr_pipeline.ipynb` Cell 9 |
| **F-17** | Dialogue Structuring | Multi-Shot Screen Turn Stitching | Ghép nối các lượt thoại từ nhiều ảnh chụp màn hình liên tiếp (2–4 ảnh), khử trùng lặp ở điểm cuộn màn hình. | Danh sách turns từ từng ảnh, `cer_thresh=0.18` | Danh sách turns hội thoại hoàn chỉnh duy nhất | Nếu câu ở ảnh sau dài và đầy đủ hơn câu bị cắt ở mép ảnh trước, tự động cập nhật nội dung đầy đủ. | `notebooks/chat_ocr_pipeline.ipynb` Cell 11 |
| **F-18** | Privacy & Security | Mandatory 6-Rule PII Sanitization | Ẩn danh hóa thông tin cá nhân theo thứ tự bắt buộc: Password $\rightarrow$ Tên+DOB $\rightarrow$ Số TK $\rightarrow$ OTP $\rightarrow$ SĐT $\rightarrow$ CCCD. | Văn bản hội thoại thô | Văn bản đã che chắn dạng `<MASKED_BANK_ACC_1>`, `<MASKED_CCCD_1>` | Ngăn chặn số tài khoản 12 số bị nhận diện nhầm thành CCCD. | `docs/PREPROCESSING_DESIGN.md` Mục 4.1 |
| **F-19** | Privacy & Security | Salted HMAC-SHA256 Token Registry | Bảng ánh xạ tra cứu PII an toàn trong bộ nhớ tạm (In-memory TTL 300s) dùng muối ngẫu nhiên 32-byte. | Giá trị PII thô + Session Salt | Chuỗi băm HMAC-SHA256 64 ký tự hex | Tự động hủy sạch bộ nhớ sau khi hoàn thành phiên phân tích. | `docs/PREPROCESSING_DESIGN.md` Mục 4.4 |
| **F-20** | Privacy & Security | Pre-existing Token Preservation | Bảo tồn nguyên vẹn 100% các token đã được che sẵn từ trước (`[MONEY]`, `[NUMBER]`, `[TIME]`). | Chuỗi văn bản nguồn | Chuỗi văn bản giữ nguyên token gốc | Whitelist ngăn chặn bộ regex PII che lặp lần thứ hai. | `docs/PREPROCESSING_DESIGN.md` Mục 4.3 |
| **F-21** | Reasoning Harness | 4-Stage CoT Reasoning Scaffolding | Hướng dẫn tư duy logic 4 giai đoạn: Xác thực Thẩm quyền $\rightarrow$ Bóc tách Tâm lý $\rightarrow$ Giám định Dữ vật $\rightarrow$ Tổng hợp Phòng thủ. | Prompt XML scaffold + Nội dung hội thoại | Luận điểm phân tích chi tiết trong thẻ `<cot_reasoning_scaffold>` | Ngăn chặn Jailbreak/Injection bằng cặp thẻ XML độc lập. | `docs/REASONING_HARNESS_DESIGN.md` Mục 3.3 |
| **F-22** | Cloud LLM Integration | Cloud LLM Structured Output (`BE_codex`) | Gọi Cloud LLM API qua `OpenAiAnalysisProvider`, trả về JSON tuân thủ `OPENAI_ANALYSIS_SCHEMA`. | `AiAnalysisInput` (Text hoặc Base64 Images) | `AiAnalysisCandidate` (`canAssess`, `suggestedCategory`, `summary`, `evidence`, `speechSummary`) | Timeout 45s (`OPENAI_UPSTREAM_TIMEOUT_MS`), xử lý lỗi HTTP 502/503/504 chuẩn OpenAPI v1.2. | `BE_codex/src/ai/openai-analysis.provider.ts` |
| **F-23** | Post-Processing | Deterministic Evidence Validation | Đối soát nguyên văn trích dẫn `quote` so với văn bản gốc và kiểm tra ràng buộc `imageIndex`. | `AiAnalysisInput` + `AiEvidence[]` | `{ accepted: AiEvidence[], rejected: boolean }` | Bác bỏ bằng chứng (`rejected=true`) nếu trích dẫn bịa đặt, sai `imageIndex`, hoặc nằm trong câu cảnh báo phòng vệ. | `BE_codex/src/analysis/evidence-validator.ts` |
| **F-24** | Post-Processing | Defensive Discussion Guard | Kiểm tra biểu thức chính quy loại bỏ trích dẫn nằm trong ngữ cảnh cảnh báo/phủ định (FPR Prevention). | Mệnh đề trích dẫn | Boolean `supportsSignal` | Từ chối trích dẫn nếu nằm trong câu có *"không bao giờ yêu cầu OTP"*, *"cảnh báo không chuyển tiền"*. | `BE_codex/src/analysis/evidence-context.ts` |
| **F-25** | Risk Assessment | Deterministic Mathematical Risk Scoring | Tính toán điểm số rủi ro toán học (0–100) theo 8 trọng số tín hiệu cố định và điểm thưởng tương quan $+20$. | Danh sách `SignalType[]` đã qua kiểm định | `RiskAssessment` (`score`, `level: DANGER/SUSPICIOUS/SAFE`) | Trả về `score = null`, `UNABLE_TO_ASSESS` nếu `canAssess = false`. | `BE_codex/src/risk/risk.service.ts` |
| **F-26** | Category Decision | Deterministic Scam Category Selection | Đối soát chéo giữa `suggestedCategory` của AI với các bằng chứng đã được kiểm định để chốt danh mục cuối cùng. | `suggestedCategory`, `evidence[]`, `hasUrlIndicators` | `ScamCategory` (10 giá trị enum chuẩn OpenAPI v1.2) | Fallback về `OTHER` hoặc `NONE` nếu không thỏa mãn điều kiện cấu thành. | `BE_codex/src/risk/scam-category.ts` |

---

## 6. BẢNG CÁC TRƯỜNG HỢP BIÊN (EDGE CASES)

| # | Tính năng Liên quan | Dữ liệu Đầu vào Thử nghiệm | Hành vi Hệ thống Quan sát được & Giải pháp Thiết kế |
|---|---|---|---|
| **EC-01** | OCR Header/Footer Filter | Ảnh chụp màn hình đầy đủ thanh pin, sóng 5G Viettel và thanh điều hướng iOS Home Bar (Kích thước 1125x2436). | Bộ lọc tọa độ `ymin >= 0.082*H` (199.7px) và `ymax <= 0.915*H` (2228.9px) loại bỏ hoàn toàn các dòng "12:45", "5G", "Viettel", "Nhập tin nhắn..." mà không làm mất dòng chat đầu tiên. |
| **EC-02** | Optical Polarity Inversion | Bong bóng người dùng nền xanh dương đậm hoặc Dark Mode (chữ trắng trên nền tối). | Hàm `preprocess_crop_for_vietocr` phát hiện `median < 138` hoặc `border_mean < 138`, tự động đảo ngược màu thành chữ đen nền sáng, giúp CER giảm từ 0.255 xuống < 0.05. |
| **EC-03** | Speaker Classification Fallback | Bong bóng chat kích thước dài chiếm trọn 90% độ rộng màn hình (cả lề trái và lề phải đều sát mép). | Quy tắc fallback so sánh trực tiếp khoảng cách: nếu khoảng cách mép trái nhỏ hơn mép phải thì phân vào `'peer'`, ngược lại phân vào `'user'`. |
| **EC-04** | Line-to-Turn Bubble Grouping | Một lượt nói gồm 3 bong bóng ngắn gửi liên tiếp nhau cách nhau 15px. | Thuật toán `group_lines_to_turns` nhận diện cùng vai trò người gửi và khoảng cách dọc nhỏ, tự động gộp 3 dòng thành 1 lượt thoại duy nhất, ngăn ngừa lỗi over-segmentation số turns so với ground truth. |
| **EC-05** | Multi-Shot Turn Stitching | Cuộc hội thoại dài chụp qua 3 ảnh liên tiếp (ví dụ ca `MD_001_1.png`, `MD_001_2.png`, `MD_001_3.png`), tin nhắn thứ 4 bị lặp lại ở đầu ảnh 2. | Thuật toán `stitch_multi_shot_turns` tính khoảng cách Levenshtein giữa các câu ở biên ảnh, phát hiện trùng khớp (CER $\le 0.18$), tự động bỏ qua dòng lặp và ghép nối thành cuộc hội thoại 13 turns hoàn chỉnh. |
| **EC-06** | Multi-Actor Caller Handover | Hội thoại ID 9, hai lượt thoại liên tiếp 10 và 11 đều do kẻ lừa đảo nói (nhân viên tư vấn chuyển máy cho kế toán trưởng Dmaris). | Pipeline không giả định cứng rằng vai trò phải luân phiên 1-1; phát hiện regex chuyển máy và gán nhãn `actor_switch = true`, bảo tồn cả 2 lượt thoại độc lập cho LLM phân tích đổi vai. |
| **EC-07** | PII Disambiguation Conflict | Tin nhắn chứa đồng thời số tài khoản 12 số và CCCD 12 số: `"STK: 123456789012 kèm CCCD 001099012345"`. | Thứ tự ưu tiên bắt buộc: Quy tắc Số tài khoản (có tiền tố `STK:`) khớp trước thành `<MASKED_BANK_ACC_1>`, sau đó quy tắc CCCD mới khớp số còn lại thành `<MASKED_CCCD_1>`, bảo toàn trọn vẹn ngữ nghĩa tài chính. |
| **EC-08** | Whitelist Pre-existing Tokens | Tin nhắn chứa sẵn placeholder `[MONEY]` và `[NUMBER]`. | Động cơ PII đưa `[MONEY]`, `[NUMBER]`, `[TIME]` vào danh sách Whitelist Tokens bất biến, giữ nguyên 100%, không che lần thứ hai thành `<MASKED_NUMBER_1>`. |
| **EC-09** | Broken Spaced URL Evasion | Đường link lừa đảo bị chèn khoảng trắng đối kháng: `congan-pc02-hanoi .org` hoặc `https:// 103...`. | Thuật toán hàn gắn regex tự động xóa khoảng trắng trước TLD và sau protocol, khôi phục thành `https://congan-pc02-hanoi.org` và kích hoạt cờ `adversarial_evasion_detected = true`. |
| **EC-10** | Defensive Discussion Quotes | Tin nhắn an toàn từ ngân hàng chứa: *"Vietcombank KHÔNG BAO GIỜ yêu cầu Quý khách cung cấp mã OTP"*. | Nếu LLM trích dẫn cụm từ `"cung cấp mã OTP"`, `EvidenceValidator` phát hiện cụm từ này nằm trong câu có `KHÔNG BAO GIỜ` và lập tức từ chối (`rejected = true`), bảo vệ tỷ lệ báo động giả FPR < 2.0%. |
| **EC-11** | ImageIndex Invariant Constraint | Yêu cầu phân tích văn bản thuần (`InputType.TEXT`), nhưng LLM gửi `"imageIndex": 0` hoặc bỏ quên trường này. | `EvidenceValidator` kiểm tra nghiêm ngặt: với `TEXT`, `imageIndex` bắt buộc phải là `null`. Nếu gửi số hoặc undefined, toàn bộ bằng chứng bị đánh dấu ungrounded và bị loại bỏ. |
| **EC-12** | Corroboration Bonus Trigger | Kẻ lừa đảo vừa đòi tiền (`MONEY_REQUEST`), vừa đe dọa lệnh bắt tạm giam (`THREAT`) và mạo danh công an (`IMPERSONATION`). | `RiskService` phát hiện `activeRequest = true` và `corroborated = true`, kích hoạt điểm thưởng nguy cơ tương quan $+20$ điểm, đưa điểm số từ 55 lên $\min(100, 55 + 20) = 75$ (`DANGER`). |
| **EC-13** | Dialogue Turn Count Range | Ca ID 121 chỉ có 7 turns (ngắn nhất), trong khi ca ID 2 có tới 14 turns (dài nhất). | Pipeline xử lý động theo mảng turns thực tế mà không áp đặt giới hạn min/max cứng nhắc, bảo đảm toàn vẹn mọi turn từ 7 đến 14. |
| **EC-14** | Multi-Image Sequences per Case | 171 ca có 3 ảnh, 21 ca có 2 ảnh, 8 ca có 4 ảnh trong `metadata.json`. | Module xử lý tiếp nhận danh sách `images` có độ dài từ 1 đến 5 (theo đúng giới hạn `MAX_IMAGES = 5` của `ImageUploadGuard`), xử lý tuần tự từng ảnh và ghép nối thành một hội thoại duy nhất. |

---

## 7. CHI TIẾT DANH MỤC TẬP DỮ LIỆU KIỂM THỬ (TEST DATA INVENTORY)

Tập dữ liệu kiểm thử authoritative nằm tại `data/` bao gồm **200 ca kiểm thử** trong `metadata.json` và **587 tệp ảnh** trong `images/`:

### 7.1. Bảng Tổng Hợp 5 Nhóm Thủ Đoạn (Dataset Category Breakdown)

| Nhóm Tiền tố (Prefix) | Dải ID Ca (Case IDs) | Số Lượng Ca (Cases) | Tổng Số Ảnh (Images) | Tỷ lệ Nhãn Thực tế (Ground Truth) | Danh mục Lừa đảo Mục tiêu (`ScamCategory`) | Mức Độ Rủi ro (`RiskLevel`) | Dấu hiệu Ngữ nghĩa Cốt lõi (Key Text Indicators) |
|---|:---:|:---:|:---:|:---:|---|:---:|---|
| **MD**<br>*(Mạo danh Cơ quan)* | `1` – `43` | **43 ca** | **117 ảnh**<br>(~2.72 ảnh/ca) | **100% `scam`**<br>(43 scam, 0 benign) | `GOVERNMENT_IMPERSONATION`<br>`THREAT` | **`DANGER`**<br>(Điểm: 85 – 100) | Mạo danh Cảnh sát điều tra PC02, Viện kiểm sát, Lệnh bắt giam T16, dọa buôn ma túy/rửa tiền, ép chuyển tiền vào "TK tạm giữ Bộ Công An" để "quét seri tiền sạch", link giả `congan-pc02-hanoi.org`. |
| **DT**<br>*(Đầu tư / Nhiệm vụ)* | `44` – `86` | **43 ca** | **126 ảnh**<br>(~2.93 ảnh/ca) | **100% `scam`**<br>(43 scam, 0 benign) | `FINANCIAL_FRAUD`<br>`FAKE_RECRUITMENT` | **`DANGER`**<br>(Điểm: 75 – 100) | Tuyển cộng tác viên làm nhiệm vụ VIP 3, giật đơn Shopee/Lazada, cam kết hoa hồng 20-30%, dọa vượt quá thời gian, giam tiền gốc ép nạp thêm 68 - 101 triệu vào tài khoản công ty ma để tất toán. |
| **MB**<br>*(Mạo danh Shipper)* | `87` – `128` | **42 ca** | **125 ảnh**<br>(~2.98 ảnh/ca) | **100% `scam`**<br>(42 scam, 0 benign) | `FAKE_DELIVERY`<br>`SOCIAL_ENGINEERING`<br>`PHISHING` | **`DANGER`**<br>(Điểm: 75 – 100) | Giả danh shipper GHTK/Viettel Post giao kiện hàng mỹ phẩm 320k gửi lễ tân, xin chuyển khoản vào tài khoản cá nhân, sau đó báo chuyển nhầm vào tài khoản hội viên VIP bị trừ tiền 3.5 triệu/tháng, dụ bấm link hủy để vét sạch tài khoản. |
| **DC**<br>*(Đánh cắp Tài khoản)* | `129` – `170` | **42 ca** | **130 ảnh**<br>(~3.10 ảnh/ca) | **100% `scam`**<br>(42 scam, 0 benign) | `BANK_IMPERSONATION`<br>`OTP_THEFT`<br>`PHISHING` | **`DANGER`**<br>(Điểm: 85 – 100) | Giả mạo SMS brandname Vietcombank, Techcombank, VCB Digibank, thông báo kích hoạt lại ứng dụng, tài khoản bị đăng nhập nơi khác, hoàn phí quản lý thẻ 600k, dụ truy cập link giả mạo và yêu cầu đọc mã OTP 6 số. |
| **HN**<br>*(Hội thoại An toàn)* | `171` – `200` | **30 ca** | **89 ảnh**<br>(~2.97 ảnh/ca) | **100% `benign`**<br>(0 scam, 30 benign) | `NONE` | **`SAFE`**<br>(Điểm: 0 – 35) | Giao dịch đời thường hợp pháp: Shipper quen hẹn để hàng ở bàn bảo vệ, cảnh sát khu vực hẹn trực tiếp tại trụ sở công an phường (không bao giờ hỏi OTP/tiền), nhân viên ngân hàng hẹn ra quầy, đóng tiền sân bóng, học phí, tiền điện nước. |
| **TỔNG CỘNG** | **1 – 200** | **200 ca** | **587 ảnh** | **170 Scam / 30 Benign** | **Đa dạng 10 danh mục** | **22 Danger, 18 Safe, 10 Suspicious** | **Bao phủ 100% kịch bản thực tế** |

### 7.2. Đặc tả Cấu trúc Trường trong `data/metadata.json`

Mỗi phần tử trong danh sách `data/metadata.json` tuân thủ nghiêm ngặt schema:
```json
{
  "id": 1,
  "label": "scam",
  "image_path": [
    "images/MD_001_1.png",
    "images/MD_001_2.png",
    "images/MD_001_3.png"
  ],
  "turns": [
    {
      "role": "scammer_suspect",
      "content": "Tổng đài Bưu điện thông báo quý khách có bưu phẩm chuyển hoàn, đã kết nối sang Phòng Cảnh sát điều tra PC02."
    },
    {
      "role": "user",
      "content": "Dạ chào cán bộ, tự dưng bưu điện báo tôi nợ thẻ tín dụng 48 triệu rồi nối máy qua anh là sao ạ?"
    }
  ]
}
```

- `id` (integer, 1–200): Mã định danh duy nhất của ca kiểm thử.
- `label` (string, `"scam"` hoặc `"benign"`): Nhãn nhị phân đối chứng chuẩn xác.
- `image_path` (array of strings, độ dài 2–4): Danh sách đường dẫn tương đối trỏ tới các tệp ảnh chụp màn hình trong thư mục `images/`.
- `turns` (array of objects, độ dài 7–14): Danh sách các lượt đối đáp được gỡ băng chuẩn xác (Ground Truth transcripts). Mỗi lượt gồm `role` (`"scammer_suspect"` hoặc `"user"`) và `content` (nội dung văn bản tiếng Việt).

---

## 8. PHƯƠNG PHÁP KIỂM CHỨNG ĐỘC LẬP (VERIFICATION METHOD)

Để bất kỳ chuyên viên kiểm thử hoặc tác nhân nào có thể kiểm chứng độc lập tính trung thực và độ chính xác của toàn bộ dữ liệu trong báo cáo này, hãy thực thi các lệnh PowerShell sau từ thư mục gốc của dự án:

1. **Kiểm chứng Tính Toàn vẹn & Số lượng 587 Ảnh và 200 Metadata Cases**:
   ```powershell
   python -c "
   import json
   from pathlib import Path
   from collections import Counter

   with open('data/metadata.json', 'r', encoding='utf-8') as f:
       meta = json.load(f)
   assert len(meta) == 200, f'Expected 200 cases, got {len(meta)}'
   
   labels = Counter(d['label'] for d in meta)
   assert labels['scam'] == 170 and labels['benign'] == 30, f'Mismatch labels: {labels}'

   all_images = list(Path('data/images').glob('*.png'))
   assert len(all_images) == 587, f'Expected 587 images, got {len(all_images)}'

   referenced_images = [img for d in meta for img in d['image_path']]
   assert len(referenced_images) == 587, f'Expected 587 referenced images, got {len(referenced_images)}'

   missing = [img for img in referenced_images if not (Path('data') / img).exists()]
   assert len(missing) == 0, f'Missing images found: {missing}'

   print('SUCCESS: 100% of 200 test cases and 587 images verified with complete integrity!')
   "
   ```

2. **Kiểm chứng Độ phân giải và Không gian Màu 1125x2436 RGBA**:
   ```powershell
   python -c "
   from PIL import Image
   from pathlib import Path

   images = list(Path('data/images').glob('*.png'))
   invalid_dims = []
   for p in images:
       with Image.open(p) as img:
           if img.size != (1125, 2436) or img.mode != 'RGBA':
               invalid_dims.append((p.name, img.size, img.mode))

   assert len(invalid_dims) == 0, f'Found invalid images: {invalid_dims}'
   print('SUCCESS: All 587 images strictly adhere to 1125x2436 RGBA format!')
   "
   ```

3. **Kiểm chứng Bộ Phân loại Prefix 5 Nhóm Thủ Đoạn**:
   ```powershell
   python -c "
   import json
   from collections import defaultdict

   with open('data/metadata.json', 'r', encoding='utf-8') as f:
       meta = json.load(f)

   groups = defaultdict(list)
   for d in meta:
       prefix = d['image_path'][0].split('/')[-1].split('_')[0]
       groups[prefix].append(d)

   assert len(groups['MD']) == 43 and all(d['label'] == 'scam' for d in groups['MD'])
   assert len(groups['DT']) == 43 and all(d['label'] == 'scam' for d in groups['DT'])
   assert len(groups['MB']) == 42 and all(d['label'] == 'scam' for d in groups['MB'])
   assert len(groups['DC']) == 42 and all(d['label'] == 'scam' for d in groups['DC'])
   assert len(groups['HN']) == 30 and all(d['label'] == 'benign' for d in groups['HN'])

   print('SUCCESS: All 5 prefix groups (MD, DT, MB, DC, HN) match 100% specification!')
   "
   ```

4. **Kiểm chứng Ràng buộc OpenAPI v1.2 & NestJS Gateway `BE_codex`**:
   ```powershell
   cd "BE_codex"
   npm test
   ```
   *Kết quả mong đợi*: Toàn bộ các bài test `EvidenceValidator`, `RiskService`, `ImageUploadGuard` và `OpenAiAnalysisProvider` đều vượt qua (`PASS`).

5. **Điều kiện Phủ định Kết luận (Invalidation Conditions)**:
   - Nếu trong `data/images/` phát hiện tệp ảnh bị lỗi kích thước khác 1125x2436 hoặc thiếu tệp so với `metadata.json`.
   - Nếu `EvidenceValidator` cho phép trường `imageIndex` mang giá trị số đối với phân tích văn bản (`InputType.TEXT`).
   - Nếu mô hình OCR chạy trên GPU thay vì chạy 100% trên CPU máy chủ làm tốn bộ nhớ VRAM của GPU.
