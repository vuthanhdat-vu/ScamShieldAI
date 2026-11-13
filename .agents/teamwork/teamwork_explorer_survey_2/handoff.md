# Handoff Report: Khảo Sát & Phân Tích Trùng Lặp 3 File CSV Trong `data_demo`

**Agent**: teamwork_explorer_survey_2  
**Recipient**: Orchestrator (1fd7583a-5f21-457e-82a3-df5e26cfa868)  
**Date**: 2026-11-12T08:06:00Z  
**Type**: Hard Handoff (Investigation & Survey Complete)  

---

## 1. Observation (Quan Sát Trực Tiếp)

Các quan sát trực tiếp được thu thập thông qua công cụ đọc byte và phân tích cú pháp Python trên 3 file mục tiêu:

### A. Kích thước và Mã hóa File
- `data_demo/dataset_url.csv`:
  - Kích thước: 2,011,503 bytes.
  - Byte mở đầu: `0x63 0x68 0x61 0x6e 0x6e 0x65 0x6c` (`"channel"`). Không có BOM (`has_bom = False`).
  - Giải mã: 100% hợp lệ với `utf-8` và `ascii`. Tất cả 2,011,503 bytes đều có giá trị `< 128` (ASCII thuần).
- `data_demo/No_scam.csv`:
  - Kích thước: 578,408 bytes.
  - 3 byte đầu tiên: `0xef 0xbb 0xbf` (UTF-8 BOM). Bắt buộc giải mã với `utf-8-sig`.
  - Giải mã: 100% hợp lệ với `utf-8-sig` (524,091 ký tự).
- `data_demo/Scam.csv`:
  - Kích thước: 196,670 bytes. Không có BOM.
  - Khi giải mã bằng `utf-8`: Lỗi tại byte offset 91,825:
    `UnicodeDecodeError: 'utf-8' codec can't decode byte 0xf4 in position 91825: invalid continuation byte`
    Ngữ cảnh byte: `b'-pay.vip de huy giao dich"\r\nTh\xf4ng b\xe1o t? VIETINBANK: B?n d\xf9n'`
  - Có 3,825 byte có giá trị `>= 0x80`. Trong đó gồm `0x96` (en-dash '–' trong Windows-1252) tại dòng 1396 và 1401.
  - Giải mã bằng `windows-1252`: Thành công 100% (196,670 ký tự).

### B. Ngắt Dòng, Header và Cấu Trúc Bảng
- `data_demo/dataset_url.csv`:
  - Ký tự kết thúc dòng: CRLF (`\r\n`) trong toàn bộ file (53,117 dấu CRLF).
  - Header: `['channel', 'label', 'url_norm']` (3 cột).
  - Tổng số bản ghi dữ liệu CSV: 53,116 bản ghi. Không có trường nhiều dòng (multiline = 0).
  - Phân bố: `label`: `phishing` (36,706) và `benign` (16,410); `channel`: `url` (53,112) và `social` (4).
- `data_demo/No_scam.csv`:
  - Ký tự kết thúc bản ghi: CRLF (`\r\n`) (2,205 dấu CRLF).
  - Header: `['message']` (1 cột).
  - Tổng số bản ghi dữ liệu CSV: 2,204 bản ghi.
  - Trường nhiều dòng: Có **587 bản ghi multiline** chứa 1,422 ký tự `\n` đơn bên trong nội dung.
  - Tổng số dòng văn bản tính theo `\n`: 3,627 dòng.
- `data_demo/Scam.csv`:
  - Ký tự kết thúc bản ghi: CRLF (`\r\n`) (1,431 dấu CRLF).
  - Header: `['message']` (1 cột).
  - Tổng số bản ghi dữ liệu CSV: 1,430 bản ghi.
  - Trường nhiều dòng: Có **27 bản ghi multiline** chứa 67 ký tự `\n` đơn bên trong nội dung.
  - Tổng số dòng văn bản tính theo `\n`: 1,498 dòng.

### C. Trùng Lặp Nội Bộ (Internal Duplicates)
- `data_demo/dataset_url.csv`:
  - Cột nội dung chính: `url_norm`.
  - Số URL duy nhất: 53,116 / 53,116.
  - Số dòng trùng lặp: **0 dòng**.
- `data_demo/No_scam.csv`:
  - Cột nội dung chính: `message`.
  - So khớp nguyên bản (exact raw): 1,930 unique, **274 dòng trùng lặp**.
  - So khớp sau `.strip()`: 1,929 unique, **275 dòng trùng lặp**.
  - Sự khác biệt: Dòng 1502 không có `\n` đuôi, dòng 1535 có `\n` đuôi (`'(TB) Nạp liền tay, vận may trúng lớn! ...'`).
  - Có 135 mẫu tin nhắn bị lặp lại, mẫu lặp nhiều nhất xuất hiện 16 lần.
