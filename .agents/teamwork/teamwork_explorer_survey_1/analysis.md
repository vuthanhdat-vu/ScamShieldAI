# BÁO CÁO KHẢO SÁT TOÀN DIỆN 5 THƯ MỤC JSON HỘI THOẠI TRONG `data_demo`
## (COMPREHENSIVE SURVEY OF 5 JSON CONVERSATION DIRECTORIES IN `data_demo`)

- **Tác nhân thực hiện**: `teamwork_explorer_survey_1` (Read-only Investigation Subagent)
- **Mục tiêu**: Khảo sát thực chứng toàn diện cấu trúc, schema, dữ liệu, dị biệt và định hướng kỹ thuật sáp nhập (R1) cho 5 thư mục JSON hội thoại phục vụ xây dựng reasoning harness phát hiện gian lận.
- **Thư mục làm việc**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI`
- **Thư mục trạng thái**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\teamwork_explorer_survey_1\`
- **Thời điểm khảo sát**: 2026-11-12T08:03:00Z
- **Chế độ kiểm tra**: Read-only Investigation (Tuyệt đối không can thiệp, sửa đổi hay tạo file trong mã nguồn và thư mục dữ liệu gốc)

---

## TỔNG QUAN TÓM TẮT (EXECUTIVE SUMMARY)

1. **Quy mô dữ liệu**: Toàn bộ không gian hội thoại JSON bao gồm đúng **5 thư mục**, mỗi thư mục chứa duy nhất **1 tệp tin** mang tên thống nhất `core.json` (tổng cộng 5 tệp tin, 2.712 dòng, 207.034 bytes ~ 202.18 KB).
2. **Tổng số đơn vị hội thoại**: Đúng **38 cuộc hội thoại** với tổng cộng **628 lượt thoại (turns)** và **23.724 từ tiếng Việt**.
3. **Cấu trúc Schema gốc**: Đồng nhất 100% trên cả 5 tệp: Root Array chứa các đối tượng hội thoại gồm 2 trường `["_id", "dialogue"]`. Mỗi phần tử trong mảng `dialogue` chứa đúng 2 trường `["role", "content"]`.
4. **Phân vai người nói**: Duy nhất 2 giá trị: `"người gọi"` (Caller / Kẻ lừa đảo, chiếm 329 lượt thoại, 52.4%) và `"người nhận"` (Receiver / Nạn nhân, chiếm 299 lượt thoại, 47.6%). 100% (38/38) cuộc gọi đều do `"người gọi"` mở đầu.
5. **Đặc tính mã hóa & định dạng**: 100% tệp tin chuẩn **UTF-8 không BOM**, ngắt dòng kiểu Windows **CRLF (`\r\n`)**, toàn bộ ký tự tiếng Việt đã chuẩn hóa **Unicode NFC (Precomposed)**, thụt lề chuẩn **4 spaces**.
6. **Các dị biệt cần lưu ý cho quá trình sáp nhập (R1)**:
   - Xung đột chỉ số: Tất cả 5 tệp đều đánh số cục bộ `_id` từ 1 (không có tính duy nhất toàn cục).
   - Khuyết thiếu ID: Tệp `Lừa đảo đặt phòng khách sạn` nhảy cóc từ `_id: 9` lên `_id: 13` (mất ID 10, 11, 12).
   - Lệch trường định danh so với R1: File gốc dùng `_id`, yêu cầu R1 chỉ định trường `"id"`.
   - Lượt thoại trùng vai liên tiếp: Hội thoại ID 1 trong `Lừa đảo đặt bàn ăn` có 2 lượt thoại liên tiếp cùng là `"người gọi"` (chuyển máy từ lễ tân sang kế toán).
   - Rò rỉ prompt LLM: Hội thoại ID 3 trong `Lừa đảo đầu tư tiền ảo` lộ chỉ dẫn hệ thống sinh dữ liệu.

---

## 1. THỐNG KÊ CHI TIẾT SỐ LƯỢNG TỆP TIN VÀ ĐƯỜNG DẪN (EXACT FILE COUNT & NAMES)

Khảo sát vật lý toàn bộ thư mục `data_demo` xác nhận có đúng 5 thư mục chứa hội thoại JSON như chỉ định trong yêu cầu R1 (thư mục `Lừa đảo trúng tuyển, tuyển sinh` không hiện diện trong không gian `data_demo` hiện tại).

### Bảng 1.1: Bảng kiểm kê vật lý 5 tệp tin JSON hội thoại

| STT | Tên thư mục | Đường dẫn tương đối | Tên tệp tin | Dung lượng (Bytes) | Số dòng (Lines) | Số hội thoại (Convs) | Dãy chỉ số `_id` cục bộ |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| 1 | `Lừa đảo từ thiện` | `data_demo\Lừa đảo từ thiện\core.json` | `core.json` | 26.170 | 291 | 5 | `[1, 2, 3, 4, 5]` |
| 2 | `Lừa đảo đầu tư tiền ảo` | `data_demo\Lừa đảo đầu tư tiền ảo\core.json` | `core.json` | 16.368 | 197 | 3 | `[1, 2, 3]` |
| 3 | `Lừa đảo đặt bàn ăn` | `data_demo\Lừa đảo đặt bàn ăn\core.json` | `core.json` | 44.640 | 632 | 10 | `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]` |
| 4 | `Lừa đảo đặt phòng khách sạn` | `data_demo\Lừa đảo đặt phòng khách sạn\core.json` | `core.json` | 47.906 | 748 | 10 | `[1, 2, 3, 4, 5, 6, 7, 8, 9, 13]` *(Khuyết 10-12)* |
| 5 | `Lừa đảo định danh cccd` | `data_demo\Lừa đảo định danh cccd\core.json` | `core.json` | 71.950 | 844 | 10 | `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]` |
| **Tổng** | **5 thư mục** | **5 tệp tin `core.json`** | - | **207.034** | **2.712** | **38** | **Không có tệp phụ / tệp ẩn** |

**Nhận định kiểm toán**:
- Không có bất kỳ tệp tin `.json` nào khác ngoài `core.json` nằm trong các thư mục mục tiêu.
- Thư mục `images/` trong `data_demo` chứa các tệp ảnh và `metadata.json`, độc lập và không thuộc phạm vi hội thoại thoại R1.

---

## 2. CẤU TRÚC VÀ BẬC PHÂN CẤP CỦA TỆP JSON (SCHEMA & HIERARCHICAL STRUCTURE)

Cả 5 tệp tin đều có cấu trúc phân cấp 2 tầng nhất quán theo chuẩn RFC 8259:
- **Cấp cao nhất (Top-Level / Root)**: Là một mảng danh sách JSON (`JSON Array` / `list`), không phải đối tượng đơn lẻ (`dict`).
- **Cấp bản ghi hội thoại (Conversation Object)**: Mỗi phần tử trong Root Array là một đối tượng JSON biểu diễn một cuộc gọi hoàn chỉnh.
- **Cấp danh sách lượt thoại (Dialogue Array)**: Trường `dialogue` bên trong mỗi cuộc gọi là một mảng tuần tự chứa các lượt tương tác nối tiếp nhau theo dòng thời gian.
- **Cấp lượt thoại đơn lẻ (Turn Object)**: Mỗi phần tử của `dialogue` là một đối tượng chứa vai trò và phát ngôn trực tiếp.

### Sơ đồ cấu trúc dữ liệu JSON gốc:
```json
[                                   <-- Root Array (danh sách các cuộc hội thoại)
  {                                 <-- Conversation Object (1 cuộc gọi)
    "_id": 1,                       <-- Trường định danh số nguyên cục bộ
    "dialogue": [                   <-- Mảng danh sách các lượt thoại tuần tự
      {                             <-- Turn Object (Lượt thoại 1)
        "role": "người gọi",        <-- Phân vai người phát ngôn
        "content": "..."            <-- Nội dung phát ngôn trực tiếp
      },
      {                             <-- Turn Object (Lượt thoại 2)
        "role": "người nhận",
        "content": "..."
      }
    ]
  }
]
```

---

## 3. CÁC TRƯỜNG DỮ LIỆU HIỆN DIỆN TRONG TỪNG BẢN GHI (FIELD INVENTORY)

Khảo sát tự động 100% các khóa (keys) trên toàn bộ 38 cuộc hội thoại và 628 lượt thoại cho thấy:

### Bảng 3.1: Từ điển trường dữ liệu (Field Dictionary)

| Cấp phân cấp | Tên trường | Kiểu dữ liệu | Bắt buộc | Mẫu giá trị | Diễn giải ngữ nghĩa |
| :--- | :--- | :--- | :---: | :--- | :--- |
| **Conversation** | `_id` | `integer` | Có | `1`, `2`, `13` | Chỉ số định danh cuộc gọi nội bộ trong phạm vi tệp. Có tiền tố gạch dưới `_`. |
| **Conversation** | `dialogue` | `array[object]`| Có | `[...]` | Mảng chứa toàn bộ các lượt phát ngôn từ khi nhấc máy đến khi kết thúc cuộc gọi. |
| **Turn** | `role` | `string` | Có | `"người gọi"`, `"người nhận"` | Phân vai người nói. Phản ánh vị thế chủ động mạo danh hay bị động tiếp nhận. |
| **Turn** | `content` | `string` | Có | `"Alo, chào chị..."` | Văn bản đối thoại trực tiếp bằng tiếng Việt có dấu. |

**Đặc điểm cấu trúc quan trọng**:
- Hoàn toàn **KHÔNG có trường nào khác** ở cấp hội thoại (không có `id` không gạch dưới, không có `topic`, `category`, `label`, `timestamp`, `phone_number`).
- Hoàn toàn **KHÔNG có trường nào khác** ở cấp lượt thoại (không có `speaker`, `turn_id`, `sentiment`, `entities`).
- Trật tự sắp xếp khóa trong JSON nguyên thủy luôn cố định: `["_id", "dialogue"]` ở cấp ngoài và `["role", "content"]` ở cấp trong.

---

## 4. TÍNH ĐỒNG NHẤT SCHEMA VÀ CÁC DỊ BIỆT DỮ LIỆU (SCHEMA UNIFORMITY & ANOMALIES)

Về mặt cú pháp và kiểu dữ liệu (Schema Syntactic Compliance), 100% tệp tin hoàn toàn đồng nhất. Tuy nhiên, qua quá trình kiểm tra nội dung và chỉ số dữ liệu, phát hiện **4 nhóm dị biệt quan trọng**:

### Bảng 4.1: Danh mục các điểm dị biệt và bất thường dữ liệu

| Mã dị biệt | Danh mục | Vị trí phát hiện | Thực trạng quan sát | Tác động & Hướng xử lý khi sáp nhập |
| :---: | :--- | :--- | :--- | :--- |
| **ANOM-A** | **Xung đột chỉ số định danh (`_id` Collision)** | Cả 5 tệp tin `core.json` | Cả 5 tệp đều đánh số `_id` bắt đầu từ 1. Khi gộp đơn thuần sẽ bị trùng lặp ID (ví dụ có 5 bản ghi cùng mang `_id: 1`). | Cần đánh lại chỉ số duy nhất toàn cục (`id: 1..38`) hoặc sử dụng mã định danh có tiền tố thư mục. |
| **ANOM-B** | **Khuyết thiếu chỉ số (`_id` Gap)** | `Lừa đảo đặt phòng khách sạn` | Dãy `_id` chạy từ 1 đến 9, sau đó nhảy thẳng lên `_id: 13`. Khuyết thiếu hoàn toàn 3 hội thoại ID 10, 11, 12. | Tổng số hội thoại thực tế của thư mục này là 10, không phải 13. Phải bảo toàn đủ 10 hội thoại hiện có. |
| **ANOM-C** | **Lẫn lộn chủ đề (Domain Crossover)** | `Lừa đảo đặt bàn ăn` (Bản ghi `_id: 10`) | Bản ghi mang `_id: 10` nằm trong thư mục Đặt bàn ăn nhưng nội dung 100% là lừa đảo đặt phòng khách sạn 5 sao Hilton Hanoi Opera (`"bên khách sạn 5 sao Hilton Hanoi Opera đây ạ... Đặt phòng Deluxe King view hồ Hoàn Kiếm..."`). | File gốc phân loại nhầm. Khi sáp nhập theo R1 giữ nguyên vẹn nội dung từ file gốc, có thể bổ sung trường nguồn gốc `source_folder`. |
| **ANOM-D** | **Lượt thoại liên tiếp trùng vai (Consecutive Same-Role)** | `Lừa đảo đặt bàn ăn` (Bản ghi `_id: 1`, lượt 10 & 11) | Lượt thoại 10 (`"người gọi"`) và lượt thoại 11 (`"người gọi"`) đi liền nhau: Nhân viên lễ tân chuyển máy cho kế toán trưởng chi nhánh Dmaris. | Đây là đặc thù kịch bản đóng kịch nhiều vai của tội phạm lừa đảo. Cần bảo toàn nguyên vẹn 2 đối tượng độc lập trong mảng `dialogue`. |
| **ANOM-E** | **Rò rỉ chỉ dẫn hệ sinh LLM (Prompt Leakage)** | `Lừa đảo đầu tư tiền ảo` (Bản ghi `_id: 3`, lượt 6) | Nội dung lượt 6 chứa câu lệnh meta-prompt: *"...tạo cảm giác khan hiếm để khuyến khích đầu tư nhanh."* | Minh chứng dữ liệu có yếu tố synthetic. Khi sáp nhập bảo toàn nguyên vẹn văn bản gốc theo đúng tiêu chí R1. |

---

## 5. PHÂN TÍCH ĐẶC TẢ VAI TRÒ NGƯỜI NÓI (SPEAKER REPRESENTATION ANALYSIS)

Khảo sát định lượng trên toàn bộ 628 lượt thoại cho thấy cách biểu diễn phân vai:

### Bảng 5.1: Phân bố lượt thoại theo vai trò trên từng chuyên đề lừa đảo

| Thư mục dữ liệu | Số hội thoại | Lượt `"người gọi"` (Caller) | Lượt `"người nhận"` (Receiver) | Tổng lượt thoại | Tỷ lệ Caller / Receiver | Độ dài trung bình (Turns/Conv) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| `Lừa đảo từ thiện` | 5 | 34 | 32 | 66 | 51.5% / 48.5% | 13.2 |
| `Lừa đảo đầu tư tiền ảo` | 3 | 24 | 21 | 45 | 53.3% / 46.7% | 15.0 |
| `Lừa đảo đặt bàn ăn` | 10 | 77 | 68 | 145 | 53.1% / 46.9% | 14.5 |
| `Lừa đảo đặt phòng khách sạn`| 10 | 91 | 83 | 174 | 52.3% / 47.7% | 17.4 |
| `Lừa đảo định danh cccd` | 10 | 103 | 95 | 198 | 52.0% / 48.0% | 19.8 |
| **TỔNG CỘNG** | **38** | **329 (52.4%)** | **299 (47.6%)** | **628 (100%)** | **52.4% / 47.6%** | **16.5** |

### Các quy luật ngữ nghĩa và hành vi quan sát được:
1. **Quy luật mở đầu (Opening Protocol)**: 100% cuộc gọi (38/38) đều do `"người gọi"` bắt đầu (`c["dialogue"][0]["role"] == "người gọi"`). Kẻ lừa đảo luôn là bên chủ động gọi đến và áp đặt kịch bản.
2. **Quy luật kết thúc (Closing Protocol)**:
   - 29 cuộc gọi kết thúc bởi `"người gọi"` (kẻ lừa đảo chốt hạ yêu cầu: chờ nhận tiền, chờ tin nhắn mã OTP, hoặc thúc ép chuyển khoản gấp).
   - 9 cuộc gọi kết thúc bởi `"người nhận"` (bao gồm cả trường hợp nạn nhân làm theo như *"Được rồi, để tôi chờ"*, hoặc trường hợp nạn nhân kháng cự cúp máy như CCCD ID 7: *"Em sẽ báo công an thật sự. Tạm biệt!"*).
3. **Ý nghĩa chú thích vai trò đối với Reasoning Harness**:
   - Chú thích `"người gọi"` phản ánh ý đồ tấn công (Scammer Intent): viện dẫn chức danh giả, tạo tâm lý sợ hãi/tham lam, cung cấp số tài khoản cá nhân, gửi liên kết độc hại, yêu cầu đọc mã OTP.
   - Chú thích `"người nhận"` phản ánh trạng thái tâm lý và mức độ tổn thương của nạn nhân (Victim Susceptibility): bối rối, tin tưởng, cung cấp dữ liệu cá nhân, hoặc hoài nghi, kháng cự.

---

## 6. THIẾT KẾ KIẾN TRÚC TỆP SÁP NHẬP `data_demo/merged_conversations.json` THEO YÊU CẦU R1

### 6.1. Đối chiếu yêu cầu R1 và Acceptance Criteria trong `ORIGINAL_REQUEST.md`

Trích dẫn nguyên văn Requirement R1:
> *"Gộp toàn bộ các file JSON hội thoại thành 1 file duy nhất lưu tại `data_demo/merged_conversations.json`."*  
> *"Cấu trúc file gộp: mỗi bản ghi hội thoại bao gồm trường 'id' và trường 'dialogue' là mảng chứa các đối tượng và nội dung hội thoại gốc, bảo toàn đầy đủ schema và chú thích rõ lời người gọi tới và người nhận."*  
> *"Giữ nguyên vẹn toàn bộ 5 thư mục và các file JSON ban đầu, không xóa hay di chuyển file gốc."*

Trích dẫn tiêu chí chấp thuận (Acceptance Criteria):
> - `data_demo/merged_conversations.json` được tạo thành công, cú pháp JSON hợp lệ.
> - File gộp chứa đầy đủ tất cả các cuộc hội thoại từ toàn bộ các file trong 5 thư mục nguồn.
> - Mỗi bản ghi trong file gộp có cấu trúc gồm trường `"id"` và trường `"dialogue"`, trong đó `"dialogue"` lưu trữ mảng các đối tượng hội thoại giữ nguyên schema và lời chú thích người gọi tới/người nhận.
> - Tất cả 5 thư mục gốc và các file JSON ban đầu được bảo toàn nguyên vẹn, không bị xóa hoặc chỉnh sửa.

### 6.2. Phân tích xung đột trường giữa `_id` gốc và `id` yêu cầu

- **Hiện trạng file gốc**: Khóa là `_id` (có gạch dưới, giá trị integer 1..10 cục bộ theo từng file).
- **Yêu cầu R1**: Khóa là `id` (không gạch dưới).
- **Rủi ro xung đột**: Nếu chỉ đơn giản đổi tên `_id` thành `id` mà giữ nguyên giá trị số thì sẽ có 5 bản ghi cùng có `id: 1`, 5 bản ghi có `id: 2`,... dẫn đến vi phạm tính duy nhất của trường định danh (Primary Key Collision).

### 6.3. So sánh 4 phương án thiết kế cấu trúc bản ghi sáp nhập

| Tiêu chí | Phương án A (Chuẩn hóa R1 Tối giản) | Phương án B (Tương thích kép `id` & `_id`) | Phương án C (Bảo lưu Nguồn gốc Đầy đủ - Khuyến nghị) | Phương án D (Mã chuỗi Slug) |
| :--- | :--- | :--- | :--- | :--- |
| **Cấu trúc mẫu** | `{"id": 1, "dialogue": [...]}` | `{"id": 1, "_id": 1, "dialogue": [...]}` | `{"id": 1, "category": "Lừa đảo từ thiện", "original_id": 1, "dialogue": [...]}` | `{"id": "tu_thien_01", "dialogue": [...]}` |
| **Trường `id`** | Số nguyên tuần tự `1` đến `38` | Số nguyên tuần tự `1` đến `38` | Số nguyên tuần tự `1` đến `38` | Chuỗi ký tự định danh |
| **Độ khớp R1** | Khớp 100% câu chữ | Khớp 100% câu chữ, thêm `_id` | Khớp 100% câu chữ, giàu ngữ cảnh | Khớp cấu trúc, khác kiểu `id` |
| **Tính duy nhất** | Đảm bảo duy nhất 1..38 | Đảm bảo duy nhất 1..38 | Đảm bảo duy nhất 1..38 | Đảm bảo duy nhất |
| **Bảo lưu nguồn gốc**| Mất thông tin tên thư mục | Biết `_id` gốc, mất tên thư mục | Bảo tồn trọn vẹn thư mục & ID gốc | Giữ tên thư mục trong slug |

### 6.4. Đề xuất Kiến trúc Chuẩn cho Worker Thực thi R1

Để đảm bảo vừa tuân thủ tuyệt đối 100% câu chữ của Acceptance Criteria R1 (bắt buộc có trường `"id"` và trường `"dialogue"`), vừa giải quyết triệt để vấn đề truy vết nguồn gốc chuyên đề lừa đảo cho Reasoning Harness, cấu trúc tối ưu được đề xuất gồm:

```json
[
  {
    "id": 1,
    "category": "Lừa đảo từ thiện",
    "original_id": 1,
    "dialogue": [
      {
        "role": "người gọi",
        "content": "Alo, chào chị. Em là Minh từ nhóm tình nguyện 'Hành Trình Yêu Thương' đây ạ..."
      },
      {
        "role": "người nhận",
        "content": "Chào em, có chuyện gì thế em?"
      }
    ]
  },
  ...
  {
    "id": 38,
    "category": "Lừa đảo định danh cccd",
    "original_id": 10,
    "dialogue": [
      ...
    ]
  }
]
```

*Ghi chú*: Nếu kiểm thử tự động đòi hỏi **chính xác duy nhất 2 trường** `id` và `dialogue` không có thêm bất kỳ trường nào khác, cấu trúc sẽ là:
```json
[
  {
    "id": 1,
    "dialogue": [
      {
        "role": "người gọi",
        "content": "..."
      },
      {
        "role": "người nhận",
        "content": "..."
      }
    ]
  }
]
```
Trong đó `id` được đánh số tăng dần từ `1` đến `38` theo thứ tự duyệt 5 thư mục. Cả hai biến thể này đều được hỗ trợ và sẵn sàng trong mã kiểm chứng.

---

## 7. ĐẶC TẢ MÃ HÓA KÝ TỰ, ĐỊNH DẠNG VÀ CÁC TRƯỜNG HỢP BIÊN (ENCODING, FORMATTING & EDGE CASES)

### 7.1. Phân tích mã hóa ký tự (Character Encoding & Diacritics)
- **Chuẩn mã hóa**: 100% tệp tin sử dụng bộ mã **UTF-8 (65001)**.
- **Byte Order Mark (BOM)**: Kiểm tra 4 byte đầu tiên của cả 5 file khẳng định **hoàn toàn không có BOM (`\xef\xbb\xbf`)**.
- **Chuẩn hóa Unicode tiếng Việt**: Kiểm tra hàm `unicodedata.normalize('NFC', text)` trên toàn bộ 628 lượt thoại cho kết quả $100\%$ chuỗi ký tự đã ở dạng **NFC (Dựng sẵn - Precomposed)**. Không xuất hiện hiện tượng NFD (Tổ hợp - Decomposed) gây lỗi vỡ font khi tìm kiếm chuỗi.
- **Ký tự Typography đặc biệt**:
  - Dấu gạch ngang En Dash: `–` (`U+2013`, ví dụ trong *"5–10 phút"*, *"2–3 ngày"*).
  - Dấu ba chấm Ellipsis: `…` (`U+2026`, ví dụ trong *"Được rồi… để tôi xem"*).
  - Dấu ngoặc kép cong và ngoặc đơn: `‘ ’`, `“ ”`, `( )`.
  - Toàn bộ các ký tự này đều là ký tự Unicode hợp lệ và phải được giữ nguyên vẹn khi ghi file bằng `json.dump(..., ensure_ascii=False)`.

### 7.2. Định dạng ngắt dòng và thụt lề (Whitespace & Indentation)
- **Ngắt dòng**: Cả 5 tệp tin đều sử dụng chuẩn ngắt dòng Windows CRLF (`\r\n`).
- **Thụt lề**: Định dạng JSON thụt lề đồng nhất 4 khoảng trắng (`indent=4`).
- **Ký tự vô hình / Khoảng trắng ẩn**: Không phát hiện Zero-width space (`\u200B`), Zero-width joiner (`\u200D`), Zero-width non-joiner (`\u200C`) hay Hangul Filler (`\u3164`) trong các tệp JSON hội thoại (ngược lại với tệp CSV `full_dataset.csv` có chứa ký tự ẩn).

### 7.3. Các trường hợp biên ngữ nghĩa đặc biệt (Semantic Edge Cases)
1. **Trường hợp Nạn nhân Kháng cự Thành công (Negative/Defensive Cases)**:
   - `Lừa đảo định danh cccd` (Hội thoại `_id: 7`, lượt thoại 16-17): Nạn nhân phát hiện dấu hiệu mạo danh đòi mã OTP ngân hàng, kiên quyết từ chối đọc OTP và chủ động cúp máy (`"Em có nhận OTP ngân hàng, nhưng em không đọc đâu anh. Em nghĩ đây là lừa đảo rồi... Em cúp máy đây!... Em sẽ báo công an thật sự. Tạm biệt!"`).
   - `Lừa đảo đặt phòng khách sạn` (Hội thoại `_id: 1`, lượt thoại 10-11): Nạn nhân từ chối chuyển khoản đặt cọc cho số tài khoản cá nhân của đối tượng (`"Không, chị không chuyển tiền qua số lạ."`).
   - *Ý nghĩa*: Đây là các mẫu dữ liệu kiểm thử vàng (Golden Negative Test Cases) rất có giá trị cho mô hình suy luận để kiểm tra xem hệ thống có nhận diện được nạn nhân đã tự bảo vệ thành công hay không.
2. **Khai thác Định dạng Số CCCD và URL Bị Lỗi (Malformed Artifacts)**:
   - Trong `Lừa đảo định danh cccd` (Hội thoại `_id: 5`), số CCCD kẻ lừa đảo đọc chỉ có 8 chữ số (`12345678`).
   - Trong `Lừa đảo định danh cccd` (Hội thoại `_id: 8, 9, 10`), số CCCD kẻ lừa đảo đọc có tới 14 chữ số (`00119012345678`).
   - Trong `Lừa đảo định danh cccd` (Hội thoại `_id: 8`), URL cổng dịch vụ công giả mạo bị chèn khoảng trắng: `https://vneid-an ninh.gov.vn/download`.

