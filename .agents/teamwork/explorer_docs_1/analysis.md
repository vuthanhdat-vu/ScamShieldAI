# BÁO CÁO KHẢO SÁT CHUYÊN SÂU VÀ PHÂN TÍCH KHOẢNG TRỐNG THIẾT KẾ
## (IN-DEPTH GAP ANALYSIS: PREPROCESSING & REASONING HARNESS DESIGN DOCS)

- **Mã tài liệu**: `GAP-DOCS-EXPLORER-01`
- **Tác nhân thực hiện**: `explorer_docs_1` (Teamwork Explorer Agent)
- **Thời điểm hoàn thành**: 2026-11-12T10:20:00Z
- **Thư mục làm việc**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI`
- **Mục tiêu kỹ thuật**: Khảo sát toàn diện hai tài liệu thiết kế cốt lõi (`docs/PREPROCESSING_DESIGN.md` và `docs/REASONING_HARNESS_DESIGN.md`), đối chiếu thực trạng dữ liệu mới tại `data_demo/` và kiến trúc mã nguồn `BE_codex/`, xác lập chuỗi bằng chứng thực nghiệm và vạch rõ danh mục khoảng trống (Gap Matrix) cần tối ưu hóa theo các yêu cầu R1, R2, R3 trong `ORIGINAL_REQUEST.md`.

---

## 1. TÓM TẮT ĐIỀU HÀNH (EXECUTIVE SUMMARY)

Qua khảo sát toàn diện mã nguồn, tài liệu và dữ liệu thực tế tại dự án `ScamShieldAI`:
1. **Dữ liệu thực tế tại `data_demo/` đã trải qua tinh gọn bước 2**, chuyển dịch từ cấu trúc phân tán ban đầu sang 5 nguồn dữ liệu quy chuẩn:
   - `conservations.json`: 38 hội thoại đa lượt (186 KB), cấu trúc `{id, dialogue: [{role, content}]}`.
   - `dataset_url_sampled.csv`: 3,192 bản ghi URL đại diện (269 KB), bổ sung cột phân loại hành vi `pattern_group` bên cạnh `channel, label, url_norm`.
   - `Scam.csv`: 1,319 tin nhắn văn bản lừa đảo đơn lẻ (185 KB, mã UTF-8 đã khử trùng lặp và chuyển đổi an toàn từ CP1252 gốc).
   - `No_scam.csv`: 1,930 tin nhắn dịch vụ/thông báo hợp lệ (492 KB, mã UTF-8 đã khử BOM và trùng lặp, bảo toàn 524 bản ghi multiline RFC 4180).
   - `images/`: 50 ca kiểm thử ảnh chụp màn hình đa nền tảng (Zalo, Messenger, iMessage, SMS Android) kèm `metadata.json` (phân bổ nhãn rủi ro: 22 DANGER, 18 SAFE, 10 SUSPICIOUS) và 50 tệp ground truth tại `texts/`.
2. **Tài liệu `docs/PREPROCESSING_DESIGN.md` (85.3 KB, 1,100 dòng)**:
   - *Điểm mạnh*: Xây dựng rất xuất sắc các thuật toán de-obfuscation tiếng Việt (chuẩn hóa Unicode NFC/NFKC, xóa ký tự ẩn zero-width, chuyển đổi font monospace toán học, un-stuttering) và kỹ thuật ẩn danh PII bảo lưu ngữ cảnh với salted HMAC-SHA256.
   - *Khoảng trống nghiêm trọng*:
     * **Hoàn toàn vắng bóng dữ liệu hình ảnh/ảnh chụp màn hình**: Không có bất kỳ đặc tả nào về tiền xử lý ảnh (OCR, độ phân giải, binarization, bounding box nhận diện bóng thoại chat). `modality` trong JSON Schema chỉ có `["dialogue", "single_message", "url", "hybrid"]`, thiếu hẳn `image`.
     * **Lạc hậu so với cấu trúc dữ liệu thực tế**: Vẫn mô tả 5 thư mục hội thoại rời rạc cũ (đã bị xóa), tham chiếu đến tệp không tồn tại (`full_dataset.csv`, `sample.csv`, `dataset_url.csv` 53k dòng) thay vì 4 tệp thực tế (`conservations.json`, `dataset_url_sampled.csv`, `Scam.csv`, `No_scam.csv`).
     * **Chưa có luồng riêng cho `No_scam.csv`**: Thiếu cơ chế kiểm soát dương tính giả (False Positive) cho tin nhắn hợp lệ.
     * **Đặc tả Embedding còn sơ sài**: Chỉ nhắc đến "ONNX PhoBERT CPU Embedding" ở 3 dòng văn bản, chưa có đặc tả schema vector, kích thước chiều, pooling method, cơ chế lưu trữ/truy vấn vector tương thích microservice.
3. **Tài liệu `docs/REASONING_HARNESS_DESIGN.md` (77.9 KB, 1,079 dòng)**:
   - *Điểm mạnh*: Lập luận toán học về ngân sách VRAM cho mô hình Qwen2.5-3B-Instruct Q4_K_M trên GPU RTX 4050 6GB rất sắc bén, tính toán chi tiết KV Cache GQA và cấu hình `llama.cpp` server. Thiết kế quy trình CoT 4 giai đoạn logic cao.
   - *Khoảng trống nghiêm trọng*:
     * **Chưa phân định trách nhiệm Microservice song song**: Hoàn toàn không nhắc tới `BE_codex` (NestJS API Gateway hiện có trong repo). Tài liệu chỉ thiết kế ADK Recipe Python độc lập, chưa định nghĩa ranh giới xử lý, giao thức truyền thông (REST/A2A), và hợp đồng dữ liệu giữa NestJS và Python FastAPI AI Service.
     * **Ngân sách VRAM chưa tính đến tải trọng Đa phương thức (Multimodal/OCR)**: Toàn bộ bảng tính VRAM chỉ giả định văn bản thuần túy. Chưa phân tích VRAM khi xử lý ảnh chụp màn hình (chứng minh OCR chạy 100% trên CPU hay GPU, giới hạn VLM cục bộ vs Cloud fallback).
     * **Thiếu hệ thống Test Harness Suites thực thụ**: Section 6 chỉ có 1 bài smoke test đơn lẻ `test_runnability.py` (kiểm tra import ADK `root_agent is not None`). Hoàn toàn không có bộ test harness nào để đánh giá suy luận trên 5 nguồn dữ liệu thực tế.
     * **Thiếu ma trận chỉ số đánh giá toàn diện**: Chỉ có công thức độ trễ lý thuyết, thiếu bộ chỉ số đo lường hiệu năng và chất lượng thực tế (P50/P95/P99 latency, VRAM peak consumption, Confusion Matrix, Precision, Recall, F1, False Positive Rate < 2% trên `No_scam.csv`, OCR CER/WER).
     * **Vi phạm quy tắc mô hình**: Tài liệu vẫn tham chiếu đến `Gemini 2.5 Flash` (dòng 917, 943, 949), trong khi quy định hệ thống bắt buộc sử dụng `Gemini 3.7 Flash` (do 2.0 và 2.5 đã bị deprecated).

---

## 2. CHUỖI BẰNG CHỨNG THỰC NGHIỆM ĐÃ XÁC MINH (VERIFIED EVIDENCE CHAINS)

### 2.1. Hiện trạng dữ liệu thực tế tại `data_demo/`
| Tên tệp tin / Thư mục | Kích thước | Số lượng bản ghi / tệp | Cấu trúc trường dữ liệu xác minh | Trạng thái mã hóa & Chuẩn hóa |
| :--- | :--- | :--- | :--- | :--- |
| `conservations.json` | 186,116 bytes | 38 hội thoại, 628 lượt thoại | Array of objects: `id` (int), `dialogue` (array of `{role, content}`). Roles: `'người gọi'`, `'người nhận'` | UTF-8 không BOM, NFC chuẩn |
| `dataset_url_sampled.csv` | 269,508 bytes | 3,192 dòng dữ liệu + 1 header | 4 cột: `channel`, `label`, `url_norm`, `pattern_group` | UTF-8, RFC 4180 |
| `Scam.csv` | 185,900 bytes | 1,319 dòng dữ liệu + 1 header | 1 cột: `message` (nội dung SMS/tin nhắn lừa đảo) | UTF-8 (đã khử trùng lặp từ 1,430 dòng CP1252 gốc), 27 multiline records |
| `No_scam.csv` | 492,833 bytes | 1,930 dòng dữ liệu + 1 header | 1 cột: `message` (nội dung SMS/tin nhắn an toàn, quảng cáo, OTP) | UTF-8 (đã khử trùng lặp từ 2,204 dòng UTF-8-BOM gốc), 524 multiline records |
| `images/` | ~15 MB | 50 tệp ảnh + metadata + 50 text | `images/` (50 ảnh `.jpg`/`.png`), `texts/` (50 tệp `.txt`), `metadata.json` (50 objects) | Nhãn `expected_label`: 22 DANGER, 18 SAFE, 10 SUSPICIOUS |
| `test_dataset_multiturn/` | ~30 MB | 112 ảnh đa lượt | Chứa các chuỗi ảnh chụp màn hình hội thoại liên tiếp (`sequence_tag: 1/4`, etc.) | Dữ liệu mở rộng kiểm thử chuỗi thời gian |
| `DEDUPLICATION_REPORT.md` | 10,894 bytes | — | Báo cáo kiểm toán khử trùng lặp in-place cho 3 tệp CSV | Bản ghi kiểm toán kỹ thuật |

*Bằng chứng xác minh*:
- Lệnh: `python -c "import json; data=json.load(open('data_demo/conservations.json', encoding='utf-8')); print(len(data), list(data[0].keys()))"` $\rightarrow$ `Count: 38, Keys: ['id', 'dialogue']`.
- Lệnh: `(Get-Content -Path data_demo/dataset_url_sampled.csv).Count` $\rightarrow$ `3193` (1 header + 3192 rows).
- Lệnh: `python -c "import json; data=json.load(open('data_demo/images/metadata.json', encoding='utf-8')); from collections import Counter; print(Counter(d['expected_label'] for d in data))"` $\rightarrow$ `Counter({'DANGER': 22, 'SAFE': 18, 'SUSPICIOUS': 10})`.

### 2.2. Hiện trạng mã nguồn Backend Gateway (`BE_codex`)
Tại thư mục `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\BE_codex`:
- Kiến trúc: NestJS Framework (TypeScript).
- Entry points:
  * `POST /api/v1/analysis/text`: Tiếp nhận `{ text: string }`.
  * `POST /api/v1/analysis/images`: Tiếp nhận `{ images: UploadedImage[], context?: string }`.
- Contracts cốt lõi (`BE_codex/src/contracts/analysis.enums.ts`):
  * `InputType`: `TEXT`, `IMAGE`.
  * `RiskLevel`: `SAFE`, `SUSPICIOUS`, `DANGER`.
  * `ScamCategory`: `FINANCIAL_FRAUD`, `IMPERSONATION`, `LOTTERY_PRIZE`, `JOB_OFFER`, `PHISHING_URL`, `OTHER`, `NONE`.
  * `SignalType`: `CREDENTIAL_REQUEST`, `MONEY_REQUEST`, `IMPERSONATION`, `THREAT`, `URGENCY`, `TOO_GOOD_TO_BE_TRUE`, `SUSPICIOUS_URL`, `OTHER`.
- Kiến trúc tích hợp AI (`BE_codex/src/ai/ai-analysis-provider.ts`):
  * Định nghĩa interface `AiAnalysisProvider`:
    `analyze(input: AiAnalysisInput, signal: AbortSignal): Promise<AiAnalysisCandidate>`.
  * Hiện tại có 2 implementation: `MockAiAnalysisProvider` và `OpenAiAnalysisProvider`.
  * Ranh giới phân chia hiện tại: AI Provider chỉ trả về `AiAnalysisCandidate` (`canAssess`, `suggestedCategory`, `summary`, `evidence: [{quote, reason, signalType, imageIndex}]`, `recommendedActions`, `speechSummary`).
  * Backend NestJS nắm quyền tối thượng thực thi `EvidenceValidator`, trích xuất URL `UrlIntelligenceService`, tính toán điểm rủi ro `RiskService` (0-100) và ánh xạ `RiskLevel`.

---

## 3. PHÂN TÍCH KHOẢNG TRỐNG CHI TIẾT TRONG `docs/PREPROCESSING_DESIGN.md` (GAP ANALYSIS R2)

### 3.1. Khoảng trống 1: Độ bao phủ 5 nguồn dữ liệu thực tế (Data Modality Mismatch)
| Yêu cầu R1/R2 | Trạng thái trong `PREPROCESSING_DESIGN.md` hiện tại | Chi tiết sai lệch / Khoảng trống | Đề xuất cập nhật |
| :--- | :--- | :--- | :--- |
| **`conservations.json`** | Mô tả 5 thư mục con riêng biệt (`Lừa đảo từ thiện`, `Lừa đảo đầu tư tiền ảo`, v.v.) với mã ID cục bộ nhảy cóc (Section 2.1). | 5 thư mục nguồn đã được gộp thành duy nhất 1 tệp `conservations.json` (38 hội thoại, `id: 1..38`). Thiết kế hiện tại chứa mã xử lý file rỗng `ANOM-01` và logic slug `ANOM-02` đã lỗi thời. | Cập nhật Pipeline 1 để tiếp nhận trực tiếp `conservations.json`, chuẩn hóa tên gọi, đặc tả cấu trúc `id` và danh sách lượt thoại `dialogue`. |
| **`dataset_url_sampled.csv`** | Mô tả `dataset_url.csv` với 53,117 dòng (Section 2.2). | Tệp thực tế là bản tinh gọn đại diện `dataset_url_sampled.csv` (3,192 dòng) có thêm cột `pattern_group`. Thiết kế chưa khai thác giá trị của cột phân nhóm hành vi này. | Cập nhật Pipeline 2 phản ánh 3,192 URL tinh gọn, bổ sung schema trường `pattern_group` vào metadata trích xuất. |
| **`Scam.csv`** | Tham chiếu đến tệp không tồn tại `full_dataset.csv` (4,492 dòng, Section 2.3) và `sample.csv` (772 dòng, Section 2.4). | `Scam.csv` chứa 1,319 tin nhắn lừa đảo duy nhất (1 cột `message`). Tệp từng mang mã hóa nguy hiểm Windows-1252 (ký tự `0x96` en-dash và Latin-1) đã được chuyển sang UTF-8. Thiết kế cũ hoàn toàn không đề cập đến `Scam.csv`. | Thay thế Section 2.3 bằng Pipeline chuyên biệt cho `Scam.csv` (Single Scam Message Pipeline), ghi nhận lịch sử bẫy mã hóa và cơ chế bảo toàn trường nhiều dòng RFC 4180. |
| **`No_scam.csv`** | Hoàn toàn vắng bóng trong tài liệu. | `No_scam.csv` chứa 1,930 tin nhắn dịch vụ hợp lệ (từng có UTF-8 BOM, 524 bản ghi multiline). Đây là dữ liệu sống còn để thẩm định tỷ lệ dương tính giả (False Positive Rate). | Bổ sung Pipeline chuyên biệt cho `No_scam.csv` (Benign Telecommunication / Service Message Pipeline), định nghĩa bộ lọc loại trừ (Whitelisting & False Positive Suppression). |
| **Thư mục `images/`** | **HOÀN TOÀN KHÔNG CÓ (0%)**. | Thư mục `images/` chứa 50 ca kiểm thử ảnh chụp màn hình đa nền tảng, 50 tệp ground truth `texts/` và `metadata.json` với 3 nhãn rủi ro. Tài liệu thiết kế không có bất kỳ dòng nào về xử lý hình ảnh! | Thiết lập mới hoàn toàn **Pipeline 5: Khung Tiền Xử Lý Ảnh Chụp Màn Hình Đa Nền Tảng (Multimodal Screenshot & Visual OCR Pipeline)**. |

### 3.2. Khoảng trống 2: Đặc tả Schema Đầu vào và Đầu ra Chuẩn hóa (Schema Gap)
1. **Thiếu Schema cho Dữ liệu Ảnh**:
   - Trong `UnifiedScamInspectionPayload` (Section 5.1):
     * Trường `modality` chỉ cho phép `enum: ["dialogue", "single_message", "url", "hybrid"]`. Hoàn toàn thiếu `image` hoặc `screenshot`.
     * Trường `content` chỉ có `dialogue`, `single_message`, `normalized_urls`. Không có trường chứa dữ liệu ảnh (`image_payload`, `image_metadata`, `ocr_extracted_text`, `bounding_boxes`).
2. **Thiếu Schema Ingestion cho từng tệp dữ liệu thô**:
   - Chưa định nghĩa bảng ánh xạ (Field Mapping) từ cấu trúc thô của 5 nguồn vào `UnifiedScamInspectionPayload`:
     * `conservations.json`: `{id, dialogue: [{role, content}]}` $\rightarrow$ `DialogueTurn: {turn_id, speaker_role, text}`.
     * `dataset_url_sampled.csv`: `{channel, label, url_norm, pattern_group}` $\rightarrow$ `NormalizedUrlRecord`.
     * `Scam.csv` / `No_scam.csv`: `{message}` $\rightarrow$ `content.single_message`.
     * `images/`: `{image_path, case_id, turns, expected_label}` $\rightarrow$ `content.image_payload` + `content.dialogue`.
3. **Thiếu Fixture kiểm thử cho Modality Hình ảnh**:
   - Section 5.3 chỉ có 4 Fixtures (Hội thoại, Tin nhắn đơn, URL, Lai ghép). Cần bổ sung Fixture 5: *Kịch bản Ảnh chụp màn hình ứng dụng chat (Multimodal Screenshot Scenario)*.

### 3.3. Khoảng trống 3: Quy trình Làm sạch Văn bản Tiếng Việt (Vietnamese NLP Cleaning)
1. **Chuẩn hóa Unicode & Khử dấu (Diacritics & Accents)**:
   - *Đã có*: Chuẩn hóa NFC/NFKC (3.1), xử lý font toán học monospace (3.3), nén ký tự lặp (3.4).
   - *Còn thiếu*:
     * Bộ quy tắc xử lý lỗi chính tả và gõ phím tiếng Việt (Telex / VNI typo correction) đặc thù trong tin nhắn lừa đảo: ví dụ gõ nhầm dấu thanh (`ngan hangf` $\rightarrow$ `ngân hàng`, `chuyenr tieenf` $\rightarrow$ `chuyển tiền`).
     * Bộ chuyển đổi từ viết tắt thông dụng trên SMS/mạng xã hội Việt Nam (Vietnamese Internet Slang / SMS Shorthand Normalizer): `ko`/`k`/`hok` $\rightarrow$ `không`, `stk` $\rightarrow$ `số tài khoản`, `dc`/`đc` $\rightarrow$ `được`, `ck` $\rightarrow$ `chuyển khoản`, `nt` $\rightarrow$ `nhắn tin`, `tl` $\rightarrow$ `trả lời`.
2. **Xử lý Dấu câu (Punctuation) và Biểu tượng cảm xúc (Emojis)**:
   - Kẻ lừa đảo thường dùng chuỗi dấu chấm hỏi/chấm than (`???`, `!!!`) hoặc các emoji báo động (`⚠️`, `🚨`, `🔴`, `‼️`) để tạo cảm giác cấp bách giả tạo.
   - Hiện tại tài liệu chưa đặc tả quy tắc chuẩn hóa dấu câu và trích xuất đặc trưng emoji rủi ro (Emoji Risk Feature Extraction).
3. **Chiến lược Từ dừng (Stop Words Strategy)**:
   - Tài liệu chưa làm rõ chính sách từ dừng: Trong bài toán lừa đảo, các từ ngữ như *"ngay"*, *"khẩn cấp"*, *"trước khi"*, *"nếu không"* thường bị các bộ lọc NLP thông thường coi là stop words và loại bỏ, nhưng đây lại chính là **tín hiệu đe dọa / cấp bách cốt lõi (Urgency Signals)**. Cần đặc tả danh sách từ dừng chọn lọc bảo lưu tín hiệu tâm lý.

### 3.4. Khoảng trống 4: Trích xuất Đặc trưng & Chuẩn hóa URL (URL Feature Pipeline)
1. *Đã có*: Levenshtein distance kiểm tra typosquatting 48 tên miền trắng, danh sách 22 TLD rủi ro cao, cờ PaaS hosting abuse, giải mã Base64 query parameter.
2. *Còn thiếu*:
   - Tích hợp trường `pattern_group` từ `dataset_url_sampled.csv` (liên kết URL với 5 nhóm hành vi lừa đảo phổ biến tại Việt Nam: Cờ bạc/Live 18+, Tuyển CTV TMĐT, Mạo danh Ngân hàng/Ví, Lệnh bắt BCA/DVC, Đầu tư tài chính).
   - Đặc trưng từ vựng & cấu trúc nâng cao (Lexical & Structural Indicators):
     * Độ dài URL (URL Length > 150 ký tự).
     * Shannon Entropy của chuỗi hostname và path (phát hiện chuỗi ngẫu nhiên sinh bằng DGA).
     * Số lượng dấu chấm (Subdomain count > 3).
     * Phát hiện ký tự `@` trong URL (HTTP basic authentication trick: `https://vietcombank.com.vn@scam-server.xyz`).
     * Phát hiện cổng mạng bất thường (`:8080`, `:8443`, `:8888`, v.v.).
     * Phát hiện địa chỉ IP trần (IPv4/IPv6, hex/octal encoded IP).

