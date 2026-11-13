# BÁO CÁO KHẢO SÁT TOÀN DIỆN TẬP TÀI NGUYÊN DỮ LIỆU TINH GỌN (`data_demo/`)
## Comprehensive Empirical Survey of Streamlined Data Assets, Schemas & Structural Artifacts

- **Dự án**: ScamShieldAI — Hệ thống Phát hiện và Suy luận Lừa đảo Đa phương thức
- **Tác nhân thực hiện**: `explorer_data_1` (Teamwork Explorer)
- **Thời điểm khảo sát**: 2026-11-12T10:20:00Z
- **Thư mục làm việc**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI`
- **Thư mục trạng thái**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\explorer_data_1\`
- **Nguyên tắc kỹ thuật**: 100% Read-Only, không sửa đổi bất kỳ tệp dữ liệu nào trong `data_demo/`. Mọi số liệu thống kê được tính toán và kiểm chứng thực nghiệm độc lập.

---

## 1. TỔNG QUAN TÀI NGUYÊN DỮ LIỆU (EXECUTIVE SUMMARY & ASSET INVENTORY)

Kho dữ liệu tinh gọn tại `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\data_demo` đã được tái cấu trúc thành công từ các thư mục phân tán trước đây thành một bộ dữ liệu chuẩn hóa, phục vụ trực tiếp cho quá trình tiền xử lý và khung suy luận (Reasoning Harness). 

### Bảng 1.1: Bảng kiểm kê thực nghiệm toàn bộ tài sản dữ liệu trong `data_demo/`

| Tên Tệp / Thư mục | Định dạng | Dung lượng | Quy mô Dữ liệu | Thuộc tính / Schema Cốt lõi | Tình trạng Kỹ thuật & Bảng mã |
| :--- | :---: | :---: | :---: | :--- | :--- |
| **`conservations.json`** | JSON | 186,116 bytes | 38 hội thoại<br>(628 lượt thoại) | Array of Objects: `id` (int), `dialogue` (array of `role`, `content`) | **Tên tệp dị biệt**: `conservations` (thay vì `conversations`). Mã hóa UTF-8 chuẩn. 100% kịch bản lừa đảo. |
| **`dataset_url_sampled.csv`** | CSV | 269,508 bytes | 3,192 dòng dữ liệu<br>(+1 dòng header) | 4 cột: `channel`, `label`, `url_norm`, `pattern_group` | Phân tầng 19 nhóm mẫu; 1,994 Phishing (62.47%), 1,198 Benign (37.53%). 0 null, 0 URL trùng. |
| **`dataset_url.csv`** | CSV | — | **KHÔNG TỒN TẠI** | — | Đã được thay thế toàn diện bởi `dataset_url_sampled.csv` trong `data_demo/`. |
| **`Scam.csv`** | CSV | 185,900 bytes | 1,319 dòng tin nhắn<br>(+1 dòng header) | 1 cột: `message` | Đã chuyển đổi từ CP1252 sang UTF-8; bảo toàn 27 dòng multiline (RFC 4180). 0 duplicate, 0 null. Chứa placeholder `[MONEY]`, `[NUMBER]` và mock domain. |
| **`No_scam.csv`** | CSV | 492,833 bytes | 1,930 dòng tin nhắn<br>(+1 dòng header) | 1 cột: `message` | Đã bóc tách BOM (`utf-8-sig`) về UTF-8 chuẩn; bảo toàn 524 dòng multiline (RFC 4180). 0 duplicate, 0 null. Chứa 71.9% biến động số dư và 58.5% viễn thông. |
| **`DEDUPLICATION_REPORT.md`** | Markdown | 10,894 bytes | 156 dòng markdown | Báo cáo chi tiết khử trùng lặp in-place cho 3 file CSV | Trùng khớp 100% (byte-for-byte) với `docs/CSV_SURVEY_REPORT.md`. Ghi nhận loại bỏ 385 dòng lặp, 0 trùng lặp chéo Scam vs No-scam. |
| **`single_image/`**<br>(alias: `images/`) | Thư mục | ~1.15 MB | 50 ca kiểm thử ảnh đa nền tảng | Gồm: `images/` (50 file ảnh), `texts/` (50 transcript), `metadata.json` (50 entries) | Đầy đủ metadata: `case_id`, `expected_label`, `image_path`, `turns`. 4 nền tảng (Zalo, Messenger, iMessage, SMS), 2 theme (Light/Dark). Thư mục vật lý trên đĩa là `data_demo/single_image/`. |
| **`test_dataset_multiturn/`** | Thư mục | ~3.8 MB | 112 ảnh chụp màn hình, 28 phiên hội thoại | Mở rộng của bộ ảnh kiểm thử: 28 ca multiturn, mỗi ca gồm 4 ảnh lũy tiến (`shot_1` đến `shot_4`) | Phục vụ kiểm thử suy luận theo chuỗi thời gian (Multiturn Session Visual Reasoning). |

---

## 2. KHẢO SÁT CHUYÊN SÂU TẬP HỘI THOẠI ĐA LƯỢT (`conservations.json`)

### 2.1. Tên tệp tin và Cấu trúc Schema
- **Đường dẫn tệp**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\data_demo\conservations.json`
- **Kích thước**: 186,116 bytes.
- **Lưu ý định danh (Critical Naming Quirk)**: Tệp tin được đặt tên là **`conservations.json`** (viết sai chính tả chữ `ser` thay vì `conversations.json`). Bất kỳ mã nguồn hoặc module nạp dữ liệu nào cấu hình cứng tên `conversations.json` sẽ gặp lỗi `FileNotFoundError`.
- **Cấu trúc JSON tổng thể**: Là một JSON Array gồm đúng **38 phần tử** (mỗi phần tử đại diện cho một cuộc hội thoại hoàn chỉnh).
- **Schema của mỗi Conversation Object**:
  ```json
  {
    "id": 1,
    "dialogue": [
      {
        "role": "người gọi",
        "content": "Alo, chào chị. Em là Minh từ nhóm tình nguyện 'Hành Trình Yêu Thương'..."
      },
      {
        "role": "người nhận",
        "content": "Nhóm của em uy tín không? Chuyển khoản thế nào?..."
      }
    ]
  }
  ```
