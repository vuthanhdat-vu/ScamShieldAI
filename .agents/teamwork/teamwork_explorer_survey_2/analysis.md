# Báo Cáo Khảo Sát Chi Tiết và Phân Tích Trùng Lặp 3 File CSV Trong `data_demo`

**Tác giả**: teamwork_explorer_survey_2  
**Mục tiêu**: Khảo sát chuyên sâu, phân tích mã hóa, schema, dị thường dữ liệu, định lượng trùng lặp nội bộ và trùng lặp chéo trên 3 file CSV (`dataset_url.csv`, `No_scam.csv`, `Scam.csv`) phục vụ xây dựng reasoning harness cho API model phát hiện lừa đảo.  
**Thời gian thực hiện**: 2026-11-12T08:04:00Z  
**Nguyên tắc**: Read-only investigation (không chỉnh sửa dữ liệu, không thay đổi file nguồn).

---

## Tóm Tắt Phát Hiện Cốt Lõi (Executive Summary)

1. **`dataset_url.csv`**: File chuẩn hóa hoàn hảo, gồm 53,116 dòng dữ liệu (53,117 dòng vật lý tính cả header), mã hóa UTF-8 (ASCII thuần), phân tách bằng dấu phẩy `,`, dấu trích dẫn `"`, kết thúc dòng CRLF (`\r\n`). **Không có bất kỳ dòng trùng lặp nào** trên cột nội dung chính `url_norm` (0 trùng lặp nội bộ, 53,116 URL duy nhất 100%).
2. **`No_scam.csv`**: File chứa 2,204 dòng dữ liệu tin nhắn phi lừa đảo (2,205 bản ghi CSV), mã hóa UTF-8 kèm BOM (`utf-8-sig`), có **587 dòng chứa xuống dòng nội bộ (multiline records)** với tổng cộng 1,422 ký tự LF (`\n`). 
   - **Trùng lặp nội bộ**: Có **274 dòng trùng lặp** theo so khớp chuỗi nguyên bản (exact raw match), giữ lại **1,930 dòng duy nhất**. Nếu chuẩn hóa khoảng trắng/xuống dòng đuôi (`.strip()`), phát hiện thêm 1 trường hợp lệch newline đuôi (dòng 1502 vs 1535), đưa số trùng lặp lên **275 dòng**, giữ lại **1,929 dòng duy nhất**.
3. **`Scam.csv`**: File chứa 1,430 dòng dữ liệu tin nhắn lừa đảo (1,431 bản ghi CSV), **bẫy mã hóa nghiêm trọng: file được mã hóa theo Windows-1252 (CP1252)**, chứa các byte đơn như `0x96` (en-dash), `0xE0`, `0xE1`, `0xF4` gây lỗi `UnicodeDecodeError` nếu mở bằng UTF-8 mặc định tại byte 91,825 (dòng 777). 
   - Có 27 dòng multiline (chứa 67 ký tự LF).
   - **Trùng lặp nội bộ**: Có **111 dòng trùng lặp** (kết quả đồng nhất 111 dòng cho cả so khớp exact lẫn stripped), giữ lại **1,319 dòng duy nhất**.
4. **Trùng lặp chéo giữa 3 file**:
   - Trùng lặp nội dung tin nhắn giữa `No_scam.csv` và `Scam.csv`: **0 dòng trùng lặp** (hoàn toàn phân tách).
   - Trùng lặp giữa tin nhắn (`No_scam` / `Scam`) với `dataset_url.csv`: **0 dòng trùng khớp trực tiếp**.
   - Tuy nhiên, quét liên kết URL xuất hiện bên trong nội dung tin nhắn: phát hiện 8 domain trong `No_scam` xuất hiện trong `dataset_url` (đều là domain hợp pháp) và 6 domain/URL trong `Scam` xuất hiện trong `dataset_url` (đều là link lừa đảo/phishing).

---

## 1. Khảo Sát Chi Tiết Mã Hóa, Schema và Định Dạng Từng File

