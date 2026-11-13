# BÁO CÁO BÀN GIAO ĐIỀU TRA & KHẢO SÁT KHOẢNG TRỐNG THIẾT KẾ
## (HANDOFF REPORT: GAP ANALYSIS OF DESIGN DOCS & DATA PIPELINES)

- **Tác nhân thực hiện**: `explorer_docs_1` (Teamwork Explorer Agent)
- **Hội thoại ID**: `432694ab-6553-40df-9bc8-fcc8d4bc623c`
- **Tác nhân điều phối (Parent)**: `432e0a44-5488-4ca3-b0fb-fd41e17d59f3`
- **Trạng thái**: Hoàn thành xuất sắc (Task Complete - Hard Handoff)
- **Thời điểm bàn giao**: 2026-11-12T10:22:00Z

---

## 1. QUAN SÁT THỰC NGHIỆM (OBSERVATION)

1. **Khảo sát tệp tài liệu thiết kế hiện có**:
   - `docs/PREPROCESSING_DESIGN.md` (85,368 bytes, 1,100 dòng):
     * Dòng 61-65: Định nghĩa 4 nguồn thô cũ: *(A) 5 Thư mục JSON Thoại (38 Dialogues), (B) dataset_url.csv (53,117 URLs), (C) full_dataset.csv (4,492 Rows), (D) sample.csv (772 Mẫu SMS)*.
     * Dòng 494-498: Trường `modality` trong JSON Schema chỉ chứa `["dialogue", "single_message", "url", "hybrid"]`.
     * Tìm kiếm từ khóa `OCR|screenshot|image|tesseract|paddleocr|vision|hình ảnh`: Kết quả 0 kết quả về xử lý ảnh (chỉ có từ ngữ chứa "cảnh", "mảnh").
     * Dòng 96, 254, 1078: Chỉ có 3 câu ngắn nhắc đến *"ONNX PhoBERT CPU Embedding"*, không có đặc tả kiến trúc vector, kích thước chiều hay cơ chế lưu trữ.
   - `docs/REASONING_HARNESS_DESIGN.md` (77,937 bytes, 1,079 dòng):
     * Dòng 80-117: Thiết kế tập trung vào việc đóng gói Google ADK Recipe độc lập (`core/python/scamshield-reasoning-harness`). Không có bất kỳ dòng nào nhắc đến `BE_codex` (NestJS Gateway).
     * Dòng 720-786: Tính toán VRAM chi tiết cho Qwen2.5-3B Q4_K_M (1.92 GB) + KV Cache GQA, nhưng 100% giả định văn bản thuần túy, chưa tính tải trọng khi xử lý ảnh hoặc OCR.
     * Dòng 917, 943, 949: Đề xuất sử dụng `Gemini 2.5 Flash` cho Tier 3 Cloud Fallback (vi phạm quy tắc AGENTS.md cấm 2.0 và 2.5).
     * Dòng 985-1046: Chỉ có một bài smoke test `tests/test_runnability.py` kiểm tra import ADK `root_agent is not None`. Hoàn toàn không có Test Harness Suites cho 5 nguồn dữ liệu thực tế.
2. **Khảo sát dữ liệu thực tế tại `data_demo/`**:
   - `conservations.json`: 186,116 bytes, gồm 38 hội thoại với 628 lượt thoại, cấu trúc `[{id: int, dialogue: [{role: string, content: string}]}]`. 5 thư mục nguồn cũ đã bị xóa.
   - `dataset_url_sampled.csv`: 269,508 bytes, 3,192 dòng dữ liệu + 1 dòng header, gồm 4 cột: `channel`, `label`, `url_norm`, `pattern_group`. Tệp `dataset_url.csv` (53k dòng) không còn tồn tại.
   - `Scam.csv`: 185,900 bytes, 1,319 dòng dữ liệu duy nhất, 1 cột `message`, UTF-8 chuẩn (đã được khử trùng lặp và sửa lỗi mã hóa CP1252), chứa 27 dòng multiline.
   - `No_scam.csv`: 492,833 bytes, 1,930 dòng dữ liệu duy nhất, 1 cột `message`, UTF-8 chuẩn (đã khử trùng lặp và BOM), chứa 524 dòng multiline RFC 4180. Tệp `full_dataset.csv` và `sample.csv` không còn tồn tại.
   - `images/`: Gồm thư mục `images/` (50 ảnh `.jpg`/`.png`), `texts/` (50 tệp ground truth), và `metadata.json` (50 ca kiểm thử với phân bổ nhãn: 22 DANGER, 18 SAFE, 10 SUSPICIOUS).
3. **Khảo sát mã nguồn Backend Gateway (`BE_codex`)**:
   - `BE_codex/src/analysis/analysis.service.ts` và `BE_codex/src/ai/ai-analysis-provider.ts`:
     * Đã có sẵn kiến trúc gateway tiếp nhận `POST /api/v1/analysis/text` và `POST /api/v1/analysis/images`.
     * `AiAnalysisProvider` interface trả về `AiAnalysisCandidate` (`canAssess`, `suggestedCategory`, `summary`, `evidence: [{quote, reason, signalType, imageIndex}]`, `recommendedActions`, `speechSummary`).
     * `RiskService` tại NestJS nắm quyền tính điểm số rủi ro (0-100) và ánh xạ `RiskLevel` (`SAFE`, `SUSPICIOUS`, `DANGER`).

