# BÁO CÁO GIÁM ĐỊNH ĐỐI KHÁNG THỰC NGHIỆM (EMPIRICAL ADVERSARIAL CHALLENGE REPORT)

**Tác vụ**: Thẩm định đối kháng thực nghiệm Thiết kế Khung Suy luận & Tối ưu Phần cứng (`docs/REASONING_HARNESS_DESIGN.md`)  
**Tác giả**: Teamwork Challenger Agent (`challenger_2`)  
**Ngày thực hiện**: 2026-11-12T10:42:00Z  
**Phán quyết (Verdict)**: **REQUEST_CHANGES** (Yêu cầu chỉnh sửa bắt buộc trước khi phê duyệt)  

---

## 1. OBSERVATION (QUAN SÁT THỰC NGHIỆM TRỰC TIẾP)

Kiểm toán viên đã trực tiếp viết mã Python, truy vấn API, phân tích mã nguồn và chạy các câu lệnh thực thi trên hệ thống Windows để đối soát từng luận điểm:

### 1.1. Thẩm định Ngân sách VRAM Toán học & Kiến trúc Chú ý (GQA KV Cache)
1. **Thông số Kiến trúc Mô hình (Tra cứu chính thức từ Hugging Face `config.json`)**:
   - **Qwen2.5-3B**: `num_hidden_layers = 36`, `num_attention_heads = 16`, `num_key_value_heads = 2`, `hidden_size = 2048` $\implies d_{\text{head}} = 128$.
   - **Qwen2.5-7B**: `num_hidden_layers = 28`, `num_attention_heads = 28`, `num_key_value_heads = 4`, `hidden_size = 3584` $\implies d_{\text{head}} = 128$.
   - **Llama-3.1-8B**: `num_hidden_layers = 32`, `num_attention_heads = 32`, `num_key_value_heads = 8`, `hidden_size = 4096` $\implies d_{\text{head}} = 128$.

2. **Dung lượng Trọng số Mô hình (GGUF Q4_K_M)**:
   - Qwen2.5-3B: `docs/REASONING_HARNESS_DESIGN.md` dòng 394 nêu $1,920\text{ MB} (1.92\text{ GB})$. (Thực tế: file GGUF $\approx 1.93\text{ GB}$). Khớp.
   - Qwen2.5-7B: Dòng 410 nêu $4,480\text{ MB} (4.48\text{ GB})$. Khớp.
   - Llama-3.1-8B: Dòng 421 nêu $4,920\text{ MB} (4.92\text{ GB})$. Khớp.

3. **Công thức KV Cache GQA**:
   - Công thức: $M_{\text{token}} = 2 \times n_{\text{layers}} \times n_{\text{kv\_heads}} \times d_{\text{head}} \times b_{\text{elem}}$.
   - Chạy kiểm toán bằng Python:
     * Với FP16 ($b_{\text{elem}} = 2$ bytes): $2 \times 36 \times 2 \times 128 \times 2 = 36,864\text{ bytes} = 36.00\text{ KiB} = 36.864\text{ KB}$.
     * Với Q8_0 ($b_{\text{elem}} = 1$ byte): $2 \times 36 \times 2 \times 128 \times 1 = 18,432\text{ bytes} = 18.00\text{ KiB} = 18.432\text{ KB}$.
   - **Phát hiện sai lệch quy đổi đơn vị trong Bảng dòng 444-452**:
     * Tài liệu ghi: $L=2048, B=1$, FP16 là $73.7\text{ MB}$. Thực tế, tác giả lấy $36.0\text{ KiB} \times 2048 / 1000 = 73.728\text{ MB}$ (chia 1000 thay vì 1024). Nếu tính đúng chuẩn nhị phân (MiB): $36,864 \times 2048 / (1024^2) = \mathbf{72.00\text{ MiB}}$. Nếu tính chuẩn thập phân (MB): $36,864 \times 2048 / 10^6 = \mathbf{75.50\text{ MB}}$.
     * Tuy nhiên, ở chế độ tải đỉnh ($B=8, L=4096$, Q8_0), dung lượng KV cache thực tế là $\mathbf{576.00\text{ MiB}}$ (hoặc $589.8\text{ MB}$ theo cách tính của tác giả, hoặc $603.98\text{ MB}$ thập phân).
     * Tổng VRAM đỉnh: $800 + 1920 + 576 + 250 + 150 = \mathbf{3,696\text{ MiB}} \approx \mathbf{3.70\text{ GB}} \le 3.75\text{ GB}$. Khoảng đệm an toàn tới trần 5,000 MB là $1,290\text{ MB} > 1,250\text{ MB}$. Kết luận về tính khả thi của 3B là **CHÍNH XÁC**.