| Thuộc tính | `dataset_url.csv` | `No_scam.csv` | `Scam.csv` |
| :--- | :--- | :--- | :--- |
| **Kích thước file** | 2,011,503 bytes (~1.92 MB) | 578,408 bytes (~564.8 KB) | 196,670 bytes (~192.1 KB) |
| **File Encoding** | UTF-8 (ASCII compatible, không BOM) | UTF-8 with BOM (`utf-8-sig`, bytes `EF BB BF`) | **Windows-1252 / CP1252** (Bẫy mã hóa!) |
| **Ký tự phân tách (Delimiter)** | Dấu phẩy `,` | Dấu phẩy `,` | Dấu phẩy `,` |
| **Ký tự trích dẫn (Quotechar)** | Dấu nháy kép `"` | Dấu nháy kép `"` | Dấu nháy kép `"` |
| **Ký tự kết thúc bản ghi** | CRLF (`\r\n`) | CRLF (`\r\n`) | CRLF (`\r\n`) |
| **Xuống dòng nội bộ trường** | Không có (0 dòng) | Có (LF `\n` đơn trong 587 bản ghi) | Có (LF `\n` đơn trong 27 bản ghi) |
| **Header columns** | `channel,label,url_norm` | `message` | `message` |
| **Số lượng cột** | 3 cột | 1 cột | 1 cột |
| **Schema chi tiết** | 1. `channel`: string (`url`: 53,112; `social`: 4)<br>2. `label`: string (`phishing`: 36,706; `benign`: 16,410)<br>3. `url_norm`: string (URL chuẩn hóa) | 1. `message`: string (nội dung SMS/tin nhắn thông báo thông thường) | 1. `message`: string (nội dung SMS/tin nhắn mạo danh, lừa đảo) |
| **Cột nội dung chính** | **`url_norm`** (cột thứ 3, index 2) | **`message`** (cột thứ 1, index 0) | **`message`** (cột thứ 1, index 0) |

---

## 2. Thống Kê Số Lượng Dòng Vật Lý và Bản Ghi Dữ Liệu (Row Counts)

Do đặc thù các file tin nhắn chứa các trường nhiều dòng (multiline quoted fields), việc đếm dòng thuần túy bằng các công cụ dòng lệnh (như `wc -l` hoặc split theo `\n`) sẽ dẫn đến số liệu sai lệch nếu không phân biệt giữa số dòng vật lý và số bản ghi dữ liệu CSV:

| Tệp tin | Tổng số ký tự `\r\n` (CRLF) | Tổng số ký tự `\n` đơn trong trường | Tổng số dòng vật lý (Text lines) | Số dòng Header | **Tổng số dòng dữ liệu (Data Rows)** |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **`dataset_url.csv`** | 53,117 | 0 | 53,117 | 1 | **53,116** |
| **`No_scam.csv`** | 2,205 | 1,422 | 3,627 | 1 | **2,204** |
| **`Scam.csv`** | 1,431 | 67 | 1,498 | 1 | **1,430** |

*Ghi chú*:
- Trong `dataset_url.csv`: Mỗi bản ghi tương ứng đúng 1 dòng vật lý CRLF. 1 dòng header + 53,116 dòng dữ liệu = 53,117 dòng.
- Trong `No_scam.csv`: Mỗi bản ghi kết thúc bằng `\r\n`. 1 dòng header + 2,204 bản ghi dữ liệu = 2,205 bản ghi. Bên trong các bản ghi có 1,422 ký tự `\n` xuống dòng, nâng tổng số ngắt dòng văn bản lên 3,627 dòng.
- Trong `Scam.csv`: Tương tự, 1 header + 1,430 bản ghi dữ liệu = 1,431 bản ghi kết thúc bằng `\r\n`. Bên trong có 67 ký tự `\n` xuống dòng, tổng ngắt dòng văn bản là 1,498 dòng.

---

## 3. Xác Định Cột Nội Dung Chính (Primary Content Column)

1. **`data_demo/dataset_url.csv`**:
   - Cột nội dung chính: **`url_norm`** (index 2).
   - Căn cứ: `channel` và `label` là các trường phân loại thuộc tính (metadata/target label). Thực thể định danh chính của mỗi quan sát là chuỗi URL chuẩn hóa `url_norm`.
   - Kết quả kiểm tra: 100% URL trong `url_norm` là duy nhất (không có 2 dòng nào trùng `url_norm` mà khác nhãn hay kênh).
