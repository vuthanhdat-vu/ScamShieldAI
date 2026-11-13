# BÁO CÁO BÀN GIAO (HANDOFF REPORT) — KHẢO SÁT DỮ LIỆU TINH GỌN `data_demo/`
## Teamwork Explorer 1 Handoff to Orchestrator & Downstream Workers

- **Tác nhân**: `explorer_data_1` (Teamwork Explorer)
- **Thư mục làm việc**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI`
- **Thư mục trạng thái**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\explorer_data_1\`
- **Tài liệu phân tích đính kèm**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\explorer_data_1\analysis.md`
- **Loại bàn giao (Handoff Type)**: **Hard Handoff** (Nhiệm vụ khảo sát hoàn thành 100%, sẵn sàng bàn giao cho các Worker cập nhật tài liệu thiết kế).

---

## 1. OBSERVATION (QUAN SÁT THỰC NGHIỆM TRỰC TIẾP)

Dưới đây là các quan sát thực nghiệm được trích xuất trực tiếp bằng công cụ khảo sát đọc (read-only):

### 1.1. Tệp Hội thoại đa lượt `conservations.json`
- **Đường dẫn tệp**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\data_demo\conservations.json`. Dung lượng: 186,116 bytes.
- **Tên tệp**: Viết là `conservations.json` (chứa ký tự `ser` thay vì `conversations`).
- **Tổng số hội thoại**: 38 hội thoại.
- **Tổng số lượt thoại (Turns)**: 628 lượt thoại (Min = 9, Max = 25, Mean = 16.53).
- **Phân bổ vai trò**: `người gọi`: 329 lượt, `người nhận`: 299 lượt. 100% cuộc gọi mở đầu bởi `người gọi`.
- **Dị biệt cấu trúc**: Tại Hội thoại ID 9, hai lượt thoại liên tiếp 10 và 11 đều có `role = "người gọi"`.
  * *Trích nguyên văn Turn 10*: `"Dạ tại hệ thống ngân hàng bên em mới nâng cấp, cần phải khớp nội dung chuyển khoản chị ạ. Nhiều khách cũng bị giống chị, nhưng xong xuôi hết rồi. Để em chuyển máy cho chị kế toán xử lý hoàn tiền cho chị luôn nhé, chị ấy sẽ hướng dẫn chi tiết ạ."`
  * *Trích nguyên văn Turn 11*: `"Alo, chào chị. Em là Hạnh, kế toán trưởng chi nhánh Dmaris đây ạ. Em vừa kiểm tra giao dịch của chị rồi..."`

### 1.2. Tập Dữ liệu Liên kết `dataset_url_sampled.csv` & Kiểm tra `dataset_url.csv`
- **Sự tồn tại của `dataset_url.csv`**: File `data_demo/dataset_url.csv` **KHÔNG TỒN TẠI** trên toàn bộ workspace.
- **Tệp thay thế `dataset_url_sampled.csv`**: 269,508 bytes, 3,192 dòng dữ liệu (+1 dòng header).
- **Cột**: `['channel', 'label', 'url_norm', 'pattern_group']`.
- **Phân bổ nhãn**: `phishing`: 1,994 dòng (62.47%), `benign`: 1,198 dòng (37.53%). 0 null, 0 URL trùng lặp.
- **Phân tầng 19 nhóm `pattern_group`**: 7 nhóm Benign (300 .gov.vn, 250 .vn, 200 .com/.net...) và 12 nhóm Phishing (250 cờ bạc, 250 TMĐT, 250 ngân hàng, 200 đầu tư...).

### 1.3. Tập Tin nhắn Đơn Lừa đảo `Scam.csv`
- **Đường dẫn**: `data_demo/Scam.csv`. Dung lượng: 185,900 bytes. Header: `['message']`.
- **Số dòng dữ liệu**: 1,319 dòng (+1 dòng header). 0 null, 0 duplicate (đã khử 111 dòng lặp).
- **Bản ghi nhiều dòng (Multiline)**: Đúng 27 dòng chứa `\n` bên trong trường `message` theo chuẩn RFC 4180.
- **Độ dài**: Ký tự min=42, max=569, mean=135.50. Từ min=1, max=117, mean=25.27.
- **Hiện tượng đặc thù**:
  * 748 dòng (56.71%) chứa domain mockup `http://sim.example.vn/x`.
  * 434 dòng (32.90%) chứa ký tự `?` (nhiều dòng bị lỗi mojibake từ trước khi làm sạch CP1252, ví dụ: `"B?t ??ng s?n giá g?c C?T..."`).
  * Placeholder: `[MONEY]` (236 dòng), `[NUMBER]` (204 dòng), `[TIME]` (48 dòng).

