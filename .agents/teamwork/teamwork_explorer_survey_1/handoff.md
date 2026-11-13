# HANDOFF REPORT — TEAMWORK EXPLORER SURVEY 1
## Khảo sát Toàn diện 5 Thư mục JSON Hội thoại trong `data_demo` (Milestone 1 / Requirement R1)

- **Agent Name**: `teamwork_explorer_survey_1`
- **Archetype**: `teamwork_explorer`
- **Sender Conversation ID**: `c390139b-07c3-45e0-883c-72a1c475e1a1`
- **Recipient Conversation ID**: `1fd7583a-5f21-457e-82a3-df5e26cfa868` (Parent / Orchestrator)
- **Handoff Type**: Hard (Task Complete)
- **State Folder**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\teamwork_explorer_survey_1\`
- **Detailed Analysis Artifact**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\teamwork_explorer_survey_1\analysis.md`

---

## 1. OBSERVATION

Dưới đây là các quan sát thực nghiệm trực tiếp thông qua kiểm tra cấu trúc dữ liệu nhị phân và nội dung của các tệp tin trong `data_demo`:

### O1. Danh mục và số lượng tệp tin vật lý
- Trong thư mục `data_demo`, có đúng 5 thư mục mục tiêu:
  1. `data_demo\Lừa đảo từ thiện\core.json` (Dung lượng: 26,170 bytes, 291 dòng)
  2. `data_demo\Lừa đảo đầu tư tiền ảo\core.json` (Dung lượng: 16,368 bytes, 197 dòng)
  3. `data_demo\Lừa đảo đặt bàn ăn\core.json` (Dung lượng: 44,640 bytes, 632 dòng)
  4. `data_demo\Lừa đảo đặt phòng khách sạn\core.json` (Dung lượng: 47,906 bytes, 748 dòng)
  5. `data_demo\Lừa đảo định danh cccd\core.json` (Dung lượng: 71,950 bytes, 844 dòng)
- Tổng dung lượng: 207,034 bytes (~202.18 KB). Tổng số dòng văn bản: 2,712 dòng.
- Mỗi thư mục chứa đúng duy nhất 1 tệp tin `core.json`. Không có tệp phụ hay tệp ẩn nào khác.

### O2. Cấu trúc Schema và Dữ liệu gốc
- 100% cả 5 tệp tin đều có Root Type là `list` (mảng JSON).
- Mỗi phần tử trong mảng là một `dict` (đối tượng hội thoại) với chính xác 2 trường: `_id` (`int`) và `dialogue` (`list`).
- Mỗi phần tử trong `dialogue` là một `dict` (đối tượng lượt thoại) với chính xác 2 trường: `role` (`str`) và `content` (`str`).
- Không có bất kỳ trường nào khác xuất hiện ở cấp hội thoại hay cấp lượt thoại.
- Tổng số cuộc hội thoại: đúng 38 cuộc gọi:
  - `Lừa đảo từ thiện`: 5 cuộc gọi, `_id` từ 1 đến 5.
  - `Lừa đảo đầu tư tiền ảo`: 3 cuộc gọi, `_id` từ 1 đến 3.
  - `Lừa đảo đặt bàn ăn`: 10 cuộc gọi, `_id` từ 1 đến 10.
  - `Lừa đảo đặt phòng khách sạn`: 10 cuộc gọi, `_id`: `[1, 2, 3, 4, 5, 6, 7, 8, 9, 13]`.
  - `Lừa đảo định danh cccd`: 10 cuộc gọi, `_id` từ 1 đến 10.

### O3. Phân vai người nói và Phân bố lượt thoại
- Trường `role` chỉ nhận đúng 2 giá trị chuỗi tiếng Việt: `"người gọi"` và `"người nhận"`.
- Tổng số lượt thoại: 628 lượt thoại (Caller: 329 lượt - 52.4%, Receiver: 299 lượt - 47.6%). Tổng số từ tiếng Việt: 23,724 từ.
- 100% các cuộc hội thoại (38/38) đều bắt đầu bằng lượt thoại có `role: "người gọi"`.
- 29 cuộc hội thoại kết thúc bằng `"người gọi"`, 9 cuộc hội thoại kết thúc bằng `"người nhận"`.