- `data_demo/Scam.csv`:
  - Cột nội dung chính: `message`.
  - Cả so khớp exact và stripped: 1,319 unique, **111 dòng trùng lặp**.
  - Có 67 mẫu tin nhắn bị lặp lại, 2 mẫu lặp nhiều nhất xuất hiện 10 lần.

### D. Trùng Lặp Chéo (Cross-File Duplicates)
- Trùng lặp chính xác `message` giữa `No_scam.csv` và `Scam.csv`: **0 dòng**.
- Trùng lặp chính xác giữa tin nhắn với `url_norm` trong `dataset_url.csv`: **0 dòng**.
- Quét URL bên trong nội dung tin nhắn:
  - `No_scam.csv`: 8 URL/domain trùng khớp với `dataset_url.csv` (100% nhãn `benign`).
  - `Scam.csv`: 6 URL/domain trùng khớp với `dataset_url.csv` (100% nhãn `phishing`).

---

## 2. Logic Chain (Chuỗi Lập Luận)

1. **Về Mã Hóa File**:
   - Từ Quan sát 1A, `dataset_url.csv` là ASCII/UTF-8 thuần, `No_scam.csv` chứa UTF-8 BOM, và `Scam.csv` chứa các ký tự 1 byte của `windows-1252` gây lỗi crash UTF-8 ngay tại dòng 777.
   - *Suy luận*: Bất kỳ script nào mở cả 3 file bằng encoding mặc định (`utf-8`) sẽ thất bại trên `Scam.csv`. Do đó, khi đọc `Scam.csv`, parser bắt buộc phải chỉ định `encoding='windows-1252'`. Khi ghi đè in-place, parser có thể giữ nguyên mã hóa này hoặc chuyển đổi an toàn sang UTF-8.

2. **Về Cấu Trúc Bản Ghi và Xử Lý Multiline**:
   - Từ Quan sát 1B, `No_scam.csv` có 587 bản ghi multiline và `Scam.csv` có 27 bản ghi multiline.
   - *Suy luận*: Nếu sử dụng các phương thức xử lý dòng thô như `file.readlines()` hoặc split bằng `\n`, dữ liệu sẽ bị cắt nát thành các phân đoạn sai lệch và tạo ra hàng nghìn dòng rác. Bắt buộc phải sử dụng parser CSV chuẩn RFC 4180 (`csv.reader` và `csv.writer` với `newline=''`) để bảo toàn tính toàn vẹn của dữ liệu.

3. **Về Cột Nội Dung Chính và Khử Trùng Lặp**:
   - Từ Quan sát 1B và 1C, `dataset_url.csv` có cột `url_norm` chứa 100% URL duy nhất; `No_scam.csv` và `Scam.csv` chỉ có duy nhất cột `message`.
   - *Suy luận*: Tiêu chí deduplication theo cột nội dung chính hoàn toàn rõ ràng. Áp dụng quy tắc `keep='first'` bảo toàn thứ tự ban đầu sẽ loại bỏ chính xác:
     - 0 dòng khỏi `dataset_url.csv` (giữ nguyên 53,116 dòng).
     - 274 dòng (exact) hoặc 275 dòng (stripped) khỏi `No_scam.csv` (còn 1,930 hoặc 1,929 dòng).
     - 111 dòng khỏi `Scam.csv` (còn 1,319 dòng).

4. **Về Tính Độc Lập và An Toàn Dữ Liệu Chéo**:
   - Từ Quan sát 1D, không có bất kỳ thông điệp nào bị gán nhãn trùng lặp giữa `No_scam` và `Scam`.
   - *Suy luận*: Hai tập tin nhắn hoàn toàn độc lập và sạch về mặt nhãn phân loại, không có rủi ro mâu thuẫn nhãn (data leakage / conflicting ground truth) cho mô hình AI sau khi khử trùng nội bộ độc lập từng file.

---

## 3. Caveats (Cảnh Báo & Giả Định)

1. **Dấu hỏi chấm `?` trong `Scam.csv`**:
   - Trong `Scam.csv` từ dòng 777 trở đi, nhiều từ tiếng Việt có dấu hỏi chấm (ví dụ: `Th\xf4ng b\xe1o t? VIETINBANK: B?n d\xf9ng vui l\xf2ng ??ng nh?p`).
   - Đây là đặc điểm vốn có của dữ liệu nguồn ban đầu (đã bị lỗi phông từ trước khi lưu file), không phải do quá trình khảo sát tạo ra. Việc khử trùng lặp giữ nguyên vẹn chuỗi gốc này.