---

## 2. CHUỖI SUY LUẬN LOGIC (LOGIC CHAIN)

1. *Từ Quan sát 1 & 2*: Dữ liệu thực tế tại `data_demo/` đã được tinh gọn và chuyển đổi cấu trúc (thay thế 5 folder và các tệp cũ bằng 4 tệp dữ liệu văn bản/URL và 1 thư mục `images/` 50 ảnh). Trong khi đó, `docs/PREPROCESSING_DESIGN.md` vẫn tham chiếu cấu trúc cũ và hoàn toàn thiếu vắng tiền xử lý hình ảnh. $\rightarrow$ **Suy luận**: `PREPROCESSING_DESIGN.md` bắt buộc phải được cập nhật lại toàn bộ Section 2 thành 5 Luồng tương ứng với 5 nguồn thực tế, đặc biệt phải thiết kế mới luồng OCR/Visual Preprocessing trên CPU cho `images/` và mở rộng schema `UnifiedScamInspectionPayload` để hỗ trợ `modality: "image"`.
2. *Từ Quan sát 1 & 3*: Hiện tại repo đã có sẵn NestJS Gateway (`BE_codex`) đóng vai trò nhận request công khai, xác thực, giới hạn tần suất, kiểm tra trích dẫn và chấm điểm rủi ro. Tuy nhiên, `docs/REASONING_HARNESS_DESIGN.md` chỉ mô tả ADK Python độc lập mà không hề đề cập đến `BE_codex`. $\rightarrow$ **Suy luận**: `REASONING_HARNESS_DESIGN.md` đang thiếu mảnh ghép kiến trúc microservice song song. Cần đặc tả rõ ràng phân định trách nhiệm: NestJS làm API Gateway và Python FastAPI làm AI Reasoning Service, kèm giao thức HTTP REST/A2A và bảng ánh xạ DTO hai chiều.
3. *Từ Quan sát 1*: RTX 4050 chỉ có 6GB VRAM. Mô hình ngôn ngữ 3B đã chiếm 1.92 GB trọng số và 1.18 GB KV Cache ($B=8$). Nếu nạp thêm mô hình thị giác (VLM) trên GPU, hệ thống sẽ lập tức sụt bộ nhớ (OOM). $\rightarrow$ **Suy luận**: Quy trình OCR và bóc tách bố cục thị giác cho ảnh chụp màn hình **bắt buộc phải thực thi 100% trên CPU (Core i5)** bằng công nghệ nhẹ như PaddleOCR/Tesseract ONNX, giữ mức tiêu thụ VRAM của tầng thị giác ở mức $0\text{ MB}$. Các tài liệu phức tạp cần leo thang trực tiếp lên Tier 3 Cloud.
4. *Từ Quan sát 1 & 2*: Section 6 của `REASONING_HARNESS_DESIGN.md` hiện chỉ chứa 1 bài smoke test cấu trúc `test_runnability.py`. $\rightarrow$ **Suy luận**: Tài liệu chưa đáp ứng yêu cầu R3 về việc thiết kế quy trình kiểm thử suy luận (reasoning harness) và đánh giá mô hình. Bắt buộc phải bổ sung **5 Test Harness Suites** đại diện cho 5 nguồn dữ liệu thực tế (`conservations.json`, `dataset_url_sampled.csv`, `Scam.csv`, `No_scam.csv`, `images/`) và **Khung chỉ số đánh giá E2E** (Latency P50/P95, Throughput, VRAM peak, Precision, Recall, F1, FPR $\le 2\%$).
5. *Từ Quan sát 1*: Quy tắc người dùng tại `AGENTS.md` cấm sử dụng `gemini-2.0-flash` và `gemini-2.5-flash`. $\rightarrow$ **Suy luận**: Toàn bộ các vị trí đề cập đến `Gemini 2.5 Flash` trong tài liệu suy luận phải được sửa đổi thành `gemini-3.7-flash`.

---

## 3. CÁC ĐIỀU KIỆN LOẠI TRỪ & GIẢ ĐỊNH (CAVEATS)

1. **Phạm vi khảo sát là Read-Only**: Tác nhân tuyệt đối không can thiệp hay sửa đổi bất kỳ tệp dữ liệu nguồn hay mã nguồn nào trong quá trình khảo sát. Toàn bộ báo cáo và phát hiện được lưu tại `.agents/teamwork/explorer_docs_1/`.
2. **Thư mục `test_dataset_multiturn/`**: Thư mục này chứa 112 ảnh đa lượt liên tiếp (`sequence_tag: 1/4`), được coi là tập dữ liệu mở rộng cho kịch bản chuỗi thời gian. Bộ 50 ảnh tại `images/` được xác định là tập kiểm thử chuẩn mực theo yêu cầu R1.
3. **Tên tệp `conservations.json`**: Tệp thực tế mang tên `conservations.json` (chứa lỗi chính tả chữ 'r' trước 'v'). Thiết kế cần bảo toàn đường dẫn tệp thực tế này mà không tự ý đổi tên tệp nguồn.

