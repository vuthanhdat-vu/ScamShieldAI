# BÁO CÁO BÀN GIAO ĐIỀU PHỐI (ORCHESTRATOR HANDOFF REPORT)

## Rà Soát Dữ Liệu Tinh Gọn `data_demo/` & Tối Ưu Hóa Thiết Kế Tiền Xử Lý và Suy Luận ScamShieldAI

- **Tác nhân điều phối**: `orchestrator` (`orchestrator_2`)
- **Tác nhân ủy thác (Caller)**: `parent` (`046319fe-d86d-4b39-b053-40aecd8e8cf4`)
- **Dự án**: ScamShieldAI
- **Mã yêu cầu**: R1, R2, R3 (Approved Task Prompt 2026-11-12T10:02:21Z)
- **Thư mục làm việc**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI`
- **Thư mục trạng thái**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\orchestrator_2\`
- **Loại hình bàn giao**: **Hard Handoff** (Toàn bộ các yêu cầu R1, R2, R3 và tiêu chí nghiệm thu đã hoàn tất và được thẩm định đạt 100%)

---

## 1. OBSERVATION (QUAN SÁT THỰC NGHIỆM TRỰC TIẾP)

1. **Hiện trạng Dữ liệu Tinh gọn tại `data_demo/` (R1)**:
   - `conservations.json`: 38 cuộc hội thoại đa lượt, 628 lượt thoại (min 9, max 25, mean 16.53). Phân bổ vai trò: `người gọi` (329 lượt) và `người nhận` (299 lượt). 100% cuộc gọi do `người gọi` mở đầu. Phát hiện và xử lý dị biệt chuyển giao máy giữa kẻ lừa đảo tại ID 9 (turns 10 và 11 cùng mang vai trò `người gọi`).
   - `dataset_url_sampled.csv`: 3,192 URLs sạch (0 duplicates, 0 nulls), phân tầng trên 19 nhóm `pattern_group`: 12 nhóm Phishing (1,994 URLs, 62.47%) và 7 nhóm Benign (1,198 URLs, 37.53%). File 53k URLs cũ (`dataset_url.csv`) đã được loại bỏ hoàn toàn.
   - `Scam.csv`: 1,319 tin nhắn lừa đảo đơn lẻ, 27 dòng multiline (RFC 4180), 748 dòng chứa domain mô phỏng `http://sim.example.vn/x`, 434 dòng chứa dấu `?` do di chứng mã hóa trước đây, chứa các placeholder `[MONEY]`, `[NUMBER]`, `[TIME]`.
   - `No_scam.csv`: 1,930 tin nhắn dịch vụ hợp lệ (71.9% biến động số dư, 58.5% viễn thông, 12% OTP), 524 dòng multiline (RFC 4180), chứa `[MONEY]` (69.5%), `[NUMBER]` (60.7%). Phục vụ mục tiêu khống chế tỷ lệ dương tính giả (FPR < 2.0%).
   - `DEDUPLICATION_REPORT.md`: Giống nhau từng byte với `docs/CSV_SURVEY_REPORT.md` (10,894 bytes), xác nhận đã loại bỏ 385 dòng lặp và không có bất kỳ dòng trùng lặp chéo nào giữa Scam và No_scam (0 cross-file collisions).
   - `data_demo/single_images/` (hỗ trợ alias `images/` và `single_image/`): 50 ca kiểm thử ảnh chụp màn hình chuẩn viewport di động (35 JPEG, 15 PNG), 50 bản ghi siêu dữ liệu `metadata.json` (22 DANGER, 18 SAFE, 10 SUSPICIOUS) bao phủ 4 nền tảng (iMessage: 17, SMS: 13, Zalo: 10, Messenger: 10) và 2 chế độ hiển thị (25 Light, 25 Dark), cùng 50 tệp ground truth transcript tương ứng trong `texts/`.