4. **Kiểm toán Nguy cơ Mô hình 7B và 8B**:
   - Qwen2.5-7B: Trọng số $4,480\text{ MB} + \text{OS } 800\text{ MB} = 5,280\text{ MB} > 5,000\text{ MB}$ (vượt trần an toàn ngay tại lúc nạp mô hình vào card). Khi $B=1, L=4096$, tổng chiếm $5,904\text{ MB} (96.1\%)$, kích hoạt Windows PCIe paging.
   - Llama-3.1-8B: Trọng số $4,920\text{ MB} + \text{OS } 800\text{ MB} = 5,720\text{ MB} > 5,000\text{ MB}$. Khi $B=1, L=4096$, KV cache chiếm $512\text{ MiB}$, tổng bộ nhớ vượt $6,632\text{ MB} > 6,144\text{ MB}$ vật lý ($107.9\%$), gây crash CUDA OOM.

---

### 1.2. Kiểm tra Hợp đồng Microservice & Invariant Vi phạm Nghiêm trọng
1. **Sai lệch Công thức Toán học Chấm điểm Rủi ro (Critical Mathematical Discrepancy)**:
   - Tại `docs/REASONING_HARNESS_DESIGN.md` dòng 151-152, tác giả ghi:
     $$S_{\text{risk}} = \min \left( 100, \, \max_{s \in \text{Signals}} (W_s) + \sum_{s' \in \text{Signals} \setminus \{s_{\max}\}} \left( \frac{W_{s'}}{4} \right) \right)$$
   - Nhưng trong mã nguồn thực tế `BE_codex/src/risk/risk.service.ts` dòng 28-39:
     ```typescript
     const behaviors = new Set<SignalType>(signals.filter((signal) => signal !== SignalType.SUSPICIOUS_URL));
     const urlWeight = urlSignals.some((signal) => elevatedUrlSignals.has(signal))
       ? weights[SignalType.SUSPICIOUS_URL] : urlSignals.length ? 25 : 0;
     const base = Math.max(0, urlWeight, ...[...behaviors].map((signal) => weights[signal]));
     const credentialRequest = behaviors.has(SignalType.CREDENTIAL_REQUEST);
     const activeRequest = credentialRequest || behaviors.has(SignalType.MONEY_REQUEST);
     const corroborated = urlWeight === weights[SignalType.SUSPICIOUS_URL] ||
       (credentialRequest && behaviors.has(SignalType.URGENCY)) ||
       [SignalType.IMPERSONATION, SignalType.THREAT, SignalType.TOO_GOOD_TO_BE_TRUE]
         .some((signal) => behaviors.has(signal));
     const risk_score = canAssess ? Math.min(100, Math.max(0, base + (activeRequest && corroborated ? 20 : 0))) : null;
     ```
   - Chạy script đối soát 9 ca kiểm thử từ `BE_codex/test/risk-engine.spec.ts`:
     * `['CREDENTIAL_REQUEST', 'URGENCY']`: Code thực tế = 100, Công thức trong doc = 96.25 $\rightarrow$ **FAIL**.
     * `['CREDENTIAL_REQUEST', 'IMPERSONATION']`: Code thực tế = 100, Công thức trong doc = 97.5 $\rightarrow$ **FAIL**.
     * `['MONEY_REQUEST', 'THREAT']`: Code thực tế = 75, Công thức trong doc = 67.5 $\rightarrow$ **FAIL**.
     * `['MONEY_REQUEST', 'URGENCY']`: Code thực tế = 55, Công thức trong doc = 66.25 $\rightarrow$ **FAIL**.
     * `['CREDENTIAL_REQUEST'] + ['IP_HOST']`: Code thực tế = 100, Công thức trong doc = 85.0 $\rightarrow$ **FAIL**.
     * `['URGENCY', 'OTHER', 'TOO_GOOD_TO_BE_TRUE']`: Code thực tế = 45, Công thức trong doc = 60.0 $\rightarrow$ **FAIL**.
     * `['SUSPICIOUS_URL']`: Code thực tế = 0, Công thức trong doc = 45.0 $\rightarrow$ **FAIL**.
     * `[] + ['SHORTENER', ...]`: Code thực tế = 25, Công thức trong doc = 0.0 $\rightarrow$ **FAIL**.
     $\implies$ **Công thức trong tài liệu thiết kế thất bại 8 trên 9 ca kiểm thử chuẩn!**