2. **Khác biệt 1 dòng giữa Exact Match và Stripped Match trong `No_scam.csv`**:
   - Dòng 1502 vs 1535 lệch nhau ký tự `\n` ở cuối chuỗi.
   - Nếu implementer dùng exact match: giảm 274 dòng (còn 1,930 dòng). Nếu dùng `.strip()`: giảm 275 dòng (còn 1,929 dòng). Cả 2 phương án đều hợp lệ, nhưng script kiểm thử cần biết trước phương án được chọn để assert số dòng chính xác.
3. **Phạm vi khảo sát**:
   - Khảo sát strictly tuân thủ chế độ Read-Only, không thực hiện ghi đè hoặc thay đổi bất kỳ byte nào trên 3 file trong thư mục `data_demo`.

---

## 4. Conclusion (Kết Luận Cốt Lõi)

1. Khảo sát đã hoàn thành 100% mục tiêu, cung cấp đầy đủ thông số kỹ thuật (encoding, delimiters, line counts, schema), dị thường (multiline, BOM, windows-1252 trap), và số lượng định lượng trùng lặp chính xác.
2. Báo cáo chi tiết đã được lập tại:
   `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\teamwork_explorer_survey_2\analysis.md`
3. Bộ số liệu chuẩn (Ground Truth) sẵn sàng chuyển giao cho subagent thực thi và subagent kiểm thử:
   - `dataset_url.csv`: 53,116 ban đầu -> 0 trùng -> 53,116 còn lại.
   - `No_scam.csv`: 2,204 ban đầu -> 274 trùng (exact) / 275 trùng (stripped) -> 1,930 (exact) / 1,929 (stripped) còn lại.
   - `Scam.csv`: 1,430 ban đầu -> 111 trùng -> 1,319 còn lại.
   - Trùng lặp chéo giữa 3 file: 0 dòng.

---

## 5. Verification Method (Phương Pháp Kiểm Chứng Độc Lập)

Người tiếp nhận hoặc agent kiểm thử có thể sao chép và chạy đoạn mã PowerShell / Python sau để kiểm chứng độc lập toàn bộ các kết quả trên:

```powershell
@'
import csv

# 1. Verify dataset_url.csv
with open("data_demo/dataset_url.csv", "r", encoding="utf-8", newline="") as f:
    rows = list(csv.reader(f))
    header, data = rows[0], rows[1:]
    urls = [r[2] for r in data]
    assert header == ["channel", "label", "url_norm"]
    assert len(data) == 53116
    assert len(set(urls)) == 53116
    print("[PASS] dataset_url.csv: 53116 rows, 0 duplicates.")

# 2. Verify No_scam.csv
with open("data_demo/No_scam.csv", "r", encoding="utf-8-sig", newline="") as f:
    rows = list(csv.reader(f))
    header, data = rows[0], rows[1:]
    msgs = [r[0] for r in data]
    assert header == ["message"]
    assert len(data) == 2204
    assert len(set(msgs)) == 1930
    assert len(set(m.strip() for m in msgs)) == 1929
    print("[PASS] No_scam.csv: 2204 rows, 274 exact dups (1930 unique), 275 stripped dups (1929 unique).")

# 3. Verify Scam.csv
with open("data_demo/Scam.csv", "r", encoding="windows-1252", newline="") as f:
    rows = list(csv.reader(f))
    header, data = rows[0], rows[1:]
    msgs = [r[0] for r in data]
    assert header == ["message"]
    assert len(data) == 1430
    assert len(set(msgs)) == 1319
    assert len(set(m.strip() for m in msgs)) == 1319
    print("[PASS] Scam.csv: 1430 rows, 111 dups (1319 unique).")

# 4. Verify Cross-file
with open("data_demo/No_scam.csv", "r", encoding="utf-8-sig", newline="") as f:
    no_scam_set = set(r[0] for r in csv.reader(f))
with open("data_demo/Scam.csv", "r", encoding="windows-1252", newline="") as f:
    scam_set = set(r[0] for r in csv.reader(f))
no_scam_set.discard("message")
scam_set.discard("message")
assert len(no_scam_set.intersection(scam_set)) == 0
print("[PASS] Cross-file overlap between No_scam and Scam is 0.")
'@ | python
```