### 3.5. Khoảng trống 5: Tiền xử lý Thị giác & OCR cho Ảnh Chụp Màn Hình (Visual/OCR Preprocessing)
Tài liệu hiện tại khuyết hoàn toàn mảng này. Cần bổ sung thiết kế chi tiết:
1. **Chuẩn hóa Kích thước & Tỷ lệ Ảnh (Resolution & Aspect Ratio Normalization)**:
   - Các ảnh chụp màn hình từ iOS, Android, Desktop có độ phân giải rất đa dạng (từ HD 720p đến 4K).
   - Thiết lập chuẩn kích thước phục vụ OCR: Giới hạn chiều dài cực đại $1,920\text{ px}$, tự động downscale ảnh quá lớn để bảo toàn bộ nhớ CPU/RAM và duy trì tỷ lệ khung hình gốc (Aspect Ratio Preservation).
2. **Tiền xử lý Nâng cao Chất lượng Ảnh (Image Enhancement & Binarization)**:
   - Chuyển đổi ảnh thang xám (Grayscale Conversion).
   - Tăng cường độ tương phản cục bộ thích nghi (Contrast Limited Adaptive Histogram Equalization - CLAHE) nhằm xử lý các ảnh chụp màn hình chế độ tối (Dark Mode) hoặc bị mờ.
   - Khử nhiễu ảnh và binarization (Adaptive Thresholding) hỗ trợ bóc tách chữ sắc nét.