---

## 4. KẾT LUẬN & ĐỀ XUẤT HÀNH ĐỘNG (CONCLUSION)

Cuộc điều tra xác nhận rằng cả hai tài liệu thiết kế hiện tại đều sở hữu nền tảng lý thuyết và giải thuật rất tốt nhưng tồn tại các khoảng trống lớn so với dữ liệu thực tế và kiến trúc microservice mục tiêu.

**Đề xuất hành động bàn giao cho tác nhân cập nhật tài liệu (Worker Writer)**:
1. **Cập nhật `docs/PREPROCESSING_DESIGN.md`**:
   - Tái cấu trúc Section 2 thành 5 Luồng tiền xử lý tương ứng với 5 nguồn dữ liệu thực tế.
   - Thêm Luồng 5: Tiền xử lý Ảnh chụp màn hình đa nền tảng & OCR trên CPU.
   - Bổ sung `modality: "image"` và `image_payload` vào OpenAPI Schema Draft 2020-12 (Section 5).
   - Bổ sung bộ chuẩn hóa Telex typo, từ lóng SMS, và chính sách từ dừng bảo tồn rủi ro.
   - Đặc tả chi tiết kiến trúc trích xuất Embedding trên CPU (PhoBERT/Bi-Encoder ONNX INT8).
2. **Cập nhật `docs/REASONING_HARNESS_DESIGN.md`**:
   - Bổ sung phân định trách nhiệm rõ ràng giữa NestJS Gateway (`BE_codex`) và Python FastAPI Reasoning Service.
   - Cập nhật bảng ngân sách VRAM 4 chế độ chứng minh an toàn tuyệt đối trên RTX 4050 6GB (OCR chạy 100% CPU).
   - Đổi toàn bộ tham chiếu mô hình đám mây sang `gemini-3.7-flash`.
   - Viết mới Section 6 với **5 Test Harness Suites** cho 5 nguồn dữ liệu thực tế và **Khung chỉ số đánh giá E2E** (Precision, Recall, F1, False Positive Rate $\le 2\%$, Latency P50/P95, VRAM peak).

---

## 5. PHƯƠNG PHÁP KIỂM CHỨNG ĐỘC LẬP (VERIFICATION METHOD)

Kiểm toán viên độc lập có thể thẩm định các kết luận trong báo cáo bằng các lệnh sau trên PowerShell:

1. **Kiểm tra sự tồn tại và số lượng của 5 nguồn dữ liệu thực tế**:
   ```powershell
   # 1. Kiểm tra conservations.json (38 dialogues)
   python -c "import json; data=json.load(open('data_demo/conservations.json', encoding='utf-8')); assert len(data) == 38; print('Conversations OK:', len(data))"

   # 2. Kiểm tra dataset_url_sampled.csv (3,192 dòng + header)
   python -c "import csv; rows=list(csv.reader(open('data_demo/dataset_url_sampled.csv', encoding='utf-8'))); assert len(rows) == 3193; print('URLs OK:', len(rows)-1)"

   # 3. Kiểm tra Scam.csv (1,319 dòng) và No_scam.csv (1,930 dòng)
   python -c "import csv; s=list(csv.reader(open('data_demo/Scam.csv', encoding='utf-8'))); ns=list(csv.reader(open('data_demo/No_scam.csv', encoding='utf-8'))); assert len(s)==1320 and len(ns)==1931; print('Scam/No_scam OK:', len(s)-1, len(ns)-1)"

   # 4. Kiểm tra 50 ảnh và metadata.json
   python -c "import json; data=json.load(open('data_demo/images/metadata.json', encoding='utf-8')); assert len(data) == 50; print('Images OK:', len(data))"
   ```

2. **Kiểm tra khoảng trống vắng mặt của ảnh trong `PREPROCESSING_DESIGN.md`**:
   ```powershell
   Select-String -Path docs/PREPROCESSING_DESIGN.md -Pattern "\b(OCR|screenshot|paddleocr|tesseract)\b" -CaseSensitive:$false
   # Kết quả mong đợi: 0 dòng kết quả (chứng minh hoàn toàn vắng bóng thiết kế ảnh)
   ```

3. **Kiểm tra vi phạm model deprecated trong `REASONING_HARNESS_DESIGN.md`**:
   ```powershell
   Select-String -Path docs/REASONING_HARNESS_DESIGN.md -Pattern "Gemini 2.5 Flash"
   # Kết quả mong đợi: Khớp tại các dòng 917, 943, 949 (cần sửa sang gemini-3.7-flash)
   ```

---
*Tệp phân tích chuyên sâu chi tiết đính kèm: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\explorer_docs_1\analysis.md`.*