### O4. Các dị biệt và trường hợp biên phát hiện được
- **Khuyết thiếu ID**: Tại `Lừa đảo đặt phòng khách sạn\core.json`, dòng 649 kết thúc `_id: 9`, ngay tại dòng 652 chuyển sang `"_id": 13`. Khuyết hoàn toàn ID 10, 11, 12 (thực tế chỉ có 10 hội thoại).
- **Trùng vai liên tiếp**: Tại `Lừa đảo đặt bàn ăn\core.json`, hội thoại `_id: 1` có lượt thoại 10 và 11 cùng có `role: "người gọi"` (nhân viên Minh chuyển máy sang kế toán Hạnh).
- **Rò rỉ Prompt sinh dữ liệu**: Tại `Lừa đảo đầu tư tiền ảo\core.json`, hội thoại `_id: 3`, lượt thoại 6 chứa nguyên văn câu: `"...tạo cảm giác khan hiếm để khuyến khích đầu tư nhanh."`.
- **Lẫn lộn chủ đề**: Tại `Lừa đảo đặt bàn ăn\core.json`, hội thoại `_id: 10` chứa nội dung lừa đảo đặt phòng khách sạn 5 sao Hilton Hanoi Opera (`"Em là Minh, bên khách sạn 5 sao Hilton Hanoi Opera đây ạ..."`).
- **Mẫu nạn nhân kháng cự**: Tại `Lừa đảo định danh cccd\core.json` (`_id: 7`), nạn nhân từ chối cung cấp OTP và cúp máy (`"Em có nhận OTP ngân hàng, nhưng em không đọc đâu anh. Em nghĩ đây là lừa đảo rồi... Em cúp máy đây!... Em sẽ báo công an thật sự. Tạm biệt!"`). Tại `Lừa đảo đặt phòng khách sạn\core.json` (`_id: 1`), nạn nhân từ chối chuyển tiền cọc cho số lạ.

### O5. Đặc tính mã hóa và kỹ thuật tệp
- Bộ mã hóa: 100% UTF-8 không có byte order mark (`has_bom == False`).
- Chuẩn hóa Unicode: 100% (628/628 lượt thoại) đã ở dạng Unicode NFC.
- Ngắt dòng: Windows CRLF (`\r\n`).
- Thụt lề: 4 spaces đồng nhất.

---

## 2. LOGIC CHAIN

1. **Từ Quan sát O1 và O2**:
   - Năm thư mục chứa đúng 5 tệp `core.json` với tổng cộng 38 cuộc hội thoại.
   - Khi sáp nhập theo Requirement R1, file kết quả `data_demo/merged_conversations.json` phải là một mảng JSON chứa chính xác 38 phần tử, không được bỏ sót bất kỳ cuộc gọi nào.
2. **Từ Quan sát O2 và R1 trong `ORIGINAL_REQUEST.md`**:
   - Yêu cầu R1 quy định: *"mỗi bản ghi hội thoại bao gồm trường 'id' và trường 'dialogue' là mảng chứa các đối tượng và nội dung hội thoại gốc, bảo toàn đầy đủ schema và chú thích rõ lời người gọi tới và người nhận"*.
   - Trong khi file gốc dùng trường `_id` và các tệp đều đánh số cục bộ `_id: 1..10`, nếu giữ nguyên số này sẽ gây xung đột khóa chính (5 bản ghi trùng `id: 1`).
   - Do đó, để đảm bảo tính hợp lệ của cơ sở dữ liệu và tuân thủ R1, trường định danh phải được chuẩn hóa thành `id` với giá trị số nguyên tuần tự duy nhất từ `1` đến `38` (theo thứ tự duyệt 5 thư mục cố định). Đồng thời, bảo tồn nguyên vẹn mảng `dialogue` với schema `[{"role": "người gọi"|"người nhận", "content": "..."}]`.
3. **Từ Quan sát O3 và O4**:
   - Sự hiện diện của 2 lượt `"người gọi"` liên tiếp trong `Lừa đảo đặt bàn ăn` (ID 1) và prompt leak trong `Lừa đảo đầu tư tiền ảo` (ID 3) là đặc điểm thực tế của dữ liệu nguồn.
   - Vì tiêu chí chấp thuận yêu cầu *"bảo toàn đầy đủ schema và chú thích rõ lời người gọi tới và người nhận"*, không được phép tự ý xóa bỏ hay gộp các lượt thoại này tại bước sáp nhập dữ liệu thô R1 (việc xử lý de-obfuscation và prompt cleansing sẽ do module tiền xử lý đảm nhiệm sau).