3. **Phân đoạn Bố cục Bóng thoại (Chat Bubble Segmentation & Bounding Boxes)**:
   - Nhận diện tọa độ vùng chứa tin nhắn (Bounding Boxes) để phân biệt:
     * Bóng thoại người gửi (User bubble - thường căn phải, nền xanh/màu).
     * Bóng thoại đối phương (Peer/Stranger bubble - thường căn trái, nền xám/trắng).
     * Thông tin tiêu đề cuộc trò chuyện (Tên đối tượng, số điện thoại, trạng thái "Người lạ", nhãn cảnh báo viễn thông).
4. **Lựa chọn Động cơ OCR trên CPU (CPU-Optimized OCR Engine)**:
   - Do GPU RTX 4050 6GB phải dành riêng cho mô hình suy luận SLM, bộ OCR **bắt buộc phải thực thi trên CPU** mà không chiếm dụng VRAM.
   - Đánh giá và lựa chọn giải pháp: `PaddleOCR` (Vietnamese model chạy ONNX runtime trên CPU) hoặc `Tesseract OCR` tích hợp ngôn ngữ `vie`.
   - Đặc tả quy trình chuyển đổi kết quả OCR (text + bounding box + confidence) thành định dạng hội thoại có cấu trúc `{speaker, text, timestamp}` tương thích với `DialogueTurn`.