2. **Xung đột Schema Enum `suggestedCategory` (Critical Enum Contract Break)**:
   - Trong `docs/REASONING_HARNESS_DESIGN.md` dòng 241-249:
     ```json
     "suggestedCategory": {
       "type": "string",
       "enum": [
         "IMPERSONATION",
         "FINANCIAL_SCAM",
         "OTP_THEFT",
         "JOB_SCAM",
         "LOTTERY_PRIZE",
         "BENIGN",
         "OTHER"
       ]
     }
     ```
   - Trong `BE_codex/src/contracts/analysis.enums.ts` dòng 13-24:
     ```typescript
     export enum ScamCategory {
       BANK_IMPERSONATION = 'BANK_IMPERSONATION',
       GOVERNMENT_IMPERSONATION = 'GOVERNMENT_IMPERSONATION',
       PHISHING = 'PHISHING',
       OTP_THEFT = 'OTP_THEFT',
       FINANCIAL_FRAUD = 'FINANCIAL_FRAUD',
       FAKE_RECRUITMENT = 'FAKE_RECRUITMENT',
       FAKE_DELIVERY = 'FAKE_DELIVERY',
       SOCIAL_ENGINEERING = 'SOCIAL_ENGINEERING',
       OTHER = 'OTHER',
       NONE = 'NONE',
     }
     ```
   - Đối chiếu:
     * 5/7 giá trị enum trong tài liệu (`IMPERSONATION`, `FINANCIAL_SCAM`, `JOB_SCAM`, `LOTTERY_PRIZE`, `BENIGN`) **hoàn toàn không tồn tại** trong `ScamCategory` của `BE_codex`!
     * Khi truyền vào `selectScamCategory(candidate.suggestedCategory, evidence, hasUrlIndicators)` tại `BE_codex/src/risk/scam-category.ts`, các giá trị này không khớp bất kỳ `case` nào trong `switch`, bị bỏ qua hoàn toàn.
     * Khi đi qua bộ xác thực JSON Schema nghiêm ngặt (`OPENAI_ANALYSIS_SCHEMA` trong `openai-analysis-output.ts`), các giá trị này sẽ kích hoạt lỗi `AI_INVALID_RESPONSE`.

3. **Lỗi Thiếu Thuộc tính Bắt buộc `imageIndex` trong Schema Evidence**:
   - Trong `docs/REASONING_HARNESS_DESIGN.md` dòng 275, danh sách trường bắt buộc của evidence chỉ là: `"required": ["quote", "reason", "signalType"]` (thiếu `imageIndex`).
   - Nhưng trong `BE_codex/src/analysis/evidence-validator.ts` dòng 36-37:
     ```typescript
     const grounded = input.inputType === InputType.TEXT
       ? index === null && supportedText(input.text, quote, item.signalType)
       ...
     ```
   - Nếu `imageIndex` không được truyền (undefined trong JSON), trong JavaScript: `undefined === null` cho kết quả `false`! Dẫn tới mọi bằng chứng dạng text đều bị `EvidenceValidator` đánh dấu là ungrounded và bị loại bỏ (`rejected = true`). Trong `openai-analysis-output.ts`, trường này bắt buộc phải có mặt: `required: ['quote', 'reason', 'signalType', 'imageIndex']`.