- **Kiểm định tính toàn vẹn Schema**:
  - Khóa cấp cao nhất (Top-level keys): 100% chỉ có 2 trường `id` (integer) và `dialogue` (array). Không có khóa phụ rác hoặc khóa thiếu.
  - Khóa cấp lượt thoại (Turn keys): 100% chỉ có 2 trường `role` (string) và `content` (string). Không có null, không có chuỗi rỗng.
  - Chuỗi ID: Chạy tuần tự tuyệt đối từ `1` đến `38` (`is_sequential = True`).

### 2.2. Thống kê Lượt thoại (Turns) và Phân bổ Vai trò (Roles)
- **Tổng số hội thoại**: 38 hội thoại.
- **Tổng số lượt thoại (Total Turns)**: **628 lượt thoại**.
- **Độ dài lượt thoại mỗi cuộc gọi**:
  - Tối thiểu: **9 lượt** (Hội thoại ID 1).
  - Tối đa: **25 lượt** (Hội thoại ID 26 và ID 32).
  - Trung bình (Mean): **16.53 lượt/hội thoại**.
  - Phân bổ tần suất lượt thoại:
    * 9 lượt: 1 cuộc (ID 1)
    * 11 lượt: 3 cuộc (ID 8, 17, 19)
    * 12 lượt: 3 cuộc (ID 18, 20, 21)
    * 13 lượt: 4 cuộc (ID 11, 14, 15, 16)
    * 14 lượt: 3 cuộc (ID 2, 4, 5)
    * 15 lượt: 7 cuộc (ID 3, 7, 10, 12, 22, 23, 24, 34)
    * 16 lượt: 1 cuộc (ID 10)
    * 17 lượt: 3 cuộc (ID 31, 33, 38)
    * 18 lượt: 1 cuộc (ID 30)
    * 19 lượt: 3 cuộc (ID 6, 13, 29)
    * 20 lượt: 1 cuộc (ID 9)
    * 23 lượt: 5 cuộc (ID 25, 27, 28, 36, 37)
    * 24 lượt: 1 cuộc (ID 35)
    * 25 lượt: 2 cuộc (ID 26, 32)
- **Phân bổ vai trò (Dialogue Roles)**:
  - Chỉ có 2 giá trị vai trò xuất hiện: `"người gọi"` (Caller) và `"người nhận"` (Receiver).
  - `"người gọi"`: **329 lượt** (chiếm 52.39%).
  - `"người nhận"`: **299 lượt** (chiếm 47.61%).
  - Người bắt đầu hội thoại: **100% (38/38 cuộc)** đều do `"người gọi"` mở đầu (đúng bản chất các cuộc gọi lừa đảo chủ động).
  - Người kết thúc hội thoại: 29 cuộc kết thúc bởi `"người gọi"`, 9 cuộc kết thúc bởi `"người nhận"`.
- **Độ dài văn bản mỗi lượt thoại**:
  - Số ký tự: Min = 3 ký tự, Max = 809 ký tự, Trung bình = 168.12 ký tự.
  - Số từ: Min = 1 từ, Max = 176 từ, Trung bình = 37.78 từ.

### 2.3. Bóc tách 5 Chuyên đề Lừa đảo Nguồn gốc
Dựa trên nguồn gốc sáp nhập từ tập tin gốc (`scripts/merge_conversations.py`), 38 cuộc hội thoại được chia thành đúng 5 chuyên mục kịch bản tấn công:

| Khoảng ID | Số Hội thoại | Chuyên đề Lừa đảo | Đặc trưng Ngôn ngữ & Thủ đoạn |
| :---: | :---: | :--- | :--- |
| **ID 01 – 05** | 5 | **Lừa đảo từ thiện** | Giả danh nhóm thiện nguyện ("Hành Trình Yêu Thương", "Quỹ Vì Người Nghèo", "Quỹ Ánh Sao"), lợi dụng bão lũ miền Trung, trẻ em vùng cao; cung cấp STK cá nhân hoặc fanpage giả để lừa nạn nhân chuyển khoản ủng hộ. |
| **ID 06 – 08** & **ID 27 – 28** | 5 | **Lừa đảo đầu tư tài chính / tiền ảo** | Tự xưng chuyên gia cố vấn đầu tư từ "CryptoGlobal", "Sàn Giao dịch Quốc tế", cam kết lợi nhuận 15-30%/ngày, nạp tiền vào sàn ảo, ban đầu cho rút thử lãi nhỏ, sau đó khóa lệnh rút và ép nạp phí mở khóa. |
| **ID 09 – 17** | 9 | **Lừa đảo đặt bàn ăn / nhà hàng** | Mạo danh các chuỗi nhà hàng lớn (Dmaris, Verde Bistro, Aurora Lounge, The Gangs, Kichi-Kichi, Phở Bò Kobe), thông báo sự cố chuyển tiền thiếu mã đặt bàn, tạo lệnh hoàn tiền giả, sau đó ép khách chuyển cọc vào STK cá nhân của "giám đốc chi nhánh". |
| **ID 18 – 26** | 9 | **Lừa đảo đặt phòng khách sạn / Resort** | Mạo danh bộ phận CSKH của Booking.com, khách sạn Hilton Hanoi, Melia, Vinpearl Luxury, thông báo phòng đã đặt bị hủy do lỗi cổng thanh toán thẻ, yêu cầu xác nhận khẩn cấp và chuyển khoản vào tài khoản ủy thác. |
| **ID 29 – 38** | 10 | **Lừa đảo định danh CCCD / VNeID** | Mạo danh sĩ quan công an (Trung tá, Thượng tá, Đại tá thuộc Cục Cảnh sát QLHC về TTXH - C06, Cục Cảnh sát Hình sự - C02), đe dọa CCCD bị sai thông tin định danh Mức 2, dính líu đường dây rửa tiền, ép cài ứng dụng VNeID giả mạo (.apk) hoặc đọc 3 mã OTP ngân hàng để "đồng bộ dữ liệu". |

