# Handoff Report: E2E Test Scenarios and Data Fixture Inventory

**Author**: `explorer_e2e_3` (Explorer Subagent)  
**Date**: 2026-11-13  
**Working Directory**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI`  
**State Folder**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\explorer_e2e_3`  
**Target Milestone**: Milestone 4 — Automated Integration Test Suite & Contract Validation  

---

## 1. Observation

### 1.1 Dataset Files & Integrity Checks
Direct filesystem inspection was performed across the dataset directories:
- **`data/metadata.json`**:
  - File size: 10,253 lines.
  - Total items/cases: **200 cases** (`id`: 1 through 200).
  - Schema per item: `{ id: number, label: "scam" | "benign", image_path: string[], turns: { role: string, content: string }[] }`.
  - Label distribution: **170 scam**, **30 benign**.
- **`data/images/`**:
  - Total image files: **587 files**.
  - File format: 100% `.png` files (587/587).
  - File sizes: Minimum 138,651 bytes (~135 KiB), Maximum 425,297 bytes (~415 KiB), Average 339,441 bytes (~331 KiB). All files are well within the 5 MiB (5,242,880 bytes) per-image limit.
  - Image existence check: **0 missing files**. Every single one of the 587 paths referenced in `data/metadata.json` exists in `data/images/`.

### 1.2 Case Distribution by Category Prefix
Every case ID corresponds to a specific category code prefix in its image filenames:

| Category Prefix | Vietnamese Description | ScamShield AI Category | Total Cases | ID Range | Image Count Distribution | Avg Turns | URLs Present | PII Entities Observed | Expected Risk Level |
|---|---|---|---|---|---|---|---|---|---|
| **MD** | Mạo danh cơ quan chức năng (Công an, Viện Kiểm Sát, Tòa án, Bưu điện) | `GOVERNMENT_IMPERSONATION` / `BANK_IMPERSONATION` | 43 | 1–43 | 2 imgs: 12<br>3 imgs: 31 | 10.9 | 20 cases (46.5%) | CCCD (37 cases), Bank STK (41 cases), OTP (3 cases) | `DANGER` (score 75–100) |
| **DT** | Đầu tư / Làm nhiệm vụ nạp tiền / Giật đơn / Kiếm tiền online | `FINANCIAL_FRAUD` / `FAKE_RECRUITMENT` | 43 | 44–86 | 2 imgs: 3<br>3 imgs: 40 | 10.5 | 29 cases (67.4%) | Bank STK (41 cases), CCCD (37 cases), OTP (0 cases) | `DANGER` (score 75–100) |
| **MB** | Mua bán / Giả mạo shipper / Bưu phẩm / Hủy thẻ hội viên | `FAKE_DELIVERY` / `PHISHING` | 42 | 87–128 | 2 imgs: 4<br>3 imgs: 35<br>4 imgs: 3 | 9.5 | 7 cases (16.7%) | Bank STK (40 cases), CCCD (30 cases), OTP (5 cases) | `DANGER` (score 75–100) |
| **DC** | Đánh cắp tài khoản / Phishing SMS Brandname / Đánh cắp OTP | `OTP_THEFT` / `PHISHING` / `BANK_IMPERSONATION` | 42 | 129–170 | 3 imgs: 38<br>4 imgs: 4 | 9.5 | 21 cases (50.0%) | OTP (23 cases), Bank STK (41 cases), CCCD (11 cases) | `DANGER` (score 75–100) |
| **HN** | Hội thoại thường nhật / Shipper thật / Chuyển khoản sinh hoạt | `NONE` | 30 | 171–200 | 2 imgs: 2<br>3 imgs: 27<br>4 imgs: 1 | 10.0 | 0 cases (0.0%) | Bank STK (23 cases), CCCD (11 cases), OTP (5 cases) | `SAFE` (score 0–39) |
| **TOTAL** | — | — | **200** | **1–200** | **2 imgs: 21<br>3 imgs: 171<br>4 imgs: 8** | **10.1** | **77 cases** | — | — |