2. **`data_demo/No_scam.csv`**:
   - Cột nội dung chính: **`message`** (index 0).
   - Căn cứ: File chỉ có duy nhất 1 cột biểu diễn văn bản tin nhắn hợp pháp.
3. **`data_demo/Scam.csv`**:
   - Cột nội dung chính: **`message`** (index 0).
   - Căn cứ: File chỉ có duy nhất 1 cột biểu diễn văn bản tin nhắn lừa đảo.

---

## 4. Phân Tích Chi Tiết Trùng Lặp Nội Bộ và Trùng Lặp Chéo

### 4.1. Trùng Lặp Nội Bộ Trong Từng File

#### A. File `dataset_url.csv`
- **Tổng số dòng dữ liệu ban đầu**: 53,116 dòng.
- **Số dòng trùng lặp trên cột `url_norm`**: **0 dòng (0.00%)**.
- **Số dòng duy nhất sau khử trùng lặp**: **53,116 dòng (100.00%)**.
- *Phân tích chi tiết*: 
  - Toàn bộ 53,116 URL đều là độc nhất.
  - Kiểm tra chuẩn hóa nâng cao (viết thường toàn bộ `lower()` và bỏ dấu gạch chéo cuối `rstrip('/')`) vẫn cho kết quả đúng 53,116 URL duy nhất. Không có hiện tượng near-duplicate do chữ hoa/thường hay dấu gạch chéo đuôi.

#### B. File `No_scam.csv`
- **Tổng số dòng dữ liệu ban đầu**: 2,204 dòng.
- **Tiêu chí 1: So khớp nguyên bản (Exact Raw String Match)**:
  - Số dòng trùng lặp cần loại bỏ: **274 dòng (12.43%)**.
  - Số dòng duy nhất giữ lại: **1,930 dòng (87.57%)**.
  - Số lượng giá trị tin nhắn khác biệt có xảy ra lặp lại: 135 mẫu tin nhắn.
- **Tiêu chí 2: So khớp sau khi làm sạch khoảng trắng/xuống dòng đuôi (Stripped Match)**:
  - Số dòng trùng lặp cần loại bỏ: **275 dòng (12.48%)**.
  - Số dòng duy nhất giữ lại: **1,929 dòng (87.52%)**.
  - *Điểm phát hiện đặc biệt*: Dòng thứ 1502 (CSV row index) và dòng thứ 1535 có nội dung hoàn toàn giống hệt nhau về chữ, nhưng dòng 1535 có thêm ký tự `\n` ở cuối trước dấu nháy đóng:
    - Nội dung: `(TB) Nạp liền tay, vận may trúng lớn! \nVinaPhone dành tặng riêng Quý khách 20% giá trị thẻ nạp...`
    - Dòng 1502: không có `\n` đuôi.
    - Dòng 1535: có `\n` đuôi.
    - Nếu xử lý stripped, dòng 1535 sẽ được coi là trùng lặp với dòng 1502 (loại bỏ 275 dòng). Nếu xử lý raw exact, dòng 1535 được giữ lại (loại bỏ 274 dòng).

**Bảng phân phối tần suất lặp lại trong `No_scam.csv` (Exact Match)**:

| Tần suất xuất hiện (Frequency) | Số lượng tin nhắn độc nhất | Tổng số dòng chiếm dụng | Số dòng trùng lặp loại bỏ |
| :---: | :---: | :---: | :---: |
| **1x** (Không trùng) | 1,795 | 1,795 | 0 |
| **2x** | 89 | 178 | 89 |
| **3x** | 18 | 54 | 36 |
| **4x** | 6 | 24 | 18 |
| **5x** | 9 | 45 | 36 |
| **6x** | 5 | 30 | 25 |
| **7x** | 2 | 14 | 12 |
| **8x** | 3 | 24 | 21 |
| **10x** | 1 | 10 | 9 |
| **14x** | 1 | 14 | 13 |
| **16x** | 1 | 16 | 15 |
| **TỔNG CỘNG** | **1,930** | **2,204** | **274** |