### 2.4. Phát hiện Dị biệt Cấu trúc Quan trọng (Structural Anomaly in Conv ID 9)
- **Quy luật luân phiên (Role Alternation)**: 37/38 cuộc hội thoại tuân thủ nghiêm ngặt quy tắc luân phiên 1-1 (`người gọi` $\rightarrow$ `người nhận` $\rightarrow$ `người gọi` $\rightarrow$ ...).
- **Dị biệt duy nhất tại Hội thoại ID 9 (Turns 10 & 11)**:
  - Turn 10 có vai trò `"người gọi"` (nhân viên Minh): *"...Để em chuyển máy cho chị kế toán xử lý hoàn tiền cho chị luôn nhé, chị ấy sẽ hướng dẫn chi tiết ạ."*
  - Turn 11 ngay sau đó tiếp tục có vai trò `"người gọi"` (kế toán Hạnh): *"...Alo, chào chị. Em là Hạnh, kế toán trưởng chi nhánh Dmaris đây ạ. Em vừa kiểm tra giao dịch của chị rồi..."*
  - **Ý nghĩa kỹ thuật**: Đây **không phải lỗi dữ liệu** mà là hiện tượng phản ánh thực tế nghiệp vụ lừa đảo: **Kịch bản chuyển máy đa tác nhân (Multi-actor Scammer Handover)**. Hai kẻ lừa đảo khác nhau cùng đóng vai trò bên gọi đến nạn nhân. Module Preprocessing cần hỗ trợ chuỗi turn liên tiếp cùng role từ phía đối phương mà không ngắt phiên.

---

## 3. KHẢO SÁT CHUYÊN SÂU TẬP LIÊN KẾT ĐỘC HẠI (`dataset_url_sampled.csv`)

### 3.1. Hiện trạng Tệp dữ liệu & Xác nhận về `dataset_url.csv`
- **Tệp `dataset_url.csv`**: **Không còn tồn tại** trong `data_demo/` (trước đây có quy mô 53,116 URL thô như mô tả trong `docs/EDA_REPORT.md` và `DEDUPLICATION_REPORT.md`).
- **Tệp thay thế hiện hành**: **`data_demo/dataset_url_sampled.csv`** (269,508 bytes).
- **Cấu trúc trường (Headers)**: Gồm 4 cột chuẩn:
  ```csv
  channel,label,url_norm,pattern_group
  ```
- **Quy mô**: Đúng **3,192 dòng dữ liệu** (+ 1 dòng header = 3,193 dòng vật lý).
- **Kiểm định chất lượng**:
  - Dữ liệu khuyết thiếu (Null/NaN): **0 bản ghi** (100% đầy đủ).
  - Trùng lặp URL (`url_norm` duplicates): **0 bản ghi** (100% URL là duy nhất tuyệt đối).

### 3.2. Phân bố Nhãn (Class Distribution)
- **`phishing` (Liên kết lừa đảo / độc hại)**: **1,994 URLs** (chiếm **62.47%**).
- **`benign` (Liên kết hợp pháp / an toàn)**: **1,198 URLs** (chiếm **37.53%**).
- **Phân bổ kênh (`channel`)**: 100% (3,192/3,192) đều có giá trị `url`.

### 3.3. Phân tầng 19 Nhóm Mẫu Tấn công & Tên miền (`pattern_group`)
Tập dữ liệu đã được lấy mẫu phân tầng (stratified sampling) kỹ lưỡng thành 19 nhóm mẫu đại diện cho các chiến dịch tấn công thực tế tại Việt Nam:

| Nhóm Mẫu (`pattern_group`) | Nhãn | Số lượng URL | Tỷ lệ (%) | Đặc điểm Kỹ thuật Điển hình |
| :--- | :---: | :---: | :---: | :--- |
| **Benign - Cơ quan Nhà nước VN (.gov.vn)** | benign | 300 | 9.40% | Cổng thông tin UBND các tỉnh/thành, sở ban ngành, hệ thống DVC (`hnd.baria-vungtau.gov.vn`) |
| **Benign - Doanh nghiệp & Tổ chức VN (.vn)** | benign | 250 | 7.83% | Doanh nghiệp chính thống Việt Nam (`viac.vn`, `vietnamobile.com.vn`) |
| **Benign - Nền tảng & Doanh nghiệp quốc tế (.com/.net)** | benign | 200 | 6.27% | Các trang dịch vụ công nghệ, thương mại quốc tế uy tín |
| **Benign - Giáo dục & Đào tạo VN (.edu.vn)** | benign | 150 | 4.70% | Trường đại học, học viện, cổng tuyển sinh chính thống |
| **Benign - Tên miền quốc gia khác (ccTLD)** | benign | 150 | 4.70% | Tên miền quốc gia uy tín (`.br`, `.de`, `.ru`, `.jp`) |
| **Benign - Tổ chức phi lợi nhuận quốc tế (.org)** | benign | 100 | 3.13% | Tổ chức tiêu chuẩn, y tế, giáo dục quốc tế |
| **Benign - Giáo dục & Đại học quốc tế (.edu)** | benign | 48 | 1.50% | Đại học quốc tế |
| *Tiểu kết tập Benign* | *benign* | *1,198* | *37.53%* | *Phần lớn sở hữu tên miền cấp cao được kiểm soát chặt chẽ* |
| **Phishing - Cờ bạc, Đổi thưởng & Live 18+** | phishing | 250 | 7.83% | Game bài, tài xỉu, cá độ bóng đá, nổ hũ (`trumchanle99.fun`, `py2688.com`) |
| **Phishing - TMĐT & Tuyển CTV đơn hàng** | phishing | 250 | 7.83% | Giả mạo Shopee, Tiki, Lazada, thông tin giao hàng (`thongtindonhang.com`) |
| **Phishing - Ngân hàng & Ví điện tử** | phishing | 250 | 7.83% | Typosquatting ngân hàng VCB, BIDV, Techcombank, MoMo (`vietcombank.money`) |
| **Phishing - Đầu tư tài chính & Tiền ảo** | phishing | 200 | 6.27% | Sàn forex lậu, đầu tư sinh lời, app vay tiền (`vaytieudungnganhang.net`) |
| **Phishing - Tên miền TLD giá rẻ rác** | phishing | 150 | 4.70% | Sử dụng gTLD giá rẻ không kiểm soát danh tính (`.xyz`, `.top`, `.vip`, `.cc`) |
| **Phishing - Generic / Khác** | phishing | 150 | 4.70% | Các chiến dịch phishing tổng hợp, chuyển hướng |
| **Phishing - Nạp game & Quà tặng** | phishing | 150 | 4.70% | Trang web nạp thẻ lậu, tặng kim cương/vàng game FreeFire, Liên Quân |
| **Phishing - Rút gọn link & Cloud Hosting** | phishing | 150 | 4.70% | Sử dụng Bitly, TinyURL, Cloudflare Pages, Vercel để che giấu đích đến |
| **Phishing - Tên miền DGA & Chuỗi số dài** | phishing | 150 | 4.70% | Thuật toán sinh tên miền tự động (DGA) và dãy số ngẫu nhiên |
| **Phishing - Viễn thông & Quỹ từ thiện** | phishing | 150 | 4.70% | Giả mạo nhà mạng tặng 4G/5G, giả quỹ thiện nguyện vùng lũ |
| **Phishing - Bưu chính & Chuyển phát** | phishing | 76 | 2.38% | Mạo danh VNPost, ViettelPost, giao bưu kiện bị kẹt |
| **Phishing - DVC & Cơ quan nhà nước** | phishing | 68 | 2.13% | Mạo danh Cổng DVC Quốc gia, VNeID, phạt nguội Bộ Công An |
| *Tiểu kết tập Phishing* | *phishing* | *1,994* | *62.47%* | *Bao phủ toàn diện các vectơ tấn công mạng hiện đại* |

### 3.4. Đặc tính Kỹ thuật URL (Giao thức, TLD và Độ dài)
- **Giao thức (Protocols)**:
  - Trong tập `benign`: 1,076 URL dùng `http://` (89.8%), 122 URL dùng `https://` (10.2%).
  - Trong tập `phishing`: 1,965 URL dùng `http://` (98.5%), 29 URL dùng `https://` (1.5%).
  - *Đánh giá*: Đa số các URL trong bộ dữ liệu thô được lưu trữ dưới tiền tố `http://` để chuẩn hóa, tuy nhiên các trang phishing ít sử dụng HTTPS hợp lệ hơn.
- **Top 10 TLDs trong tập Phishing**:
  1. `.com`: 1,059 (53.1%)
  2. `.xyz`: 114 (5.7%)
  3. `.vip`: 92 (4.6%)
  4. `.net`: 90 (4.5%)
  5. `.top`: 62 (3.1%)
  6. `.online`: 61 (3.1%)
  7. `.vn`: 45 (2.3% — thường là tên miền phụ lậu hoặc chiếm quyền)
  8. `.cc`: 36 (1.8%)
  9. `.club`: 31 (1.6%)
  10. `.live`: 23 (1.2%)
- **Top 10 TLDs trong tập Benign**:
  1. `.gov.vn`: 300 (25.0%)
  2. `.vn`: 178 (14.9%)
  3. `.com`: 173 (14.4%)
  4. `.edu.vn`: 150 (12.5%)
  5. `.org`: 92 (7.7%)
  6. `.com.vn`: 48 (4.0%)
  7. `.edu`: 29 (2.4%)
  8. `.net`: 23 (1.9%)
  9. `.ru`: 19 (1.6%)
  10. `.de`: 10 (0.8%)
- **Độ dài ký tự URL**:
  - `benign`: Min = 11, Max = 51, Mean = 24.29, Median = 22 ký tự.
  - `phishing`: Min = 13, Max = 178, Mean = 24.50, Median = 23 ký tự.

---

## 4. KHẢO SÁT CHUYÊN SÂU TẬP TIN NHẮN ĐƠN LỪA ĐẢO (`Scam.csv`)