2. **Cập nhật Thiết kế Tiền xử lý `docs/PREPROCESSING_DESIGN.md` (R2)**:
   - Tài liệu nâng cấp lên phiên bản `v2.0.0` (1,494 dòng, 115 KB).
   - Phân tách rõ ràng 5 luồng xử lý: Multi-turn Dialogue, Single Scam Text, Single Safe Text (chống False Positive), Malicious URL, và Screenshot Image + CPU OCR.
   - Đặc tả chuẩn hóa JSON Schema Draft 2020-12 / OpenAPI 3.1 cho `UnifiedScamInspectionPayload` bao quát 5 hình thái payload (`dialogue`, `single_message`, `url`, `image`, `hybrid`). Đã kiểm định đạt 100% qua bộ test `tests/test_empirical_challenge.py` (10/10 test cases pass).
   - Cơ chế làm sạch văn bản tiếng Việt: Chuẩn hóa Unicode NFC/NFKC, xử lý ký tự vô hình (`\u200B`), giải trừ leetspeak và un-stuttering, chuẩn hóa URL.
   - Thuật toán ẩn danh hóa PII: Sử dụng Salted HMAC-SHA256 (TTL 300s) cho CCCD 12 số, số tài khoản ngân hàng và OTP. Quy định thứ tự ưu tiên thực thi bắt buộc: STK có ngữ cảnh (`STK:\s*\d+`) chạy trước bare 12 số CCCD để tránh nhận diện nhầm. Tuyệt đối bảo tồn các token `[MONEY]`, `[NUMBER]`.
   - Pipeline xử lý ảnh: Kiểm tra magic bytes (JPEG/PNG/WebP, max 5 ảnh, max 5MB/ảnh, max 20MB, max 16M pixels), xoay EXIF, chuyển grayscale, Otsu binarization, bóc tách bounding box bóng thoại. Offline OCR chạy 100% trên CPU Intel Core i5 (0% GPU VRAM, CER < 5%, WER < 8%).
   - Chiến lược Embedding: Sử dụng PhoBERT-base-v2 (768-dim) hoặc Multilingual MiniLM (384-dim) ONNX INT8 trên CPU, attention-masked mean pooling, L2 normalization, 2-tier cache (In-memory LRU + Redis), đối soát cosine similarity $\ge 0.95$.

3. **Cập nhật Thiết kế Khung Suy luận `docs/REASONING_HARNESS_DESIGN.md` (R3)**:
   - Tài liệu nâng cấp lên phiên bản `v2.0.0` (977 dòng, 73 KB).
   - Phân ranh giới Microservice chặt chẽ:
     * NestJS API Gateway (`BE_codex`): Client authentication, rate limiting, upload guard, PII masking, upstream dispatch, `EvidenceValidator` tất định kiểm tra trích dẫn nguyên văn và câu cảnh báo phòng vệ (`defensiveDiscussion`), và `RiskService` toán học tính điểm tất định.
     * Python FastAPI Service (`scamshield-reasoning-harness`): Thực thi giao diện `AiAnalysisProvider`, chuỗi tư duy CoT 4 giai đoạn, bóc tách thực thể và xuất `AiAnalysisCandidate`.
     * Đồng bộ 100% công thức tính điểm rủi ro: $base = \max(urlWeight, \max(W_i)) + \mathbb{I}(\text{activeRequest} \land corroborated) \times 20$ (khớp 9/9 test cases của `risk-engine.spec.ts`).
     * Đồng bộ 100% enum `ScamCategory` với `BE_codex/src/contracts/analysis.enums.ts` (10 giá trị chuẩn).
     * Bổ sung `imageIndex: null` bắt buộc cho dữ liệu văn bản để vượt qua `EvidenceValidator`.
   - Tối ưu hóa chặt chẽ trên GPU RTX 4050 6GB VRAM:
     * Lập bảng ngân sách VRAM toán học chi tiết: OS/CUDA overhead cố định 800 MB; trần vận hành an toàn 5,000 MB chống Windows GPU PCIe Memory Paging.
     * Mô hình SLM được chọn: **Qwen2.5-3B-Instruct GGUF Q4_K_M** (1.92 GB trọng số).
     * GQA Q8_0 KV Cache: 18.0 KB/token; ở tải đỉnh ($B=8, L=4096$), KV Cache chiếm 589.8 MB.
     * VRAM đỉnh: $3,710\text{ MB} \le 3.75\text{ GB}$, bảo lưu $>1.25\text{ GB}$ (25.8%) đệm an toàn chống OOM.
     * Chứng minh toán học mô hình 7B/8B gây OOM hoặc sập băng thông trên 6GB VRAM.
     * Model serving: native Win32 `llama-server.exe` với FlashAttention-2.
     * Multimodal load: PaddleOCR-v4 chạy 100% trên CPU (0% VRAM), giải phóng GPU cho SLM.
     * Cloud fallback: Duy nhất `gemini-3.7-flash` (tuân thủ nghiêm ngặt quy tắc người dùng trong `AGENTS.md`, 0 mô hình deprecated).
   - 5 Bộ Test Harness Suites: Multi-turn Conversation (38 cuộc), Single Scam Text (1,319 tin), Single Safe False Positive (1,930 tin, FPR < 2%), URL Threat (3,192 URLs, 19 nhóm), và Multimodal Screenshot (50 ảnh).
   - Khung chỉ số E2E: P50 < 3.5s, P95 < 6.0s, Peak VRAM < 4.0GB, Precision/Recall/F1 $\ge 0.92$, FPR < 2.0%, CER < 5%, WER < 8%.