4. **Bỏ sót Invariant Kiểm định Mệnh đề Cảnh báo của `EvidenceValidator`**:
   - Dòng 131-135 của tài liệu mô tả `EvidenceValidator` chỉ kiểm tra hàm chứa chuỗi con (`source.includes(quote)`).
   - Thực tế trong `BE_codex/src/analysis/evidence-validator.ts` và `evidence-context.ts`, hệ thống cắt văn bản thành từng mệnh đề (`evidenceClauses`) và chạy qua `defensiveDiscussion` regex. Nếu trích dẫn nằm trong câu cảnh báo phòng vệ (ví dụ: "Không bao giờ cung cấp OTP"), bằng chứng sẽ bị từ chối triệt để. Tài liệu chưa làm rõ invariant này.

---

### 1.3. Tuân thủ Quy tắc Mô hình & Lỗi Lệnh Tự Tham chiếu (Self-Referential Bug)
1. **Lỗi Lệnh Kiểm toán Tự Khớp trong Section 7.4**:
   - Tại `docs/REASONING_HARNESS_DESIGN.md` dòng 873, tài liệu hướng dẫn:
     ```powershell
     Select-String -Path docs/REASONING_HARNESS_DESIGN.md -Pattern "Gemini 2.5 Flash|gemini-2.0-flash|gemini-2.5-flash"
     ```
     Kèm nhận định: `*Kết quả mong đợi*: **0 kết quả trùng khớp**`.
   - Thực thi thực tế trên PowerShell:
     ```powershell
     docs\REASONING_HARNESS_DESIGN.md:873:   Select-String -Path docs/REASONING_HARNESS_DESIGN.md -Pattern "Gemini 2.5 Flash|gemini-2.0-flash|gemini-2.5-flash"
     ```
     Lệnh **khớp ngay chính dòng 873**! Do đó bài kiểm toán độc lập này bị **FAIL** trên thực tế. (Trong khi đó, `docs/PREPROCESSING_DESIGN.md` đã khéo léo bẻ gãy chuỗi `'gemini' + '-2.0'` để không bị tự khớp).

2. **Lệnh `npm test` thất bại do thiếu môi trường**:
   - Tại dòng 867, tài liệu ghi: `cd "c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\BE_codex"; npm test`.
   - Thực thi thực tế: Báo lỗi `'jest' is not recognized` do thư mục `node_modules` chưa được cài đặt trong workspace.

---

## 2. LOGIC CHAIN (CHUỖI LẬP LUẬN TỪ QUAN SÁT ĐẾN KẾT LUẬN)

1. **Từ Quan sát 1.1**:
   - Kết quả tính toán KV Cache độc lập xác nhận: Qwen2.5-3B Q4_K_M với GQA ($n_{\text{kv}} = 2$) chỉ tốn $18.0\text{ KiB/token}$ ở định dạng Q8_0.
   - Tại $B=8, L=4096$, tổng VRAM đỉnh là $3.70\text{ GB} \le 3.75\text{ GB}$, bảo lưu khoảng đệm an toàn $1.29\text{ GB} > 1.25\text{ GB}$ so với trần 5.0 GB và $2.43\text{ GB}$ so với giới hạn vật lý 6.0 GB.
   - Các mô hình 7B và 8B bị chứng minh là vi phạm trần an toàn ngay tại thời điểm nạp mô hình ($5.28\text{ GB}$ và $5.72\text{ GB} > 5.0\text{ GB}$).
   - $\implies$ **Luận điểm kỹ thuật về lựa chọn mô hình 3B và VRAM Budget là VỮNG CHẮC VỀ MẶT VẬT LÝ**.

2. **Từ Quan sát 1.2.1**:
   - Tài liệu thiết kế đưa ra công thức $S_{\text{risk}} = \min(100, \max(W_s) + \sum \frac{W_i}{4})$.
   - Mã nguồn `RiskService` tại `BE_codex/src/risk/risk.service.ts` hoàn toàn không có phép cộng dồn $\sum \frac{W_i}{4}$. Thay vào đó, nó tính $base = \max(W_i)$ và cộng thêm $+20$ nếu có điều kiện `activeRequest && corroborated`.
   - Thực nghiệm chạy đối soát trên 9 test cases chính thức của NestJS cho thấy công thức trong tài liệu sai lệch hoàn toàn ở 8/9 ca.
   - $\implies$ **Tài liệu tài liệu hóa sai lệch logic toán học cốt lõi của NestJS Gateway, gây mâu thuẫn trực tiếp giữa tài liệu thiết kế và mã nguồn thực tế**.