### 1.3 Key Behavioral Observations from Metadata
1. **Multi-Image Distribution**:
   - 2-image cases: 21 cases (IDs 16, 20, 21, 22, 26, 29, 32, 33, 37, 39, 41, 43, 76, 79, 83, 117, 119, 121, 122, 181, 187).
   - 3-image cases: 171 cases (the majority, representing multi-screen chat scrolls).
   - 4-image cases: 8 cases (IDs 88, 103, 106, 143, 146, 150, 158, 179).
2. **URLs & Suspicious Domains**:
   - 77 of the 170 scam cases contain explicit URLs.
   - Example phishing & scam domains found in transcripts:
     - `MD`: `https://congan-pc02-hanoi.org`, `https://toaan-tructuyen-hoso.net`, `http://thuedientu-kichhoat-mst.org`, `http://bit.ly/capnhatBHYT-vssid`.
     - `DT`: `https://tuyendung-lazada-vn.top`, `http://hethong-xuatkho-247.top`, `https://unisat-crypto-vn.org`, `https://gold-forex-global.org`, `https://win-ai-casino.top`.
     - `MB`: `http://ghtk-huythehoivien-247.com`, `https://shopee-baohiem-hoantien.org`, `http://westernunion-xacnhan-vnd.org`.
     - `DC`: `https://acb-online-center.com`, `https://bidv.cam/vn`, `http://dichvucong-capnhat-vneid.org`, `http://etax-mobile-gdt.org/ThueDienTu_Gov.apk`, `https://business-meta-appeal-case8821.com`.
     - `HN`: 0 suspicious URLs across all 30 benign cases.
3. **PII Density**:
   - CCCD numbers: 12-digit strings (e.g., `040054001299` in ID 2) appear heavily in `MD` (police interrogation) and `DT` (job applicant form).
   - Bank accounts: Accounts from NCB, MB Bank, Vietcombank, Techcombank, VIB, BIDV appear across all categories.
   - OTP codes: Explicit 4- to 6-digit verification codes (e.g., `956897` in ID 129) appear in 23 cases of category `DC`.
4. **Contract & Decision Constraints**:
   - `BE_codex/docs/ScamShield_AI_OpenAPI_v1.2.yaml`:
     - Method: `POST /api/v1/analysis/images`.
     - Multipart form data: field `images` (1–5 files), optional `context` (string <= 1000 chars).
     - Single image size limit: <= 5 MiB (5,242,880 bytes).
     - Combined images limit: <= 20 MiB (20,971,520 bytes).
     - Allowed formats: `image/jpeg`, `image/png`, `image/webp`.
     - Pixel limit: <= 16 MP (`MAX_DECODED_PIXELS = 16_000_000`).
     - Response: Strictly 11 snake_case fields (`additionalProperties: false`):
       `analysis_id`, `input_type`, `risk_score`, `risk_level`, `scam_category`, `summary`, `evidence`, `detected_urls`, `recommended_actions`, `speech_summary`, `analyzed_at`.
     - `evidence[].image_index`: integer `0 <= image_index < imageCount` (nullable only for TEXT input, strictly non-null for IMAGE).
     - `detected_urls[].is_verified_malicious`: strictly `false`.
     - `risk_score`: null when `risk_level: "UNABLE_TO_ASSESS"`.

---

## 2. Logic Chain

1. **Mapping Dataset Cases to OpenAPI Categories**:
   - Observation 1.2 establishes 5 distinct category prefixes (`MD`, `DT`, `MB`, `DC`, `HN`).
   - In `BE_codex/src/risk/scam-category.ts`, category selection is governed by evidence quotes and signal types:
     - `MD` exhibits `IMPERSONATION` of police/court/ministry + `THREAT` + `MONEY_REQUEST` -> selects `GOVERNMENT_IMPERSONATION` or `BANK_IMPERSONATION`.
     - `DT` exhibits `TOO_GOOD_TO_BE_TRUE` + `MONEY_REQUEST` + recruitment quotes -> selects `FAKE_RECRUITMENT` or `FINANCIAL_FRAUD`.
     - `MB` exhibits fake delivery/package quotes + `MONEY_REQUEST` / `SUSPICIOUS_URL` -> selects `FAKE_DELIVERY`.
     - `DC` exhibits `CREDENTIAL_REQUEST` with OTP / banking phishing links -> selects `OTP_THEFT` or `PHISHING`.
     - `HN` exhibits benign daily dialogue without fraud indicators -> selects `NONE`.