4. **Từ Quan sát O5**:
   - Vì dữ liệu chứa nhiều ký tự tiếng Việt có dấu và ký tự typography (`–`, `…`), việc ghi tệp `data_demo/merged_conversations.json` bắt buộc phải sử dụng cờ `ensure_ascii=False` trong `json.dump()`. Nếu thiếu cờ này, tiếng Việt sẽ bị mã hóa thành chuỗi thoát Unicode `\uXXXX`, làm sai lệch định dạng nguyên bản.

---

## 3. CAVEATS

1. **Thư mục `Lừa đảo trúng tuyển, tuyển sinh`**:
   - Trong tài liệu `docs/EDA_REPORT.md` có ghi nhận thư mục này chứa file 0 bytes (ANOM-01). Tuy nhiên trong không gian thư mục thực tế hiện tại tại `data_demo/`, thư mục này hoàn toàn không tồn tại. Cuộc khảo sát tập trung chính xác vào đúng 5 thư mục hiện có theo chỉ định trong `ORIGINAL_REQUEST.md`.
2. **Thư mục `images/`**:
   - Thư mục `data_demo/images/` chứa ảnh và file `metadata.json`/`metadata.csv` phục vụ bài toán đa phương thức (multimodal screenshot), không nằm trong phạm vi sáp nhập hội thoại thoại của R1.
3. **Phạm vi khảo sát**:
   - Agent thực hiện nhiệm vụ khảo sát chỉ đọc (Read-only), không chỉnh sửa bất kỳ tệp dữ liệu nào và không thực hiện viết file `merged_conversations.json` (được dành riêng cho implementer worker theo phân công của Orchestrator).

---

## 4. CONCLUSION

1. **Khả năng sáp nhập hoàn hảo**: 5 tệp JSON có schema cú pháp hoàn toàn tương thích, đồng nhất 100%, sẵn sàng cho thao tác gộp tự động mà không gặp trở ngại về cấu trúc.
2. **Quy mô mục tiêu của `merged_conversations.json`**:
   - Root: Mảng JSON gồm đúng 38 đối tượng hội thoại.
   - Mỗi đối tượng gồm: trường `id` (duy nhất 1..38) và trường `dialogue`.
   - Tổng số lượt thoại bảo toàn: đúng 628 lượt thoại (329 caller, 299 receiver).
   - Tổng số từ tiếng Việt: 23,724 từ.
   - Mã hóa: UTF-8 không BOM, `ensure_ascii=False`, thụt lề `indent=4`.
3. **Bảo tồn nguyên trạng**: Toàn bộ 5 thư mục và 5 tệp `core.json` gốc được giữ nguyên vẹn 100%, không bị di chuyển hay xóa bỏ.

---

## 5. VERIFICATION METHOD

Để kiểm chứng độc lập kết quả khảo sát trên dữ liệu gốc, chạy lệnh Python sau trong PowerShell tại thư mục gốc dự án:

```powershell
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
caller_count = 0
receiver_count = 0

for d in dirs:
    fp = os.path.join('data_demo', d, 'core.json')
    assert os.path.exists(fp), f'Missing file {fp}'
    with open(fp, 'r', encoding='utf-8') as f:
        data = json.load(f)
    assert isinstance(data, list), 'Root must be a list'
    for c in data:
        assert '_id' in c and 'dialogue' in c, 'Missing _id or dialogue'
        total_convs += 1
        for t in c['dialogue']:
            assert 'role' in t and 'content' in t, 'Missing role or content'
            assert t['role'] in ('người gọi', 'người nhận'), f'Invalid role: {t[\"role\"]}'
            total_turns += 1
            if t['role'] == 'người gọi':
                caller_count += 1
            else:
                receiver_count += 1

assert total_convs == 38, f'Expected 38 convs, got {total_convs}'
assert total_turns == 628, f'Expected 628 turns, got {total_turns}'
assert caller_count == 329, f'Expected 329 caller turns, got {caller_count}'
assert receiver_count == 299, f'Expected 299 receiver turns, got {receiver_count}'
print('ALL 5 JSON FILES VERIFIED SUCCESSFULLY! Exact match with survey report.')
"
```

**Điều kiện mất hiệu lực (Invalidation Conditions)**:
- Nếu xuất hiện thêm bất kỳ tệp JSON nào khác trong 5 thư mục.
- Nếu số hội thoại khác 38 hoặc số lượt thoại khác 628.
- Nếu có lượt thoại mang `role` ngoài `"người gọi"` và `"người nhận"`.
- Nếu có file không mở được bằng `utf-8` hoặc bị lỗi cú pháp JSON.