*Các mẫu tin nhắn bị lặp nhiều nhất trong `No_scam.csv`*:
1. Xuất hiện **16 lần**: `[TB] NẠP THẺ ĐỦ ĐẦY - DATA XÀI NGAY!\nTặng 20% giá trị tất cả...` (loại 15 dòng thừa).
2. Xuất hiện **14 lần**: `Quy khach co [MONEY] trong tai khoan. Bam goi *098*3# de co ...` (loại 13 dòng thừa).
3. Xuất hiện **10 lần**: `[TB] NẠP THẺ TẶNG TIỀN - DÙNG LIỀN DATA!\nTặng 20% giá trị tấ...` (loại 9 dòng thừa).
4. Xuất hiện **8 lần**: `Doi thanh cong [POINT] tieu dung Viettel++ thanh 20 MB Data ...` (loại 7 dòng thừa).

#### C. File `Scam.csv`
- **Tổng số dòng dữ liệu ban đầu**: 1,430 dòng.
- **Tiêu chí 1 & 2 (Cả Exact Match và Stripped Match đều cho kết quả hoàn toàn trùng khớp)**:
  - Số dòng trùng lặp cần loại bỏ: **111 dòng (7.76%)**.
  - Số dòng duy nhất giữ lại: **1,319 dòng (92.24%)**.
  - Số lượng giá trị tin nhắn khác biệt có xảy ra lặp lại: 67 mẫu tin nhắn.

**Bảng phân phối tần suất lặp lại trong `Scam.csv`**:

| Tần suất xuất hiện (Frequency) | Số lượng tin nhắn độc nhất | Tổng số dòng chiếm dụng | Số dòng trùng lặp loại bỏ |
| :---: | :---: | :---: | :---: |
| **1x** (Không trùng) | 1,252 | 1,252 | 0 |
| **2x** | 52 | 104 | 52 |
| **3x** | 7 | 21 | 14 |
| **4x** | 2 | 8 | 6 |
| **5x** | 2 | 10 | 8 |
| **6x** | 1 | 6 | 5 |
| **9x** | 1 | 9 | 8 |
| **10x** | 2 | 20 | 18 |
| **TỔNG CỘNG** | **1,319** | **1,430** | **111** |

*Các mẫu tin nhắn bị lặp nhiều nhất trong `Scam.csv`*:
1. Xuất hiện **10 lần**: `Kho?n vay c?a b?n ?ã quá h?n. Vui lòng thanh toán hôm nay, n...` (loại 9 dòng thừa).
2. Xuất hiện **10 lần**: `?? h?y giao d?ch l?, ??c mã [NUMBER] cho nhân viên ngân hàng...` (loại 9 dòng thừa).
3. Xuất hiện **9 lần**: `H? th?ng ghi nh?n b?n nh?n nh?m 1 kho?n ti?n. Liên h? [NUMBE...` (loại 8 dòng thừa).
4. Xuất hiện **6 lần**: `Nhóm t? v?n ch?ng khoán mi?n phí c?a th?y ?ang m? thêm slot,...` (loại 5 dòng thừa).
5. Xuất hiện **5 lần**: `C?n ng??i cho thuê tài kho?n ngân hàng, 5-[MONEY]/tháng, an ...` (loại 4 dòng thừa).

---

### 4.2. Thống Kê Trùng Lặp Chéo Giữa 3 File (Cross-File Duplicates)

1. **Trùng lặp giữa `No_scam.csv` và `Scam.csv`**:
   - Trùng lặp chính xác tuyệt đối (Exact match): **0 tin nhắn (0 dòng)**.
   - Trùng lặp sau chuẩn hóa khoảng trắng (Stripped match): **0 tin nhắn (0 dòng)**.
   - Trùng lặp không phân biệt hoa thường (Case-insensitive): **0 tin nhắn (0 dòng)**.
   - *Đánh giá*: Không có xung đột gán nhãn chéo giữa tập No_scam và tập Scam. Dữ liệu tin nhắn giữa 2 file phân định ranh giới nhãn sạch sẽ.