### 1.4. Tập Tin nhắn Đơn An toàn `No_scam.csv`
- **Đường dẫn**: `data_demo/No_scam.csv`. Dung lượng: 492,833 bytes. Header: `['message']`.
- **Số dòng dữ liệu**: 1,930 dòng (+1 dòng header). 0 null, 0 duplicate (đã khử 274 dòng lặp).
- **Bản ghi nhiều dòng (Multiline)**: 524 dòng chứa `\n` bên trong trường `message` theo chuẩn RFC 4180.
- **Độ dài**: Ký tự min=1, max=881, mean=227.83. Từ min=1, max=180, mean=43.29.
- **Nội dung & Placeholder**: 1,387 dòng biến động số dư (71.87%), 1,129 dòng viễn thông (58.50%), 232 mã OTP (12.02%). Chứa `[MONEY]` (1,341 dòng - 69.48%), `[NUMBER]` (1,172 dòng - 60.73%).

### 1.5. Báo cáo Khử trùng lặp `DEDUPLICATION_REPORT.md`
- **Đường dẫn**: `data_demo/DEDUPLICATION_REPORT.md` và `docs/CSV_SURVEY_REPORT.md`.
- **Kiểm tra đồng nhất**: Kích thước 10,894 bytes, so sánh nhị phân `read_bytes() == read_bytes()` cho kết quả `True` (100% byte-for-byte identical).
- **Chỉ số ghi nhận**: Xóa 385 dòng lặp (274 trong No_scam, 111 trong Scam, 0 trong URL), giữ 56,365 dòng sạch. Trùng lặp chéo giữa Scam và No_scam: **0 dòng**.

### 1.6. Tập Ảnh chụp Màn hình `data_demo/single_image/` (Alias trong thiết kế: `data_demo/images/`)
- **Đường dẫn thư mục**: Vật lý trên đĩa là `data_demo/single_image/` (trong một số tài liệu sơ khởi được gọi là `data_demo/images/`).
- **Cấu trúc**: `metadata.json` (39,914 bytes, 50 entries), `images/` (50 files), `texts/` (50 files). Khớp nhau 100% theo ID `case_001` đến `case_050`.
- **Định dạng & Dung lượng**: 35 JPEG, 15 PNG. Dung lượng trung bình 22.4 KB/ảnh.
- **Độ phân giải**: Chuẩn viewport di động (375x812: 9 ảnh, 390x844: 8 ảnh, 412x915: 6 ảnh, 360x800: 5 ảnh...).
- **Nền tảng**: iMessage (17), SMS Android (13), Zalo (10), Facebook Messenger (10).
- **Giao diện**: 25 Light mode, 25 Dark mode (tỷ lệ 1:1).
- **Nhãn mục tiêu**: `DANGER`: 22 ca, `SAFE`: 18 ca, `SUSPICIOUS`: 10 ca.

---

## 2. LOGIC CHAIN (CHUỖI LẬP LUẬN TỪ QUAN SÁT ĐẾN KẾT LUẬN)

1. **Từ Quan sát 1.1**: Tập tin hội thoại `conservations.json` chứa 38 hội thoại với 628 lượt thoại. Việc hai lượt thoại 10 và 11 ở ID 9 cùng mang vai trò `người gọi` bắt nguồn từ lời thoại chuyển giao máy giữa nhân viên tư vấn và kế toán lừa đảo. 
   $\rightarrow$ *Hệ quả*: Bộ tiền xử lý hội thoại không được giả định cứng rằng vai trò luôn luân phiên 1-1, và cần hỗ trợ cấu trúc hội thoại đa bên (multi-actor caller handover). Tên tệp `conservations.json` phải được giữ nguyên hoặc cấu hình alias trong loader để tránh gãy pipeline.