2. **Mathematical Risk Scoring Consistency**:
   - In `BE_codex/src/risk/risk.service.ts`:
     - `CREDENTIAL_REQUEST` has weight 85 -> automatically reaches `DANGER` (>= 75).
     - `MONEY_REQUEST` (55) + `IMPERSONATION` (50) -> `base = 55`, `activeRequest = true`, `corroborated = true` -> `55 + 20 = 75` -> `DANGER`.
     - `MONEY_REQUEST` (55) + `THREAT` (50) -> `55 + 20 = 75` -> `DANGER`.
     - `MONEY_REQUEST` (55) + `TOO_GOOD_TO_BE_TRUE` (45) -> `55 + 20 = 75` -> `DANGER`.
     - Benign cases (`HN`) have 0 fraud signals -> `base = 0`, score = 0 -> `SAFE` (0 <= 39).
     - Valid image with no readable dialogue / noise -> `canAssess = false`, score = `null` -> `UNABLE_TO_ASSESS`.
3. **Structuring the 4 Test Tiers**:
   - To guarantee complete verification without gaps, the test cases must be stratified into 4 tiers:
     - **Tier 1 (Feature Coverage)**: Validates functional capability across all 5 core categories (`MD`, `DT`, `MB`, `DC`, `HN`).
     - **Tier 2 (Boundary & Corner Cases)**: Probes every edge of the multipart parser, byte limits, format filters, unreadable images, and context constraints.
     - **Tier 3 (Cross-Feature Combinations)**: Probes cross-module interactions: multi-image reading order + 0-based `image_index`, URL intelligence heuristics + risk score elevation, PII sanitization preservation, and benign disambiguation of money transfers.
     - **Tier 4 (Real-World Application Scenarios)**: High-fidelity end-to-end integration across real-life screenshots from `data/images/` cross-referenced with `data/metadata.json`, asserted against OpenAPI v1.2 Ajv schema.

---

## 3. Detailed 4-Tier Test Specifications

### Tier 1: Feature Coverage (Representative Happy-Path Tests)

| Test ID | Category | Case ID & Fixtures | Input Parameters | Expected Response Status & Schema Assertions |
|---|---|---|---|---|
| **T1-01** | Government Impersonation | Case 1 (`MD_001`):<br>`MD_001_1.png`<br>`MD_001_2.png`<br>`MD_001_3.png` | `multipart/form-data`<br>files: 3 PNGs<br>context: optional | - Status: `200 OK`<br>- `risk_level`: `"DANGER"`<br>- `risk_score`: `75 <= score <= 100`<br>- `scam_category`: `"GOVERNMENT_IMPERSONATION"`<br>- `evidence`: Non-empty array; contains signal types `IMPERSONATION` and `THREAT`<br>- `image_index`: Integer `0 <= index <= 2`<br>- `detected_urls`: Contains `https://congan-pc02-hanoi.org`, `is_verified_malicious: false` |
| **T1-02** | Financial Task / Recruitment | Case 45 (`DT_002`):<br>`DT_002_1.png`<br>`DT_002_2.png`<br>`DT_002_3.png` | `multipart/form-data`<br>files: 3 PNGs | - Status: `200 OK`<br>- `risk_level`: `"DANGER"`<br>- `risk_score`: `75 <= score <= 100`<br>- `scam_category`: `"FAKE_RECRUITMENT"` or `"FINANCIAL_FRAUD"`<br>- `evidence`: Signal types `TOO_GOOD_TO_BE_TRUE` or `MONEY_REQUEST`<br>- `detected_urls`: Contains `https://tuyendung-lazada-vn.top` |
| **T1-03** | Fake Delivery / Courier | Case 87 (`MB_001`):<br>`MB_001_1.png`<br>`MB_001_2.png`<br>`MB_001_3.png` | `multipart/form-data`<br>files: 3 PNGs | - Status: `200 OK`<br>- `risk_level`: `"DANGER"`<br>- `risk_score`: `75 <= score <= 100`<br>- `scam_category`: `"FAKE_DELIVERY"`<br>- `evidence`: Mentions fake delivery/cancellation fees<br>- `detected_urls`: Contains `http://ghtk-huythehoivien-247.com` with signal `HTTP_ONLY` |
| **T1-04** | Account Theft / Phishing OTP | Case 130 (`DC_002`):<br>`DC_002_1.png`<br>`DC_002_2.png`<br>`DC_002_3.png` | `multipart/form-data`<br>files: 3 PNGs | - Status: `200 OK`<br>- `risk_level`: `"DANGER"`<br>- `risk_score`: `75 <= score <= 100`<br>- `scam_category`: `"PHISHING"` or `"BANK_IMPERSONATION"`<br>- `evidence`: Signal types `CREDENTIAL_REQUEST` or `URGENCY`<br>- `detected_urls`: Contains `https://acb-online-center.com` |
| **T1-05** | Benign / Non-Scam | Case 171 (`HN_001`):<br>`HN_001_1.png`<br>`HN_001_2.png`<br>`HN_001_3.png` | `multipart/form-data`<br>files: 3 PNGs | - Status: `200 OK`<br>- `risk_level`: `"SAFE"`<br>- `risk_score`: `0 <= score <= 39`<br>- `scam_category`: `"NONE"`<br>- `evidence`: `[]` (empty or no scam signals)<br>- `detected_urls`: `[]` (empty) |

