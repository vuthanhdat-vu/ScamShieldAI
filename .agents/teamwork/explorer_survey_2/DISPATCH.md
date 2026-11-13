# DISPATCH — Explorer Survey 2

## Mission
Khảo sát khám phá dữ liệu (EDA) chuyên sâu KHÔNG VIẾT HOẶC CHẠY MÃ CODE đối với 3 tập dữ liệu còn lại trong `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\data_demo`:
1. File/tập `dataset_url` (danh sách liên kết lừa đảo).
2. File/tập `full_dataset` (gồm 2 cột message - không có lời thoại người nhận - và label, 1 là phishing).
3. File/tập `sample` (cột text là tin nhắn lừa đảo đơn lẻ, không phải hội thoại).

## Key Constraints & Instructions
- BẮT BUỘC đọc file gốc: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\ORIGINAL_REQUEST.md`.
- TUYỆT ĐỐI KHÔNG VIẾT HOẶC CHẠY MÃ CODE (No code writing or execution). Dùng `read_file` trực tiếp để khảo sát và phân tích cấu trúc, định dạng file, header, delimiters, các dòng mẫu.
- Thư mục làm việc: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI`.
- Thư mục trạng thái của bạn: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\explorer_survey_2`.
- Xác định chính xác định dạng file (CSV, JSON, TSV, TXT, hay Parquet/Excel - kiểm tra phần mở rộng hoặc nội dung).
- Phân tích chi tiết:
  1. Cấu trúc trường, header, encoding, dấu phân cách.
  2. Phân bố nhãn (đặc biệt trong `full_dataset`: tỷ lệ label 1 vs 0 nếu có, hoặc phân bố nhãn).
  3. Đặc trưng nội dung `dataset_url`: cấu trúc URL, tên miền lừa đảo, thủ thuật giả mạo (typosquatting, subdomains, TLDs, IP hosting, query params).
  4. Đặc trưng nội dung `sample`: tin nhắn lừa đảo đơn lẻ, hình thức gửi (SMS/Brandname/Email/OTT), lời kêu gọi hành động (CTA), đe dọa, urgency.
  5. Các điểm dị biệt, nhiễu dữ liệu, dữ liệu trống/null, ký tự đặc biệt, encoding errors.
- Báo cáo kết quả ra `handoff.md` trong thư mục trạng thái của bạn với đầy đủ dẫn chứng cụ thể trích từ dữ liệu.


## 2026-11-12T04:09:16Z
[Message] timestamp=2026-11-12T04:09:16Z sender=10be6ed3-def1-4119-a72c-b7321b6b8474 priority=MESSAGE_PRIORITY_HIGH content=You are Explorer 2 assigned to Survey the non-conversation datasets in data_demo: dataset_url, full_dataset, and sample for ScamShieldAI.
Read c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\ORIGINAL_REQUEST.md and c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\explorer_survey_2\DISPATCH.md first.
Your state folder is: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\explorer_survey_2.
Working directory: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI.

CRITICAL CONSTRAINTS:
1. DO NOT WRITE OR RUN ANY CODE. This is a strictly non-coding EDA. Use read_file to inspect files directly.
2. Inspect dataset_url, full_dataset, and sample in c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\data_demo.
3. Analyze and document:
   - Exact file extensions, encodings, delimiters, and file structures.
   - dataset_url: format, URL patterns, scam tactics (typosquatting, suspicious TLDs, IP vs domain, fake brand paths, obfuscation, URL length, protocol).
   - full_dataset: column structure (message, label where 1 is phishing), label distribution (class balance/imbalance), characteristics of phishing vs non-phishing messages, text lengths, noise, vocabulary.
   - sample: single-turn scam message characteristics, sender impersonation, call-to-action (links, phone numbers, OTP requests), urgency, financial hooks.
   - Edge cases, formatting errors, corrupted lines, nulls, missing fields, or encoding issues across all three sources.
4. Write your full comprehensive report to c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\explorer_survey_2\handoff.md with concrete evidence citations (exact excerpts from inspected files).
5. Send a completion message when finished.