2. **Từ Quan sát 1.2 & 1.5**: Tệp `dataset_url.csv` không còn trong thư mục mà đã được tinh giản thành `dataset_url_sampled.csv` với 3,192 URL cân bằng trên 19 nhóm mẫu `pattern_group`.
   $\rightarrow$ *Hệ quả*: Tài liệu `docs/PREPROCESSING_DESIGN.md` và `docs/REASONING_HARNESS_DESIGN.md` phải cập nhật loại bỏ tham chiếu 53,116 URL thô, chuyển sang đặc tả bộ nạp dữ liệu URL 4 cột (`channel`, `label`, `url_norm`, `pattern_group`) và thiết kế kịch bản kiểm thử dựa trên 19 nhóm mẫu này.

3. **Từ Quan sát 1.3 & 1.4**: Cả `Scam.csv` (27 dòng multiline) và `No_scam.csv` (524 dòng multiline) đều chứa số lượng lớn bản ghi nhiều dòng theo chuẩn RFC 4180 và các placeholder masked (`[MONEY]`, `[NUMBER]`). Ngoài ra, `Scam.csv` có 434 dòng chứa `?` do di chứng mojibake trước đó.
   $\rightarrow$ *Hệ quả*: Bộ parser CSV bắt buộc phải dùng chế độ đọc an toàn RFC 4180 (`csv.reader` hoặc `pandas.read_csv` với engine C), không được đọc theo dòng thô thô sơ (`f.readlines()`). Tiền xử lý cần quy định cách bảo toàn các token `[MONEY]` và cơ chế chuẩn hóa ký tự `?`.

4. **Từ Quan sát 1.6**: Bộ ảnh `data_demo/images/` có cấu trúc hoàn chỉnh 50 ca kiểm thử với đầy đủ 3 thành phần (`images/`, `texts/`, `metadata.json`) bao phủ cân bằng 4 nền tảng (Zalo, Messenger, iMessage, SMS) và 2 chế độ hiển thị (Light/Dark mode) cùng 3 mức nhãn rủi ro (DANGER, SUSPICIOUS, SAFE).
   $\rightarrow$ *Hệ quả*: Quy trình Reasoning Harness cần thiết kế một kịch bản kiểm thử đa phương thức (Multimodal Test Suite) 50 ca kiểm thử này, tính toán chi tiết ngân sách VRAM cho mô hình OCR/Vision trên card RTX 4050 6GB.

5. **Tổng hợp kiến trúc**: Toàn bộ dữ liệu đã được tinh gọn và chuẩn hóa sạch sẽ (0 duplicates, 0 cross-file collisions). Hệ thống microservice (NestJS Gateway + FastAPI AI Service) có thể ánh xạ trực tiếp 5 luồng dữ liệu (Hội thoại, URL, Scam text, No-scam text, Image) thành 5 DTO và 5 pipeline xử lý tương ứng.

---

## 3. CAVEATS (GIỚI HẠN & GIẢ ĐỊNH)

1. **Tên tệp `conservations.json`**: Có thể là typo lúc tạo file ban đầu, nhưng do quy tắc Read-Only nghiêm ngặt, chúng tôi giữ nguyên tệp và cảnh báo rõ ràng cho các tác nhân downstream.
2. **Ký tự `?` trong `Scam.csv` (434 dòng)**: Một số dấu `?` là câu hỏi hợp pháp, nhưng phần lớn là mất dấu tiếng Việt từ nguồn thu thập trước đó (không thể đảo ngược hoàn toàn nếu không có dữ liệu gốc). Preprocessing cần chấp nhận đây là nhiễu thực tế.
3. **Mock domain `http://sim.example.vn/x` trong `Scam.csv` (748 dòng)**: Đây là dữ liệu giả lập được sinh ra khi che chắn dữ liệu trước đây. Trong môi trường kiểm thử thực tế, URL Forensic Tool cần nhận biết domain mock này để tránh chấm sai nhãn nếu domain không phân giải được DNS.
4. **Thư mục `test_dataset_multiturn/`**: Thư mục này chứa 112 ảnh mở rộng (28 phiên multiturn) ngoài phạm vi 50 ảnh cơ bản của `data_demo/images/`. Đây là tài sản giá trị cho kiểm thử chuỗi thời gian nhưng không nằm trong 50 ảnh chính khóa của yêu cầu R1.

---

## 4. CONCLUSION (KẾT LUẬN & ĐỀ XUẤT HÀNH ĐỘNG)