2. **Trùng lặp giữa nội dung tin nhắn (`No_scam` / `Scam`) với URL trong `dataset_url.csv`**:
   - Không có tin nhắn nào trong `No_scam.csv` hoặc `Scam.csv` chỉ bao gồm duy nhất 1 chuỗi URL trùng với `url_norm` trong `dataset_url.csv` (**0 dòng trùng khớp trực tiếp**).
3. **Phân tích đối sánh thực thể URL xuất hiện bên trong văn bản tin nhắn với `dataset_url.csv` (URL Entity Mentions)**:
   - Trong `No_scam.csv`: Có tổng cộng 1,278 lượt xuất hiện của các chuỗi định dạng URL/domain. Khi đối sánh với 53,116 URL của `dataset_url.csv`, có **8 tên miền/liên kết trùng khớp**. Tất cả 8 liên kết này trong `dataset_url.csv` đều mang nhãn **`benign`** (ví dụ: `gmail.com`, `vuihoc.vn`, `mytv.com.vn`, `mathx.vn`, `tokhaiyte.vn`).
   - Trong `Scam.csv`: Có tổng cộng 1,185 lượt xuất hiện URL/domain. Khi đối sánh với `dataset_url.csv`, có **6 liên kết/tên miền trùng khớp**. Toàn bộ 6 liên kết này trong `dataset_url.csv` đều mang nhãn **`phishing`** (ví dụ: `http://11zalo.com`, `vietinbamk.com`, `www.bidvsmat.com`, `http://tikihethongmuasam12h.com`, `www.wtudl.icu`).
   - *Kết luận*: Tính nhất quán ngữ nghĩa giữa tập URL lừa đảo và các mồi nhử trong tập tin nhắn lừa đảo là rất cao và không bị nhiễm chéo nhãn.

---

## 5. Dị Thường Dữ Liệu, Giá Trị Thiếu/Trống và Các Bẫy Định Dạng

### 5.1. Giá Trị Thiếu / Null / Empty Strings
- `dataset_url.csv`: 0 giá trị rỗng, 0 giá trị null, 0 giá trị chuỗi giả null (`"nan"`, `"null"`, `"none"`). Tỷ lệ hoàn chỉnh 100%.
- `No_scam.csv`: 0 giá trị rỗng, 0 giá trị null, 0 chuỗi giả null. Tỷ lệ hoàn chỉnh 100%.
- `Scam.csv`: 0 giá trị rỗng, 0 giá trị null, 0 chuỗi giả null. Tỷ lệ hoàn chỉnh 100%.

### 5.2. Khoảng Trắng và Xuống Dòng Dị Thường
- **Khoảng trắng thừa**:
  - Trong `Scam.csv`: Dòng 847 có khoảng trắng ở cuối chuỗi: `'MBER] Liên h? / zalo:[NUMBER] '`.
- **Xuống dòng cuối chuỗi (`\n` trailing)**:
  - Trong `Scam.csv`: Dòng 1118 có ký tự `\n` ở cuối chuỗi trước nháy đóng: `'tps://techcom-rewards-vn .com\n'`.
  - Trong `No_scam.csv`: Có 12 dòng có ký tự `\n` ở cuối chuỗi trước nháy đóng (dòng 3, 1523, 1527, 1535, 1537, ...).

### 5.3. Trường Nhiều Dòng (Multiline Quoted Fields)
- **`No_scam.csv`**: Có tới **587 bản ghi** (chiếm 26.63% tổng số bản ghi) chứa ký tự xuống dòng nội dung (`\n`). 
  - Ký tự xuống dòng bên trong trường được bọc trong cặp nháy kép `"` và sử dụng ký tự `\n` (LF đơn), trong khi ngắt dòng kết thúc mỗi bản ghi CSV là `\r\n` (CRLF).
  - Có 43 dòng chứa dấu nháy kép bên trong nội dung (ví dụ: `“Đã uống rượu bia - không lái xe"` hoặc `""`).