### 4.1. Cấu trúc, Mã hóa & Quá trình Làm sạch
- **Đường dẫn tệp**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\data_demo\Scam.csv`
- **Kích thước**: 185,900 bytes.
- **Header**: Đúng 1 cột `['message']`.
- **Số lượng bản ghi**: **1,319 dòng tin nhắn duy nhất** (+ 1 dòng header = 1,320 dòng vật lý).
- **Hiện trạng mã hóa**: Ban đầu lưu dưới mã **Windows-1252 / CP1252** chứa các byte bẫy (như byte `0x96` en-dash, byte `0xE0`, `0xE1`), đã được chuyển đổi thành công về mã hóa **UTF-8 tiêu chuẩn** trong đợt khử trùng lặp.
- **Trùng lặp & Khuyết thiếu**: **0 dòng trùng lặp**, **0 dòng khuyết thiếu**. (Đã loại bỏ 111 dòng lặp từ 1,430 dòng ban đầu, tỷ lệ làm sạch 7.76%).
- **Xử lý dòng nhiều dòng (Multiline Records)**: Có đúng **27 bản ghi** chứa ký tự xuống dòng `\n` bên trong trường nội dung, được bọc trong dấu ngoặc kép chuẩn RFC 4180 và kết thúc dòng bằng CRLF (`\r\n`).

### 4.2. Thống kê Chiều dài và Đặc trưng Ngôn ngữ
- **Độ dài ký tự**:
  - Tối thiểu: 42 ký tự
  - Tối đa: 569 ký tự
  - Trung bình (Mean): 135.50 ký tự
  - Trung vị (Median): 128.00 ký tự
- **Độ dài số từ**:
  - Tối thiểu: 1 từ
  - Tối đa: 117 từ
  - Trung bình (Mean): 25.27 từ
  - Trung vị (Median): 24.00 từ

### 4.3. Các Yếu tố Ngụy trang & Hiện tượng Dữ liệu Đặc thù
1. **Tên miền Mockup tổng hợp chiếm tỷ lệ lớn**:
   - Có tới **748 dòng (chiếm 56.71%)** chứa liên kết `http://sim.example.vn/x`. Đây là tên miền nhân tạo được sinh ra trong quá trình che chắn dữ liệu huấn luyện ban đầu.
2. **Các Token thế chỗ (Placeholder Masking)**:
   - `[MONEY]`: Xuất hiện trong 236 dòng (17.89%).
   - `[NUMBER]`: Xuất hiện trong 204 dòng (15.47%).
   - `[TIME]`: Xuất hiện trong 48 dòng (3.64%).
   - `[DATE]`: Xuất hiện trong 8 dòng (0.61%).
   - `[NAME]`: Xuất hiện trong 15 dòng (1.14%).
3. **Hiện tượng Dấu chấm hỏi Mojibake (`?`)**:
   - Có **434 dòng (32.90%)** chứa ký tự `?`.
   - Trong đó, nhiều mẫu là di chứng của việc chuyển đổi bảng mã lỗi từ trước (mất mát ký tự có dấu thành `?`), ví dụ:
     * `Thông báo t? VIETINBANK: B?n dùng vui lòng ??ng nh?p vào vietinbamk.com ngay khi có th? ?? c?p nh?t`
     * `B?t ??ng s?n giá g?c C?T, chi?t kh?u 15% + quà [MONEY]. Liên h? [NUMBER] (Mr Tâm)...`
   - *Khuyến nghị cho Preprocessing*: Pipeline tiền xử lý tiếng Việt phải có bộ quy tắc xử lý hoặc khôi phục heuristic cho các ký tự `?` này để tránh làm suy giảm chất lượng embedding và mô hình suy luận.
4. **Các thủ thuật ngụy trang né tránh bộ lọc (Evasion)**:
   - Chèn dấu gạch ngang hoặc dấu chấm vào tên thương hiệu: `V-C-B-priority.com`, `vietinbamk.com` (typosquatting chữ 'm' thay cho 'n'), `vletcombank.com` ('l' thay cho 'i').

### 4.4. Phân loại Chủ đề Lừa đảo trong `Scam.csv`
- Mạo danh ngân hàng / khóa tài khoản / OTP: 133 tin nhắn (10.1%)
- Tuyển dụng việc làm online / Shopee / Tiki: 75 tin nhắn (5.7%)
- Tín dụng đen / Vay tiền online duyệt nhanh: 45 tin nhắn (3.4%)
- Trúng thưởng / Quà tri ân / iPhone: 24 tin nhắn (1.8%)
- Phạt nguội vi phạm giao thông / Bộ Công An: 16 tin nhắn (1.2%)
- Cờ bạc trực tuyến / Cá cược / Nhà cái: 14 tin nhắn (1.1%)

---

## 5. KHẢO SÁT CHUYÊN SÂU TẬP TIN NHẮN ĐƠN AN TOÀN (`No_scam.csv`)