### 3.6. Khoảng trống 6: Chiến lược Trích xuất Embedding Tương thích Microservice
1. Hiện tại tài liệu chỉ nhắc đến "ONNX PhoBERT CPU Embedding" ở 3 dòng.
2. Cần đặc tả kiến trúc trích xuất embedding hoàn chỉnh:
   - **Mô hình mục tiêu**: `bkai-foundation-models/vietnamese-bi-encoder` hoặc `vinai/phobert-base-v2` xuất bản sang định dạng ONNX INT8.
   - **Môi trường thực thi**: CPU máy chủ (Intel Core i5) sử dụng tập lệnh AVX-VNNI (chiếm ~180MB RAM hệ thống, $0\%\text{ VRAM}$).
   - **Đặc tả Vector Output**: Vector 768 chiều (hoặc 384 chiều), chuẩn hóa $L2$ norm.
   - **Cơ chế lưu trữ & đối soát tương đồng (Semantic Vector Cache)**: Sử dụng HNSW Index trong bộ nhớ RAM hoặc cơ sở dữ liệu vector nhẹ để đối soát độ tương đồng cosine với ngân hàng tri thức kịch bản lừa đảo (Scam Knowledge Base) với độ trễ $<10\text{ms}$.
   - **Hợp đồng DTO Microservice**: Trường `semantic_embedding: float[]` trong payload trung gian giữa Tier 1 và Tier 2.