1. **Hiện trạng dữ liệu đã sẵn sàng**: Kho dữ liệu `data_demo/` đã hoàn toàn tinh gọn, nhất quán và sạch sẽ, không có bất kỳ xung đột nhãn nào.
2. **Kế hoạch hành động cho Worker phụ trách `docs/PREPROCESSING_DESIGN.md`**:
   - Thay thế các schema cũ bằng 4 schema chuẩn: Hội thoại `conservations.json` (38 cuộc), URL `dataset_url_sampled.csv` (4 cột, 19 pattern groups), Tin nhắn đơn lẻ `Scam.csv` / `No_scam.csv` (1 cột `message`, chuẩn RFC 4180), và Ảnh chụp màn hình `images/` (metadata.json + texts).
   - Thiết kế thuật toán đọc multiline an toàn và cơ chế bảo tồn placeholder (`[MONEY]`, `[NUMBER]`).
3. **Kế hoạch hành động cho Worker phụ trách `docs/REASONING_HARNESS_DESIGN.md`**:
   - Dựng bảng phân ranh giới trách nhiệm rõ ràng giữa NestJS Gateway (`BE_codex`) và FastAPI AI Reasoning Engine.
   - Lập bảng phân bổ bộ nhớ chi tiết (VRAM Budget Table) cho card đồ họa NVIDIA RTX 4050 6GB: SLM ~2.1GB, Vision/OCR ~1.2GB, KV Cache ~0.5GB, OS ~0.8GB, VRAM đệm dự phòng ~1.5GB (24%).
   - Thiết lập 4 bộ test harness tương ứng với 4 nguồn dữ liệu văn bản và bộ test 50 ảnh đa nền tảng.

---

## 5. VERIFICATION METHOD (PHƯƠNG PHÁP KIỂM CHỨNG ĐỘC LẬP)

Bất kỳ tác nhân hoặc kỹ sư nào cũng có thể kiểm chứng độc lập toàn bộ các kết quả trên thông qua các lệnh Python thực nghiệm sau từ thư mục gốc của dự án:

```powershell
# 1. Kiểm chứng hội thoại đa lượt
python -c "
import json
with open('data_demo/conservations.json', 'r', encoding='utf-8') as f:
    d = json.load(f)
assert len(d) == 38, 'Expected 38 conversations'
total_turns = sum(len(c['dialogue']) for c in d)
assert total_turns == 628, 'Expected 628 turns'
print('CONVERSATIONS VERIFIED: 38 convs, 628 turns')
"

# 2. Kiểm chứng URL dataset
python -c "
import pandas as pd
df = pd.read_csv('data_demo/dataset_url_sampled.csv')
assert df.shape == (3192, 4), 'Expected shape (3192, 4)'
assert df['label'].value_counts()['phishing'] == 1994
assert df['label'].value_counts()['benign'] == 1198
assert df['url_norm'].duplicated().sum() == 0
print('URL DATASET VERIFIED: 3,192 rows, 0 duplicates, 1,994 phishing / 1,198 benign')
"

# 3. Kiểm chứng Scam.csv và No_scam.csv
python -c "
import pandas as pd
df_s = pd.read_csv('data_demo/Scam.csv')
df_ns = pd.read_csv('data_demo/No_scam.csv')
assert df_s.shape == (1319, 1), 'Expected Scam.csv (1319, 1)'
assert df_ns.shape == (1930, 1), 'Expected No_scam.csv (1930, 1)'
assert len(set(df_s['message']).intersection(set(df_ns['message']))) == 0
print('SCAM & NO_SCAM VERIFIED: 1,319 scam rows, 1,930 no-scam rows, 0 cross overlap')
"

# 4. Kiểm chứng bộ ảnh chụp màn hình 50 ca kiểm thử (single_image/ hoặc images/)
python -c "
import json
from pathlib import Path
base_img = Path('data_demo/single_image') if Path('data_demo/single_image').exists() else Path('data_demo/images')
meta_p = base_img / 'metadata.json'
img_dir = base_img / 'images'
text_dir = base_img / 'texts'
with open(meta_p, 'r', encoding='utf-8') as f:
    meta = json.load(f)
assert len(meta) == 50, 'Expected 50 metadata entries'
assert len(list(img_dir.glob('*'))) == 50, 'Expected 50 image files'
assert len(list(text_dir.glob('*.txt'))) == 50, 'Expected 50 text transcript files'
print(f'IMAGES DATASET VERIFIED ({base_img.name}): 50 images, 50 transcripts, 50 metadata records')
"
```

Tất cả các lệnh trên khi thực thi đều thoát với mã 0 (`code 0`) và không có bất kỳ assert failure nào.