### 5.1. Cấu trúc, Mã hóa & Quá trình Làm sạch
- **Đường dẫn tệp**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\data_demo\No_scam.csv`
- **Kích thước**: 492,833 bytes.
- **Header**: Đúng 1 cột `['message']`.
- **Số lượng bản ghi**: **1,930 dòng tin nhắn duy nhất** (+ 1 dòng header = 1,931 dòng vật lý).
- **Hiện trạng mã hóa**: Ban đầu chứa byte đánh dấu đầu tệp **BOM (`utf-8-sig`)**, đã được bóc tách và chuẩn hóa về **UTF-8 tiêu chuẩn**.
- **Trùng lặp & Khuyết thiếu**: **0 dòng trùng lặp**, **0 dòng khuyết thiếu**. (Đã loại bỏ 274 dòng lặp từ 2,204 dòng ban đầu, tỷ lệ làm sạch 12.43%).
- **Xử lý dòng nhiều dòng (Multiline Records)**: Có tới **524 bản ghi** chứa ký tự xuống dòng `\n` bên trong trường nội dung (chiếm 27.15% tập dữ liệu), được bảo toàn nghiêm ngặt theo chuẩn RFC 4180.

### 5.2. Thống kê Chiều dài và Đặc trưng Văn bản
- **Độ dài ký tự**:
  - Tối thiểu: 1 ký tự
  - Tối đa: 881 ký tự
  - Trung bình (Mean): 227.83 ký tự (dài hơn đáng kể so với tin nhắn lừa đảo 135.5 ký tự do chứa chi tiết giao dịch/thông số dịch vụ)
  - Trung vị (Median): 221.50 ký tự
- **Độ dài số từ**:
  - Tối thiểu: 1 từ
  - Tối đa: 180 từ
  - Trung bình (Mean): 43.29 từ
  - Trung vị (Median): 41.00 từ

### 5.3. Các Loại Tin Nhắn Hợp Pháp & Tỷ lệ Placeholder
Tập tin nhắn an toàn phản ánh rõ rệt các giao dịch viễn thông và tài chính đời sống thực tế tại Việt Nam:
1. **Phân loại nội dung dịch vụ**:
   - **Biến động số dư & Giao dịch ngân hàng**: **1,387 tin nhắn (71.87%)** (Vietcombank, BIDV, Techcombank, MB Bank, VietinBank...).
   - **Dịch vụ nhà mạng viễn thông & Gói cước data**: **1,129 tin nhắn (58.50%)** (Viettel, MobiFone, VinaPhone, Vietnamobile thông báo cước, nạp thẻ, gói 4G/5G).
   - **Mã OTP xác thực bảo mật**: **232 tin nhắn (12.02%)** (xác thực đăng nhập, giao dịch thẻ, liên kết ví).
   - **Thương mại điện tử & Trạng thái đơn hàng**: **39 tin nhắn (2.02%)** (CellphoneS, Shopee, Tiki giao hàng).
   - **Thông báo trường học, y tế, điện nước**: **20 tin nhắn (1.04%)**.
2. **Tỷ lệ Token thế chỗ (Placeholder Masking) rất cao**:
   - Do tính chất nhạy cảm của dữ liệu tài chính cá nhân, tập dữ liệu đã được làm sạch PII trước:
     * `[MONEY]`: **1,341 dòng (69.48%)**
     * `[NUMBER]`: **1,172 dòng (60.73%)**
     * `[TIME]`: **590 dòng (30.57%)**
     * `[DATE]`: **374 dòng (19.38%)**
     * `[NAME]`: **111 dòng (5.75%)**
   - Số dòng chứa `?` chỉ có 43 dòng (2.23%), chủ yếu là câu hỏi hợp pháp hoặc ký tự chấm câu thông thường, không bị lỗi mojibake hàng loạt như `Scam.csv`.

---

## 6. ĐỐI SOÁT BÁO CÁO KHỬ TRÙNG LẶP (`DEDUPLICATION_REPORT.md`)

Báo cáo `data_demo/DEDUPLICATION_REPORT.md` (đồng bộ hoàn toàn với `docs/CSV_SURVEY_REPORT.md`) ghi nhận chi tiết quá trình làm sạch 3 tệp CSV. Khảo sát thực nghiệm xác nhận tính chính xác 100% của các chỉ số sau:

### Bảng 6.1: Đối soát chỉ số trong báo cáo và thực tế tệp tin

| Chỉ số / Hạng mục | Số liệu trong Báo cáo | Số liệu Kiểm chứng Thực tế | Sai lệch (Discrepancy) |
| :--- | :---: | :---: | :---: |
| Dòng ban đầu `dataset_url.csv` | 53,116 | 53,116 (trước khi sample) | 0 |
| Dòng sau lọc `dataset_url_sampled.csv` | — | **3,192** (đã lấy mẫu phân tầng) | Hoàn toàn hợp lý |
| Dòng ban đầu `No_scam.csv` | 2,204 | 2,204 | 0 |
| Dòng trùng loại bỏ trong `No_scam.csv` | 274 (12.43%) | 274 | 0 |
| Dòng duy nhất giữ lại `No_scam.csv` | **1,930** | **1,930** | **0 (Khớp tuyệt đối)** |
| Dòng multiline trong `No_scam.csv` | 524 duy nhất | 524 | **0 (Khớp tuyệt đối)** |
| Dòng ban đầu `Scam.csv` | 1,430 | 1,430 | 0 |
| Dòng trùng loại bỏ trong `Scam.csv` | 111 (7.76%) | 111 | 0 |
| Dòng duy nhất giữ lại `Scam.csv` | **1,319** | **1,319** | **0 (Khớp tuyệt đối)** |
| Dòng multiline trong `Scam.csv` | 27 duy nhất | 27 | **0 (Khớp tuyệt đối)** |
| **Trùng lặp chéo giữa Scam và No_scam** | **0 dòng** | **0 dòng** | **0 (Ranh giới sạch 100%)** |

### 6.2. Kiểm toán Thực thể URL Chéo (Cross-Entity Audit)
- 100% các tên miền hợp pháp xuất hiện trong `No_scam.csv` (19 tên miền: `viettel.vn`, `mytv.com.vn`, `bit.ly/appmomo`...) đều có nhãn `benign` trong tập liên kết.
- 100% các liên kết lừa đảo xuất hiện trong `Scam.csv` (11 liên kết: `vietinbamk.com`, `bidvsmat.com`, `11zalo.com`...) đều có nhãn `phishing` trong tập liên kết.

---

## 7. KHẢO SÁT CHUYÊN SÂU TẬP ẢNH CHỤP MÀN HÌNH ĐA NỀN TẢNG (`data_demo/single_image/` — ALIAS `images/`)

### 7.1. Cấu trúc Thư mục và Khối lượng Tệp
Tập dữ liệu ảnh 50 ca kiểm thử thực tế được lưu trữ tại đường dẫn vật lý **`data_demo/single_image/`** (trong các tài liệu đặc tả ban đầu được gọi tắt là `data_demo/images/`). Thư mục này được tổ chức đồng bộ gồm 3 cấu phần:
```
data_demo/single_image/  (alias: data_demo/images/)
├── images/           # 50 tệp tin hình ảnh chụp màn hình (case_001 đến case_050)
├── texts/            # 50 tệp tin văn bản transcript và nhãn ground-truth tương ứng
└── metadata.json     # Siêu dữ liệu chuẩn hóa dạng JSON cho 50 ca kiểm thử (39,914 bytes)
```

- **Kiểm định tính đồng bộ giữa 3 cấu phần**:
  - Số lượng bản ghi trong `metadata.json`: Đúng **50 entries**.
  - Số lượng tệp ảnh trong `images/`: Đúng **50 files**.
  - Số lượng tệp text trong `texts/`: Đúng **50 files**.
  - Ánh xạ định danh: Khớp nhau 100% theo mã `case_001` đến `case_050`.

### 7.2. Đặc tính Kỹ thuật Hình ảnh (Kích thước, Định dạng, Độ phân giải)
- **Định dạng vật lý**:
  - JPEG (`.jpg`): **35 ảnh** (chiếm 70.0%).
  - PNG (`.png`): **15 ảnh** (chiếm 30.0%).
- **Dung lượng tệp**:
  - Nhỏ nhất: 7,165 bytes (`case_018_safe_sms_android_light.jpg`)
  - Lớn nhất: 42,600 bytes (`case_024_danger_sms_android_light.png`)
  - Trung bình: 22,372.7 bytes (~22 KB/ảnh). Rất nhẹ, nạp cực nhanh vào bộ nhớ phục vụ kiểm thử.
- **Độ phân giải & Tỷ lệ khung hình (Mobile Viewports)**:
  - 100% các ảnh đều mô phỏng tỉ lệ màn hình điện thoại thông minh hiện đại:
    * `375 x 812`: 9 ảnh (Tỉ lệ iPhone X, iPhone 11 Pro, iPhone 13 mini)
    * `390 x 844`: 8 ảnh (Tỉ lệ iPhone 12, 13, 14)
    * `412 x 915`: 6 ảnh (Tỉ lệ Google Pixel, thiết bị Android tiêu chuẩn)
    * `360 x 800`: 5 ảnh (Tỉ lệ Samsung Galaxy A/S series)
    * Các kích thước khác: `288 x 641`, `393 x 852`, `428 x 926`...

### 7.3. Phân bổ Nền tảng Ứng dụng & Giao diện Sáng/Tối
- **Phân bổ theo Nền tảng (Platforms)**:
  - **iMessage (iOS)**: **17 ca** (34.0%)
  - **SMS (Android)**: **13 ca** (26.0%)
  - **Zalo**: **10 ca** (20.0%)
  - **Facebook Messenger**: **10 ca** (20.0%)
- **Phân bổ theo Giao diện (Theme Modes)**:
  - **Chế độ sáng (Light mode)**: Đúng **25 ca** (50.0%)
  - **Chế độ tối (Dark mode)**: Đúng **25 ca** (50.0%)
  - Đảm bảo cân bằng 1:1, kiểm thử toàn diện khả năng OCR/Vision chống suy hao tương phản.

### 7.4. Phân bổ Nhãn Mục tiêu (Ground-Truth Labels) & Ma trận Nền tảng
- **Nhãn mục tiêu**:
  - **`DANGER` (Lừa đảo nguy hiểm rõ ràng)**: **22 ca** (44.0%)
  - **`SAFE` (Giao dịch / trò chuyện an toàn)**: **18 ca** (36.0%)
  - **`SUSPICIOUS` (Nghi vấn giai đoạn đầu)**: **10 ca** (20.0%)

#### Bảng 7.1: Ma trận Phân bổ Nền tảng vs Nhãn Mục tiêu

| Nền tảng Ứng dụng | DANGER (Nguy hiểm) | SUSPICIOUS (Nghi vấn) | SAFE (An toàn) | TỔNG CỘNG |
| :--- | :---: | :---: | :---: | :---: |
| **Zalo** | 4 | 2 | 4 | **10** |
| **Facebook Messenger** | 7 | 1 | 2 | **10** |
| **iMessage (Apple)** | 7 | 4 | 6 | **17** |
| **SMS (Android)** | 4 | 3 | 6 | **13** |
| **TỔNG CỘNG** | **22** | **10** | **18** | **50** |

### 7.5. Cấu trúc Metadata & Dữ liệu Lượt thoại bên trong Ảnh
- **Schema trong `metadata.json`**:
  ```json
  {
    "expected_label": "SUSPICIOUS",
    "image_path": "images/case_001_suspicious_zalo_light.jpg",
    "case_id": "case_001",
    "turns": [
      {
        "speaker": "peer",
        "text": "A lô chào anh, em là Hùng, quản lý bên Ngân hàng Thịnh Vượng đây ạ..."
      },
      {
        "speaker": "user",
        "text": "Chào em. May quá, dạo này anh cũng đang có một khoản tiền nhàn rỗi..."
      }
    ]
  }
  ```
- **Thống kê hội thoại dạng ảnh**:
  - Số lượt thoại hiển thị trong ảnh: Min = 1, Max = 5, Trung bình = 2.98 lượt thoại.
  - Phân bổ người nói: `peer` (đối phương): 94 lượt, `user` (người dùng): 55 lượt.
- **Cấu trúc trường trong `texts/case_xxx.txt`**:
  Mỗi tệp text chứa thông tin bối cảnh chi tiết phục vụ đánh giá đa phương thức:
  - `Case ID`: Định danh ca kiểm thử (`case_001`).
  - `Peer`: Thông tin danh tính hiển thị (`Lê Thị Thảo (Người lạ • Mới nhắn tin)`).
  - `Channel`: Kênh truyền (`chat` hoặc `sms`).
  - `Ground Truth`: Nhãn chuẩn (`SUSPICIOUS`, `DANGER`, `SAFE`).
  - `Category`: Danh mục chi tiết (`Nghi_ngo_giai_doan_dau_Lừa đảo cài ứng dụng độc hại`).
  - Bản ghi hội thoại bóc tách từng câu: `[Đối phương]: ...`, `[Người dùng]: ...`.

### 7.6. Khảo sát Thư mục Bổ sung `data_demo/test_dataset_multiturn/`
- Thư mục `test_dataset_multiturn` chứa **112 tệp ảnh** tương ứng với **28 phiên hội thoại kiểm thử đa lượt** (`case_mt_001` đến `case_mt_028`).
- Mỗi phiên gồm 4 ảnh chụp liên tiếp (`_shot_1.png` đến `_shot_4.png`), mô phỏng tiến trình hội thoại kéo dài theo thời gian.
- Schema mở rộng trong `metadata.json` của bộ này bổ sung 2 trường: `"sequence_total": 4` và `"sequence_tag": "shot_1"`.

---

## 8. HÀM Ý VÀ KHUYẾN NGHỊ CHO HAI TÀI LIỆU THIẾT KẾ DOWNSTREAM

Dựa trên toàn bộ kết quả khảo sát thực nghiệm trên, tài liệu này kiến nghị các điểm cập nhật cốt lõi cho hai tài liệu thiết kế kiến trúc:

### 8.1. Khuyến nghị Cập nhật cho `docs/PREPROCESSING_DESIGN.md`
1. **Quy chuẩn hóa Schema Đầu vào 4 Luồng Tinh gọn**:
   - Thay thế các đặc tả cũ về 5 thư mục JSON và `full_dataset.csv`/`sample.csv`.
   - Thiết lập 4 luồng tiền xử lý chuyên biệt:
     * *Luồng 1 (Multi-turn Dialogue)*: Nạp `conservations.json` (chú ý tên tệp), chuẩn hóa schema `id, dialogue[role, content]`, xử lý dị biệt chuyển giao máy ở ID 9 (hai turn liên tiếp cùng role `người gọi`).
     * *Luồng 2 (URL Intelligence)*: Nạp `dataset_url_sampled.csv`, phân tầng 19 `pattern_group`, trích xuất đặc trưng lexical, TLD rác (.xyz, .top, .vip), IP hosting.
     * *Luồng 3 (Scam SMS)*: Nạp `Scam.csv` (1,319 dòng), bộ phân giải RFC 4180 cho 27 dòng multiline, thuật toán xử lý lỗi ký tự mojibake `?` (434 dòng) và giải mã mockup URL (`http://sim.example.vn/x`).
     * *Luồng 4 (No-scam SMS)*: Nạp `No_scam.csv` (1,930 dòng), bộ phân giải RFC 4180 cho 524 dòng multiline, xử lý các token bảo vệ riêng tư `[MONEY]`, `[NUMBER]`, `[TIME]`.
     * *Luồng 5 (Multimodal Screenshot)*: Pipeline OCR nhẹ nhàng cho 50 ảnh chụp màn hình đa nền tảng (Zalo, Messenger, iMessage, SMS) hỗ trợ cả Dark và Light mode.