---

## 4. PHÂN TÍCH KHOẢNG TRỐNG CHI TIẾT TRONG `docs/REASONING_HARNESS_DESIGN.md` (GAP ANALYSIS R3)

### 4.1. Khoảng trống 1: Phân định Trách nhiệm Kiến trúc Microservice Song song (NestJS vs Python FastAPI)
Tài liệu hiện tại chỉ tập trung vào việc đóng gói Google ADK Recipe độc lập, hoàn toàn bỏ quên sự hiện diện của `BE_codex` (NestJS Gateway). Cần xác lập ma trận phân công trách nhiệm:

| Tiêu chí / Chức năng hệ thống | NestJS Gateway (`BE_codex`) | Python AI Reasoning Service (`FastAPI / ADK`) | Ghi chú Giao tiếp Liên Dịch Vụ |
| :--- | :---: | :---: | :--- |
| **Xác thực & Ủy quyền (Auth/JWT)** | ✅ Đảm nhiệm chính | ❌ Không xử lý | API Gateway bảo vệ endpoint công khai |
| **Giới hạn Tần suất (Rate Limiting)** | ✅ Throttler Guard (Redis/RAM) | ❌ Không xử lý | Ngăn chặn DoS trước khi chạm GPU |
| **Tiếp nhận & Xác thực File Upload (Images)** | ✅ Multipart/Multer validation | ❌ Chỉ nhận stream/base64 an toàn | NestJS kiểm tra MIME type, dung lượng, kích thước |
| **Phân tích Danh tiếng URL & Danh sách đen** | ✅ UrlIntelligenceService (Node) | ❌ Hỗ trợ bóc tách sâu qua Tool | Cache danh sách đen cục bộ tại Gateway |
| **Tiền xử lý OCR & Thị giác Máy tính** | ❌ Chuyển giao | ✅ CPU OCR / Vision Tool | Python xử lý PaddleOCR / Image preprocessing |
| **Suy luận Tác nhân CoT (Tier 2 SLM)** | ❌ Chuyển giao | ✅ Qwen2.5-3B Q4 trên RTX 4050 | Gọi llama.cpp HTTP nội bộ |
| **Điều phối Đa Tác nhân (Coordinator & Judge)** | ❌ Chuyển giao | ✅ Google ADK Framework | Quản lý vòng đời tác nhân phân tích |
| **Dự phòng Đám mây (Tier 3 Cloud Fallback)** | ❌ Chuyển giao | ✅ Gemini 3.7 Flash trên Vertex AI | Bảo vệ API key tại backend Python |
| **Kiểm định Bằng chứng (Evidence Verification)** | ✅ EvidenceValidator (Kiểm tra trích dẫn) | ❌ Model xuất bản candidate | NestJS đối soát quote xuất hiện trong raw text |
| **Tổng hợp Điểm Rủi ro & Phán quyết Cuối** | ✅ RiskService (Công thức chấm điểm) | ❌ Model gợi ý sơ bộ | Gateway giữ quyền phán quyết cuối cùng |
| **Khuyến nghị & Ứng phó Khẩn cấp** | ✅ GuidanceService & Emergency DTO | ❌ Chỉ sinh nội dung gợi ý | Gateway điều phối phản hồi nghiệp vụ |

**Giao thức Giao tiếp & Khế ước Dữ liệu (Inter-Service Contract)**:
- Phương thức: RESTful HTTP/2 nội bộ (hoặc gRPC). Endpoint: `POST http://fastapi-ai-service:8000/api/v1/reasoning/analyze`.
- Timeout Budget: NestJS cấu hình timeout `UPSTREAM_AI_TIMEOUT_MS = 15,000ms`. Python FastAPI cam kết hoàn tất Tier 2 trong vòng $< 5,000\text{ms}$ (P95).
- Khắc phục xung đột Enum:
  * NestJS dùng `ScamCategory`: `FINANCIAL_FRAUD`, `IMPERSONATION`, `LOTTERY_PRIZE`, `JOB_OFFER`, `PHISHING_URL`, `OTHER`, `NONE`.
  * Python SLM dùng 8 nhãn chi tiết hơn: Cần thiết lập bảng ánh xạ hai chiều (Bidirectional Enum Mapping Adapter) giữa Gateway và Reasoning Service.