---

### Tier 2: Boundary & Corner Cases

| Test ID | Boundary Dimension | Input Scenario & Fixtures | Expected Status | Error Code / Specific Response Assertions |
|---|---|---|---|---|
| **T2-01** | Minimum Image Boundary | 1 valid image (`images/MD_001_1.png`) | `200 OK` | `input_type: "IMAGE"`, `evidence[].image_index === 0` |
| **T2-02** | Maximum Image Boundary | Exactly 5 valid images (e.g., `MD_001_1.png`, `MD_001_2.png`, `MD_001_3.png`, `MD_002_1.png`, `MD_002_2.png`) | `200 OK` | `input_type: "IMAGE"`, all `image_index` within `[0, 4]` |
| **T2-03** | Exceeded Image Count | 6 image parts attached under `images` | `400 Bad Request` | `errorCode: "INVALID_INPUT"`, standard error envelope |
| **T2-04** | Zero Images (Empty) | Multipart form with no `images` field | `400 Bad Request` | `errorCode: "INVALID_INPUT"` |
| **T2-05** | Wrong Media Type | `POST /api/v1/analysis/images` with `Content-Type: application/json` | `400 Bad Request` | `errorCode: "INVALID_INPUT"` |
| **T2-06** | Unsupported Format (GIF/BMP) | Upload file with magic bytes `GIF89a` or `BM` under filename `test.gif` | `400 Bad Request` | `errorCode: "UNSUPPORTED_IMAGE_FORMAT"` |
| **T2-07** | Invalid Image Data (Corrupt) | 100 random bytes under filename `corrupt.png` with mime `image/png` | `400 Bad Request` | `errorCode: "INVALID_IMAGE"` |
| **T2-08** | Single Image Size Limit (> 5 MiB) | 1 PNG file sized `5,242,881` bytes (> 5 MiB) | `413 Payload Too Large` | `errorCode: "IMAGE_TOO_LARGE"` |
| **T2-09** | Combined Image Size Limit (> 20 MiB) | 5 PNG files, each `4.5 MiB` (total `22.5 MiB` > 20 MiB limit) | `413 Payload Too Large` | `errorCode: "IMAGE_TOO_LARGE"` |
| **T2-10** | Exceeded Resolution (> 16 MP) | Crafted PNG with dimensions `5000 x 4000` (20 Megapixels > 16 MP) | `400 Bad Request` | `errorCode: "INVALID_IMAGE"` |
| **T2-11** | Animated Image | Multi-page APNG or animated WebP (`pages > 1`) | `400 Bad Request` | `errorCode: "INVALID_IMAGE"` |
| **T2-12** | Valid Image but Unreadable / Noise | Solid white/black image or random gaussian noise PNG | `200 OK` | - `risk_level: "UNABLE_TO_ASSESS"`<br>- `risk_score: null`<br>- `scam_category: "NONE"`<br>- `evidence: []`<br>- `detected_urls: []`<br>- `summary`: Explains inability to read text |
| **T2-13** | Context Parameter Boundary | (a) `context` = string of 1,000 characters<br>(b) `context` = string of 1,001 characters<br>(c) Extra body field `foo: "bar"` | (a) `200 OK`<br>(b) `400 Bad Request` (`INVALID_INPUT`)<br>(c) `400 Bad Request` (`INVALID_INPUT`) | - (a) Valid `AnalysisResponse`<br>- (b) `errorCode: "INVALID_INPUT"`<br>- (c) `errorCode: "INVALID_INPUT"` |