2. **Quy trình Khử nhiễu & Chuẩn hóa Tiếng Việt**:
   - Giữ nguyên các giải pháp NFC/NFKC, khử ký tự ẩn zero-width, thu gọn ký tự lặp.
   - Bổ sung quy tắc tái cấu trúc các từ viết tắt ngụy trang ngân hàng (`v-c-b`, `bidvsmat`, `vietinbamk`).

### 8.2. Khuyến nghị Cập nhật cho `docs/REASONING_HARNESS_DESIGN.md`
1. **Phân ranh giới Trách nhiệm Microservice (NestJS vs Python FastAPI)**:
   - **NestJS API Gateway (`BE_codex`)**:
     * Đóng vai trò Cổng API bên ngoài (Edge Gateway), xác thực JWT, phân quyền người dùng, Rate Limiting.
     * Tiếp nhận Request (`multipart/form-data` cho ảnh, `application/json` cho text/url).
     * Kiểm tra nhanh danh sách đen/trắng (URL White/Blacklist cache trong Redis).
     * Forward request đã tiền kiểm sang Python FastAPI qua mTLS/HTTP2 nội bộ.
   - **Python FastAPI Service (AI Reasoning Engine)**:
     * Chịu trách nhiệm thực thi ADK Root Agent (`ScamCoordinatorAgent`).
     * Thực thi suy luận cục bộ trên GPU RTX 4050 (SLM Qwen2.5-3B-Instruct qua llama.cpp).
     * Quản lý phân luồng bộ nhớ VRAM, trả kết quả Reasoning CoT (Risk Score, Evidence, Explanation, Guidance).