### 4.2. Khoảng trống 2: Tính Khả thi và Thực tế của Bảng Ngân sách VRAM (6GB RTX 4050)
1. *Đã có*: Mô hình toán học trọng số mô hình Qwen2.5-3B Q4_K_M (1.92 GB) + KV Cache GQA (73.7 MB tại $L=2048$, $B=1$; 1.18 GB tại $L=4096$, $B=8$) + Trừ hao hệ điều hành Windows DWM (800 MB).
2. *Khoảng trống & Rủi ro Kỹ thuật cần bổ sung*:
   - **Tải trọng VRAM khi xử lý Đa phương thức (Multimodal Inference)**:
     * Nếu sử dụng mô hình thị giác đa phương thức cục bộ (như Qwen2-VL-2B hoặc Qwen2-VL-7B), dung lượng trọng số Vision Encoder + Language Model sẽ vượt quá 4.5 GB - 8.0 GB, **chắc chắn gây sập VRAM (OOM)** trên RTX 4050 6GB.
     * *Giải pháp thiết kế bắt buộc*: Tách rời quy trình thành **Pipeline 2 bước (Decoupled Vision-Language Pipeline)**:
       1. Tác vụ OCR & Trích xuất Bố cục thị giác chạy hoàn toàn trên CPU bằng PaddleOCR ONNX INT8 ($0\%\text{ VRAM}$).
       2. Văn bản trích xuất từ OCR được đưa vào mô hình Qwen2.5-3B SLM trên GPU như một lượt thoại văn bản thông thường ($0\%\text{ VRAM phát sinh thêm}$).
       3. Đối với các hình ảnh tài liệu pháp lý phức tạp (con dấu đỏ giả, lệnh bắt, con dấu Bộ Công an), hệ thống định tuyến trực tiếp lên Tier 3 Cloud (Gemini 3.7 Flash) mà không nạp mô hình VLM cục bộ.
   - **Hiện tượng dao động bộ nhớ Desktop Window Manager (DWM Fluctuation)**:
     * Trên Windows 11 khi cắm màn hình ngoài hoặc mở nhiều ứng dụng đồ họa, DWM có thể chiếm dụng từ 800 MB đến 1,200 MB. Cần nâng mức trừ hao an toàn từ 800 MB lên **1,000 MB (1.0 GB)**, kéo trần an toàn xuống **4,800 MB (4.68 GiB)**.

**Bảng Tổng hợp Ngân sách VRAM Thực tế Đã Tối Ưu Hóa (RTX 4050 6GB)**:
| Hạng mục Phân bổ Bộ nhớ | Chế độ 1: Tin nhắn đơn / URL ($B=1, L=1024$) | Chế độ 2: Hội thoại đa lượt ($B=1, L=4096$) | Chế độ 3: Batch Scoring Ngoại tuyến ($B=8, L=4096$) | Chế độ 4: Ảnh chụp màn hình (CPU OCR + SLM) |
| :--- | :---: | :---: | :---: | :---: |
| **Windows OS & DWM Overhead** | 1,000 MB | 1,000 MB | 1,000 MB | 1,000 MB |
| **CUDA Driver & Allocator Context** | 250 MB | 250 MB | 250 MB | 250 MB |
| **Trọng số Model (Qwen2.5-3B Q4_K_M)** | 1,920 MB | 1,920 MB | 1,920 MB | 1,920 MB |
| **KV Cache (FlashAttention-2 + Q8_0)** | 36.8 MB | 147.5 MB | 1,180 MB | 147.5 MB |
| **VRAM Bộ xử lý Ảnh / OCR** | 0 MB (CPU) | 0 MB (CPU) | 0 MB (CPU) | **0 MB (Chạy 100% CPU)** |
| **Activation & Compute Buffers** | 150 MB | 200 MB | 350 MB | 200 MB |
| **TỔNG VRAM CHIẾM DỤNG** | **3,356.8 MB** (3.28 GB) | **3,517.5 MB** (3.44 GB) | **4,700 MB** (4.59 GB) | **3,517.5 MB** (3.44 GB) |
| **Dung lượng VRAM Còn Dư (Margin)**| **+2,787.2 MB** (45.4%) | **+2,626.5 MB** (42.8%) | **+1,444 MB** (23.5%) | **+2,626.5 MB** (42.8%) |
| **Trạng thái Hoạt động** | ⭐ Cực kỳ an toàn | ⭐ Cực kỳ an toàn | ✅ Vừa vặn dưới trần 4.8GB | ⭐ Cực kỳ an toàn |

### 4.3. Khoảng trống 3: Thiết kế Bộ Kịch Bản Kiểm Thử (Test Harness Suites) cho Toàn Bộ Nguồn Dữ Liệu
Section 6 trong tài liệu hiện tại chỉ có 1 smoke test `test_runnability.py` kiểm tra import module. Hoàn toàn thiếu bộ kịch bản kiểm thử suy luận (Reasoning Test Harness Suites) để đánh giá mô hình. Cần bổ sung 5 Suites chuyên biệt:

1. **Suite 1: Multi-turn Dialogue Reasoning Test Suite (`conservations.json`)**:
   - Số lượng ca kiểm thử: 38 hội thoại.
   - Mục tiêu: Kiểm tra năng lực bóc tách tiến trình thao túng tâm lý qua từng lượt thoại, phát hiện sự thay đổi chức danh (impersonation consistency), nhận diện thời điểm đối tượng đưa ra yêu cầu chuyển tiền hoặc gửi ảnh CCCD.
2. **Suite 2: Malicious URL Threat Analysis Suite (`dataset_url_sampled.csv`)**:
   - Số lượng ca kiểm thử: 3,192 URL (đánh giá theo lô hoặc mẫu phân tầng theo `pattern_group`).
   - Mục tiêu: Kiểm tra khả năng phát hiện typosquatting tên miền ngân hàng/cơ quan nhà nước, cờ PaaS hosting, và khả năng giải mã tham số lừa đảo.
3. **Suite 3: Single Scam Text Detection Suite (`Scam.csv`)**:
   - Số lượng ca kiểm thử: 1,319 tin nhắn lừa đảo.
   - Mục tiêu: Đánh giá tỷ lệ phát hiện (Recall $\ge 98\%$), kiểm tra khả năng bóc tách thực thể số tài khoản, mã OTP, số tiền yêu cầu.
4. **Suite 4: False Positive Suppression Suite (`No_scam.csv`)**:
   - Số lượng ca kiểm thử: 1,930 tin nhắn hợp lệ.
   - Mục tiêu sống còn: Đo lường và kiểm soát tỷ lệ báo động nhầm (False Positive Rate $\le 2.0\%$). Đảm bảo các thông báo biến động số dư ngân hàng, mã OTP đăng nhập chính thống, tin khuyến mãi nhà mạng không bị gán nhãn nguy hiểm.
