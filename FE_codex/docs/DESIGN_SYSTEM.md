# ScamShield AI mobile design system

## Visual direction

Use a warm neutral canvas, navy headings and restrained teal actions. Home feels like a short decision guide. A small shield and the brand name sit above a clear question and two stacked action cards. Forms and results use the same simple column, with the emergency action visible where it matters. Keep decorative illustration, charts, and dashboard counters out of the core flows.

| Token | Value | Use |
| --- | --- | --- |
| canvas | #F6F8F7 | Page background |
| surface | #FFFFFF | Cards and fields |
| ink | #14263B | Headings and body |
| muted | #475569 | Supporting copy |
| action | #00665D | Filled buttons with white text |
| actionPressed | #00534B | Pressed primary buttons |
| focus | #00665D | 2 dp focus ring with separation |
| divider | #DCE5E4 | Decorative separators |
| fieldBorder | #657C7B | Input boundary on white |
| errorInk / errorSurface | #9F231F / #FFF0EF | Form and request errors |
| disabledInk / disabledSurface | #475569 / #E7ECEC | Disabled controls with an explanatory hint when useful |

Use platform system fonts initially for Vietnamese diacritics and native text scaling. Set the Home title at 32/40 sp, screen title 26/34, section title 20/28, body and controls 16/24, secondary copy 14/20. Use semibold for titles and buttons. Keep Vietnamese accents visible at every weight and let wrapped text grow vertically.

Spacing tokens in dp are 4, 8, 12, 16, 20, 24, 32, 40 and 48. Use 20 dp page padding, 16 dp on narrow phones and a centered content column capped at 560 dp on large screens. Use 24 dp between sections and 12 dp between related items. Use 20 dp card radius and 14 dp control radius. Use a hairline divider and low elevation (Android 2 or an equivalent soft iOS shadow) on entry cards only. Keep other panels flat for visual clarity.

Use one outline icon family, proposed MaterialCommunityIcons. Use 24 dp icons on actions and 20 dp within status labels. Pair meaningful icons with text. Keep a minimum 48 × 48 dp touch area and use 52 dp minimum for full-width buttons. Respect safe areas and the keyboard. Use a scrolling layout with an inset-aware form action row that becomes inline if the visible area is short. Allow labels to wrap. Verify TalkBack traversal, focus after errors and route changes, reduced motion, large display and font scaling, and WCAG AA targets of 4.5:1 for normal text and 3:1 for meaningful control boundaries. Avoid announcing the counter on every keystroke. Announce loading, errors and completion once.

## Risk presentation

| API level | Vietnamese title | Ink / surface | Icon and support copy |
| --- | --- | --- | --- |
| SAFE | Chưa thấy dấu hiệu đáng ngờ | #145649 / #E8F5EF | Magnifier. “Hãy xác minh qua kênh chính thức trước khi làm theo yêu cầu.” |
| SUSPICIOUS | Có dấu hiệu đáng ngờ | #754000 / #FFF4D9 | Alert triangle. “Tạm dừng và xác minh qua kênh chính thức.” |
| DANGER | Rủi ro cao | #98251E / #FFF0EF | Alert octagon. “Dừng tương tác. Nếu đã cung cấp thông tin hoặc chuyển tiền, hãy xem hướng dẫn ngay.” |
| UNABLE_TO_ASSESS | Chưa thể đánh giá | #48366B / #F2EDF9 | Question circle. “Thử gửi nội dung đầy đủ hơn hoặc dùng cách kiểm tra khác.” |

Use status text and icon alongside color. Purple with a question icon conveys missing evidence distinctly from muted green with a magnifier. Reserve red urgency for situations needing immediate attention. Keep guidance urgency separate from risk semantics. Use the summary and actions to explain what the user can do. Avoid percentage gauges, success checkmarks on SAFE, and claims about AI accuracy or guaranteed safety.

## Navigation

```text
Home ── Text Analysis ──┐
     ├─ Image Analysis ─┴─ Analysis Result ── Emergency Guidance
     └─ Emergency Guidance
```

Use one back stack with no tab bar. Android Back and header Back behave consistently. Result Back returns to the originating form with its draft. “Kiểm tra nội dung khác” resets to Home. Emergency Back returns to its entry point. Show an explicit cancel action while waiting and cancel the active attempt on leaving the form.

## Screen specifications

### 1. Home · Trang chủ

- Purpose and layout. Show the ScamShield AI wordmark and “Bạn muốn kiểm tra gì?” above two large action cards. “Kiểm tra tin nhắn” opens Text Analysis. “Kiểm tra ảnh chụp màn hình” opens Image Analysis. Each has a single short description and a trailing chevron. A visibly distinct, labeled “Cần hỗ trợ ngay” panel opens Emergency Guidance.
- States. Home has no user fields or empty dataset. Render navigation immediately. Health is a diagnostic and never blocks the cards. A configuration error surfaces at a request entry point with retry and back available. Home remains accessible from every recoverable flow.

### 2. Text Analysis · Kiểm tra tin nhắn