---

## 8. HƯỚNG DẪN HÀNH ĐỘNG CHO AGENT THỰC THI (ACTIONABLE RECOMMENDATIONS FOR IMPLEMENTER)

Khi tiến hành sáp nhập dữ liệu hội thoại (Requirement R1), Agent thực thi cần tuân thủ nghiêm ngặt các quy tắc kỹ thuật sau:

1. **Quy tắc Bảo toàn Dữ liệu Gốc (Preservation Rule)**:
   - Tuyệt đối không xóa, đổi tên, di chuyển hoặc ghi đè lên bất kỳ tệp tin nào trong 5 thư mục gốc (`Lừa đảo từ thiện`, `Lừa đảo đầu tư tiền ảo`, `Lừa đảo đặt bàn ăn`, `Lừa đảo đặt phòng khách sạn`, `Lừa đảo định danh cccd`).
2. **Quy tắc Duyệt Thứ tự Thư mục (Deterministic Traversal)**:
   - Để file gộp có tính tất định và có thể tái lập 100%, duyệt 5 thư mục theo danh sách cố định:
     1. `Lừa đảo từ thiện` (5 hội thoại $\rightarrow$ gán `id: 1..5`)
     2. `Lừa đảo đầu tư tiền ảo` (3 hội thoại $\rightarrow$ gán `id: 6..8`)
     3. `Lừa đảo đặt bàn ăn` (10 hội thoại $\rightarrow$ gán `id: 9..18`)
     4. `Lừa đảo đặt phòng khách sạn` (10 hội thoại $\rightarrow$ gán `id: 19..28`)
     5. `Lừa đảo định danh cccd` (10 hội thoại $\rightarrow$ gán `id: 29..38`)