5. **Suite 5: Cross-Platform Screenshot Multimodal Suite (`images/`)**:
   - Số lượng ca kiểm thử: 50 ca kiểm thử màn hình thực tế (kèm 50 tệp ground truth).
   - Phân bổ: 22 DANGER, 18 SAFE, 10 SUSPICIOUS.
   - Mục tiêu: Đánh giá độ chính xác của pipeline bóc tách OCR trên CPU, độ nhạy đối với các giao diện chat Zalo, Messenger, SMS, và mức độ trùng khớp giữa phán quyết của mô hình và nhãn `expected_label`.

### 4.4. Khoảng trống 4: Khung Chỉ Số Đo Lường Hiệu Năng và Độ Chính Xác Đầu Cuối (E2E Evaluation Metrics)
Tài liệu cần bổ sung một chương chuyên biệt về Khung Chỉ số Đánh giá (Evaluation Metrics Framework) bao gồm:

1. **Nhóm Chỉ số Hiệu năng Phần cứng (Hardware & System Performance Metrics)**:
   - **Prefill Latency**: Thời gian xử lý prompt đầu vào (P50 $< 800\text{ms}$, P95 $< 1,200\text{ms}$).
   - **Generation / Decode Speed**: Tốc độ sinh token tự hồi quy ($\ge 65\text{ tokens/s}$).
   - **End-to-End Request Latency**: Tổng thời gian phản hồi từ lúc Gateway nhận request đến khi trả verdict (P50 $< 3.8\text{s}$, P95 $< 4.8\text{s}$).
   - **VRAM Utilization Peak**: Mức đỉnh bộ nhớ đồ họa đo bằng `pynvml` (luôn $\le 4,800\text{ MB}$, không bao giờ vượt 5,000 MB).
   - **CPU & RAM Footprint**: Mức chiếm dụng CPU Core i5 ($\le 60\%$ trung bình) và RAM hệ thống ($\le 4\text{ GB}$).
2. **Nhóm Chỉ số Độ chính xác Giám định (Classification & Detection Accuracy Metrics)**:
   - **Precision**: Tỷ lệ cảnh báo đúng trên tổng số ca cảnh báo lừa đảo ($TP / (TP + FP)$). Mục tiêu: $\ge 97.5\%$.
   - **Recall (Sensitivity)**: Tỷ lệ phát hiện lừa đảo trên tổng số ca lừa đảo thực tế ($TP / (TP + FN)$). Mục tiêu: $\ge 98.5\%$.
   - **F1-Score**: Điểm trung bình điều hòa giữa Precision và Recall. Mục tiêu: $\ge 98.0\%$.
   - **False Positive Rate (FPR)**: Tỷ lệ báo động nhầm trên tập tin nhắn sạch `No_scam.csv` ($FP / (FP + TN)$). **Ngưỡng bắt buộc: $\le 2.0\%$** (ngăn chặn tình trạng gây hoang mang cho người dùng).
   - **False Negative Rate (FNR)**: Tỷ lệ bỏ lọt lừa đảo trên tập `Scam.csv` ($FN / (FN + TP)$). **Ngưỡng bắt buộc: $\le 1.5\%$**.
   - **Per-Category Performance**: Đo lường Precision/Recall riêng cho từng kịch bản (Mạo danh cơ quan công quyền, Lừa cọc nhà hàng/khách sạn, Đầu tư tiền ảo, Lừa đảo từ thiện, Thu hoạch mã OTP).
3. **Nhóm Chỉ số Xử lý Thị giác (OCR & Visual Quality Metrics)**:
   - **Character Error Rate (CER)**: Tỷ lệ lỗi ký tự OCR trên 50 ca kiểm thử ảnh so với ground truth `texts/` (Mục tiêu: $< 3.0\%$).
   - **Word Error Rate (WER)**: Tỷ lệ lỗi từ OCR (Mục tiêu: $< 6.0\%$).
   - **Entity Extraction Recall**: Tỷ lệ trích xuất đúng số tiền, số tài khoản, mã OTP từ ảnh chụp màn hình (Mục tiêu: $\ge 96.0\%$).

### 4.5. Khoảng trống 5: Sự Cố Lỗi Thời Mô Hình Đám Mây (Model Deprecation Bug)
- **Vấn đề**: Tại các dòng 917, 943, 949 của `docs/REASONING_HARNESS_DESIGN.md`, tài liệu đề xuất sử dụng `Gemini 2.5 Flash` làm Tier 3 Cloud Fallback.
- **Ràng buộc hệ thống (`AGENTS.md`)**: Cấm tuyệt đối sử dụng `gemini-2.0-flash` hoặc `gemini-2.5-flash` do cả hai đều đã bị deprecated. Bắt buộc phải chuyển đổi sang **`gemini-3.7-flash`**.

---

## 5. BẢNG TỔNG HỢP SO SÁNH MA TRẬN KHOẢNG TRỐNG (GAP MATRIX)