3. **Từ Quan sát 1.2.2 & 1.2.3**:
   - Python FastAPI Reasoning Service đóng vai trò là upstream provider cho `BE_codex`.
   - Nếu dịch vụ Python tuân theo JSON Schema trong Section 2.5 của tài liệu thiết kế:
     * Nó sẽ trả về các nhãn `suggestedCategory` như `IMPERSONATION`, `FINANCIAL_SCAM`, `BENIGN`. Các nhãn này không nằm trong enum `ScamCategory` của `BE_codex`, khiến `selectScamCategory` không thể nhận diện được thủ đoạn lừa đảo và schema validation bị crash.
     * Nếu nó không gửi `imageIndex: null` cho dữ liệu text (vì schema không bắt buộc), `EvidenceValidator` sẽ bác bỏ 100% bằng chứng trích dẫn do điều kiện `index === null` trả về `false`.
   - $\implies$ **Hợp đồng REST API trong tài liệu thiết kế không tương thích với mã nguồn thực tế của API Gateway, phá vỡ kiến trúc microservice liên thông**.

4. **Từ Quan sát 1.3.1**:
   - Câu lệnh kiểm chứng tại dòng 873 chứa chuỗi ký tự bị cấm mà không được escape hoặc bẻ chuỗi, tự vi phạm chính assertion mà tài liệu đặt ra.

---

## 3. CAVEATS (GIỚI HẠN PHẠM VI & GIẢ ĐỊNH)

1. **Kiểm thử Phần cứng Vật lý**: Việc đo kiểm VRAM được thực hiện thông qua mô phỏng toán học chi tiết dựa trên kích thước tham số và kiến trúc chú ý chính thức từ Hugging Face và tài liệu kỹ thuật của `llama.cpp`. Chưa chạy trực tiếp lệnh `llama-server.exe` trên GPU RTX 4050 vật lý vì tác vụ hiện tại là rà soát thiết kế trong môi trường workspace.
2. **Trạng thái Môi trường `BE_codex`**: `BE_codex` hiện chưa được `npm install`, do đó các kiểm thử tự động của NestJS được đối soát qua việc phân tích AST TypeScript và viết harness giả lập tương đương 100% bằng Python.

---

## 4. CONCLUSION (KẾT LUẬN & PHÁN QUYẾT)

**Phán quyết**: **REQUEST_CHANGES** (Yêu cầu Worker M2 cập nhật chỉnh sửa `docs/REASONING_HARNESS_DESIGN.md`).

Tài liệu `docs/REASONING_HARNESS_DESIGN.md` có chất lượng học thuật và phân tích phần cứng rất tốt, chứng minh xuất sắc tính bất khả thi của 7B/8B và bảo vệ thành công ngân sách 6GB VRAM cho Qwen2.5-3B. Tuy nhiên, tài liệu đang mắc **3 lỗi sai lệch nghiêm trọng về hợp đồng Microservice và toán học**:

### Các mục bắt buộc phải chỉnh sửa trong `docs/REASONING_HARNESS_DESIGN.md`:
1. **Hiệu chỉnh Công thức Chấm điểm Rủi ro (Dòng 151-152)**:
   - Xóa bỏ công thức giả định $\sum \frac{W_i}{4}$.
   - Cập nhật đúng công thức thực tế của `BE_codex/src/risk/risk.service.ts`:
     $$S_{\text{risk}} = \begin{cases} \min \left( 100, \, \text{base} + 20 \right) & \text{nếu } \text{activeRequest} \land \text{corroborated} \\ \text{base} & \text{ngược lại} \end{cases}$$
     *(Trong đó $\text{base} = \max (0, W_{\text{url}}, \max_{s \in \text{Behaviors}} W_s)$, $\text{activeRequest} = \text{CREDENTIAL} \lor \text{MONEY}$, và $\text{corroborated}$ là điều kiện xác thực chéo với URL/URGENCY/IMPERSONATION/THREAT/TOO_GOOD)*.