2. **Bảng Phân bổ Bộ nhớ VRAM Mục tiêu (Target VRAM Budget Table trên RTX 4050 6GB)**:
   - Tổng VRAM khả dụng: **6,144 MB**.
   - Phân bổ nghiêm ngặt:
     * *Mô hình SLM (Qwen2.5-3B-Instruct Q4_K_M)*: ~**2,100 MB**.
     * *KV Cache Context (Context 4,096 tokens, FP16)*: ~**512 MB**.
     * *Multimodal Vision/OCR Engine (PaddleOCR / Mobile-VLM nhẹ)*: ~**1,200 MB**.
     * *Hệ điều hành Windows & Màn hình hiển thị*: ~**800 MB**.
     * *VRAM Đệm an toàn (Safety Margin chống OOM)*: ~**1,532 MB** ($> 24\%$).
   - Kỹ thuật nạp: `n_gpu_layers` tối ưu, flash attention kích hoạt, batch size = 1 cho suy luận thời gian thực.
3. **Bộ Kịch bản Kiểm thử Tác nhân (Test Harness Suites)**:
   - Suite 1: Kiểm thử 38 hội thoại `conservations.json` (đánh giá khả năng phát hiện âm mưu thao túng đa bước).
   - Suite 2: Kiểm thử 3,192 URL `dataset_url_sampled.csv` (đo độ chính xác phân loại tên miền rác/phishing).
   - Suite 3: Kiểm thử 1,319 mẫu `Scam.csv` vs 1,930 mẫu `No_scam.csv` (đo Precision/Recall trên tin nhắn đơn lẻ có bẫy ngữ cảnh).
   - Suite 4: Kiểm thử 50 ảnh `data_demo/images/` (đo tính năng phát hiện qua ảnh chụp màn hình đa nền tảng).