- **`Scam.csv`**: Có **27 bản ghi** (1.89%) là trường nhiều dòng chứa LF đơn. Có 11 dòng chứa dấu nháy kép nội dung.
- **RỦI RO NGHIÊM TRỌNG**: Nếu lập trình viên xử lý file bằng cách đọc từng dòng văn bản (`for line in f:` hoặc `.readlines()`), các bản ghi multiline sẽ bị chém gãy thành các mảnh vụn, phá hủy hoàn toàn cấu trúc dữ liệu! **Bắt buộc phải sử dụng module `csv.reader` / `csv.writer` tiêu chuẩn RFC 4180 của Python để xử lý**.

### 5.4. Bẫy Mã Hóa Ký Tự Trong `Scam.csv` (Encoding Trap)
- **Hiện tượng**: File `Scam.csv` được lưu ở bảng mã **Windows-1252** (CP1252), không phải UTF-8.
- **Vị trí lỗi**: Tại byte 91,825 (dòng 777), gặp chuỗi byte:
  `b'Th\xf4ng b\xe1o t? VIETINBANK: B?n d\xf9ng vui l\xf2ng ??ng nh?p v\xe0o vietinbamk.com...'`
  Byte `\xf4` (chữ 'ô' trong CP1252) đứng đơn lẻ không có continuation byte của UTF-8, lập tức gây lỗi `UnicodeDecodeError: 'utf-8' codec can't decode byte 0xf4 in position 91825`.
- **Đặc điểm lịch sử của tập dữ liệu**: 
  - Từ dòng 1 đến dòng 776: Toàn bộ là ký tự ASCII thuần (không dấu).
  - Từ dòng 777 đến 1431: Chứa các ký tự tiếng Việt một byte theo Windows-1252 (`\xe0` = à, `\xe1` = á, `\xf4` = ô, `\xea` = ê, `\xf3` = ó, `\xe2` = â, `\xed` = í, `\xfd` = ý, `\xe3` = ã, `\xfa` = ú, `\xf2` = ò, `\xec` = ì).
  - Các ký tự tiếng Việt phức tạp không có trong Windows-1252 (như ư, ơ, đ, dấu hỏi, dấu nặng) đã bị chuyển thành dấu hỏi chấm `?` từ trước khi tạo file (ví dụ: `t?`, `B?n`, `??ng nh?p`).
  - Chứa ký tự en-dash `0x96` (`–`) tại dòng 1396 và 1401.

---

## 6. Quy Định và Quy Tắc Chi Tiết Cho Việc Khử Trùng Lặp In-Place

Nhằm đảm bảo quá trình thực thi khử trùng lặp và ghi đè trực tiếp (in-place overwrite) đạt tiêu chuẩn Acceptance Criteria và không làm hỏng dữ liệu, các quy tắc kỹ thuật sau được xác lập:

### Quy Tắc 1: Nguyên Tắc Giữ Lại Bản Ghi (Deduplication Policy)
- **First Occurrence Wins**: Khi phát hiện dòng trùng lặp trên cột nội dung chính, luôn giữ lại bản ghi xuất hiện đầu tiên (`keep='first'`), loại bỏ toàn bộ các bản ghi trùng lặp xuất hiện phía sau.
- **Bảo toàn thứ tự gốc**: Duy trì nguyên vẹn thứ tự tương đối của các dòng dữ liệu được giữ lại.

### Quy Tắc 2: Tiêu Chí So Khớp (Matching Criteria)
- Cột khóa xác định trùng lặp:
  - `dataset_url.csv`: Cột `url_norm`
  - `No_scam.csv`: Cột `message`
  - `Scam.csv`: Cột `message`
- **Khuyến nghị phương án so khớp**:
  - **Phương án A (Exact Raw String Match)**: So khớp chính xác từng byte chuỗi `message`.
    - Kết quả: `dataset_url.csv` giữ 53,116 (bỏ 0); `No_scam.csv` giữ 1,930 (bỏ 274); `Scam.csv` giữ 1,319 (bỏ 111).
  - **Phương án B (Stripped String Match)**: So khớp sau khi `.strip()` bỏ khoảng trắng và ký tự xuống dòng dư thừa ở 2 đầu chuỗi.
    - Kết quả: `dataset_url.csv` giữ 53,116 (bỏ 0); `No_scam.csv` giữ 1,929 (bỏ 275 - khử thêm dòng 1535 bị thừa `\n` đuôi); `Scam.csv` giữ 1,319 (bỏ 111).
  - *Đề xuất*: Ưu tiên Phương án B hoặc Phương án A kèm giải trình rõ ràng trong báo cáo kiểm thử độc lập. Cả 2 phương án đều đạt tiêu chí Acceptance Criteria.