---

### Tier 3: Cross-Feature Combinations

| Test ID | Combination Dimension | Test Scenario & Fixtures | Interacting Subsystems | Expected Integrated Behavior & Assertions |
|---|---|---|---|---|
| **T3-01** | Multi-Image 0-based `image_index` Grounding | Case 1 (`MD_001` - 3 images): Turn sequence spans 3 screens. | OCR Bubble Sorting + `EvidenceValidator` + Response Mapper | - Every item in `evidence` has `image_index` matching the exact screenshot where the quote originated (`0`, `1`, or `2`).<br>- No quote is hallucinated or assigned `image_index >= 3`.<br>- All quotes are verified verbatim substrings. |
| **T3-02** | URL Intelligence + Risk Score Elevation | Case 87 (`MB_001` - 3 images): Contains `http://ghtk-huythehoivien-247.com`. | `UrlIntelligenceService` + `RiskService` | - `UrlIntelligenceService` detects `http:` and flags `HTTP_ONLY`.<br>- `is_verified_malicious` is strictly `false`.<br>- `detected_urls` is included in payload.<br>- Signal `SUSPICIOUS_URL` elevates the composite risk score. |
| **T3-03** | PII Anonymization & Dialogue Preservation | Case 2 (`MD_002` - 3 images): Contains CCCD `040054001299`, name `Lê Văn Hậu`, `Trần Văn Sự`, bank terms. | `PiiSanitizer` + Reasoning Harness + `EvidenceValidator` | - Sanitizer anonymizes PII in strict priority (`PASSWORD` -> `PERSON_NAME_DOB` -> `BANK_ACCOUNT` -> `OTP` -> `PHONE_NUMBER` -> `CCCD`).<br>- Stopwords and placeholders (`[MONEY]`, `[NUMBER]`) remain intact.<br>- Reasoning evaluates risk without leaking raw PII in output summaries. |
| **T3-04** | Multi-Signal Convergence (High Urgency + Threat) | Case 129 (`DC_001` - 3 images): Fake Vietcombank OTP request (`956897`) + urgency. | Reasoning CoT + `selectScamCategory` + `RiskService` | - Multi-signal convergence: `CREDENTIAL_REQUEST` (85) + `URGENCY` (45).<br>- `corroborated = true`, risk score hits `100`.<br>- `scam_category`: `"OTP_THEFT"`.<br>- Emergency actions include locking bank accounts immediately. |
| **T3-05** | Benign Financial Disambiguation | Case 171 (`HN_001` - 3 images): Legitimate transfer of 320,000đ to MB Bank shipper account. | Preprocessing + Reasoning + `RiskService` | - System differentiates legitimate peer payment from fraudulent extortion.<br>- No false `MONEY_REQUEST` or `DANGER` triggered.<br>- `risk_level: "SAFE"`, `risk_score <= 39`, `scam_category: "NONE"`. |

---

### Tier 4: Real-World Application Scenarios (10 Golden Benchmark Cases)

Ten representative real-world cases selected from `data/metadata.json` across all 5 categories:

#### Scenario 1: Fake Police Narcotics & Money Laundering Extortion (Case 1 — `MD_001`)
- **Images**: `MD_001_1.png`, `MD_001_2.png`, `MD_001_3.png` (3 images).
- **Dialogue Theme**: Bưu điện chuyển hoàn -> Đại úy Nguyễn Quốc Trung PC02 Hà Nội -> Lệnh bắt tạm giam T16 vụ án ma túy -> Truy cập `https://congan-pc02-hanoi.org` -> Chuyển 65 triệu sang TK Tạm giữ NCB `19038475612019`.
- **Expected Assertions**:
  - `risk_level`: `"DANGER"`, `risk_score`: `75..100`.
  - `scam_category`: `"GOVERNMENT_IMPERSONATION"`.
  - `evidence`: Quotes referencing "PC02 Hà Nội", "Lệnh bắt tạm giam 90 ngày", "chuyển toàn bộ tiền trong thẻ sang TK Tạm giữ".
  - `detected_urls`: `[{ url: "https://congan-pc02-hanoi.org", is_verified_malicious: false }]`.
  - Full OpenAPI v1.2 schema compliance.

#### Scenario 2: High-Level Criminal Police Intimidation with CCCD (Case 2 — `MD_002`)
- **Images**: `MD_002_1.png`, `MD_002_2.png`, `MD_002_3.png` (3 images).
- **Dialogue Theme**: Thượng tá Lê Văn Hậu (Cục Cảnh sát Hình sự Bộ Công an) -> Đọc đúng số CCCD `040054001299` của chồng nạn nhân -> Rửa tiền 700 triệu -> Đòi bắt giam nếu không ra Hà Nội -> Yêu cầu gọi video Zalo riêng tư.
- **Expected Assertions**:
  - `risk_level`: `"DANGER"`, `risk_score`: `75..100`.
  - `scam_category`: `"GOVERNMENT_IMPERSONATION"`.
  - `evidence`: Quotes referencing "Cục Cảnh sát Hình sự Bộ Công an", "rửa tiền 700 triệu", "cưỡng chế bắt giam".
  - PII preserved / sanitized.

#### Scenario 3: Task Commission Timeout System Lock (Case 44 — `DT_001`)
- **Images**: `DT_001_1.png`, `DT_001_2.png`, `DT_001_3.png` (3 images).
- **Dialogue Theme**: Nhiệm vụ VIP 3 quá hạn 01 giờ 56 phút -> Hệ thống khóa tiền gốc và hoa hồng -> Phải nạp thêm 45 triệu để kích hoạt mở cổng rút tiền trong 30 phút.
- **Expected Assertions**:
  - `risk_level`: `"DANGER"`, `risk_score`: `75..100`.
  - `scam_category`: `"FINANCIAL_FRAUD"`.
  - `evidence`: Signal types `TOO_GOOD_TO_BE_TRUE`, `URGENCY`, `MONEY_REQUEST`.

#### Scenario 4: Fake E-Commerce Part-Time Job Recruitment (Case 45 — `DT_002`)
- **Images**: `DT_002_1.png`, `DT_002_2.png`, `DT_002_3.png` (3 images).
- **Dialogue Theme**: Tin nhắn rác iMessage tuyển dụng việc làm tại nhà lương 6tr-36tr/tháng -> Dẫn dụ bấm vào link `https://tuyendung-lazada-vn.top` -> Chuyển tiền làm nhiệm vụ giật đơn nhận hoa hồng.
- **Expected Assertions**:
  - `risk_level`: `"DANGER"`, `risk_score`: `75..100`.
  - `scam_category`: `"FAKE_RECRUITMENT"`.
  - `detected_urls`: `[{ url: "https://tuyendung-lazada-vn.top", is_verified_malicious: false }]`.