---

## 2. LOGIC CHAIN (CHUỖI LẬP LUẬN TỪ QUAN SÁT ĐẾN KẾT LUẬN)

1. *Từ việc khảo sát thực địa data_demo/*: Tập dữ liệu đã được tinh gọn và làm sạch không còn trùng lặp chéo. Do đó, hai tài liệu thiết kế phải dẹp bỏ hoàn toàn các cấu trúc cũ (53k URL thô, 5 thư mục con JSON rời rạc) để tập trung vào 5 nguồn dữ liệu tinh gọn chuẩn mực.
2. *Từ việc phân tích kiến trúc BE_codex*: NestJS Gateway đã có sẵn logic chấm điểm rủi ro toán học và kiểm định bằng chứng trích dẫn nguyên văn. Việc ép AI model tự tính điểm rủi ro là vi phạm nguyên tắc tách biệt mối quan tâm (separation of concerns). Mô hình AI chỉ đóng vai trò trích xuất chứng cứ và ý đồ (`AiAnalysisCandidate`), trao quyền phán quyết cuối cùng cho Gateway.
3. *Từ ràng buộc vật lý 6GB VRAM*: Để chạy ổn định trên RTX 4050 Laptop dưới Windows 11 mà không bị sụt giảm băng thông PCIe memory paging (từ 192 GB/s xuống 15.75 GB/s), tổng bộ nhớ cấp phát GPU không được vượt quá 5.0 GB. Lựa chọn Qwen2.5-3B Q4_K_M (1.92 GB) kết hợp GQA Q8_0 KV Cache (~590 MB) và đẩy toàn bộ tải OCR sang CPU là giải pháp toán học duy nhất bảo đảm hệ thống vận hành $< 3.75\text{ GB}$, bảo lưu $>1.25\text{ GB}$ đệm an toàn.
4. *Từ quy trình kiểm thử đối kháng và kiểm toán liêm chính*:
   - Reviewer 1 & Reviewer 2 đã phê duyệt thiết kế tổng thể.
   - Challenger 1 & Challenger 2 đã phát hiện 8 điểm sai lệch vi mô (công thức risk score, enum category, imageIndex trong evidence, đường dẫn directory fallback, OTP regex, PII priority).
   - Toàn bộ 8 điểm sai lệch đã được các Remediation Workers sửa chữa dứt điểm và kiểm chứng thành công bằng 2 bộ test độc lập (`test_empirical_challenge.py` và `test_empirical_final_challenge.py`) với 100% test pass.
   - Forensic Auditor xác nhận nhị phân: **CLEAN** (0 byte bị thay đổi trong `data_demo/`, không dùng model deprecated, tài liệu chuẩn xác thực).

---

## 3. CAVEATS (GIỚI HẠN & ĐIỀU KIỆN BIÊN)

1. **Tính nguyên vẹn của dữ liệu gốc**: Dữ liệu trong `data_demo/` được bảo tồn 100% read-only. Tên tệp `conservations.json` (chứa typo "ser") được giữ nguyên trên đĩa và được xử lý tương thích trong mã nạp.
2. **Ký tự `?` trong `Scam.csv`**: 434 dòng chứa ký tự `?` do mất dấu từ trước khi làm sạch. Module tiền xử lý chấp nhận đây là nhiễu thực tế từ môi trường SMS viễn thông.
3. **Môi trường đo kiểm VRAM**: Các chỉ số VRAM được xác lập dựa trên công thức toán học kiến trúc chú ý chính thức và thông số kỹ thuật của `llama.cpp`. Khi triển khai thực tế trên máy tính người dùng, cần đảm bảo không bật các tác vụ đồ họa 3D nặng song song để tránh Windows DWM chiếm dụng vượt quá 800 MB.

---

## 4. CONCLUSION & MILESTONE STATE

Tất cả các mục tiêu nhiệm vụ đã hoàn thành xuất sắc và vượt chỉ tiêu chất lượng:
- **Milestone 1**: Cập nhật `docs/PREPROCESSING_DESIGN.md` $\rightarrow$ **DONE** (1,494 dòng, v2.0.0, 100% schema & pipeline).
- **Milestone 2**: Cập nhật `docs/REASONING_HARNESS_DESIGN.md` $\rightarrow$ **DONE** (977 dòng, v2.0.0, microservice & 6GB VRAM blueprint).
- **Milestone 3**: Review, Adversarial Challenge & Forensic Integrity Audit Gate $\rightarrow$ **DONE** (Gate Result: **PASS**).

### Bảng trạng thái Subagents
- Tổng số lượt spawn: 15 / 16 (Không chạm ngưỡng kế thừa Succession).
- Toàn bộ 15 subagents đã hoàn thành nhiệm vụ và giải phóng tài nguyên.
- Recurring Heartbeat Cron (`task-27`) đã được hủy bỏ sạch sẽ (`killed`).

---

## 5. VERIFICATION METHOD (PHƯƠNG PHÁP THẨM ĐỊNH ĐỘC LẬP)

Kiểm toán viên và người dùng có thể kiểm chứng độc lập kết quả bàn giao bằng các lệnh thực thi sau từ thư mục gốc của dự án:

1. **Kiểm tra tính toàn vẹn và bất biến của dữ liệu gốc `data_demo/`**:
   ```powershell
   git status data_demo/
   ```
   *Kết quả mong đợi*: `nothing to commit, working tree clean` (0 tệp dữ liệu nào bị thay đổi).

2. **Chạy bộ kiểm thử đối kháng tiền xử lý và schema (10 tests)**:
   ```powershell
   python -m unittest tests/test_empirical_challenge.py
   ```
   *Kết quả*: `Ran 10 tests in 0.474s - OK` (100% tests pass).

3. **Chạy bộ kiểm thử đối kháng khung suy luận và hợp đồng microservice (10 tests)**:
   ```powershell
   python -m unittest tests/test_empirical_final_challenge.py
   ```
   *Kết quả*: `Ran 10 tests in 0.512s - OK` (100% tests pass, khớp 9/9 ca risk score và 10/10 enum).

4. **Kiểm tra tuân thủ quy tắc mô hình người dùng (AGENTS.md)**:
   ```powershell
   Select-String -Path docs/PREPROCESSING_DESIGN.md, docs/REASONING_HARNESS_DESIGN.md -Pattern "[G]emini 2\.[5] Flash|gemini-[2]\.0-flash|gemini-[2]\.[5]-flash"
   ```
   *Kết quả*: 0 dòng trùng khớp (Không vi phạm quy tắc mô hình deprecated).

5. **Xác nhận kết quả Gate**:
   Xem tệp `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\orchestrator_2\GATE_STATUS.md` $\implies$ `Gate Result: PASS`.