### Quy Tắc 3: Xử Lý Mã Hóa Khi Đọc và Ghi
- **`dataset_url.csv`**: Đọc bằng `encoding='utf-8'`, ghi lại bằng `encoding='utf-8'`, `newline=''`, `lineterminator='\r\n'`.
- **`No_scam.csv`**: Đọc bằng `encoding='utf-8-sig'`, ghi lại bằng `encoding='utf-8-sig'` (bảo toàn BOM ban đầu của file), `newline=''`, `lineterminator='\r\n'`.
- **`Scam.csv`**: 
  - Đọc bằng `encoding='windows-1252'`.
  - Khi ghi lại: Ghi bằng `encoding='windows-1252'` để bảo toàn định dạng mã hóa gốc 100%, hoặc ghi bằng `encoding='utf-8'` nếu quy chuẩn dự án yêu cầu thống nhất toàn bộ CSV về UTF-8 (lưu ý: giải mã bằng `windows-1252` rồi ghi ra UTF-8 hoàn toàn an toàn và không mất thông tin). Khuyến nghị ghi giữ nguyên `windows-1252` hoặc UTF-8 chuẩn kèm thông báo rõ trong báo cáo.

### Quy Tắc 4: Bảo Toàn Trường Nhiều Dòng và Dấu Nháy (Quoting Standard)
- Bắt buộc sử dụng `csv.writer(f, quoting=csv.QUOTE_MINIMAL, lineterminator='\r\n')`.
- Các trường có chứa dấu phẩy `,`, dấu nháy kép `"`, hoặc ký tự xuống dòng `\n` sẽ tự động được bọc trong cặp dấu nháy kép theo chuẩn RFC 4180. Dấu nháy kép bên trong nội dung được thoát thành `""`.

### Quy Tắc 5: Ghi Đè An Toàn (Atomic In-Place Write)
- Không ghi trực tiếp đè vào file đang mở đọc.
- Đọc toàn bộ dữ liệu vào bộ nhớ, lọc các bản ghi duy nhất, đóng luồng đọc, sau đó ghi đè vào file (hoặc ghi vào file tạm `.tmp` rồi đổi tên thay thế) để tránh mất mát dữ liệu nếu quá trình ghi gặp sự cố gián đoạn.

---

## 7. Bảng Tổng Hợp Số Liệu Khảo Sát Phục Vụ Kiểm Thử Độc Lập

Bảng số liệu sau đây là căn cứ chuẩn mực (Ground Truth) để script kiểm chứng độc lập đối chiếu sau khi hoàn tất bước khử trùng:

| Tệp tin | Mã hóa đầu vào | Tổng số dòng ban đầu | Số dòng trùng nội bộ (Exact) | Số dòng sau khử (Exact) | Số dòng trùng nội bộ (Stripped) | Số dòng sau khử (Stripped) | Trùng chéo với các file khác |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **`dataset_url.csv`** | UTF-8 | 53,116 | **0** | **53,116** | **0** | **53,116** | 0 |
| **`No_scam.csv`** | UTF-8-SIG | 2,204 | **274** | **1,930** | **275** | **1,929** | 0 |
| **`Scam.csv`** | Windows-1252 | 1,430 | **111** | **1,319** | **111** | **1,319** | 0 |
| **TỔNG CỘNG** | — | **56,750** | **385** | **56,365** | **386** | **56,364** | **0** |

---
*Báo cáo được hoàn thành bởi teamwork_explorer_survey_2 tuân thủ nghiêm ngặt nguyên tắc khảo sát read-only và chuẩn mực kiểm thử phần mềm.*