3. **Quy tắc Chuẩn hóa Cấu trúc Bản ghi (Record Structure)**:
   - Mỗi bản ghi trong mảng kết quả bắt buộc có:
     - `id`: Số nguyên duy nhất từ `1` đến `38`.
     - `dialogue`: Giữ nguyên vẹn mảng các đối tượng lượt thoại `[{"role": "...", "content": "..."}]` từ file gốc.
   - Không được cắt tỉa, xóa bỏ hoặc sửa đổi nội dung phát ngôn trong `content` (kể cả lượt thoại có prompt leakage hay lượt thoại trùng vai).
4. **Quy tắc Ghi Tệp Chuẩn UTF-8 (File Writing Protocol)**:
   - Sử dụng `open('data_demo/merged_conversations.json', 'w', encoding='utf-8', newline='\n')`.
   - Sử dụng `json.dump(merged_data, f, ensure_ascii=False, indent=4)`.
   - `ensure_ascii=False` là tham số bắt buộc để bảo tồn nguyên vẹn ký tự tiếng Việt có dấu.
5. **Quy tắc Kiểm tra Sau Khi Ghi (Post-Generation Verification)**:
   - Kiểm tra cú pháp JSON hợp lệ bằng `json.load()`.
   - Kiểm tra `len(merged_data) == 38`.
   - Kiểm tra tổng số lượt thoại `sum(len(c['dialogue']) for c in merged_data) == 628`.
   - Kiểm tra các khóa bắt buộc: `set(c.keys()) >= {'id', 'dialogue'}`.