- Purpose and layout. Header and one labeled multiline editor, “Nội dung tin nhắn”, with placeholder “Dán hoặc nhập tin nhắn đáng ngờ”. Display count and privacy copy under the editor. “Phân tích tin nhắn” submits. “Dán tin nhắn” uses an explicit clipboard action. Never read the clipboard on entry. “Quay lại” returns Home.
- Empty and validation. Keep the editor visible when empty. For a blank submit say “Nhập hoặc dán tin nhắn để tiếp tục.” Above 5,000 after trim say “Rút gọn tin nhắn còn tối đa 5.000 ký tự.” Retain the draft and move accessibility focus to the field or error. If clipboard access fails, explain how to paste with the system editor.
- Loading and error. Keep the draft visible, disable edits, show an indeterminate “Đang kiểm tra tin nhắn…” and offer “Hủy”. On failure show an inline message and retry when appropriate. “Chưa nhận được kết quả. Bạn có thể thử lại.” suits a device timeout. Use field-level guidance for 400. Success opens Result.

### 3. Image Analysis · Kiểm tra ảnh chụp màn hình

- Purpose and layout. An empty picker card labeled “Chọn ảnh” includes “Chọn từ 1 đến 5 ảnh, theo thứ tự từ cũ đến mới.” Follow with a numbered thumbnail list, per-image remove and accessible up/down actions, optional “Thông tin bổ sung” field with counter, and privacy text. “Phân tích ảnh” submits the visible sequence. “Thêm ảnh” remains available below capacity. Show JPEG, PNG, WebP and “Tối đa 5 MiB mỗi ảnh, 20 MiB tổng cộng.”
- Empty and validation. A canceled picker leaves the draft intact. Show “Chọn ít nhất 1 ảnh” after an empty submit. Explain unsupported, unreadable, over-size or excessive selections near their source. Keep accepted images. Preserve context and show a correction message above 1,000 characters. For restricted library access offer another picker attempt or the settings route only where applicable.
- Loading and error. Show “Đang gửi và kiểm tra ảnh…” with indeterminate progress and “Hủy”. Lock reorder and removal while submitting. Keep the draft on timeout, HTTP failure or cancellation. Give explicit next steps for replacement and rate limits. Offer text analysis as an alternative from the insufficient image result. Never imply success at upload completion.

### 4. Analysis Result · Kết quả kiểm tra

- Purpose and layout. Place the status card and Vietnamese summary first. Follow with “Việc bạn nên làm” using the server's ordered actions, then “Dấu hiệu tìm thấy” with quotes and reasons. Group screenshot evidence under “Ảnh 1”, “Ảnh 2” and corresponding thumbnails. Use inert text for URLs with a plain-language explanation of structural indicators. Hide absent category and empty optional sections. If no actions are supplied, show a brief static reminder to verify via official channels.
- Actions. “Xem hướng dẫn khẩn cấp” is prominent for DANGER and accessible for all risk levels. For UNABLE_TO_ASSESS lead with “Sửa nội dung” or “Chọn lại ảnh”. Image results may also offer “Kiểm tra bằng tin nhắn”, which starts an empty text form from Home. “Nghe tóm tắt” reads only the Vietnamese speech summary on demand, toggles to “Dừng đọc”, and leaves written content visible. “Kiểm tra nội dung khác” resets to Home.
- States. Enter with a complete decoded response. Loading and invalid responses stay on the origin form. For direct entry without session data show “Không có kết quả để hiển thị” and “Về trang chủ”. A valid UNABLE_TO_ASSESS shows its own status and next steps even with empty evidence and URLs. If speech is unavailable show a brief inline explanation and retain the written summary. No input fields or submit validation belong on this screen.

### 5. Emergency Guidance · Hướng dẫn khẩn cấp

- Purpose and layout. Ask “Bạn đã làm gì?” above six full-width radio rows. Map the rows to “Chưa tương tác”, “Đã bấm vào liên kết”, “Đã nhập thông tin đăng nhập”, “Đã cung cấp mã OTP”, “Đã chuyển tiền”, and “Đã cài ứng dụng đáng ngờ”. Preserve this order. No option is selected by default. “Xem các bước cần làm” requests guidance. Display the returned title and urgency, then ordered steps with the first action visually emphasized. LOW, MEDIUM and HIGH use “Cần lưu ý”, “Nên xử lý sớm” and “Cần xử lý ngay”.
- Actions and states. Prompt “Chọn tình huống để xem hướng dẫn” for an empty submission. Show “Đang tải hướng dẫn…” and an explicit cancel. Changing scenarios invalidates the previous response and clears old steps. For request failure retain the selection, offer “Thử lại” and show the short static fallback “Dừng trao đổi và liên hệ ngân hàng hoặc dịch vụ qua kênh chính thức nếu tài khoản có thể bị ảnh hưởng.” Keep Back available. The screen never asks for credentials, OTP, payment details or account identifiers.

## Reusable components

Use `Screen` for insets, column width and scroll behavior, `AppText` for typography, `Button` for primary, secondary, text, pressed, disabled and pending states, `Card` and `ActionCard` for structure, and `FormField` for the shared label, hint, count and error layout. Use `InlineNotice` for loading and errors, `RiskCard` for the four result states, `ImageRow` for preview and ordering, and `ScenarioOption` and `StepList` for guidance. Keep semantic roles, labels and state props consistent across the five screens.