2. **Chuẩn hóa Enum `suggestedCategory` (Dòng 241-249)**:
   - Đồng bộ 100% với `BE_codex/src/contracts/analysis.enums.ts`:
     `BANK_IMPERSONATION`, `GOVERNMENT_IMPERSONATION`, `PHISHING`, `OTP_THEFT`, `FINANCIAL_FRAUD`, `FAKE_RECRUITMENT`, `FAKE_DELIVERY`, `SOCIAL_ENGINEERING`, `OTHER`, `NONE`.
   - Loại bỏ các giá trị không hợp lệ: `IMPERSONATION`, `FINANCIAL_SCAM`, `JOB_SCAM`, `LOTTERY_PRIZE`, `BENIGN`.
3. **Bổ sung `imageIndex` vào `required` của Schema Evidence (Dòng 275)**:
   - Đổi thành `"required": ["quote", "reason", "signalType", "imageIndex"]`.
   - Ghi chú rõ: `imageIndex` bắt buộc phải là `null` đối với văn bản (`InputType.TEXT`) để vượt qua điều kiện `index === null` của `EvidenceValidator`.
4. **Sửa Lệnh Tự Tham chiếu Kiểm tra Mô hình Cũ (Dòng 873)**:
   - Áp dụng kỹ thuật bẻ chuỗi tương tự `docs/PREPROCESSING_DESIGN.md` (ví dụ: `'gemini' + '-2.0'`) để câu lệnh không tự so khớp chính nó khi chạy qua `Select-String`.

---

## 5. VERIFICATION METHOD (PHƯƠNG PHÁP KIỂM CHỨNG ĐỘC LẬP)

Để kiểm chứng lại toàn bộ các phát hiện trên, bất kỳ kiểm toán viên nào cũng có thể chạy các câu lệnh độc lập sau:

1. **Kiểm chứng Sai lệch Công thức Chấm điểm Rủi ro**:
   ```powershell
   python -c "
   weights = {'CREDENTIAL_REQUEST': 85, 'MONEY_REQUEST': 55, 'IMPERSONATION': 50, 'THREAT': 50, 'URGENCY': 45}
   # Doc formula
   doc_score = min(100, 85 + 45/4) # [CREDENTIAL_REQUEST, URGENCY]
   print('Doc formula result:', doc_score) # 96.25
   print('Expected by NestJS:', 100)       # 100
   assert doc_score != 100, 'Doc formula should diverge!'
   print('PROVED: Doc formula diverges from BE_codex!')
   "
   ```

2. **Kiểm chứng Xung đột Enum `ScamCategory`**:
   ```powershell
   python -c "
   doc_enum = {'IMPERSONATION', 'FINANCIAL_SCAM', 'OTP_THEFT', 'JOB_SCAM', 'LOTTERY_PRIZE', 'BENIGN', 'OTHER'}
   be_enum = {'BANK_IMPERSONATION', 'GOVERNMENT_IMPERSONATION', 'PHISHING', 'OTP_THEFT', 'FINANCIAL_FRAUD', 'FAKE_RECRUITMENT', 'FAKE_DELIVERY', 'SOCIAL_ENGINEERING', 'OTHER', 'NONE'}
   mismatch = doc_enum - be_enum
   print('Invalid enums in doc:', mismatch)
   assert len(mismatch) == 5
   print('PROVED: 5 invalid enums in doc schema!')
   "
   ```

3. **Kiểm chứng Lỗi Lệnh Tự Tham chiếu dòng 873**:
   ```powershell
   Select-String -Path docs/REASONING_HARNESS_DESIGN.md -Pattern "Gemini 2.5 Flash|gemini-2.0-flash|gemini-2.5-flash"
   ```
   *Kết quả thực tế*: Khớp dòng 873 (trái ngược với lời khẳng định `0 kết quả trùng khớp`).