---

## 9. QUY TRÌNH VÀ LỆNH KIỂM CHỨNG ĐỘC LẬP (VERIFICATION SCRIPT)

Bất kỳ chuyên viên hoặc tác nhân kiểm toán nào cũng có thể kiểm chứng độc lập toàn bộ các số liệu và nhận định trong báo cáo này bằng lệnh sau:

```bash
python -c "
import os, json

dirs = [
    'Lừa đảo từ thiện',
    'Lừa đảo đầu tư tiền ảo',
    'Lừa đảo đặt bàn ăn',
    'Lừa đảo đặt phòng khách sạn',
    'Lừa đảo định danh cccd'
]

total_convs = 0
total_turns = 0
caller_turns = 0
receiver_turns = 0

for d in dirs:
    fp = os.path.join('data_demo', d, 'core.json')
    assert os.path.exists(fp), f'Missing {fp}'
    with open(fp, 'r', encoding='utf-8') as f:
        data = json.load(f)
    assert isinstance(data, list)
    for c in data:
        assert '_id' in c and 'dialogue' in c
        total_convs += 1
        for t in c['dialogue']:
            assert 'role' in t and 'content' in t
            assert t['role'] in ('người gọi', 'người nhận')
            total_turns += 1
            if t['role'] == 'người gọi':
                caller_turns += 1
            else:
                receiver_turns += 1

print(f'VERIFICATION SUCCESS: {total_convs} convs, {total_turns} turns (Caller: {caller_turns}, Receiver: {receiver_turns})')
"
```
Kết quả kiểm chứng đạt chuẩn tuyệt đối:
`VERIFICATION SUCCESS: 38 convs, 628 turns (Caller: 329, Receiver: 299)`.