| Tiêu chí Kiểm toán | Yêu cầu Kỹ thuật Phê duyệt (R1, R2, R3) | Trạng thái Hiện tại trong Docs | Mức độ Nghiêm trọng | Giải pháp Cập nhật Bắt buộc |
| :--- | :--- | :--- | :---: | :--- |
| **Bao phủ 5 Nguồn Dữ liệu** | Đủ `conservations.json`, `dataset_url_sampled.csv`, `Scam.csv`, `No_scam.csv`, `images/` | Chỉ mô tả các file cũ, hoàn toàn thiếu `images/` và `No_scam.csv` | 🔴 **CRITICAL** | Cập nhật cấu trúc Section 2 của `PREPROCESSING_DESIGN.md` thành 5 Luồng chuyên biệt tương ứng. |
| **Schema Dữ liệu Đa phương thức** | Có schema chuẩn cho cả 4 nguồn văn bản và hình ảnh | Schema OpenAPI chỉ có text/url, enum modality thiếu `image` | 🔴 **CRITICAL** | Mở rộng `UnifiedScamInspectionPayload` bổ sung trường `image_payload` và enum `image`. |
| **Làm sạch Tiếng Việt** | Diacritics, unicode NFC, typos, slang, punctuation, stop words, regex PII | Có NFC, monospace, PII; thiếu slang, typo, stop words, emoji | 🟡 **MEDIUM** | Bổ sung quy tắc Telex typo, bảng từ lóng mạng/SMS, và chính sách stop words bảo toàn rủi ro. |
| **Trích xuất Đặc trưng URL** | Chuẩn hóa RFC 3986, TLD score, typosquatting, entropy, pattern_group | Có TLD, Levenshtein; thiếu entropy, pattern_group, @ trick | 🟡 **MEDIUM** | Bổ sung Shannon entropy, phát hiện userinfo `@`, liên kết `pattern_group` vào Threat Matrix. |
| **Tiền xử lý Ảnh / OCR** | Độ phân giải, contrast, binarization, bounding box, OCR text | **0% (Hoàn toàn không có)** | 🔴 **CRITICAL** | Viết mới chương tiền xử lý ảnh trên CPU (PaddleOCR ONNX, CLAHE contrast, chat bubble segmentation). |
| **Chiến lược Embedding** | Mô hình, kích thước vector, pooling, CPU ONNX, cache, microservice DTO | Chỉ có 3 dòng nhắc thoáng qua | 🟡 **MEDIUM** | Bổ sung chi tiết mô hình `vietnamese-bi-encoder` 768-d ONNX INT8 trên CPU Core i5 và semantic cache. |
| **Ranh giới Microservice** | NestJS Gateway vs Python FastAPI Reasoning Engine | Chỉ thiết kế ADK độc lập, bỏ qua `BE_codex` | 🔴 **CRITICAL** | Thiết kế chương kiến trúc phân ranh NestJS vs FastAPI, hợp đồng REST DTO, timeout và circuit breaker. |
| **Ngân sách VRAM Thực tế** | RTX 4050 6GB: Bảng phân bổ cho cả Text và Multimodal/OCR | Bảng tính chi tiết text SLM, nhưng chưa tính tải trọng OCR/Vision | 🔴 **CRITICAL** | Bổ sung chứng minh OCR chạy 100% CPU ($0\%\text{ VRAM}$), nâng đệm DWM lên 1.0GB, lập bảng 4 chế độ. |
| **Bộ Kịch Bản Kiểm Thử** | Test Harness Suites bao phủ cả 5 nguồn dữ liệu thực | Chỉ có 1 smoke test import module ADK | 🔴 **CRITICAL** | Thiết kế 5 Suites kiểm thử chi tiết cho hội thoại, URL, scam text, benign text, và ảnh screenshot. |
| **Chỉ Số Đánh Giá E2E** | Latency percentiles, VRAM peak, Precision, Recall, FPR < 2% | Chỉ có độ trễ lý thuyết, thiếu accuracy metrics | 🔴 **CRITICAL** | Thiết lập ma trận chỉ số E2E hoàn chỉnh: P50/P95 latency, VRAM peak, Precision, Recall, F1, FPR, CER/WER. |
| **Phiên bản Model Đám mây** | Sử dụng `gemini-3.7-flash` theo AGENTS.md | Đang dùng `Gemini 2.5 Flash` (deprecated) | 🟠 **HIGH** | Chuyển đổi toàn bộ sang `Gemini 3.7 Flash`. |

---

## 6. KẾ HOẠCH HÀNH ĐỘNG ĐỀ XUẤT (ACTIONABLE ROADMAP)

Để đưa hai tài liệu thiết kế đạt trạng thái xuất sắc (Zero-Defect, Production-Ready) theo đúng chuẩn kiến trúc của dự án, các bước triển khai tiếp theo cần thực hiện:

### Bước 1: Tối ưu hóa toàn diện `docs/PREPROCESSING_DESIGN.md`
1. Viết lại Section 1.2 và Section 2 để phản ánh chính xác 5 nguồn dữ liệu thực tế:
   - Luồng 1: `conservations.json` (38 hội thoại).
   - Luồng 2: `dataset_url_sampled.csv` (3,192 URL kèm `pattern_group`).
   - Luồng 3: `Scam.csv` (1,319 tin nhắn lừa đảo).
   - Luồng 4: `No_scam.csv` (1,930 tin nhắn dịch vụ hợp lệ / chống False Positive).
   - Luồng 5 (Mới): `images/` (50 ca kiểm thử ảnh chụp màn hình đa nền tảng, bóc tách OCR trên CPU).
2. Mở rộng Section 3: Bổ sung bộ quy chuẩn Telex typo correction, bảng chuyển đổi từ lóng SMS, và chính sách bảo tồn từ dừng cấp bách.
3. Mở rộng Section 5: Bổ sung enum `image` vào `modality`, thêm `image_payload` vào `content`, và viết thêm Fixture 5 (Ảnh chụp màn hình).
4. Hoàn thiện Section 6 & 7: Chi tiết hóa chiến lược trích xuất Embedding PhoBERT/Bi-Encoder trên CPU.

### Bước 2: Tối ưu hóa toàn diện `docs/REASONING_HARNESS_DESIGN.md`
1. Cập nhật Section 2: Xác lập ranh giới rõ ràng giữa NestJS Gateway (`BE_codex`) và Python FastAPI Reasoning Service, kèm sơ đồ luồng dữ liệu song song và ánh xạ DTO.
2. Hoàn thiện Section 4: Cập nhật bảng ngân sách VRAM 4 kịch bản trên RTX 4050 6GB (chứng minh OCR chạy trên CPU, trần an toàn 4,800 MB).
3. Nâng cấp Section 5: Đổi `Gemini 2.5 Flash` thành `Gemini 3.7 Flash` cho Tier 3 Cloud Fallback.
4. Viết mới toàn bộ Section 6: Thay thế bài test runnability đơn lẻ bằng hệ thống **5 Test Harness Suites** bao phủ 5 nguồn dữ liệu thực tế và **Khung chỉ số đánh giá E2E** (Latency, VRAM, Precision, Recall, F1, False Positive Rate $\le 2\%$, CER/WER).

---
*Báo cáo được khởi tạo bởi tác nhân `explorer_docs_1` - ScamShieldAI Architecture Team.*