#### Scenario 5: GHTK Fake Shipper Recurring Membership Fee (Case 87 — `MB_001`)
- **Images**: `MB_001_1.png`, `MB_001_2.png`, `MB_001_3.png` (3 images).
- **Dialogue Theme**: Shipper GHTK giao đơn mỹ phẩm 320k -> Giả vờ bấm nhầm nút đăng ký thẻ hội viên VIP trừ 4.5 triệu/tháng -> Yêu cầu vào link `http://ghtk-huythehoivien-247.com` để hủy thẻ.
- **Expected Assertions**:
  - `risk_level`: `"DANGER"`, `risk_score`: `75..100`.
  - `scam_category`: `"FAKE_DELIVERY"`.
  - `detected_urls`: `[{ url: "http://ghtk-huythehoivien-247.com", signals: ["HTTP_ONLY"], is_verified_malicious: false }]`.

#### Scenario 6: Fake Resort Fanpage Room Booking Scam (Case 88 — `MB_002` — 4 Images)
- **Images**: `MB_002_1.png`, `MB_002_2.png`, `MB_002_3.png`, `MB_002_4.png` (4 images).
- **Dialogue Theme**: Fanpage giả mạo Serena Resort Kim Bôi (quảng cáo có tích xanh giả) -> Báo giá Bungalow view hồ 4.730.400đ -> Thúc giục chuyển cọc 100% để giữ phòng kẻo hết.
- **Expected Assertions**:
  - `risk_level`: `"DANGER"`, `risk_score`: `75..100`.
  - `scam_category`: `"FAKE_DELIVERY"` or `"FINANCIAL_FRAUD"`.
  - `image_index` spans values in `[0, 3]`.

#### Scenario 7: Bank SMS Spoofing Reactivate VCB Digibank (Case 129 — `DC_001`)
- **Images**: `DC_001_1.png`, `DC_001_2.png`, `DC_001_3.png` (3 images).
- **Dialogue Theme**: SMS giả mạo Vietcombank báo kích hoạt lại ứng dụng VCB Digibank -> Kèm mã xác nhận `956897` -> Nhân viên Zalo mạo danh yêu cầu đọc mã OTP để hoàn phí duy trì thẻ.
- **Expected Assertions**:
  - `risk_level`: `"DANGER"`, `risk_score`: `85..100`.
  - `scam_category`: `"OTP_THEFT"`.
  - `evidence`: Signal type `CREDENTIAL_REQUEST`, quote contains "mã xác nhận: 956897".

#### Scenario 8: ACB Global Financial Service Phishing SMS (Case 130 — `DC_002`)
- **Images**: `DC_002_1.png`, `DC_002_2.png`, `DC_002_3.png` (3 images).
- **Dialogue Theme**: Brandname ACB: Tài khoản mở dịch vụ tài chính toàn cầu phí 2.000.000VND/tháng trừ trong 2 giờ -> Bấm vào `https://acb-online-center.com` để hủy -> Yêu cầu nhập user/password và OTP.
- **Expected Assertions**:
  - `risk_level`: `"DANGER"`, `risk_score`: `75..100`.
  - `scam_category`: `"PHISHING"` or `"BANK_IMPERSONATION"`.
  - `detected_urls`: Contains `https://acb-online-center.com`.

#### Scenario 9: Legitimate GHTK Shipper Package Drop-off (Case 171 — `HN_001`)
- **Images**: `HN_001_1.png`, `HN_001_2.png`, `HN_001_3.png` (3 images).
- **Dialogue Theme**: Shipper GHTK giao hộp kem dưỡng ẩm 320k đặt trên Shopee -> Khách bận họp gửi lễ tân -> Shipper gửi ảnh gói hàng có chữ ký bảo vệ -> Khách chuyển đúng 320k vào STK cá nhân MB Bank -> Shipper xác nhận giao thành công, không gửi link hay đòi OTP.
- **Expected Assertions**:
  - `risk_level`: `"SAFE"`, `risk_score`: `0..39`.
  - `scam_category`: `"NONE"`.
  - `evidence`: `[]`.
  - `detected_urls`: `[]`.

#### Scenario 10: Legitimate Bank Branch Customer Appointment (Case 172 — `HN_002`)
- **Images**: `HN_002_1.png`, `HN_002_2.png`, `HN_002_3.png` (3 images).
- **Dialogue Theme**: Chuyên viên quan hệ khách hàng Vietcombank chi nhánh Thành Công mời khách đến quầy giao dịch làm thủ tục nâng hạn mức thẻ -> Hướng dẫn chuẩn bị CCCD gốc và sao kê lương mang trực tiếp đến chi nhánh -> Nhắc nhở ngân hàng không bao giờ hỏi mật khẩu hay OTP qua tin nhắn.
- **Expected Assertions**:
  - `risk_level`: `"SAFE"`, `risk_score`: `0..39`.
  - `scam_category`: `"NONE"`.
  - `evidence`: `[]`.
  - `detected_urls`: `[]`.

---

## 4. Caveats

1. **OCR Engine Availability in Test Environments**:
   - In offline test environments or sandbox runners without native `PaddleOCR_v4_det` or `Tesseract` binaries installed, the OCR adapter must fallback to `MetadataOcrProvider` (using ground-truth transcripts from `data/metadata.json`).
   - The test suite must be engineered to run transparently against either live OCR binaries (when present) or the ground-truth metadata adapter.
2. **LLM Non-Determinism (`MOCK_AI=true` vs `MOCK_AI=false`)**:
   - In automated CI and integration test runs, `MOCK_AI=true` is the primary deterministic engine. The rule-based evaluator in `mock-ai-analysis.provider.ts` guarantees exact assertion reproducibility.
   - For Cloud LLM testing (`MOCK_AI=false`), assertions on `summary` and `speech_summary` must test for non-empty string types and Vietnamese language markers rather than verbatim equality.
3. **HTTP 413 vs HTTP 400 Precedence**:
   - When a request violates both file size (> 5 MiB) and image count (> 5 images), Multer's stream parser may trigger `LIMIT_FILE_SIZE` or `LIMIT_UNEXPECTED_FILE` depending on part ordering. Tests in Tier 2 isolate each boundary dimension independently to ensure deterministic status codes.

---

## 5. Conclusion

- The test dataset is in pristine condition: **200 cases** completely mapped across **587 images** with zero missing files and robust metadata annotations.
- The 5 dataset categories (`MD`, `DT`, `MB`, `DC`, `HN`) cleanly map to the OpenAPI v1.2 scam categories (`GOVERNMENT_IMPERSONATION`, `FINANCIAL_FRAUD`, `FAKE_RECRUITMENT`, `FAKE_DELIVERY`, `OTP_THEFT`, `PHISHING`, `NONE`) and deterministic risk score bands.
- The designed **4-tier test architecture** provides comprehensive test coverage:
  - **Tier 1 (Feature Coverage)**: 5 happy-path category tests.
  - **Tier 2 (Boundary & Corner Cases)**: 13 strict limit and edge tests.
  - **Tier 3 (Cross-Feature Combinations)**: 5 multi-component synergy tests.
  - **Tier 4 (Real-World Application Scenarios)**: 10 golden benchmark integration tests.
- All test scenarios have explicit input payloads, expected HTTP status codes, and strict Ajv schema assertions ensuring 100% compliance with OpenAPI v1.2.

---

## 6. Verification Method

To independently verify this inventory and test design:
1. **Verify Image Existence and Count**:
   ```powershell
   node -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync('data/metadata.json', 'utf8')); let missing = 0; data.forEach(item => item.image_path.forEach(p => { if (!fs.existsSync('data/' + p)) missing++; })); console.log('Total items:', data.length, 'Missing images:', missing);"
   ```
   *Expected output*: `Total items: 200 Missing images: 0`
2. **Verify Category Distribution**:
   ```powershell
   node -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync('data/metadata.json', 'utf8')); const counts = {}; data.forEach(d => { const prefix = d.image_path[0].split('/').pop().split('_')[0]; counts[prefix] = (counts[prefix] || 0) + 1; }); console.log(counts);"
   ```
   *Expected output*: `{ MD: 43, DT: 43, MB: 42, DC: 42, HN: 30 }`
3. **Execute Backend Test Suite**:
   ```powershell
   cd BE_codex; npm test
   ```
   *Expected output*: All unit and integration test suites pass.
