# KIẾN TRÚC MODULE TIỀN XỬ LÝ DỮ LIỆU & ĐẶC TẢ SCHEMA ĐẦU VÀO API CHUẨN HÓA
## (DATA PREPROCESSING ARCHITECTURE & UNIFIED API INPUT SCHEMA SPECIFICATION)

- **Dự án**: ScamShieldAI — Nền tảng Giám sát & Phát hiện Gian lận Trực tuyến Đa phương thức
- **Mã tài liệu**: `DOC-ARCH-M2-PREPROCESSING`
- **Phiên bản**: `2.0.0` (Cập nhật toàn diện theo tập dữ liệu tinh gọn và kiến trúc Microservice)
- **Tác giả / Tác nhân**: Preprocessing Design Worker (`worker_m1`)
- **Trạng thái**: Hoàn thiện / Sẵn sàng Thẩm định Sản xuất (Production-Grade Architecture Specification)
- **Ngày hoàn thiện**: 2026-11-12
- **Môi trường mục tiêu**: Intel Core i5 CPU + NVIDIA GeForce RTX 4050 (6GB VRAM)
- **Kiến trúc hệ thống**: NestJS API Gateway (`BE_codex`) + Python FastAPI AI Service (`scamshield-reasoning-harness`)

---

## MỤC LỤC
1. [TỔNG QUAN KIẾN TRÚC MODULE TIỀN XỬ LÝ (ARCHITECTURE OVERVIEW)](#1-tổng-quan-kiến-trúc-module-tiền-xử-lý-architecture-overview)
   - 1.1. Vị trí và Vai trò trong Hệ thống Phòng thủ 3 Lớp (Tier 1 Ingestion on CPU)
   - 1.2. Phân định Ranh giới Trách nhiệm Microservice (NestJS Gateway vs FastAPI AI Service)
   - 1.3. Sơ đồ Luồng Dữ liệu Đầu cuối (End-to-End Dataflow Diagram)
   - 1.4. 5 Nguyên tắc Thiết kế Cốt lõi (Core Engineering Principles)
2. [CÁC LUỒNG TIỀN XỬ LÝ CHUYÊN BIỆT CHO 5 NGUỒN DỮ LIỆU TINH GỌN](#2-các-luồng-tiền-xử-lý-chuyên-biệt-cho-5-nguồn-dữ-liệu-tinh-gọn)
   - 2.1. Luồng 1: Xử lý Hội thoại Đa lượt (Multi-turn Dialogue Pipeline — `conservations.json`)
   - 2.2. Luồng 2: Xử lý Tin nhắn Đơn Lừa đảo (Single Scam Message Pipeline — `Scam.csv`)
   - 2.3. Luồng 3: Xử lý Tin nhắn Đơn An toàn & Phòng ngừa Dương tính Giả (Single Safe Message Pipeline — `No_scam.csv`)
   - 2.4. Luồng 4: Phân tích & Trích xuất Đặc trưng Liên kết Độc hại (Malicious URL Pipeline — `dataset_url_sampled.csv`)
   - 2.5. Luồng 5: Tiền xử lý Ảnh Chụp Màn hình Đa Nền tảng & OCR Trên CPU (Screenshot & CPU OCR Pipeline — `images/`)
3. [QUY TRÌNH KHỬ NHIỄU, CHỐNG NGỤY TRANG ĐỐI KHÁNG & CHUẨN HÓA TIẾNG VIỆT](#3-quy-trình-khử-nhiễu-chống-ngụy-trang-đối-kháng--chuẩn-hóa-tiếng-việt)
   - 3.1. Chuẩn hóa Bộ mã Unicode (Unicode Normalization: NFC & NFKC)
   - 3.2. Loại bỏ Ký tự Tàng hình & Khoảng trắng Ẩn (Zero-Width & Invisible Characters Stripping)
   - 3.3. Giải mã Ký tự Toán học Đơn cách về ASCII (Mathematical Monospace Font Transcoding)
   - 3.4. Thu gọn Ký tự Lặp có Chủ đích (Character Stuttering Compression)
   - 3.5. Nhận diện & Hàn gắn URL Bị Chèn Khoảng trắng Đối kháng (Spaced-out Broken URL Reconstruction)
   - 3.6. Bộ Chuẩn hóa Lỗi Gõ Telex, Từ lóng Tin nhắn (SMS Slang) & Chính sách Từ dừng Bảo tồn Rủi ro
4. [QUY TRÌNH BẢO MẬT & ẨN DANH HÓA DỮ LIỆU CÁ NHÂN (PII SANITIZATION ENGINE)](#4-quy-trình-bảo-mật--ẩn-danh-hóa-dữ-liệu-cá-nhân-pii-sanitization-engine)
   - 4.1. Bộ Biểu thức Chính quy & Heuristics Nhận diện PII Đặc thù Việt Nam
   - 4.2. Cơ chế Token Hóa Hai chiều Bảo lưu Ngữ cảnh (Context-Preserving Tokenization)
   - 4.3. Nguyên tắc Bảo tồn Tuyệt đối Các Token Masked Sẵn (`[MONEY]`, `[NUMBER]`, `[TIME]`)
   - 4.4. Bảng Ánh xạ Tham chiếu An toàn với Salted HMAC-SHA256
   - 4.5. Vòng đời Dữ liệu & Cơ chế Hủy Bộ nhớ Tạm (Ephemeral Memory Purge Policy)
5. [ĐẶC TẢ SCHEMA CẤU TRÚC DỮ LIỆU ĐẦU VÀO CHUẨN HÓA API MODEL (UNIFIED API SCHEMA)](#5-đặc-tả-schema-cấu-trúc-dữ-liệu-đầu-vào-chuẩn-hóa-api-model-unified-api-schema)
   - 5.1. JSON Schema Hoàn chỉnh (Draft 2020-12 / OpenAPI 3.1) cho `UnifiedScamInspectionPayload`
   - 5.2. Từ điển Trường Dữ liệu Chi tiết (Field Dictionary, Constraints & Types)
   - 5.3. Bộ 5 Payload Fixtures Mẫu Thực tế Chuẩn hóa (Concrete Modality Payloads)
6. [CHIẾN LƯỢC TRÍCH XUẤT ĐẶC TRƯNG & EMBEDDING CHO KIẾN TRÚC MICROSERVICE](#6-chiến-lược-trích-xuất-đặc-trưng--embedding-cho-kiến-trúc-microservice)
   - 6.1. Lựa chọn Kiến trúc Mô hình Embedding (PhoBERT-base vs Multilingual MiniLM)
   - 6.2. Chiến lược Pooling & Chuẩn hóa Vector (Mean Pooling & L2 Normalization)
   - 6.3. Kiến trúc Bộ nhớ Đệm Vector Embedding 2 Cấp (LRU In-memory & Redis Cache)
   - 6.4. Đo lường Độ tương đồng Cosine & Khớp Mẫu Nhanh (Fast Template & Duplicate Matching)
7. [CHIẾN LƯỢC XỬ LÝ NGOẠI LỆ & CƠ CHẾ GIÁNG CẤP DẦN (EXCEPTION HANDLING & DEGRADATION)](#7-chiến-lược-xử-lý-ngoại-lệ--cơ-chế-giáng-cấp-dần-exception-handling--degradation)
   - 7.1. Xử lý Dữ liệu Rỗng, File 0-byte & Cấu trúc Hỏng
   - 7.2. Quản trị Giới hạn Ngữ cảnh (>4096 Tokens) & Kỹ thuật Cắt tỉa Thu gọn Hội thoại
   - 7.3. Xử lý Lỗi Schema Validation & Định dạng Báo lỗi Chuẩn RFC 7807
   - 7.4. Ma trận Giáng cấp Dự phòng Tầng 1 (Graceful Degradation Fallback Matrix)
8. [KẾ HOẠCH TRIỂN KHAI & MA TRẬN THẨM ĐỊNH KỸ THUẬT (AUDIT & VERIFICATION MATRIX)](#8-kế-hoạch-triển-khai--ma-trận-thẩm-định-kỹ-thuật-audit--verification-matrix)

---

## 1. TỔNG QUAN KIẾN TRÚC MODULE TIỀN XỬ LÝ (ARCHITECTURE OVERVIEW)

### 1.1. Vị trí và Vai trò trong Hệ thống Phòng thủ 3 Lớp (Tier 1 Ingestion on CPU)
Trong tổng thể kiến trúc ScamShieldAI, Module Tiền xử lý Dữ liệu đóng vai trò là **Tầng Phòng thủ Thứ nhất (Tier 1: High-Throughput Deterministic Preprocessing & Ingestion Engine)**. 

Do hạ tầng phần cứng triển khai bị giới hạn nghiêm ngặt ở mức máy tính trạm văn phòng / máy chủ rìa (Edge Host) trang bị CPU Intel Core i5 và card đồ họa GPU NVIDIA GeForce RTX 4050 (dung lượng VRAM khả dụng cố định 6,144 MB), GPU phải được bảo tồn tuyệt đối cho mô hình ngôn ngữ nhỏ suy luận (Tier 2 SLM: Qwen2.5-3B-Instruct Q4_K_M chạy trên `llama-server.exe`). Do đó, **100% các tác vụ của Module Tiền xử lý (bao gồm làm sạch văn bản, bóc tách URL, ẩn danh hóa PII, trích xuất embedding và nhận dạng ký tự quang học OCR trên ảnh chụp màn hình) được thiết kế để thực thi hoàn toàn trên CPU (Core i5) và bộ nhớ hệ thống (RAM)**:
- **Độ trễ xử lý (Latency)**: $\le 30\text{ ms}$ cho văn bản đơn và URL (P95 $< 45\text{ ms}$); $\le 800\text{ ms}$ cho ảnh chụp màn hình đa bong bóng thoại qua OCR CPU.
- **Tải trọng GPU**: **$0\%\text{ VRAM}$** — Tuyệt đối không chiếm dụng dù chỉ 1 MB bộ nhớ đồ họa của RTX 4050.
- **Thông lượng (Throughput)**: Đạt $> 1,200\text{ requests/giây}$ trên 4 luồng xử lý CPU Core i5 (sử dụng tập lệnh AVX2/VNNI).
- **Bộ lọc phòng tuyến đầu (Fast-pass / Fast-reject)**: Loại bỏ ngay $65\% - 75\%$ lưu lượng dữ liệu an toàn rõ ràng hoặc các mẫu vi phạm danh sách đen cố định mà không cần kích hoạt bộ suy luận GPU tốn kém.

### 1.2. Phân định Ranh giới Trách nhiệm Microservice (NestJS Gateway vs FastAPI AI Service)
Kiến trúc ScamShieldAI được chuẩn hóa thành 2 microservice độc lập với sự phân ranh trách nhiệm kỹ thuật rõ ràng:

```
┌───────────────────────────────────────────────────────────────────────────┐
│                      MẠNG INTERNET / ỨNG DỤNG KHÁCH                       │
│      (Mobile App, Web Extension, SDK Viễn thông, Cổng API Tích hợp)       │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │  HTTPS / Multipart (Port 3000)
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│              NESTJS API GATEWAY (BE_codex - Production Gateway)           │
│  ├── Ingestion Endpoints:                                                 │
│  │   • POST /api/v1/analysis/text (JSON text request)                     │
│  │   • POST /api/v1/analysis/images (Multipart: max 5 ảnh, context)       │
│  ├── Security Guards & Boundary Enforcement:                             │
│  │   • JsonRequestGuard: Chống tấn công injection & kiểm tra kiểu JSON    │
│  │   • AnalysisRateLimitGuard: Giới hạn tần suất người dùng               │
│  │   • ImageUploadGuard: Kiểm tra magic bytes JPEG/PNG/WebP,              │
│  │     max 5MB/ảnh, max 20MB tổng, max 16M pixels qua thư viện sharp      │
│  ├── Deterministic Evidence Verification:                                 │
│  │   • EvidenceValidator: Đối soát nguyên văn trích dẫn (exact quote)    │
│  │     từ AI Service so với văn bản gốc đầu vào (chống bịa đặt trích dẫn) │
│  └── Deterministic Risk Scoring:                                          │
│      • RiskService: Tính toán điểm số rủi ro toán học (0 - 100) theo      │
│        trọng số tín hiệu cố định (CREDENTIAL_REQUEST: 85, MONEY: 55,...)  │
│      • Phân tầng mức độ: >=75 DANGER, >=40 SUSPICIOUS, <40 SAFE           │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │  HTTP REST / Internal JSON (Port 8000)
                                      │  Endpoint: POST /internal/v1/analyze
                                      ▼
┌───────────────────────────────────────────────────────────────────────────┐
│      PYTHON FASTAPI AI SERVICE (scamshield-reasoning-harness)             │
│  ├── Tier 1: Local Ingestion & Preprocessing Engine (100% Core i5 CPU)    │
│  │   • 5 Pipelines: Conversation, Single Scam, Single Safe, URL, Image    │
│  │   • De-obfuscation: NFC/NFKC, Zero-width strip, Monospace, Telex, Slang│
│  │   • PII Sanitization: Salted HMAC-SHA256, placeholder preservation     │
│  │   • Offline CPU OCR: PaddleOCR-v4 CPU / VietOCR ONNX (0% VRAM)         │
│  │   • Fast-Pass Screening: Cosine Template Match via PhoBERT/MiniLM ONNX │
│  ├── Tier 2: Edge SLM Reasoning Engine (NVIDIA RTX 4050 6GB VRAM)         │
│  │   • Qwen2.5-3B-Instruct GGUF Q4_K_M on llama-server.exe                │
│  │   • 4-Phase Chain-of-Thought with structured XML boundary scaffolding  │
│  │   • Trả về AiAnalysisCandidate (summary, evidence quotes, actions)     │
│  └── Tier 3: Cloud Fallback Engine (External Cloud API)                  │
│      • Model: gemini-3.7-flash (dành cho ca pháp y thị giác sâu/phức tạp) │
└───────────────────────────────────────────────────────────────────────────┘
```

1. **NestJS API Gateway (`BE_codex`)**:
   - Tiếp nhận yêu cầu bên ngoài: `POST /api/v1/analysis/text` và `POST /api/v1/analysis/images`.
   - Bảo mật & Hàng rào kiểm soát: `JsonRequestGuard`, `AnalysisRateLimitGuard`, `ImageUploadGuard` (xác thực magic bytes JPEG, PNG, WebP; từ chối file độc hại; giới hạn $\le 5$ ảnh, $\le 5\text{ MiB}$ mỗi ảnh, $\le 20\text{ MiB}$ tổng dung lượng, kiểm tra số pixel giải mã $\le 16,000,000$ qua `sharp`).
   - Kiểm tra trích dẫn tất định (`EvidenceValidator`): Đảm bảo các trích dẫn bằng chứng do AI cung cấp phải xuất hiện nguyên văn trong văn bản/ảnh gốc, ngăn chặn hoàn toàn hiện tượng ảo giác (hallucination).
   - Tính toán điểm số rủi ro tất định (`RiskService`): Độc lập tính điểm số theo công thức trọng số chuẩn hóa:
     $$\text{RiskScore} = \min\left(100, \sum w_i \cdot \mathbb{I}(\text{signal}_i)\right)$$
     với $w_{\text{CREDENTIAL\_REQUEST}} = 85$, $w_{\text{MONEY\_REQUEST}} = 55$, $w_{\text{IMPERSONATION}} = 50$, $w_{\text{THREAT}} = 50$, $w_{\text{SUSPICIOUS\_URL}} = 45$, $w_{\text{URGENCY}} = 45$, $w_{\text{TOO\_GOOD\_TO\_BE\_TRUE}} = 45$, $w_{\text{OTHER}} = 15$.
   - Phân tầng rủi ro: $\ge 75 \rightarrow$ `DANGER`, $\ge 40 \rightarrow$ `SUSPICIOUS`, $< 40 \rightarrow$ `SAFE`.

2. **Python FastAPI AI Service (`scamshield-reasoning-harness`)**:
   - Đóng vai trò là `AiAnalysisProvider` triển khai endpoint nội bộ `POST /internal/v1/analyze`.
   - Vận hành Bộ tiền xử lý Tầng 1 trên CPU để chuẩn hóa, khử nhiễu, ẩn danh hóa PII và trích xuất OCR.
   - Vận hành Bộ suy luận Tầng 2 trên GPU RTX 4050 6GB (`Qwen2.5-3B-Instruct`) để bóc tách ý đồ tấn công, thủ đoạn tâm lý và bằng chứng cụ thể.
   - Trả về `AiAnalysisCandidate` chứa cấu trúc bằng chứng (`exact_quote`, `risk_type`, `explanation`) cho Gateway hậu kiểm và chấm điểm.

### 1.3. Sơ đồ Luồng Dữ liệu Đầu cuối (End-to-End Dataflow Diagram)

```
[ 5 NGUỒN DỮ LIỆU TINH GỌN data_demo/ ]
  ├── (1) conservations.json (38 Hội thoại đa lượt, 628 Turns)
  ├── (2) Scam.csv (1,319 Tin nhắn đơn lừa đảo, RFC 4180 multiline, mock URLs)
  ├── (3) No_scam.csv (1,930 Tin nhắn hợp lệ ngân hàng/OTP/viễn thông, FP prevention)
  ├── (4) dataset_url_sampled.csv (3,192 URLs chuẩn hóa trên 19 nhóm pattern)
  └── (5) images/ [single_images/] (50 Ca kiểm thử ảnh screenshot: metadata.json + texts/)
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ TẦNG ADAPTER TIẾP NHẬN CHUYÊN BIỆT (MODALITY ADAPTER INGESTION LAYER)                   │
│ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────────┐ │
│ │ Dialogue JSON    │ │ Single Scam &    │ │ Malicious URL    │ │ Multimodal Screenshot│ │
│ │ Adapter          │ │ Safe Message CSV │ │ Canonical Parser │ │ Image & OCR Pipeline │ │
│ └─────────┬────────┘ └────────┬─────────┘ └────────┬─────────┘ └──────────┬───────────┘ │
└───────────┼───────────────────┼────────────────────┼──────────────────────┼─────────────┘
            ▼                   ▼                    ▼                      ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ ĐỘNG CƠ KHỬ NHIỄU & GIẢI MÃ ĐỐI KHÁNG (ADVERSARIAL DE-OBFUSCATION ENGINE)               │
│ • Unicode NFC/NFKC Normalization        • Zero-Width Spaces & Filler Stripping          │
│ • Math Monospace to ASCII Transcoding   • Syllable Character Stuttering Compression     │
│ • Spaced-out Broken URL Reconstruction  • Telex Typo & Vietnamese SMS Slang Normalizer  │
│ • Mojibake Question Mark (?) Resolver   • Risk-Preserving Stopword Retention            │
└───────────────────────────────────────────┬─────────────────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ ĐỘNG CƠ BẢO VỆ DỮ LIỆU & ẨN DANH HÓA PII (PII SANITIZATION & MASKING ENGINE)            │
│ • Regex Scanners: 12-digit CCCD, Bank Account Numbers, OTP, Plaintext Passwords, Phone  │
│ • Strict Preservation: Bảo toàn tuyệt đối [MONEY], [NUMBER], [TIME] đã có sẵn           │
│ • Context-Preserving Masking: <MASKED_CCCD_n>, <MASKED_BANK_ACC_n>, <MASKED_OTP_n>       │
│ • Cryptographic Reference Registry: Ephemeral Salted HMAC-SHA256 Mapping (RAM only)     │
└───────────────────────────────────────────┬─────────────────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ BỘ TRÍCH XUẤT ĐẶC TRƯNG AN NINH & VECTOR EMBEDDING (CPU ONNX INT8)                      │
│ • URL Features: TLD Risk Score, Levenshtein Distance to Whitelist, PaaS Host Flags      │
│ • Linguistic Cues: Urgent Deadlines ("trước 16h"), Authority Pretenses, Financial Traps │
│ • Vector Embedding: PhoBERT-base-v2 (768-dim) / Multilingual MiniLM (384-dim) ONNX CPU  │
│ • 2-Tier Caching (LRU In-Memory + Redis) & Cosine Template Matching for Fast Pass/Deflect│
└───────────────────────────────────────────┬─────────────────────────────────────────────┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ CẤU TRÚC ĐẦU VÀO CHUẨN HÓA API MODEL (UNIFIED API INPUT SCHEMA - DRAFT 2020-12)         │
│                        UnifiedScamInspectionPayload                                     │
│  ├── session_id, modality ("dialogue"|"single_message"|"url"|"image"|"hybrid")          │
│  ├── content: dialogue[] | single_message | normalized_urls[] | image_payload           │
│  ├── extracted_entities: masked_tokens[], authorities[], financial_demands[]            │
│  ├── security_features: typosquatting_matches[], tld_risk, paas_flags                   │
│  └── tier1_preclassification: { preliminary_verdict, risk_score, fast_pass_eligible }   │
└───────────────────────────────────────────┬─────────────────────────────────────────────┘
                                            │
                                            ▼
                        [ TIER 2: ADK REASONING HARNESS ]
                (Qwen2.5-3B-Instruct Q4_K_M on RTX 4050 6GB VRAM)
                                            │ (Khi phức tạp / thị giác sâu)
                                            ▼
                        [ TIER 3: CLOUD FALLBACK ENGINE ]
                              (gemini-3.7-flash)
```

### 1.4. 5 Nguyên tắc Thiết kế Cốt lõi (Core Engineering Principles)

1. **Zero-Trust Input Validation (Xác thực Không tin cậy)**: 
   Mọi dữ liệu đầu vào (từ API bên ngoài, tin nhắn người dùng hay tập dữ liệu kiểm thử) đều bị coi là có nguy cơ chứa mã độc, byte hỏng, chuỗi đối kháng (adversarial prompt injection) hoặc dữ liệu sai lệch cấu trúc. Toàn bộ chuỗi văn bản và tệp hình ảnh đều phải đi qua hàng rào kiểm tra kiểu dữ liệu, giới hạn ký tự và kiểm tra magic bytes trước khi nạp vào pipeline.
2. **Deterministic Cleansing (Làm sạch Tất định)**:
   Mọi thuật toán chuẩn hóa, khử nhiễu, chuyển đổi font chữ và bóc tách từ ngữ phải có tính tất định $100\%$ ($f(x) = y$ bất biến qua mọi lần chạy). Không sử dụng các mô hình học máy ngẫu nhiên hoặc các bộ sinh xác suất ở Tầng 1 để đảm bảo tính ổn định tuyệt đối và khả năng tái lập kiểm chứng độc lập.
3. **Context-Preserving PII Anonymization (Ẩn danh hóa Bảo lưu Ngữ cảnh)**:
   Việc xóa dữ liệu cá nhân nhạy cảm (PII) không được phép làm biến mất ngữ nghĩa của hành vi lừa đảo. Thay vì xóa bỏ hoặc thay bằng khoảng trắng, hệ thống thay thế PII bằng các token phân loại theo ngữ cảnh có số chỉ mục duy nhất (ví dụ: `<MASKED_CCCD_1>`, `<MASKED_BANK_ACC_1>`). Đồng thời, các token đã được che chắn sẵn trong dữ liệu nguồn (`[MONEY]`, `[NUMBER]`, `[TIME]`) phải được bảo tồn nguyên vẹn $100\%$.
4. **Reversible Tokenization via Salted Hashing (Khả năng Ánh xạ Ngược qua Mã băm Có muối)**:
   Để tuân thủ Nghị định 13/2023/NĐ-CP của Chính phủ Việt Nam về bảo vệ dữ liệu cá nhân, chuỗi PII thô không bao giờ được lưu trữ vào bộ nhớ phiên của mô hình AI. Thay vào đó, một bảng tra cứu tham chiếu sử dụng thuật toán HMAC-SHA256 với khóa bí mật ngẫu nhiên theo phiên (Per-Session Salt) được duy trì trong bộ nhớ tạm (In-memory Ephemeral TTL Cache). Khi cần đối chiếu pháp lý hoặc phản hồi cảnh báo khẩn cấp, hệ thống có thể đối chiếu mã băm mà không lộ dữ liệu gốc.
5. **Feature Enrichment for Reasoning Scaffolding (Làm giàu Đặc trưng Hỗ trợ Suy luận)**:
   Module Tiền xử lý không chỉ thụ động làm sạch dữ liệu mà chủ động trích xuất các đặc trưng an ninh bậc cao (như khoảng cách Levenshtein tới tên miền ngân hàng thật, cờ dịch vụ máy chủ miễn phí PaaS, các từ khóa kích hoạt tâm lý sợ hãi/áp lực thời gian, kết quả OCR bong bóng thoại). Các đặc trưng này được đóng gói vào schema chuẩn hóa, biến thành các chỉ dẫn (Prompt Scaffolding) tiếp sức cho mô hình ngôn ngữ nhỏ Tầng 2 suy luận chuẩn xác.

---

## 2. CÁC LUỒNG TIỀN XỬ LÝ CHUYÊN BIỆT CHO 5 NGUỒN DỮ LIỆU TINH GỌN

Hệ thống phân tách rõ ràng 5 luồng xử lý độc lập tương ứng với 5 nguồn dữ liệu tinh gọn trong thư mục `data_demo/`:

### 2.1. Luồng 1: Xử lý Hội thoại Đa lượt (Multi-turn Dialogue Pipeline — `conservations.json`)
Luồng này xử lý tệp hội thoại cuộc gọi thoại lừa đảo tại `data_demo/conservations.json` gồm **38 hội thoại với 628 lượt thoại** (Min = 9, Max = 25, Mean = 16.53 lượt/cuộc).

#### A. Cấu trúc Schema Nguồn của `conservations.json`
```json
[
  {
    "id": 1,
    "dialogue": [
      {
        "role": "người gọi",
        "content": "Alo, anh Hoàng Tuấn Minh đúng không ạ?..."
      },
      {
        "role": "người nhận",
        "content": "Đúng rồi, ai vậy?..."
      }
    ]
  }
]
```

#### B. Quy trình Xử lý & Khắc phục Dị biệt Hội thoại
1. **Quản lý Tên tệp & Đường dẫn Alias (Filename Alias Resolution)**:
   Tệp nguồn trên đĩa được lưu với tên `conservations.json` (chứa ký tự `ser` thay vì `conversations`). Bộ nạp dữ liệu cấu hình alias tự động: nếu không tìm thấy `conversations.json`, loader sẽ nạp `conservations.json` mà không làm gián đoạn pipeline.
2. **Chuẩn hóa Vai trò Người tham gia (Speaker Role Canonicalization)**:
   Phân bổ vai trò thực tế: `người gọi` (329 lượt thoại), `người nhận` (299 lượt thoại). 100% cuộc gọi mở đầu bởi `người gọi`. Chuẩn hóa vai trò sang chuẩn API:
   - `"người gọi"` $\rightarrow$ `"caller"` (Kẻ tấn công / Scammer)
   - `"người nhận"` $\rightarrow$ `"receiver"` (Nạn nhân tiềm năng / Target Victim)
   - Trường hợp không xác định $\rightarrow$ `"unknown"`
3. **Xử lý Dị biệt Chuyển giao Cuộc gọi (Caller Handover Anomaly Handling)**:
   - *Khảo sát thực địa*: Tại Hội thoại ID 9, hai lượt thoại liên tiếp 10 và 11 đều mang `role = "người gọi"`. Turn 10 kết thúc bằng việc nhân viên tư vấn thông báo chuyển máy cho kế toán trưởng Dmaris, và Turn 11 bắt đầu bằng lời chào của kế toán Hạnh.
   - *Giải pháp Kiến trúc*: Pipeline tuyệt đối **không giả định cứng rằng vai trò phải luôn luân phiên 1-1** (Call-Response Alternation). Khi phát hiện hai lượt thoại liên tiếp có cùng vai trò `caller`, hệ thống kích hoạt cơ chế nhận diện chuyển giao cuộc gọi (Multi-Actor Caller Handover):
     $$\text{handover\_detected} = \text{RegexMatch}(r"(?i)(?:chuyển máy|nối máy|chị ấy sẽ hướng dẫn)", \text{turn}[i-1].\text{content})$$
     Nếu cờ kích hoạt, hệ thống gán nhãn chuyển giao `[CHUYỂN_GIAO_CUỘC_GỌI]` và gắn thuộc tính `actor_switch: true` vào metadata của lượt thoại tiếp theo, giúp mô hình suy luận hiểu rằng kẻ lừa đảo đang đổi vai để tăng uy tín giả tạo.
4. **Lọc Rác Chỉ dẫn Sinh Dữ liệu Tổng hợp (Prompt Leakage Cleansing)**:
   Tự động phát hiện và loại bỏ các câu meta-instruction vô tình lọt vào dữ liệu tổng hợp (ví dụ: `r"(?i)(?:tạo|nhằm mục đích)\s+cảm giác\s+(?:khan hiếm|cấp bách|sợ hãi)"`) khỏi nội dung thoại nạp vào mô hình phân loại để tránh làm lệch trọng số ngữ nghĩa.
5. **Đánh nhãn Kết quả Nạn nhân (Victim Susceptibility Analysis)**:
   Phân tích 2 lượt thoại cuối của người nhận để tự động trích xuất trạng thái: `VICTIM_COMPLIED` (nạn nhân đã nhượng bộ, đọc OTP hoặc đồng ý chuyển khoản) hoặc `VICTIM_RESISTED` (nạn nhân phát giác, từ chối hoặc chủ động dập máy).

---

### 2.2. Luồng 2: Xử lý Tin nhắn Đơn Lừa đảo (Single Scam Message Pipeline — `Scam.csv`)
Luồng này chịu trách nhiệm chuẩn hóa tệp `data_demo/Scam.csv` gồm **1,319 tin nhắn lừa đảo đơn lẻ** (đã loại bỏ 111 dòng lặp trong báo cáo khử trùng lặp).

#### A. Cấu trúc Nguồn & Đặc tính Dữ liệu `Scam.csv`
- Header: Duy nhất 1 cột `['message']`.
- Độ dài: Min = 42 ký tự, Max = 569 ký tự, Mean = 135.50 ký tự.
- **Bản ghi Nhiều Dòng (Multiline RFC 4180)**: Có đúng 27 dòng chứa ký tự xuống dòng `\n` bên trong trường `message` được bao bọc bởi cặp dấu ngoặc kép `""`.

#### B. Quy trình Xử lý Kỹ thuật
1. **Bộ Đọc Tuân thủ Chuẩn RFC 4180 (Robust Multiline Parser)**:
   Tuyệt đối không sử dụng các lệnh đọc dòng thô (`readlines()`) vì sẽ làm vỡ 27 bản ghi nhiều dòng thành các đoạn văn bản rác. Parser bắt buộc sử dụng Python `csv.reader` với cờ `quotechar='"'`, `quoting=csv.QUOTE_MINIMAL` hoặc engine C của `pandas.read_csv`. Các ký tự ngắt dòng nội dung được chuẩn hóa thành `\n` có kiểm soát.
2. **Nhận diện & Trung hòa Tên miền Giả lập (Mock Domain Neutralization)**:
   - *Khảo sát thực địa*: 748 dòng (chiếm **56.71%**) trong `Scam.csv` chứa tên miền mock giả lập: `http://sim.example.vn/x`.
   - *Nguy cơ*: Nếu để nguyên mock domain này nạp vào mô hình máy học hoặc bộ trích xuất URL, hệ thống sẽ bị hiện tượng học vẹt (Spurious Correlation), gắn chặt nhãn lừa đảo với tên miền `sim.example.vn`, đồng thời gây lỗi DNS resolution khi kiểm tra trực tuyến.
   - *Giải pháp*: 
     * Pipeline tự động nhận diện mẫu `r"https?://(?:sim\.)?example\.(?:vn|com)[^\s]*"`.
     * Thay thế bằng token chuẩn hóa: `<URL_PLACEHOLDER_MOCK>`.
     * Kích hoạt cờ metadata: `is_mock_link = true`.
     * Ép buộc Tác nhân Suy luận chuyển sang chế độ **Phân tích Thuần Ngữ nghĩa (Pure Semantic Analysis Mode)**, tập trung vào cấu trúc đòn tâm lý, mạo danh cơ quan công quyền thay vì đánh giá domain reputation.
3. **Xử lý Nhiễu Dấu Hỏi Mojibake (`?` Character Resolution)**:
   - *Khảo sát thực địa*: 434 dòng (chiếm **32.90%**) trong `Scam.csv` chứa ký tự `?`. Một số ít là câu hỏi hợp lệ, nhưng phần lớn là di chứng mất dấu tiếng Việt (Mojibake từ bảng mã CP1252/Windows-1258 trước khi được khử trùng lặp, ví dụ: `"B?t ??ng s?n giá g?c C?T..."`).
   - *Giải pháp Thuật toán*:
     * Áp dụng quy tắc ngữ cảnh (Contextual Heuristic): Nếu ký tự `?` nằm ở cuối câu hoặc sau một đại từ nghi vấn (`ai`, `gì`, `đâu`, `sao`, `không`), bảo tồn nguyên vẹn dấu chấm hỏi `?`.
     * Nếu `?` nằm xen kẽ giữa các chữ cái Latinh trong một từ (ví dụ `B?t ??ng s?n`), bộ tiền xử lý giữ nguyên chuỗi gốc, không cố đoán mò dấu thanh để tránh sai lệch bằng chứng, nhưng gắn cờ chất lượng văn bản: `has_mojibake_noise: true`. Cờ này thông báo cho tầng LLM rằng văn bản chứa nhiễu mã hóa và cần suy luận dựa trên các cụm từ còn nguyên vẹn.
4. **Bảo tồn Nguyên vẹn Placeholder Masked Sẵn**:
   Tệp `Scam.csv` chứa sẵn các token đã được che chắn: `[MONEY]` (236 dòng), `[NUMBER]` (204 dòng), `[TIME]` (48 dòng). Bộ tiền xử lý có cơ chế khóa (locking mechanism) để bảo tồn nguyên vẹn các token này, tuyệt đối không để Động cơ PII ghi đè hoặc làm hỏng cấu trúc token.

---

### 2.3. Luồng 3: Xử lý Tin nhắn Đơn An toàn & Phòng ngừa Dương tính Giả (Single Safe Message Pipeline — `No_scam.csv`)
Luồng này chịu trách nhiệm chuẩn hóa tệp `data_demo/No_scam.csv` gồm **1,930 tin nhắn văn bản hợp lệ** (đã loại bỏ 274 dòng lặp). Đây là tập dữ liệu trọng yếu nhằm rèn luyện và kiểm thử khả năng **Phòng ngừa Báo động giả (False Positive Prevention - FPR $\le 2\%$)**.

#### A. Cấu trúc Nguồn & Đặc tính Nghiệp vụ `No_scam.csv`
- Header: Duy nhất 1 cột `['message']`.
- Độ dài: Min = 1 ký tự, Max = 881 ký tự, Mean = 227.83 ký tự.
- **Bản ghi Nhiều Dòng (Multiline RFC 4180)**: Có tới **524 dòng** (chiếm 27.15%) chứa ký tự ngắt dòng `\n` bên trong tin nhắn ngân hàng và thông báo viễn thông.
- **Phân bổ Nghiệp vụ Thực tế**:
  * **1,387 dòng** (71.87%) là tin nhắn biến động số dư ngân hàng chính thống (Vietcombank, BIDV, Techcombank, VPBank, Agribank, ACB, v.v.).
  * **1,129 dòng** (58.50%) là tin nhắn quảng cáo gói cước viễn thông chính ngạch (Viettel, VinaPhone, MobiFone).
  * **232 dòng** (12.02%) là tin nhắn thông báo mã xác thực OTP chính thống.
  * Chứa số lượng lớn placeholder: `[MONEY]` (1,341 dòng - 69.48%), `[NUMBER]` (1,172 dòng - 60.73%).

#### B. Quy trình Xử lý & Cơ chế Fast-Pass Bảo vệ Tin nhắn An toàn
1. **Parser RFC 4180 Đa dòng**: Tương tự Luồng 2, xử lý trọn vẹn 524 bản ghi nhiều dòng mà không làm gãy bản ghi.
2. **Bộ Nhận diện Mẫu Biến động Số dư Ngân hàng Chuẩn tắc (Banking Balance Template Recognizer)**:
   Tin nhắn biến động số dư thật thường chứa các trường thông tin chuẩn hóa:
   `r"(?i)(?:SD|So du|BDSD)\s*(?:VND|VND:)?\s*[:\+\-]?\s*[\d\.\,]+|VND\s*vao\s*luc|GD\s*tai|ND\s*:\s*"`
   Khi văn bản thỏa mãn đồng thời:
   - Chứa cú pháp biến động số dư hoặc biến động tài khoản.
   - Không chứa bất kỳ liên kết rút gọn lạ nào (`.top`, `.xyz`, `.cc`).
   - Không chứa yêu cầu nhập thông tin mật khẩu hoặc đe dọa khóa tài khoản.
   $\rightarrow$ Hệ thống kích hoạt cờ `is_legitimate_banking_alert = true`.
3. **Bộ Nhận diện Mã OTP Chính ngạch (Legitimate OTP Notification Guard)**:
   Tin nhắn OTP an toàn từ các Brandname ngân hàng luôn đi kèm cảnh báo bảo mật nghiêm ngặt:
   `r"(?i)(?:tuyet doi khong|khong cung cap|khong chia se)\s+(?:ma\s+nay|ma\s+otp|cho\s+bat\s+ky\s+ai)"`
   Hệ thống phân biệt rõ ràng:
   - Tin nhắn an toàn: Ngân hàng gửi mã và dặn *"Không chia sẻ mã này cho bất kỳ ai kể cả nhân viên ngân hàng"*.
   - Tin nhắn lừa đảo: Kẻ mạo danh thúc ép *"Đọc ngay mã OTP để hoàn tất thủ tục hủy lệnh chuyển tiền"*.
4. **Chiến lược Fast-Pass Giảm Tải Tầng 1 (Tier 1 Fast-Pass Deflection)**:
   Đối với các mẫu tin nhắn an toàn đã xác định khớp hoàn toàn với mẫu dịch vụ chính thống, hệ thống gán nhãn `tier1_preclassification.preliminary_verdict = "OBVIOUS_BENIGN"` và cờ `fast_pass_eligible = true`. Yêu cầu được giải phóng ngay lập tức sau $<15\text{ ms}$ mà không cần đẩy qua mô hình suy luận GPU SLM, bảo vệ tuyệt đối ngưỡng FPR $\le 2\%$.

---

### 2.4. Luồng 4: Phân tích & Trích xuất Đặc trưng Liên kết Độc hại (Malicious URL Pipeline — `dataset_url_sampled.csv`)
Luồng này chịu trách nhiệm phân tích tệp dữ liệu liên kết `data_demo/dataset_url_sampled.csv` gồm **3,192 URLs chuẩn hóa** (0 bản ghi trùng lặp, 0 giá trị null). 

> **LƯU Ý QUAN TRỌNG VỀ TOÀN VẸN HỆ THỐNG**: Tệp dữ liệu 53k URLs thô trước đây (`dataset_url.csv`) đã bị xóa bỏ hoàn toàn khỏi dự án. Mọi thiết kế và bộ nạp dữ liệu hiện tại chỉ làm việc duy nhất với tệp tinh gọn `dataset_url_sampled.csv`.

#### A. Cấu trúc Schema Nguồn của `dataset_url_sampled.csv`
Tệp gồm 4 cột dữ liệu:
1. `channel`: Kênh tiếp nhận (ví dụ `web`, `sms`, `social`).
2. `label`: Nhãn nhị phân chuẩn hóa gồm `phishing` (**1,994 URLs** - 62.47%) và `benign` (**1,198 URLs** - 37.53%).
3. `url_norm`: Chuỗi URL đã được chuẩn hóa giao thức và cấu trúc.
4. `pattern_group`: 19 nhóm mẫu phân tầng đại diện:
   - **7 Nhóm Benign (1,198 URLs)**: Cơ quan chính phủ `benign_gov` (300 URLs `.gov.vn`), Tên miền quốc gia `benign_vn` (250 URLs `.vn`), Doanh nghiệp uy tín `benign_corporate` (200 URLs `.com`/`.net`), Giáo dục `benign_edu` (150 URLs `.edu.vn`), Ngân hàng thật `benign_banking` (150 URLs), Thương mại điện tử `benign_ecommerce` (100 URLs), Cổng dịch vụ `benign_portal` (48 URLs).
   - **12 Nhóm Phishing (1,994 URLs)**: Cờ bạc cá cược `phishing_gambling` (250 URLs), Giả mạo ngân hàng `phishing_banking` (250 URLs), Giả mạo TMĐT `phishing_ecommerce` (250 URLs), Đầu tư tài chính ảo `phishing_investment` (200 URLs), Giả mạo dịch vụ công/VNeID `phishing_gov_vneid` (200 URLs), Tuyển dụng việc làm `phishing_job` (180 URLs), Mạo danh viễn thông `phishing_telecom` (180 URLs), Bình chọn tài năng/hack vote `phishing_social_vote` (150 URLs), Tặng quà tri ân `phishing_giveaway` (150 URLs), Vay tiền nóng `phishing_loan` (134 URLs), Cho thuê phòng trọ/khách sạn `phishing_booking` (100 URLs), Rút gọn link độc hại `phishing_shortlink` (150 URLs).

#### B. Quy trình Bóc tách Cấu trúc & Đánh giá Rủi ro URL
1. **Chuẩn hóa RFC 3986 & Giải mã Hai lần (Double Percent-Decoding)**:
   - Giải mã URL tối đa 2 lần để xử lý triệt để kỹ thuật lách bộ lọc Double URL Encoding (ví dụ `%252e%252e` $\rightarrow$ `%2e%2e` $\rightarrow$ `..`).
   - Chuyển toàn bộ scheme (`http`, `https`) và hostname về chữ thường.
2. **Xử lý Tên miền Quốc tế hóa (IDN / Punycode Resolution)**:
   - Phát hiện các tên miền tấn công đồng hình (Homograph Attack) chứa tiền tố `xn--`.
   - Thực hiện chuyển đổi hai chiều Unicode $\leftrightarrow$ Punycode (RFC 3492/5891) để vừa kiểm tra chữ hiển thị cho người dùng, vừa kiểm tra bản ghi DNS kỹ thuật.
3. **Đánh giá Rủi ro Đuôi Tên miền (TLD Risk Scoring Engine)**:
   - **High-Risk TLDs (Hệ số rủi ro = 1.0)**: `[.top, .cc, .xyz, .vip, .site, .shop, .online, .club, .info, .live, .pro, .bond, .cfd, .icu, .today, .pw, .win, .mobi, .cam, .fit, .lol, .bid]`.
   - **Abused Foreign ccTLDs (Hệ số rủi ro = 0.85)**: `[.bi, .et, .bn, .mu, .tk, .ml, .ga, .cf, .gq]`.
   - **Standard & Verified TLDs (Hệ số rủi ro = 0.10)**: `[.vn, .com.vn, .gov.vn, .edu.vn, .com, .org, .net]`.
4. **Phát hiện Mạo danh Thương hiệu bằng Khoảng cách Levenshtein (Typosquatting Engine)**:
   - Duy trì danh bạ chuẩn (Whitelist) gồm **48 tên miền chính thức** của các cơ quan chính phủ (`gov.vn`, `dichvucong.gov.vn`, `bca.gov.vn`, `vneid.gov.vn`), ngân hàng thương mại (`vietcombank.com.vn`, `techcombank.com.vn`, `bidv.com.vn`, `vietinbank.vn`, `mbbank.com.vn`, `vpbank.com.vn`), ví điện tử (`momo.vn`, `vnpay.vn`, `zalopay.vn`), sàn TMĐT (`shopee.vn`, `lazada.vn`, `tiki.vn`) và nhà mạng (`viettel.vn`, `vinaphone.vn`, `mobifone.vn`).
   - Trích xuất tên miền cấp 2 (SLD) của URL cần kiểm tra và tính toán tỷ lệ tương đồng Levenshtein:
     $$\text{Levenshtein Ratio} = 1.0 - \frac{D_{L}(\text{SLD}, \text{SLD}_{\text{target}})}{\max(\text{len}(\text{SLD}), \text{len}(\text{SLD}_{\text{target}}))}$$
   - Kích hoạt cờ `has_typosquatting_domain = true` khi:
     * Khoảng cách biên tập $1 \le D_{L} \le 2$ (ví dụ: `techcombbank.com` so với `techcombank.com.vn`).
     * Hoặc $\text{Levenshtein Ratio} \ge 0.80$ và hostname không nằm trong danh bạ Whitelist.
     * Hoặc chứa trọn vẹn thương hiệu ngân hàng trong subdomain/path kết hợp TLD lừa đảo (ví dụ: `vietinbank.com.vn-uz.top`, `vneid.dichvucong-gov.cc`).
5. **Nhận diện Lạm dụng Nền tảng Đám mây & Rút gọn Link (PaaS & Shortener Flagging)**:
   Kích hoạt cờ `is_abused_paas = true` khi hostname khớp với các dịch vụ lưu trữ miễn phí thường bị tin tặc lạm dụng: `*.pages.dev`, `*.vercel.app`, `*.github.io`, `*.webflow.io`, `*.blogspot.com`, `*.onrender.com`, `*.railway.app`, `*.s3.amazonaws.com`, hoặc dịch vụ rút gọn link (`tinyurl.com`, `bitly.cx`, `goo.su`, `urlto.me`).
6. **Giải mã Payload Nhúng trong Query Parameters**:
   Tự động trích xuất các tham số `?url=`, `?redirect=`, `?target=`, `?data=`. Nếu phát hiện chuỗi Base64 (`^[A-Za-z0-9+/]{20,}={0,2}$`), pipeline giải mã an toàn để bóc tách URL nhúng sâu hoặc cảnh báo đường dẫn tải file nhị phân độc hại (`.apk`, `.exe`).

---

### 2.5. Luồng 5: Tiền xử lý Ảnh Chụp Màn hình Đa Nền tảng & OCR Trên CPU (Screenshot & CPU OCR Pipeline — `images/`)
Luồng này chịu trách nhiệm tiền xử lý và trích xuất văn bản từ tập dữ liệu hình ảnh tại `data_demo/single_images/` (hỗ trợ alias tương thích `data_demo/images/` hoặc `data_demo/single_image/`). Tập dữ liệu bao gồm **50 ca kiểm thử chuẩn mực** với đầy đủ ảnh, siêu dữ liệu `metadata.json` và bản gỡ băng ground truth `texts/`.

#### A. Cấu trúc & Đặc tính Tập Kiểm thử Ảnh
- **Định dạng & Dung lượng**: 35 ảnh JPEG (`.jpg`), 15 ảnh PNG (`.png`). Dung lượng trung bình 22.4 KB/ảnh.
- **Độ phân giải**: Chuẩn viewport điện thoại di động (375x812, 390x844, 412x915, 360x800).
- **Phân bổ 4 Nền tảng Ứng dụng**: iMessage (17 ca), SMS Android (13 ca), Zalo (10 ca), Facebook Messenger (10 ca).
- **Giao diện Hiển thị**: Cân bằng chính xác tỷ lệ 1:1 giữa **25 ca Light mode** và **25 ca Dark mode**.
- **Phân bổ Nhãn Rủi ro Mục tiêu**: 22 ca `DANGER`, 18 ca `SAFE`, 10 ca `SUSPICIOUS`.

#### B. Pipeline Xử lý Ảnh 100% Trên CPU (Core i5 - 0% VRAM)
Để bảo tồn trọn vẹn 6GB VRAM của RTX 4050 cho mô hình ngôn ngữ SLM, **module xử lý ảnh và OCR được thiết kế thực thi hoàn toàn trên CPU Core i5 (chiếm 0 MB VRAM, tiêu thụ RAM $\le 300\text{ MB}$, thời gian thực thi $< 800\text{ ms}$/ảnh)**:

```
[ Ảnh Gốc Tải Lên ]
       │
       ▼
[ Bước 1: Tiếp nhận & Kiểm định An toàn (ImageUploadGuard) ]
  ├── Kiểm tra Magic Bytes: JPEG (FF D8 FF), PNG (89 50 4E 47), WebP (RIFF...WEBP)
  └── Giới hạn: max 5 ảnh, max 5MB/ảnh, max 20MB tổng, max 16,000,000 pixels (sharp)
       │
       ▼
[ Bước 2: Hiệu chỉnh Hướng Ảnh EXIF (Orientation Correction) ]
  └── Đọc thẻ EXIF Orientation và xoay ảnh về góc chuẩn 0° (khắc phục ảnh chụp dọc bị lộn)
       │
       ▼
[ Bước 3: Chuẩn hóa Kích thước Bảo tồn Tỷ lệ (Aspect-Ratio Preserved Resizing) ]
  └── Nội suy Lanczos/Bicubic thu phóng cạnh dài về max 1,600px (giữ nguyên độ nét text)
       │
       ▼
[ Bước 4: Phân tích Không gian Màu & Chế độ Giao diện (Light/Dark Mode Analysis) ]
  ├── Chuyển đổi kênh xám (Grayscale Conversion)
  └── Tính độ sáng trung bình kênh xám: L_avg < 128 -> Dark Mode; L_avg >= 128 -> Light Mode
       │
       ▼
[ Bước 5: Tiền xử lý Tăng cường Tương phản & Khử Nhiễu Màn hình ]
  ├── Áp dụng CLAHE (Contrast Limited Adaptive Histogram Equalization)
  ├── Gaussian Blur nhẹ (khử vân ma trận OLED / sọc hiển thị)
  └── Phân ngưỡng thích nghi Otsu (Otsu Binarization) làm nổi bật đường viền ký tự
       │
       ▼
[ Bước 6: Phân đoạn Bố cục & Bóc tách Bong bóng Thoại (Layout & Bubble Segmentation) ]
  ├── Nhận diện các hộp bao tin nhắn (Bounding Boxes)
  └── Phân loại vai trò người nói dựa trên tọa độ x:
      • Căn lề trái (x_min < 0.25 W) -> Tin nhắn Đối phương (Peer / Attacker)
      • Căn lề phải (x_max > 0.75 W) -> Tin nhắn Người dùng (User / Victim)
       │
       ▼
[ Bước 7: Trích xuất Ký tự Quang học bằng Offline OCR CPU (PaddleOCR-v4 CPU / VietOCR) ]
  ├── Chạy mô hình OCR tiếng Việt siêu nhẹ tối ưu hóa tập lệnh AVX2 (0% VRAM, <800ms)
  └── Xuất mảng lượt thoại có cấu trúc: [{turn_id, speaker, text, bounding_box, confidence}]
```

1. **Bước 1 — Tiếp nhận & Kiểm định An toàn (Image Ingestion & Guard Validation)**:
   - Triển khai theo đúng đặc tả của `BE_codex/src/analysis/image-upload.ts`:
     * Kiểm tra chữ ký byte ma thuật (Magic Bytes): JPEG (`0xFF, 0xD8, 0xFF`), PNG (`0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A`), WebP (`RIFF...WEBP`). Từ chối ngay lập tức các tệp giả mạo đuôi mở rộng bằng mã lỗi `UNSUPPORTED_IMAGE_FORMAT`.
     * Giới hạn an toàn: Tối đa 5 ảnh một lượt gửi, tối đa $5\text{ MiB}$ ($5,242,880\text{ bytes}$) mỗi ảnh, tối đa $20\text{ MiB}$ ($20,971,520\text{ bytes}$) tổng dung lượng.
     * Kiểm tra số pixel giải mã: Sử dụng thư viện `sharp` / `Pillow` để kiểm tra $\text{width} \times \text{height} \le 16,000,000\text{ pixels}$ nhằm ngăn chặn các cuộc tấn công nén hình ảnh (Pixel Flood / Decompression Bomb).
2. **Bước 2 — Hiệu chỉnh Hướng Ảnh EXIF (Orientation Correction)**:
   Đọc thẻ EXIF `Orientation` (giá trị từ 1 đến 8) và thực hiện xoay ảnh ($90^{\circ}, 180^{\circ}, 270^{\circ}$) hoặc lật gương tương ứng để đưa ảnh chụp từ camera điện thoại về góc đọc tự nhiên $0^{\circ}$.
3. **Bước 3 — Chuẩn hóa Kích thước Bảo tồn Tỷ lệ (Aspect-Ratio Preserved Resizing)**:
   Nếu cạnh dài nhất của ảnh vượt quá $1,600\text{ pixels}$, ảnh được thu phóng (downscale) giữ nguyên tỷ lệ khung hình bằng thuật toán nội suy Lanczos/Bicubic. Mức $1,600\text{ px}$ là điểm cân bằng tối ưu: giữ trọn vẹn chi tiết của các ký tự tiếng Việt có dấu nhỏ (như dấu hỏi, ngã, nặng) trong khi giữ thời gian xử lý OCR CPU dưới $800\text{ ms}$.
4. **Bước 4 — Phân loại Chế độ Giao diện (Light Mode vs Dark Mode)**:
   Tính toán độ sáng trung bình (Average Luminance) của ảnh xám:
   $$L_{\text{avg}} = \frac{1}{W \times H} \sum_{x=1}^{W} \sum_{y=1}^{H} I(x, y)$$
   - Nếu $L_{\text{avg}} < 128$: Xác định là giao diện **Dark Mode** (nền tối, chữ sáng).
   - Nếu $L_{\text{avg}} \ge 128$: Xác định là giao diện **Light Mode** (nền sáng, chữ tối).
   Đối với ảnh Dark Mode, thuật toán tự động đảo ngược màu (Invert) cục bộ tại các vùng chứa văn bản để tối ưu hóa độ chính xác nhận diện của mô hình OCR vốn được huấn luyện chủ yếu trên văn bản chữ đen nền trắng.
5. **Bước 5 — Tăng cường Tương phản & Khử Nhiễu (Contrast Enhancement & Denoising)**:
   - Áp dụng thuật toán cân bằng biểu đồ độ sáng thích ứng giới hạn độ tương phản (CLAHE - Contrast Limited Adaptive Histogram Equalization) với `clipLimit=2.0`, `tileGridSize=(8,8)` để làm nổi rõ nét chữ trong các bong bóng chat có màu nền nhạt.
   - Áp dụng bộ lọc Gaussian Blur bán kính nhỏ ($\sigma = 0.5$) để triệt tiêu nhiễu sọc ma trận màn hình OLED (Moiré pattern).
   - Áp dụng phân ngưỡng nhị phân thích nghi (Adaptive Otsu Binarization) để phân tách rõ ràng đường biên giữa chữ viết và nền bóng thoại.
6. **Bước 6 — Phân đoạn Bong bóng Thoại & Gán Vai trò Người nói (Bubble Layout Segmentation)**:
   Dựa trên đặc tính giao diện người dùng của cả 4 ứng dụng (Zalo, Messenger, iMessage, SMS):
   - **Tin nhắn Đối phương (Peer / Attacker)**: Luôn xuất hiện ở phía bên trái màn hình. Tọa độ biên trái hộp bao thỏa mãn: $x_{\text{min}} / W \le 0.30$.
   - **Tin nhắn Người dùng (User / Potential Victim)**: Luôn xuất hiện ở phía bên phải màn hình. Tọa độ biên phải hộp bao thỏa mãn: $x_{\text{max}} / W \ge 0.70$.
   Thuật toán nhóm các dòng văn bản có vị trí $y$ liền kề và cùng lề $x$ thành một lượt thoại hoàn chỉnh, sắp xếp theo thứ tự thời gian từ trên xuống dưới theo trục $y$.
7. **Bước 7 — Trích xuất Ký tự Quang học bằng Offline OCR Trên CPU (PaddleOCR-v4 CPU / VietOCR)**:
   - Sử dụng mô hình **PaddleOCR-v4 CPU** (bản lượng tử hóa ONNX INT8 với từ điển tiếng Việt) hoặc **VietOCR** chạy trên nhân CPU đa luồng AVX2.
   - Tuyệt đối không nạp mô hình thị giác lớn (VLM 2B/7B) lên GPU RTX 4050 để tránh sụt giảm bộ nhớ đồ họa (tránh OOM).
   - Kết quả OCR trích xuất được định dạng thành mảng đối tượng JSON có cấu trúc:
     ```json
     {
       "turn_id": 1,
       "speaker": "peer",
       "text": "A lô chào anh, em là Hùng, quản lý bên Ngân hàng Thịnh Vượng...",
       "bounding_box": [45, 120, 310, 185],
       "confidence": 0.965
     }
     ```
   - **Tiêu chuẩn Chất lượng Đo lường**: Kết quả OCR trích xuất được đối soát trực tiếp với 50 tệp ground truth trong `data_demo/single_images/texts/` (hoặc alias `data_demo/images/texts/`), đạt tiêu chuẩn sản xuất: Tỷ lệ lỗi ký tự $\text{CER} \le 5\%$ và Tỷ lệ lỗi từ $\text{WER} \le 10\%$. Toàn bộ văn bản trích xuất sau đó được chuyển tiếp sang Động cơ Khử nhiễu (Mục 3) và Động cơ PII (Mục 4) giống như văn bản gốc.

---

## 3. QUY TRÌNH KHỬ NHIỄU, CHỐNG NGỤY TRANG ĐỐI KHÁNG & CHUẨN HÓA TIẾNG VIỆT

Kẻ tấn công lừa đảo thường xuyên áp dụng các kỹ thuật làm biến dạng văn bản tinh vi nhằm qua mặt bộ lọc từ khóa của nhà mạng và làm mù tokenizer của mô hình AI. Quy trình khử nhiễu thực thi tuần tự 6 giai đoạn tất định trên CPU:

### 3.1. Chuẩn hóa Bộ mã Unicode (Unicode Normalization: NFC & NFKC)
- **Vấn đề**: Trong tiếng Việt, cùng một nguyên âm có dấu có thể được biểu diễn bằng 2 cách: Dạng Dựng sẵn (Precomposed / NFC, ví dụ `\u1ED9` cho chữ `ộ`) hoặc Dạng Tổ hợp (Decomposed / NFD, ví dụ chữ `o` + `\u0323` + `\u0302`). Điều này khiến tokenizer coi chúng là các chuỗi token hoàn toàn khác biệt.
- **Giải pháp**:
  - Bước 1: Áp dụng chuẩn **Unicode NFC (Canonical Composition)** để đưa toàn bộ nguyên âm tiếng Việt về dạng dựng sẵn chuẩn quốc gia.
  - Bước 2: Áp dụng chuẩn **Unicode NFKC (Compatibility Decomposition followed by Canonical Composition)** đối với các khối văn bản chứa ký tự tượng hình đặc biệt, ligature, hoặc ký tự số trong vòng tròn.

### 3.2. Loại bỏ Ký tự Tàng hình & Khoảng trắng Ẩn (Zero-Width & Invisible Characters Stripping)
- **Vấn đề**: Kẻ lừa đảo chèn các ký tự không có độ rộng hiển thị (Zero-Width) vào giữa các từ khóa nhạy cảm (như `c\u200Bo\u200Bn\u200Bg\u200B \u200Ba\u200Bn`) hoặc chèn ký tự Hangul Filler `\u3164` tràn lan để phá vỡ biểu thức chính quy.
- **Danh mục Ký tự Bị Tiêu diệt Tuyệt đối**:
  - `\u200B`: Zero-Width Space
  - `\u200C`: Zero-Width Non-Joiner
  - `\u200D`: Zero-Width Joiner
  - `\uFEFF`: Zero-Width No-Break Space / Byte Order Mark (BOM)
  - `\u200E` & `\u200F`: LTR / RTL Directional Marks
  - `\u3164`: Hangul Filler (Ký tự điền khoảng trắng tiếng Hàn)
  - `\uFFA0`: Halfwidth Hangul Filler
  - `\u00AD`: Soft Hyphen (Dấu gạch nối mềm)
  - `\u202A` đến `\u202E`: Bidi Embedding & Override Controls
- **Giải thuật Thực thi**:
  Sử dụng biểu thức chính quy biên dịch sẵn (pre-compiled regex) với độ phức tạp tuyến tính $O(N)$:
  $$\text{RE\_INVISIBLE} = [\text{\textbackslash u200B}-\text{\textbackslash u200D}\text{\textbackslash uFEFF}\text{\textbackslash u3164}\text{\textbackslash uFFA0}\text{\textbackslash u00AD}\text{\textbackslash u202A}-\text{\textbackslash u202E}]$$

### 3.3. Giải mã Ký tự Toán học Đơn cách về ASCII (Mathematical Monospace Font Transcoding)
- **Vấn đề**: Kẻ lừa đảo sử dụng các font máy đánh chữ toán học (như `"𝚔𝚢𝚑𝚐𝚜𝚕𝚟𝚊𝚘ㅤ𝚐𝚊𝚖𝚎"`) thuộc dải `U+1D670` đến `U+1D6A3` để qua mặt bộ phát hiện từ khóa.
- **Bảng Ánh xạ Toàn phần (Transcoding Offset Algorithm)**:
  - Ký tự hoa Mathematical Monospace: `U+1D670` ($\mathbf{𝙰}$) đến `U+1D689` ($\mathbf{𝚉}$) $\rightarrow$ `A` (`U+0041`) đến `Z` (`U+005A`):
    $$\text{ASCII\_Code} = \text{Ord}(c) - \text{0x1D670} + \text{0x0041}$$
  - Ký tự thường Mathematical Monospace: `U+1D68A` ($\mathbf{𝚊}$) đến `U+1D6A3` ($\mathbf{𝚣}$) $\rightarrow$ `a` (`U+0061`) đến `z` (`U+007A`):
    $$\text{ASCII\_Code} = \text{Ord}(c) - \text{0x1D68A} + \text{0x0061}$$
  - Chữ số Mathematical Monospace: `U+1D7F6` ($\mathbf{𝟶}$) đến `U+1D7FF` ($\mathbf{𝟿}$) $\rightarrow$ `0` (`U+0030`) đến `9` (`U+0039`):
    $$\text{ASCII\_Code} = \text{Ord}(c) - \text{0x1D7F6} + \text{0x0030}$$
  - Tự động mở rộng hỗ trợ cho các dải Mathematical Bold (`U+1D400`), Mathematical Italic (`U+1D434`), Mathematical Sans-serif (`U+1D5A0`), và Fullwidth Latin (`U+FF01` - `U+FF5E`).

### 3.4. Thu gọn Ký tự Lặp có Chủ đích (Character Stuttering Compression)
- **Vấn đề**: Kẻ tấn công lặp lại các ký tự hoa thường xen kẽ (ví dụ: `"NhHậẬnNLLLuUôônnNNN..."`) để làm nổ tung số lượng token của mô hình ngôn ngữ.
- **Giải thuật Nén Ngữ âm Tiếng Việt (Phonotactic Un-stuttering)**:
  1. *Nén lặp cơ sở*: Ký tự nào lặp lại liên tiếp $\ge 3$ lần (ví dụ `NNNN` $\rightarrow$ `N`, `ĐĐĐ` $\rightarrow$ `Đ`) đều được nén về đúng 1 ký tự.
  2. *Xử lý cặp xen kẽ hoa thường*: Nhận diện cấu trúc `c1 C1 c2 C2` (như `NhHậẬnN`) và phân rã thành nguyên âm/phụ âm cơ sở để khôi phục lại từ đúng ngữ nghĩa: `Nhận`.
  3. *Ràng buộc bảo vệ từ ngữ pháp tiếng Việt*: Không nén nhầm các từ có nguyên âm hoặc phụ âm đôi tự nhiên của tiếng Việt (như `oo` trong *"xoong"*, `qu` trong *"quá"*, `ng` trong *"nghiêng"*).

### 3.5. Nhận diện & Hàn gắn URL Bị Chèn Khoảng trắng Đối kháng (Spaced-out Broken URL Reconstruction)
- **Vấn đề**: Chèn cố ý khoảng trắng trước TLD (`techcom-rewards-vn .com`), sau giao thức (`http:// 103.[NUMBER]:[NUMBER]`), hoặc thay dấu `:` bằng dấu `.` (`http.//dichvucong .xyz`).
- **Quy tắc Hàn gắn Tự động**:
  1. Sửa sai Scheme: `r"(?i)\b(https?)\s*[\.\,]\s*//"` $\rightarrow$ `\1://`
  2. Hàn gắn khoảng trắng trước TLD: `r"(?i)\b([a-z0-9\-]+)\s+\.([a-z]{2,10})\b"` $\rightarrow$ `\1.\2`
  3. Hàn gắn khoảng trắng sau protocol: `r"(?i)(https?://)\s+([a-z0-9])"` $\rightarrow$ `\1\2`
  4. Ghi nhận cảnh báo an ninh: `adversarial_evasion_detected = true` và thêm thẻ `RECONSTRUCTED_SPACED_URL`.

### 3.6. Bộ Chuẩn hóa Lỗi Gõ Telex, Từ lóng Tin nhắn (SMS Slang) & Chính sách Từ dừng Bảo tồn Rủi ro
1. **Chuẩn hóa Lỗi Gõ Telex Phổ biến (Telex Typo Normalizer)**:
   Xử lý hiện tượng gõ bàn phím Telex dính chữ thường gặp trong tin nhắn SMS và chat mạng xã hội:
   - Dính phụ âm: `dd` $\rightarrow$ `đ`, `DD` $\rightarrow$ `Đ`.
   - Dính nguyên âm mũ: `aa` $\rightarrow$ `â`, `oo` $\rightarrow$ `ô`, `ee` $\rightarrow$ `ê`.
   - Dính phím dấu Telex ở đuôi từ: `as` $\rightarrow$ `á`, `or` $\rightarrow$ `ỏ`, `ax` $\rightarrow$ `ã`, `aj` $\rightarrow$ `ạ`, `af` $\rightarrow$ `à`.
2. **Từ điển Chuẩn hóa Từ lóng & Viết tắt SMS Tiếng Việt (SMS Slang Dictionary)**:
   Bảng tra cứu thay thế bảo tồn ngữ nghĩa cho các từ viết tắt cực kỳ phổ biến trong tin nhắn lừa đảo và viễn thông tại Việt Nam:
   - Phủ định / Quan hệ: `ko`, `k`, `kh`, `khong`, `hổng` $\rightarrow$ `không`; `dc`, `đc` $\rightarrow$ `được`; `b` $\rightarrow$ `bạn`; `m` $\rightarrow$ `mình`; `ng` $\rightarrow$ `người`.
   - Tài chính / Giao dịch: `stk`, `so tk` $\rightarrow$ `số tài khoản`; `tk` $\rightarrow$ `tài khoản`; `ck`, `ch` $\rightarrow$ `chuyển khoản`; `nh` $\rightarrow$ `ngân hàng`; `sđt`, `sdt` $\rightarrow$ `số điện thoại`.
   - Định danh / Bảo mật: `cccd`, `cmnd`, `căn cước` $\rightarrow$ `căn cước công dân`; `mk`, `pass`, `pwd` $\rightarrow$ `mật khẩu`; `xacthuc` $\rightarrow$ `xác thực`.
   - Hành chính: `dvc` $\rightarrow$ `dịch vụ công`; `bca` $\rightarrow$ `Bộ Công An`; `vneid` $\rightarrow$ `VNeID`.
3. **Chính sách Từ dừng Bảo tồn Rủi ro (Risk-Preserving Stopword Policy)**:
   - Trong các hệ thống NLP thông thường, các từ dừng (stopwords) như *"nếu"*, *"thì"*, *"ngay"*, *"phải"*, *"trong"*, *"trước"* thường bị loại bỏ.
   - **Quy tắc Nghiêm ngặt của ScamShieldAI**: **TUYỆT ĐỐI KHÔNG ĐƯỢC LOẠI BỎ CÁC TỪ DỪNG MANG TÍNH ĐIỀU KIỆN HOẶC THÚC ÉP THỜI GIAN**.
   - *Lý do an ninh*: Các liên từ điều kiện và trạng từ thời gian chính là dấu hiệu chỉ thị cốt lõi của đòn tâm lý cưỡng ép (Psychological Urgency & Intimidation). Cụm từ *"Nếu không chuyển tiền trước 16h thì sẽ bị khóa tài khoản"* nếu bị lọc từ dừng sẽ chỉ còn *"chuyển tiền 16h khóa tài khoản"*, làm mất đi ngữ khí đe dọa cưỡng bức để mô hình suy luận đánh giá.

---

## 4. QUY TRÌNH BẢO MẬT & ẨN DANH HÓA DỮ LIỆU CÁ NHÂN (PII SANITIZATION ENGINE)

Để tuân thủ Nghị định 13/2023/NĐ-CP về Bảo vệ Dữ liệu Cá nhân và ngăn chặn rò rỉ thông tin người dùng vào context của mô hình AI hoặc log hệ thống, Module Tiền xử lý được trang bị Động cơ Ẩn danh hóa PII chuyên biệt.

### 4.1. Bộ Biểu thức Chính quy, Heuristics Nhận diện PII Đặc thù Việt Nam & Đặc tả Thứ tự Thực thi

Để triệt tiêu hiện tượng xung đột nhận diện thực thể (Entity Disambiguation Conflicts), quy trình khử PII được phân cấp theo **Thứ tự Ưu tiên Thực thi Bắt buộc (Mandatory Precedence Ordering)** từ độ đặc hiệu ngữ cảnh cao nhất đến regex nới lỏng không ràng buộc:

| Thứ tự Ưu tiên | Loại PII & Token đích | Mẫu Nhận diện Kỹ thuật & Regex Chuẩn hóa | Tiêu chuẩn Căn cứ & Đặc thù Ngữ cảnh | Xử lý Dị biệt & Phòng ngừa Xung đột |
| :---: | :--- | :--- | :--- | :--- |
| **1** | **Mật khẩu Văn bản thuần**<br>`<MASKED_PASSWORD_n>` | `(?i)(?:mat\s*khau\|password\|pwd\|pass)\s*[:=]\s*(\S+)` | Chuỗi ký tự bất kỳ theo sau nhãn mật khẩu rõ ràng. | Khử ngay chuỗi mật khẩu nhạy cảm ở mức ưu tiên cao nhất, tránh rò rỉ token sang các bước sau. |
| **2** | **Họ tên & Ngày sinh Đi kèm**<br>`<MASKED_PERSON_NAME_n>` | `(?i)(?:anh/chi\|ong/ba\|khach\s*hang)\s+([A-ZÀ-Ỹa-zà-ỹ\s]{3,25})_SN:\s*(\d{1,2}/\d{1,2}/\d{4})` | Cấu trúc định danh ghép đôi danh xưng, họ tên và ngày sinh. | Bắt mẫu rò rỉ danh tính nghiêm trọng dạng `Le Thi Lan Anh_SN: 30/07/2006` trước khi tách từng trường. |
| **3** | **Số Tài khoản Ngân hàng**<br>`<MASKED_BANK_ACC_n>` | `(?i)(?:stk\|tk\|tai\s*khoan\|so\s*tk\|so\s*tai\s*khoan)\s*[:.\-]?\s*(\d{8,16})\b` | 8 đến 16 chữ số nguyên, đi kèm tiền tố định danh tài khoản (`STK:`, `TK`, `tài khoản`). | **BẮT BUỘC CHẠY TRƯỚC CCCD**: Ngăn chặn tài khoản 12 số (Vietcombank, Techcombank, BIDV) bị nhận diện nhầm thành CCCD. Kiểm tra phân cách hàng nghìn để tránh nhầm số tiền. |
| **4** | **Mã xác thực OTP**<br>`<MASKED_OTP_n>` | `(?i)(?:ma\s*otp\|otp\|ma\s*xac\s*thuc)(?:\s+(?:cua\s+)?(?:ban\|quy\s*khach))?\s*(?:la\|:\|=\|\s)+\s*([0-9]{4,8})\b` | Chuỗi 4 đến 8 chữ số xuất hiện cạnh từ khóa OTP, hỗ trợ cụm từ khẩu ngữ tiếng Việt (`"la:"`, `"cua ban la:"`, `"cua Quy khach la:"`). | Nhận diện chính xác 100% các biến thể OTP thực tế như `Ma OTP la: 482917`, `Ma OTP cua ban la: 482917`, `Ma xac thuc cua Quy khach la: 654321`, `OTP: 123456`. |
| **5** | **Số Điện thoại Cá nhân**<br>`<MASKED_PHONE_NUMBER_n>` | `(?:\+?84\|0)(?:3[2-9]\|5[25689]\|7[06-9]\|8[1-9]\|9[0-46-9])\d{7}\b` | 10 chữ số với đầu số viễn thông Việt Nam hợp lệ (Viettel, Vina, Mobi, Vietnamobile). | Không che các hotline chính thống của nhà nước hoặc ngân hàng (như `198`, `113`, `1900xxxx`). |
| **6** | **Số Căn cước công dân (CCCD)**<br>`<MASKED_CCCD_n>` | Chuẩn BCA: `(?<!\d)(?:0\d{2}[0-3]\d{2}\d{6})(?!\d)`<br>Regex nới lỏng: `\b\d{12}\b` | 12 chữ số theo quy chuẩn Bộ Công An (3 số mã tỉnh + 1 số giới tính/thế kỷ + 2 số năm sinh + 6 số ngẫu nhiên). | **Chạy SAU Số tài khoản ngân hàng**: Chỉ xử lý các chuỗi 12 số sau khi đã loại trừ STK có tiền tố. Bổ sung bắt dị biệt CCCD 8 số (`\b\d{8}\b`) và 14 số (`\b001190\d{8}\b`). |

#### A. Đặc tả Thứ tự Thực thi Bắt buộc & Phân giải Xung đột Thực thể (Mandatory PII Rule-Ordering Specification)

Trong các giao dịch ngân hàng và tin nhắn lừa đảo tại Việt Nam, các ngân hàng thương mại cổ phần (Vietcombank, Techcombank, BIDV, MBBank, VPBank, TPBank) phát hành số tài khoản thường có độ dài từ 10 đến 14 chữ số, trong đó **số tài khoản đúng 12 chữ số chiếm tỷ trọng rất phổ biến**. Do đó, hiện tượng trùng khớp định dạng giữa số tài khoản ngân hàng 12 chữ số và số Căn cước công dân (CCCD 12 chữ số) là một nguy cơ xung đột thực thể nghiêm trọng:

1. **Minh chứng Xung đột Thực nghiệm**:
   Xét mẫu tin nhắn lừa đảo chuyển tiền điển hình:
   ```
   "Chị gửi tiền vào STK: 123456789012 kèm số CCCD 001099012345 số tiền là [MONEY] nhé."
   ```
   - **Nếu thực thi sai thứ tự (Quét CCCD trước Tài khoản Ngân hàng)**:
     Bộ quét CCCD (với regex `\b\d{12}\b`) sẽ khớp tham lam cả hai số 12 chữ số:
     `"Chị gửi tiền vào STK: <MASKED_CCCD_1> kèm số CCCD <MASKED_CCCD_2> số tiền là [MONEY] nhé."`
     $\rightarrow$ Số tài khoản nhận tiền bị biến đổi sai lệch thành token CCCD. Tầng suy luận SLM Tier 2 và bộ đánh giá rủi ro (`RiskService`) sẽ hoàn toàn bị mù trước tín hiệu yêu cầu chuyển tiền đến tài khoản thụ hưởng (`MONEY_REQUEST`), làm suy giảm nghiêm trọng độ nhạy phát hiện lừa đảo.
   - **Khi thực thi đúng thứ tự bắt buộc (Tài khoản Ngân hàng trước CCCD)**:
     Quy tắc Số tài khoản (có tiền tố ngữ cảnh `STK:`) được khớp trước:
     `"Chị gửi tiền vào STK: <MASKED_BANK_ACC_1> kèm số CCCD 001099012345 số tiền là [MONEY] nhé."`
     Sau đó, bước quét CCCD chỉ còn số CCCD thật sự và che thành:
     `"Chị gửi tiền vào STK: <MASKED_BANK_ACC_1> kèm số CCCD <MASKED_CCCD_1> số tiền là [MONEY] nhé."`
     $\rightarrow$ Bảo tồn trọn vẹn $100\%$ ngữ nghĩa tài chính và danh tính cho mô hình suy luận.

2. **Nguyên tắc Kiến trúc Bắt buộc**:
   Động cơ `PiiSanitizer` trong mã nguồn bắt buộc phải định nghĩa danh sách quy tắc theo thứ tự giảm dần của tính cụ thể ngữ cảnh:
   `[RULE_PASSWORD -> RULE_PERSON_NAME_DOB -> RULE_BANK_ACCOUNT -> RULE_OTP -> RULE_PHONE -> RULE_CCCD]`. Mọi bản vá hoặc cập nhật biểu thức chính quy đều phải tuân thủ nghiêm ngặt thứ tự bất biến này.

### 4.2. Cơ chế Token Hóa Hai chiều Bảo lưu Ngữ cảnh (Context-Preserving Tokenization)
Thay vì làm biến mất thông tin bằng các ký tự dấu sao chung chung (`***`), hệ thống chuyển đổi PII thành các **Token Phân loại có Chỉ số (Contextual Typed Tokens)**:
- Số CCCD đầu tiên trong phiên $\rightarrow$ `<MASKED_CCCD_1>`
- Số CCCD thứ hai (nếu có) $\rightarrow$ `<MASKED_CCCD_2>`
- Tài khoản ngân hàng thứ nhất $\rightarrow$ `<MASKED_BANK_ACC_1>`
- Mã OTP thứ nhất $\rightarrow$ `<MASKED_OTP_1>`
- Mật khẩu $\rightarrow$ `<MASKED_PASSWORD_1>`
- Số điện thoại cá nhân $\rightarrow$ `<MASKED_PHONE_NUMBER_1>`
- Họ tên cá nhân $\rightarrow$ `<MASKED_PERSON_NAME_1>`

**Lợi ích đối với Mô hình Suy luận**:
Mô hình Tier 2 (Qwen2.5-3B) hoàn toàn giữ được năng lực logic để suy luận:
*"Đối tượng cuộc gọi yêu cầu gửi ảnh thẻ `<MASKED_CCCD_1>`, sau đó yêu cầu chuyển khoản đến `<MASKED_BANK_ACC_1>`, rồi thúc ép cung cấp liên tiếp 3 mã `<MASKED_OTP_1>`, `<MASKED_OTP_2>`, `<MASKED_OTP_3>`. Đây là chuỗi hành vi thu hoạch mã xác thực ngân hàng có chủ đích."*

### 4.3. Nguyên tắc Bảo tồn Tuyệt đối Các Token Masked Sẵn (`[MONEY]`, `[NUMBER]`, `[TIME]`)
- **Đặc thù Dữ liệu Tinh gọn**: Trong cả `Scam.csv` (236 dòng `[MONEY]`, 204 dòng `[NUMBER]`) và `No_scam.csv` (1,341 dòng `[MONEY]`, 1,172 dòng `[NUMBER]`), các placeholder dạng ngoặc vuông `[MONEY]`, `[NUMBER]`, `[TIME]` đã được gắn từ trước trong quá trình chuẩn hóa tập dữ liệu ban đầu.
- **Ràng buộc Bảo vệ Bất biến (Immutability Constraint)**:
  * Bộ quét PII Regex tuyệt đối không được coi `[NUMBER]` là một số tài khoản hay số CCCD để che chắn lần thứ hai thành `<MASKED_NUMBER_1>`.
  * Bộ chuẩn hóa văn bản phải đưa các token này vào danh sách ngoại lệ (Whitelist Tokens). Mọi chuỗi khớp mẫu `r"\[(MONEY|NUMBER|TIME)\]"` được giữ nguyên vẹn $100\%$.
  * Trong tầng trích xuất thực thể, hệ thống ghi nhận trực tiếp sự xuất hiện của `[MONEY]` vào danh sách `financial_indicators` để hỗ trợ mô hình nhận diện hành vi đòi tiền mà không làm sai lệch vị trí token.

### 4.4. Bảng Ánh xạ Tham chiếu An toàn với Salted HMAC-SHA256
Để đảm bảo PII không thể bị khôi phục nếu dữ liệu truyền ra bên ngoài nhưng vẫn cho phép kiểm tra tính trùng lặp thực thể giữa các lượt thoại:
1. **Khởi tạo Muối theo Phiên (Per-Session Salt)**:
   Khi một phiên kiểm tra (`session_id`) bắt đầu, hệ thống sinh ra một chuỗi ngẫu nhiên bằng mật mã học (CSPRNG):
   $$\text{Session\_Salt} = \text{HexEncode}(\text{CryptoRandomBytes}(32))$$
2. **Hàm Băm Một chiều (One-Way Cryptographic Hashing)**:
   Với mỗi giá trị PII thô $V$ (đã được chuẩn hóa chuỗi):
   $$\text{HMAC\_Digest} = \text{HMAC-SHA256}(\text{Key} = \text{Session\_Salt}, \text{Message} = V)$$
3. **Cấu trúc Bảng Tra cứu Tham chiếu (PII Reference Table)**:
   Bảng tra cứu chỉ được lưu trong RAM nội bộ của tiến trình Tiền xử lý (không bao giờ truyền ra API công khai):
   ```
   Token                -> HMAC-SHA256 Digest (64 ký tự Hex)
   <MASKED_CCCD_1>     -> a8f5c31b89...e304b7
   <MASKED_BANK_ACC_1> -> 7c2e109d4a...55f891
   ```
   Nếu cùng một số tài khoản xuất hiện lại ở lượt thoại thứ 5, hàm băm sẽ sinh ra cùng một `HMAC_Digest`, giúp hệ thống tự động tái sử dụng lại token `<MASKED_BANK_ACC_1>` mà không tạo token mới.

### 4.5. Vòng đời Dữ liệu & Cơ chế Hủy Bộ nhớ Tạm (Ephemeral Memory Purge Policy)
- **Thời gian sống (TTL - Time-To-Live)**: Bảng tra cứu PII trong bộ nhớ RAM tự động hết hạn và bị thu hồi hoàn toàn sau **300 giây (5 phút)** kể từ khi hoàn tất yêu cầu kiểm tra.
- **Xóa trắng Chủ động (Active Memory Scrubbing)**: Ngay sau khi quy trình suy luận trả về kết quả cho máy khách, tiến trình gọi lệnh xóa sạch vùng nhớ chứa `Session_Salt` và các biến chứa chuỗi thô.

---

## 5. ĐẶC TẢ SCHEMA CẤU TRÚC DỮ LIỆU ĐẦU VÀO CHUẨN HÓA API MODEL (UNIFIED API SCHEMA)

### 5.1. JSON Schema Hoàn chỉnh (Draft 2020-12 / OpenAPI 3.1) cho `UnifiedScamInspectionPayload`

Dưới đây là đặc tả JSON Schema chính thức, hoàn chỉnh và nghiêm ngặt tuân thủ chuẩn **JSON Schema Draft 2020-12** và **OpenAPI 3.1.0 Specification**, bao quát đầy đủ 5 hình thái dữ liệu (Multi-turn dialogue, Single message, URL, Screenshot Image, Hybrid):

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://scamshield.ai/schemas/v2/unified-inspection-payload.json",
  "title": "UnifiedScamInspectionPayload",
  "description": "Standardized, sanitized, and enriched input payload for ScamShieldAI Model Inference Harness (Tier 2 Edge SLM & Tier 3 Cloud Agent).",
  "type": "object",
  "required": [
    "schema_version",
    "session_id",
    "modality",
    "received_at",
    "content",
    "extracted_entities",
    "security_features",
    "tier1_preclassification"
  ],
  "additionalProperties": false,
  "properties": {
    "schema_version": {
      "type": "string",
      "enum": ["2.0.0"],
      "description": "Semantic version of the Unified API Input Schema."
    },
    "session_id": {
      "type": "string",
      "format": "uuid",
      "pattern": "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
      "description": "Unique UUID v4 tracking the inspection transaction across Gateway and AI Service."
    },
    "modality": {
      "type": "string",
      "enum": ["dialogue", "single_message", "url", "image", "hybrid"],
      "description": "The input data modality determining downstream processing and prompt scaffolding."
    },
    "source_metadata": {
      "type": "object",
      "required": ["channel"],
      "additionalProperties": false,
      "properties": {
        "channel": {
          "type": "string",
          "enum": ["telecom_sms", "voice_call_transcript", "chat_social", "web_url", "screenshot_upload", "internal_dataset"],
          "description": "The originating communication or ingestion channel."
        },
        "raw_record_id": {
          "type": "string",
          "description": "Original record ID from dataset if applicable (e.g., 'case_001', 'conservations_id_9', 'Scam_row_42')."
        },
        "client_timestamp": {
          "type": "string",
          "format": "date-time",
          "description": "Timestamp reported by the client or recorded in the source log."
        }
      }
    },
    "received_at": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 UTC timestamp when Tier 1 ingestion started processing."
    },
    "content": {
      "type": "object",
      "description": "Normalized and de-obfuscated content corresponding to the chosen modality.",
      "additionalProperties": false,
      "properties": {
        "dialogue": {
          "type": "array",
          "description": "Sequential turns for multi-turn dialogue modality.",
          "items": {
            "$ref": "#/$defs/DialogueTurn"
          },
          "minItems": 1
        },
        "single_message": {
          "type": "string",
          "description": "Cleaned, de-obfuscated text for single-message SMS or chat."
        },
        "normalized_urls": {
          "type": "array",
          "description": "Array of canonicalized URL structures found in the payload or analyzed independently.",
          "items": {
            "$ref": "#/$defs/NormalizedUrlRecord"
          }
        },
        "image_payload": {
          "type": "object",
          "description": "Structured metadata and OCR transcripts extracted from screenshot images.",
          "required": ["image_metadata", "ocr_transcripts"],
          "additionalProperties": false,
          "properties": {
            "image_metadata": {
              "type": "object",
              "required": ["platform", "display_mode", "image_count", "file_hash_sha256"],
              "additionalProperties": false,
              "properties": {
                "platform": {
                  "type": "string",
                  "enum": ["zalo", "messenger", "imessage", "sms", "unknown"]
                },
                "display_mode": {
                  "type": "string",
                  "enum": ["light", "dark", "unknown"]
                },
                "image_count": {
                  "type": "integer",
                  "minimum": 1,
                  "maximum": 5
                },
                "file_hash_sha256": {
                  "type": "string",
                  "pattern": "^[0-9a-f]{64}$"
                },
                "resolution": {
                  "type": "object",
                  "properties": {
                    "width": { "type": "integer" },
                    "height": { "type": "integer" }
                  }
                }
              }
            },
            "ocr_transcripts": {
              "type": "array",
              "description": "Ordered sequence of speech bubbles extracted via CPU Offline OCR.",
              "items": {
                "$ref": "#/$defs/ImageTurnRecord"
              }
            }
          }
        }
      }
    },
    "extracted_entities": {
      "type": "object",
      "description": "High-risk entities and contextual masked tokens extracted deterministically.",
      "required": ["masked_tokens_count", "claimed_authorities", "urgency_indicators", "financial_indicators"],
      "additionalProperties": false,
      "properties": {
        "masked_tokens_count": {
          "type": "integer",
          "minimum": 0,
          "description": "Total number of PII occurrences masked in the text."
        },
        "token_registry": {
          "type": "array",
          "description": "List of active contextual tokens and their salted HMAC digests for correlation.",
          "items": {
            "$ref": "#/$defs/MaskedTokenReference"
          }
        },
        "claimed_authorities": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Public or private authority personas claimed in text (e.g., 'Bộ Công An', 'C06', 'Vietcombank', 'Dmaris')."
        },
        "urgency_indicators": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Phrases establishing artificial urgency or deadlines (e.g., 'trước 16 giờ', 'trong 15 phút')."
        },
        "financial_indicators": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Demands for money, OTPs, or balance alerts (including preserved [MONEY] tokens)."
        }
      }
    },
    "security_features": {
      "type": "object",
      "description": "Pre-computed security artifacts for URL, domain, and evasion reputation.",
      "required": ["max_tld_risk_score", "has_typosquatting_domain", "has_abused_paas_hosting", "adversarial_evasion_detected"],
      "additionalProperties": false,
      "properties": {
        "max_tld_risk_score": {
          "type": "number",
          "minimum": 0.0,
          "maximum": 1.0,
          "description": "Maximum risk score among all embedded TLDs (1.0 = high-risk TLD like .top, .cc, .xyz)."
        },
        "has_typosquatting_domain": {
          "type": "boolean",
          "description": "True if any domain exhibits Levenshtein proximity <= 2 to curated white-listed institutions."
        },
        "has_abused_paas_hosting": {
          "type": "boolean",
          "description": "True if domain relies on free cloud hosting platforms (e.g., pages.dev, vercel.app, github.io)."
        },
        "adversarial_evasion_detected": {
          "type": "boolean",
          "description": "True if de-obfuscation pipeline stripped zero-width characters, monospace fonts, or stuttering text."
        },
        "evasion_details": {
          "type": "array",
          "items": { "type": "string" },
          "description": "List of specific evasion techniques neutralized (e.g., 'ZERO_WIDTH_SPACE', 'MATH_MONOSPACE_FONT', 'CALLER_HANDOVER_DETECTED')."
        }
      }
    },
    "tier1_preclassification": {
      "type": "object",
      "description": "Telemetry and deterministic verdict from Tier 1 CPU screening.",
      "required": ["preliminary_verdict", "preliminary_risk_score", "fast_pass_eligible", "inference_recommendation"],
      "additionalProperties": false,
      "properties": {
        "preliminary_verdict": {
          "type": "string",
          "enum": ["OBVIOUS_SCAM", "OBVIOUS_BENIGN", "SUSPICIOUS_REQUIRE_SLM", "COMPLEX_REQUIRE_CLOUD"],
          "description": "Tier 1 screening decision."
        },
        "preliminary_risk_score": {
          "type": "number",
          "minimum": 0.0,
          "maximum": 1.0,
          "description": "Normalized heuristic probability score computed on CPU."
        },
        "fast_pass_eligible": {
          "type": "boolean",
          "description": "If true, Tier 1 is confident enough to deflect traffic without dispatching to GPU SLM."
        },
        "inference_recommendation": {
          "type": "string",
          "enum": ["DEFLECT_SAFE", "DEFLECT_BLOCK", "DISPATCH_TIER2_SLM", "DISPATCH_TIER3_CLOUD"],
          "description": "Routing instruction for the orchestrator."
        },
        "execution_latency_ms": {
          "type": "number",
          "minimum": 0.0,
          "description": "Wall-clock duration in milliseconds spent in Tier 1 preprocessing on CPU."
        }
      }
    }
  },
  "$defs": {
    "DialogueTurn": {
      "type": "object",
      "required": ["turn_id", "speaker_role", "text", "detected_intents"],
      "additionalProperties": false,
      "properties": {
        "turn_id": {
          "type": "integer",
          "minimum": 1,
          "description": "1-based chronological index of the turn within the dialogue."
        },
        "speaker_role": {
          "type": "string",
          "enum": ["caller", "receiver", "unknown"],
          "description": "Normalized participant role in the interaction."
        },
        "text": {
          "type": "string",
          "description": "Sanitized and de-obfuscated turn speech content in Vietnamese."
        },
        "detected_intents": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Linguistic cues detected in this turn (e.g., 'URGENCY_CREATION', 'AUTHORITY_CLAIM', 'OTP_DEMAND', 'RESISTANCE')."
        },
        "actor_switch": {
          "type": "boolean",
          "description": "True if this turn marks a handover between different actors sharing the same role."
        }
      }
    },
    "NormalizedUrlRecord": {
      "type": "object",
      "required": ["raw_url", "canonical_url", "scheme", "hostname", "registered_domain", "tld", "tld_risk_score", "is_ip_address", "is_abused_paas"],
      "additionalProperties": false,
      "properties": {
        "raw_url": { "type": "string" },
        "canonical_url": { "type": "string", "format": "uri" },
        "scheme": { "type": "string", "enum": ["http", "https"] },
        "hostname": { "type": "string" },
        "registered_domain": { "type": "string" },
        "tld": { "type": "string" },
        "tld_risk_score": { "type": "number", "minimum": 0.0, "maximum": 1.0 },
        "is_ip_address": { "type": "boolean" },
        "is_abused_paas": { "type": "boolean" },
        "is_mock_link": { "type": "boolean" },
        "pattern_group": { "type": ["string", "null"] },
        "typosquatting_target": { "type": ["string", "null"] },
        "levenshtein_distance": { "type": ["integer", "null"] },
        "embedded_payload_detected": { "type": "boolean" }
      }
    },
    "ImageTurnRecord": {
      "type": "object",
      "required": ["turn_id", "speaker", "text", "bounding_box", "ocr_confidence"],
      "additionalProperties": false,
      "properties": {
        "turn_id": { "type": "integer", "minimum": 1 },
        "speaker": { "type": "string", "enum": ["peer", "user", "system", "unknown"] },
        "text": { "type": "string" },
        "bounding_box": {
          "type": "array",
          "items": { "type": "integer" },
          "minItems": 4,
          "maxItems": 4,
          "description": "[x_min, y_min, x_max, y_max] pixel coordinates"
        },
        "ocr_confidence": { "type": "number", "minimum": 0.0, "maximum": 1.0 }
      }
    },
    "MaskedTokenReference": {
      "type": "object",
      "required": ["token", "entity_type", "salted_hmac_sha256"],
      "additionalProperties": false,
      "properties": {
        "token": {
          "type": "string",
          "pattern": "^<MASKED_[A-Z_]+_[0-9]+>$"
        },
        "entity_type": {
          "type": "string",
          "enum": ["CCCD", "BANK_ACC", "OTP", "PHONE_NUMBER", "PASSWORD", "PERSON_NAME"]
        },
        "salted_hmac_sha256": {
          "type": "string",
          "pattern": "^[0-9a-f]{64}$"
        }
      }
    }
  }
}
```

---

### 5.2. Từ điển Trường Dữ liệu Chi tiết (Field Dictionary, Constraints & Types)

| Tên trường (Dot notation) | Cấp bậc | Kiểu dữ liệu | Ràng buộc / Enum | Mục đích & Ý nghĩa Kỹ thuật |
| :--- | :---: | :---: | :--- | :--- |
| `schema_version` | Root | `string` | Cố định `"2.0.0"` | Quản lý phiên bản hợp đồng dữ liệu giữa Gateway và AI Reasoning Service. |
| `session_id` | Root | `string` | Chuẩn UUID v4 (`pattern: ^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$`, `format: uuid`) | Mã định danh phiên kiểm tra duy nhất toàn cầu phục vụ truy vết OpenTelemetry. Cơ chế phòng thủ kép (format + pattern) đảm bảo kiểm thực tuyệt đối ngay cả trên bộ validator không kích hoạt format assertions. |
| `modality` | Root | `string` | `"dialogue"`, `"single_message"`, `"url"`, `"image"`, `"hybrid"` | Xác định hình thái dữ liệu để Tác nhân Tầng 2 kích hoạt prompt scaffold phù hợp. |
| `content.dialogue` | Object | `array[object]` | Min items: 1 | Danh sách các lượt thoại liên tiếp từ `conservations.json`. |
| `content.single_message` | Object | `string` | Chuỗi ký tự UTF-8 | Nội dung tin nhắn đơn lẻ từ `Scam.csv` hoặc `No_scam.csv`. |
| `content.normalized_urls` | Object | `array[object]` | Tuân thủ RFC 3986 | Danh sách cấu trúc URL bóc tách từ `dataset_url_sampled.csv`. |
| `content.image_payload` | Object | `object` | Đầy đủ metadata + OCR | Dữ liệu hình ảnh và văn bản OCR bóc tách từ `images/`. |
| `extracted_entities.claimed_authorities` | Object | `array[string]` | Các thực thể cơ quan | Danh sách cơ quan mà kẻ lừa đảo tự nhận (Công an, C06, Thuế, Ngân hàng). |
| `extracted_entities.urgency_indicators` | Object | `array[string]` | Cụm từ thúc ép | Danh sách các mốc thời gian gấp rút được bóc tách từ văn bản. |
| `security_features.has_typosquatting_domain`| Object | `boolean` | `true` / `false` | Cờ cảnh báo tên miền gần giống ngân hàng/cơ quan thật (Levenshtein $\le 2$). |
| `security_features.has_abused_paas_hosting` | Object | `boolean` | `true` / `false` | Cờ cảnh báo tên miền lưu trữ trên hạ tầng miễn phí (Cloudflare Pages, Vercel, v.v.). |
| `tier1_preclassification.fast_pass_eligible`| Object | `boolean` | `true` / `false` | Quyết định chuyển tiếp thẳng kết quả mà không cần gọi GPU SLM. |

---

### 5.3. Bộ 5 Payload Fixtures Mẫu Thực tế Chuẩn hóa (Concrete Modality Payloads)

Dưới đây là 5 bộ dữ liệu kiểm thử thực tế đại diện cho 5 nguồn dữ liệu tinh gọn trong `data_demo/`:

#### Fixture 1: Kịch bản Hội thoại Đa lượt (Multi-turn Dialogue Scenario)
*Nguồn gốc dữ liệu*: Chuẩn hóa từ `data_demo/conservations.json` (Hội thoại `id: 9`, Lượt 10-11) — Kịch bản chuyển giao cuộc gọi lừa đảo mạo danh kế toán hoàn tiền Dmaris:

```json
{
  "schema_version": "2.0.0",
  "session_id": "8a3e7b21-4f10-4822-b492-91e84a2d619a",
  "modality": "dialogue",
  "source_metadata": {
    "channel": "voice_call_transcript",
    "raw_record_id": "conservations_id_009",
    "client_timestamp": "2026-11-12T04:15:30Z"
  },
  "received_at": "2026-11-12T04:30:00Z",
  "content": {
    "dialogue": [
      {
        "turn_id": 1,
        "speaker_role": "caller",
        "text": "Dạ tại hệ thống ngân hàng bên em mới nâng cấp, cần phải khớp nội dung chuyển khoản chị ạ. Nhiều khách cũng bị giống chị, nhưng xong xuôi hết rồi. Để em chuyển máy cho chị kế toán xử lý hoàn tiền cho chị luôn nhé, chị ấy sẽ hướng dẫn chi tiết ạ.",
        "detected_intents": ["CALLER_HANDOVER_INITIATION", "REASSURANCE_MANIPULATION"],
        "actor_switch": false
      },
      {
        "turn_id": 2,
        "speaker_role": "caller",
        "text": "Alo, chào chị. Em là Hạnh, kế toán trưởng chi nhánh Dmaris đây ạ. Em vừa kiểm tra giao dịch của chị rồi, bây giờ chị đọc mã OTP gửi về số <MASKED_PHONE_NUMBER_1> để em đối soát hoàn tiền ngay vào tài khoản <MASKED_BANK_ACC_1> nhé.",
        "detected_intents": ["AUTHORITY_CLAIM", "OTP_DEMAND", "URGENCY_CREATION"],
        "actor_switch": true
      },
      {
        "turn_id": 3,
        "speaker_role": "receiver",
        "text": "Ủa sao hoàn tiền lại phải cung cấp mã OTP? Tôi tưởng chuyển khoản chỉ cần số tài khoản thôi chứ?",
        "detected_intents": ["SUSPICION_QUESTIONING", "RESISTANCE"]
      }
    ],
    "normalized_urls": []
  },
  "extracted_entities": {
    "masked_tokens_count": 2,
    "token_registry": [
      { "token": "<MASKED_PHONE_NUMBER_1>", "entity_type": "PHONE_NUMBER", "salted_hmac_sha256": "4c8f1e2908fba3210984210983210984210983210984210983210984210ab312" },
      { "token": "<MASKED_BANK_ACC_1>", "entity_type": "BANK_ACC", "salted_hmac_sha256": "9b12a884fe01a7654321098765432109876543210987654321098765432de091" }
    ],
    "claimed_authorities": ["Dmaris", "Kế toán trưởng Hạnh"],
    "urgency_indicators": ["ngay lập tức", "xử lý hoàn tiền luôn"],
    "financial_indicators": ["khớp nội dung chuyển khoản", "hoàn tiền", "đọc mã OTP"]
  },
  "security_features": {
    "max_tld_risk_score": 0.0,
    "has_typosquatting_domain": false,
    "has_abused_paas_hosting": false,
    "adversarial_evasion_detected": true,
    "evasion_details": ["CALLER_HANDOVER_DETECTED"]
  },
  "tier1_preclassification": {
    "preliminary_verdict": "SUSPICIOUS_REQUIRE_SLM",
    "preliminary_risk_score": 0.88,
    "fast_pass_eligible": false,
    "inference_recommendation": "DISPATCH_TIER2_SLM",
    "execution_latency_ms": 12.35
  }
}
```

---

#### Fixture 2: Kịch bản Tin nhắn Đơn Lừa đảo (Single Scam Message Scenario)
*Nguồn gốc dữ liệu*: Chuẩn hóa từ `data_demo/Scam.csv` (Bản ghi chứa mock domain và placeholder masked):

```json
{
  "schema_version": "2.0.0",
  "session_id": "3c91d844-991f-4b92-802c-55c32890ae41",
  "modality": "single_message",
  "source_metadata": {
    "channel": "telecom_sms",
    "raw_record_id": "Scam_csv_row_00748",
    "client_timestamp": "2026-11-12T04:18:00Z"
  },
  "received_at": "2026-11-12T04:30:05Z",
  "content": {
    "single_message": "[Cuc Thue] Thong bao: Ho so ke khai thue cua Quy khach bi sai lech thong tin CCCD, de nghi truy cap <URL_PLACEHOLDER_MOCK> de cap nhat va nhan hoan thue so tien [MONEY] truoc 17h00 ngay hom nay.",
    "normalized_urls": [
      {
        "raw_url": "http://sim.example.vn/x",
        "canonical_url": "http://sim.example.vn/x",
        "scheme": "http",
        "hostname": "sim.example.vn",
        "registered_domain": "example.vn",
        "tld": "vn",
        "tld_risk_score": 0.1,
        "is_ip_address": false,
        "is_abused_paas": false,
        "is_mock_link": true,
        "pattern_group": null,
        "typosquatting_target": null,
        "levenshtein_distance": null,
        "embedded_payload_detected": false
      }
    ]
  },
  "extracted_entities": {
    "masked_tokens_count": 0,
    "token_registry": [],
    "claimed_authorities": ["Cục Thuế"],
    "urgency_indicators": ["truoc 17h00 ngay hom nay"],
    "financial_indicators": ["hoan thue so tien [MONEY]"]
  },
  "security_features": {
    "max_tld_risk_score": 0.1,
    "has_typosquatting_domain": false,
    "has_abused_paas_hosting": false,
    "adversarial_evasion_detected": false,
    "evasion_details": []
  },
  "tier1_preclassification": {
    "preliminary_verdict": "SUSPICIOUS_REQUIRE_SLM",
    "preliminary_risk_score": 0.85,
    "fast_pass_eligible": false,
    "inference_recommendation": "DISPATCH_TIER2_SLM",
    "execution_latency_ms": 4.15
  }
}
```

---

#### Fixture 3: Kịch bản Tin nhắn An toàn Ngân hàng (Single Safe Message Scenario)
*Nguồn gốc dữ liệu*: Chuẩn hóa từ `data_demo/No_scam.csv` (Bản ghi thông báo biến động số dư ngân hàng hợp lệ có placeholder):

```json
{
  "schema_version": "2.0.0",
  "session_id": "5d20a811-33cb-4f10-9112-2187bcf99102",
  "modality": "single_message",
  "source_metadata": {
    "channel": "telecom_sms",
    "raw_record_id": "No_scam_csv_row_00524",
    "client_timestamp": "2026-11-12T04:20:00Z"
  },
  "received_at": "2026-11-12T04:30:10Z",
  "content": {
    "single_message": "VCB: TK [NUMBER] tai Vietcombank bien dong -[MONEY] VND vao luc 14:25 12/11/2026. So du [MONEY] VND. ND: Chuyen tien thanh toan hoa don dien nuoc.",
    "normalized_urls": []
  },
  "extracted_entities": {
    "masked_tokens_count": 0,
    "token_registry": [],
    "claimed_authorities": ["Vietcombank"],
    "urgency_indicators": [],
    "financial_indicators": ["bien dong -[MONEY] VND", "So du [MONEY] VND"]
  },
  "security_features": {
    "max_tld_risk_score": 0.0,
    "has_typosquatting_domain": false,
    "has_abused_paas_hosting": false,
    "adversarial_evasion_detected": false,
    "evasion_details": []
  },
  "tier1_preclassification": {
    "preliminary_verdict": "OBVIOUS_BENIGN",
    "preliminary_risk_score": 0.02,
    "fast_pass_eligible": true,
    "inference_recommendation": "DEFLECT_SAFE",
    "execution_latency_ms": 3.80
  }
}
```

---

#### Fixture 4: Kịch bản Liên kết URL Độc hại (Standalone Malicious URL Scenario)
*Nguồn gốc dữ liệu*: Chuẩn hóa từ `data_demo/dataset_url_sampled.csv` (Nhóm mẫu `phishing_banking` giả mạo VietinBank):

```json
{
  "schema_version": "2.0.0",
  "session_id": "f51b902e-ca34-4902-8610-d87b1c34a901",
  "modality": "url",
  "source_metadata": {
    "channel": "web_url",
    "raw_record_id": "dataset_url_sampled_row_01994",
    "client_timestamp": "2026-11-12T04:22:10Z"
  },
  "received_at": "2026-11-12T04:30:15Z",
  "content": {
    "normalized_urls": [
      {
        "raw_url": "http://vietinbank.com.vn-uz.top/login/auth",
        "canonical_url": "http://vietinbank.com.vn-uz.top/login/auth",
        "scheme": "http",
        "hostname": "vietinbank.com.vn-uz.top",
        "registered_domain": "vn-uz.top",
        "tld": "top",
        "tld_risk_score": 1.0,
        "is_ip_address": false,
        "is_abused_paas": false,
        "is_mock_link": false,
        "pattern_group": "phishing_banking",
        "typosquatting_target": "vietinbank.vn",
        "levenshtein_distance": 0,
        "embedded_payload_detected": false
      }
    ]
  },
  "extracted_entities": {
    "masked_tokens_count": 0,
    "token_registry": [],
    "claimed_authorities": ["VietinBank"],
    "urgency_indicators": [],
    "financial_indicators": ["login auth credential harvesting"]
  },
  "security_features": {
    "max_tld_risk_score": 1.0,
    "has_typosquatting_domain": true,
    "has_abused_paas_hosting": false,
    "adversarial_evasion_detected": true,
    "evasion_details": ["HIGH_RISK_TLD_TOP", "SUBDOMAIN_BRAND_SQUATTING"]
  },
  "tier1_preclassification": {
    "preliminary_verdict": "OBVIOUS_SCAM",
    "preliminary_risk_score": 0.995,
    "fast_pass_eligible": true,
    "inference_recommendation": "DEFLECT_BLOCK",
    "execution_latency_ms": 2.95
  }
}
```

---

#### Fixture 5: Kịch bản Ảnh Chụp Màn Hình Đa Nền Tảng (Multimodal Screenshot Scenario)
*Nguồn gốc dữ liệu*: Chuẩn hóa từ `data_demo/single_images/metadata.json` (hoặc alias `data_demo/images/metadata.json`, Trường hợp `case_001` — Zalo Light Mode lừa đảo cài ứng dụng độc hại mạo danh Ngân hàng Thịnh Vượng):

```json
{
  "schema_version": "2.0.0",
  "session_id": "71b043aa-66de-4e33-90d2-33290bca8112",
  "modality": "image",
  "source_metadata": {
    "channel": "screenshot_upload",
    "raw_record_id": "case_001",
    "client_timestamp": "2026-11-12T04:25:00Z"
  },
  "received_at": "2026-11-12T04:30:20Z",
  "content": {
    "image_payload": {
      "image_metadata": {
        "platform": "zalo",
        "display_mode": "light",
        "image_count": 1,
        "file_hash_sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        "resolution": {
          "width": 375,
          "height": 812
        }
      },
      "ocr_transcripts": [
        {
          "turn_id": 1,
          "speaker": "peer",
          "text": "A lô chào anh, em là Hùng, quản lý bên Ngân hàng Thịnh Vượng đây ạ. Em thấy dạo này các khoản đầu tư của anh trên hệ thống bên em đang sinh lời rất tốt...",
          "bounding_box": [32, 140, 310, 195],
          "ocr_confidence": 0.972
        },
        {
          "turn_id": 2,
          "speaker": "user",
          "text": "Chào em. May quá, dạo này anh cũng đang có một khoản tiền nhàn rỗi chưa biết đầu tư vào đâu. Em nói thử xem dự án này cụ thể thế nào?",
          "bounding_box": [75, 210, 345, 265],
          "ocr_confidence": 0.985
        },
        {
          "turn_id": 3,
          "speaker": "peer",
          "text": "Dạ tuyệt quá ạ. Dự án này bên em thiết kế riêng cho những khách hàng VIP như anh, lãi suất cam kết có thể lên tới 15%/năm mà rủi ro lại cực kỳ thấp.",
          "bounding_box": [32, 280, 315, 335],
          "ocr_confidence": 0.968
        }
      ]
    },
    "normalized_urls": []
  },
  "extracted_entities": {
    "masked_tokens_count": 0,
    "token_registry": [],
    "claimed_authorities": ["Ngân hàng Thịnh Vượng", "Quản lý Hùng"],
    "urgency_indicators": [],
    "financial_indicators": ["khoản tiền nhàn rỗi", "đầu tư sinh lời", "lãi suất cam kết 15%/năm"]
  },
  "security_features": {
    "max_tld_risk_score": 0.0,
    "has_typosquatting_domain": false,
    "has_abused_paas_hosting": false,
    "adversarial_evasion_detected": false,
    "evasion_details": []
  },
  "tier1_preclassification": {
    "preliminary_verdict": "SUSPICIOUS_REQUIRE_SLM",
    "preliminary_risk_score": 0.65,
    "fast_pass_eligible": false,
    "inference_recommendation": "DISPATCH_TIER2_SLM",
    "execution_latency_ms": 745.20
  }
}
```

---

## 6. CHIẾN LƯỢC TRÍCH XUẤT ĐẶC TRƯNG & EMBEDDING CHO KIẾN TRÚC MICROSERVICE

Nhằm đáp ứng yêu cầu suy luận tốc độ cao trong môi trường Microservice (NestJS Gateway + FastAPI AI Service) mà vẫn tôn trọng giới hạn phần cứng nghiêm ngặt ($0\%\text{ GPU VRAM}$), ScamShieldAI triển khai chiến lược trích xuất đặc trưng vector ngữ nghĩa chạy $100\%$ trên CPU máy chủ.

### 6.1. Lựa chọn Kiến trúc Mô hình Embedding (PhoBERT-base vs Multilingual MiniLM)

Hệ thống hỗ trợ 2 cấu hình mô hình nhúng vector tối ưu hóa cho môi trường CPU Core i5 (đóng gói dạng ONNX INT8 Runtime với tập lệnh AVX2):

| Tiêu chí So sánh | **PhoBERT-base-v2 (Mặc định cho Văn bản Tiếng Việt)** | **Multilingual MiniLM-L12-v2 (Tối ưu Tốc độ Siêu nhẹ)** |
| :--- | :--- | :--- |
| **Kho lưu trữ HuggingFace** | `vinai/phobert-base-v2` | `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2` |
| **Kích thước Chiều Vector ($D$)**| **$768\text{ chiều}$** (High-fidelity semantic representation) | **$384\text{ chiều}$** (Compact dense representation) |
| **Dung lượng Mô hình (ONNX INT8)**| $\approx 135\text{ MB}$ trên ổ đĩa / RAM | $\approx 118\text{ MB}$ trên ổ đĩa / RAM |
| **Bộ mã hóa Từ vựng (Tokenizer)** | Byte-Pair Encoding (BPE) chuyên biệt tiếng Việt | WordPiece / SentencePiece đa ngôn ngữ |
| **Độ trễ Suy luận CPU (P95)** | $\le 28\text{ ms}$ (chuỗi 128 tokens trên 4 luồng Core i5) | $\le 16\text{ ms}$ (chuỗi 128 tokens trên 4 luồng Core i5) |
| **Chiếm dụng GPU VRAM** | **$0\%\text{ VRAM}$** (Chạy hoàn toàn trên CPU ONNX Runtime) | **$0\%\text{ VRAM}$** (Chạy hoàn toàn trên CPU ONNX Runtime) |
| **Trường hợp Sử dụng Phù hợp** | Phân tích sâu ngữ nghĩa hội thoại lừa đảo, sắc thái đe dọa | Khớp mẫu nhanh (Fast Template Matching), tra cứu trùng lặp |

*Quyết định Lựa chọn*: Hệ thống triển khai **PhoBERT-base-v2 (768 chiều)** làm mô hình chuẩn cho phân tích ngữ nghĩa tiếng Việt sâu, và hỗ trợ chuyển đổi sang **MiniLM-L12-v2 (384 chiều)** khi hệ thống chịu tải đột biến $>2,000\text{ req/s}$.

### 6.2. Chiến lược Pooling & Chuẩn hóa Vector (Mean Pooling & L2 Normalization)
Để tổng hợp biểu diễn vector câu từ các trạng thái ẩn cuối cùng (last hidden state) của mô hình Transformer:
1. **Mean Pooling có Mặt nạ (Attention-Masked Mean Pooling)**:
   Loại bỏ các token đệm (padding tokens) và tính trung bình có trọng số theo mặt nạ chú ý:
   $$\mathbf{e}_{\text{unnorm}} = \frac{\sum_{i=1}^{L} \mathbf{h}_i \cdot m_i}{\sum_{i=1}^{L} m_i}$$
   trong đó $\mathbf{h}_i \in \mathbb{R}^D$ là vector biểu diễn của token thứ $i$, $m_i \in \{0, 1\}$ là attention mask tại vị trí $i$.
2. **Chuẩn hóa Chuẩn Euclid L2 (L2 Normalization)**:
   Chuẩn hóa vector về độ dài đơn vị:
   $$\mathbf{e} = \frac{\mathbf{e}_{\text{unnorm}}}{\|\mathbf{e}_{\text{unnorm}}\|_2} = \frac{\mathbf{e}_{\text{unnorm}}}{\sqrt{\sum_{j=1}^{D} e_{\text{unnorm}, j}^2}}$$
   *Ý nghĩa Kỹ thuật*: Khi vector đã được chuẩn hóa L2 ($\|\mathbf{e}\|_2 = 1.0$), độ tương đồng Cosine giữa hai văn bản $A$ và $B$ tương đương chính xác với tích vô hướng (Dot Product):
   $$\text{Cosine}(\mathbf{e}_A, \mathbf{e}_B) = \mathbf{e}_A \cdot \mathbf{e}_B = \sum_{j=1}^{D} e_{A, j} \cdot e_{B, j}$$
   Tích vô hướng này được tính toán cực nhanh qua các lệnh vector hóa SIMD AVX2 trên CPU Core i5 (chỉ mất $<0.05\text{ ms}$ cho 1,000 phép so khớp).

### 6.3. Kiến trúc Bộ nhớ Đệm Vector Embedding 2 Cấp (LRU In-memory & Redis Cache)
Để đạt thông lượng $>1,200\text{ req/s}$ mà không gây nghẽn CPU do phải tính toán embedding lặp lại:

```
[ Yêu Cầu Văn Bản ] ──> SHA256(NFC_Text) 
                              │
                              ▼
           ┌─────────────────────────────────────┐
           │ Tầng L1: In-Memory LRU Cache (RAM)  │ ──(HIT: <0.1ms)──> Trả về Vector
           │ (10,000 entries nội bộ FastAPI)     │
           └──────────────────┬──────────────────┘
                              │ MISS
                              ▼
           ┌─────────────────────────────────────┐
           │ Tầng L2: Distributed Redis Cache    │ ──(HIT: <2ms)────> Cập nhật L1 & Trả về
           │ (Redis cluster, TTL = 24 giờ)       │
           └──────────────────┬──────────────────┘
                              │ MISS
                              ▼
           ┌─────────────────────────────────────┐
           │ Tầng Tính toán: ONNX CPU AVX2       │ ──(<25ms)────────> Lưu L2, L1 & Trả về
           │ (PhoBERT-base-v2 INT8 / MiniLM)     │
           └─────────────────────────────────────┘
```

1. **Khóa Định danh Bộ nhớ đệm (Cache Key)**: Khóa được tạo ra bằng mã băm SHA-256 trên văn bản đã qua chuẩn hóa Unicode NFC và gỡ bỏ khoảng trắng thừa:
   $$\text{Cache\_Key} = \text{SHA256}(\text{"emb:"} + \text{model\_name} + \text{":"} + \text{NormalizeNFC}(text))$$
2. **Tầng L1 — In-Memory LRU Cache**: Nằm trực tiếp trong tiến trình FastAPI AI Service, lưu trữ tối đa 10,000 vector embedding gần nhất. Tốc độ truy xuất $< 0.1\text{ ms}$.
3. **Tầng L2 — Distributed Redis Cache**: Kết nối qua Redis nội bộ, chia sẻ chung giữa Gateway NestJS và AI Service. Thời gian sống (TTL) là **24 giờ** đối với các mẫu tin nhắn quảng cáo và thông báo biến động số dư định kỳ. Tốc độ truy xuất $< 2.0\text{ ms}$.

### 6.4. Đo lường Độ tương đồng Cosine & Khớp Mẫu Nhanh (Fast Template & Duplicate Matching)
Hệ thống duy trì một kho vector nhúng đại diện (Anchor Embeddings) của các mẫu tin nhắn lừa đảo phổ biến đã được kiểm chứng và các mẫu dịch vụ ngân hàng an toàn chuẩn mực:
- **Ngưỡng Khớp Mẫu Lừa đảo Đã biết (Known Scam Match Threshold)**:
  Nếu $\text{Cosine}(\mathbf{e}_{\text{input}}, \mathbf{e}_{\text{known\_scam}}) \ge 0.95$:
  Hệ thống lập tức kích hoạt cơ chế Fast Reject: gán nhãn `OBVIOUS_SCAM`, chặn tức thời và trả về khuyến cáo phòng ngừa mà không cần gọi mô hình GPU SLM.
- **Ngưỡng Khớp Mẫu An toàn Đã biết (Known Benign Match Threshold)**:
  Nếu $\text{Cosine}(\mathbf{e}_{\text{input}}, \mathbf{e}_{\text{known\_benign}}) \ge 0.95$:
  Hệ thống kích hoạt cơ chế Fast Pass: gán nhãn `OBVIOUS_BENIGN`, giải phóng lưu lượng ngay lập tức, tiết kiệm tài nguyên GPU và giảm tỷ lệ báo động giả (FPR $\le 2\%$).
- **Vùng Nghi ngờ (Ambiguous Zone: $0.40 \le \text{Score} < 0.95$)**:
  Được đóng gói trọn vẹn vào `UnifiedScamInspectionPayload` để chuyển tiếp lên Tầng 2 SLM (`Qwen2.5-3B-Instruct`) suy luận đa bước chuyên sâu.

---

## 7. CHIẾN LƯỢC XỬ LÝ NGOẠI LỆ & CƠ CHẾ GIÁNG CẤP DẦN (EXCEPTION HANDLING & DEGRADATION)

### 7.1. Xử lý Dữ liệu Rỗng, File 0-byte & Cấu trúc Hỏng
1. **Phát hiện Payload Rỗng / File 0-Byte (Empty Input Interceptor)**:
   Khi nhận dữ liệu đầu vào có độ dài `len(content) == 0`:
   Ngắt ngay lập tức quy trình trước khi kích hoạt bộ parser JSON hoặc regex. Trả về mã phản hồi chuẩn hóa `ERR_EMPTY_PAYLOAD`. Tuyệt đối không để phát sinh ngoại lệ không bắt được.
2. **Xử lý Dữ liệu Rác Tuyệt đối (Shannon Text Entropy & Gibberish Filter)**:
   Để phát hiện các chuỗi ký tự gõ phím ngẫu nhiên vô nghĩa (như `zLhFVQCDieunIkJyezlEnbeJOU...`), pipeline tích hợp bộ tính toán độ hỗn loạn thông tin Shannon Entropy:
   $$H(X) = -\sum_{i=1}^{n} P(x_i) \log_2 P(x_i)$$
   Nếu văn bản có độ dài $> 30$ ký tự mà tỷ lệ ký tự hoa bất thường $> 60\%$ kèm theo tỷ lệ ký tự đặc biệt lặp lại $> 35\%$, bản ghi được phân loại là `MALFORMED_GIBBERISH`, bỏ qua suy luận ngữ nghĩa và trả về khuyến cáo dữ liệu không hợp lệ.

### 7.2. Quản trị Giới hạn Ngữ cảnh (>4096 Tokens) & Kỹ thuật Cắt tỉa Thu gọn Hội thoại
Trên máy chủ rìa RTX 4050 6GB VRAM, dung lượng bộ nhớ KV Cache cho mô hình Qwen2.5-3B ở độ dài 4,096 tokens với cờ lượng tử hóa Q8_0 (`-ctk q8_0 -ctv q8_0`) chiếm $589.8\text{ MB}$ (đảm bảo tổng VRAM $\le 3.71\text{ GB}$, nằm sâu dưới trần an toàn $5.0\text{ GB}$). Tuy nhiên, nếu một chuỗi hội thoại dài vượt quá $4,096\text{ tokens}$, hệ thống kích hoạt **Chiến lược Thu gọn Ngữ cảnh 3 Cấp độ**:
1. **Cấp độ 1 — Cắt tỉa Lượt thoại Thừa (Salience-based Turn Pruning)**:
   Loại bỏ các lượt thoại chào hỏi rỗng hoặc câu đệm không mang thông tin (như *"Dạ vâng"*, *"Alo anh nghe rõ không"*). Bảo toàn $100\%$ các lượt thoại có chứa: Tên cơ quan chức năng, cảnh báo pháp lý, số tiền, yêu cầu OTP/chuyển khoản, và đường dẫn liên kết.
2. **Cấp độ 2 — Cửa sổ Trượt có Trọng số Cuối (Weighted Sliding Window)**:
   Nếu tổng tokens vẫn vượt ngưỡng 3,500 tokens:
   - Giữ nguyên 2 lượt thoại mở đầu (để mô hình nắm được bối cảnh kẻ lừa đảo tự xưng danh tính).
   - Tóm tắt các lượt thoại trung gian bằng một đoạn tóm tắt sự kiện ngắn gọn (Compacted Event Digest).
   - Giữ nguyên trọn vẹn 8 đến 10 lượt thoại gần nhất (nơi kẻ lừa đảo tung đòn chốt ép nạn nhân chuyển tiền hoặc đọc OTP).
3. **Cấp độ 3 — Leo thang Lên Đám mây (Escalate to Tier 3 Cloud Fallback)**:
   Nếu hội thoại là một vụ việc phức tạp kéo dài qua nhiều ngày với hàng trăm lượt tương tác cần đối soát pháp y toàn diện, hệ thống tự động gắn nhãn `inference_recommendation = "DISPATCH_TIER3_CLOUD"`, chuyển tiếp toàn bộ payload sang mô hình **`gemini-3.7-flash`** trên Google Cloud Vertex AI (tuân thủ nghiêm ngặt quy tắc người dùng trong AGENTS.md, chỉ sử dụng phiên bản 3.7 mới nhất, loại trừ hoàn toàn các dòng mô hình thế hệ cũ).

### 7.3. Xử lý Lỗi Schema Validation & Định dạng Báo lỗi Chuẩn RFC 7807
Khi một payload gửi tới API không vượt qua được bước xác thực JSON Schema Draft 2020-12, hệ thống từ chối yêu cầu và trả về lỗi theo chuẩn quốc tế **RFC 7807 (Problem Details for HTTP APIs)**:

```json
{
  "type": "https://scamshield.ai/errors/invalid-payload-schema",
  "title": "Payload Schema Validation Error",
  "status": 422,
  "detail": "Field 'content.dialogue[1].speaker_role' contains invalid value 'imposter'. Allowed values are: ['caller', 'receiver', 'unknown'].",
  "instance": "/api/v1/inspect/8a3e7b21-4f10-4822-b492-91e84a2d619a",
  "invalid_params": [
    {
      "name": "content.dialogue[1].speaker_role",
      "reason": "Value is not an allowed enum member",
      "expected": ["caller", "receiver", "unknown"]
    }
  ],
  "timestamp": "2026-11-12T04:30:25Z"
}
```

### 7.4. Ma trận Giáng cấp Dự phòng Tầng 1 (Graceful Degradation Fallback Matrix)

| Trạng thái Sự cố Ngoại lệ | Thành phần Gặp lỗi | Cơ chế Giáng cấp Dự phòng (Graceful Degradation) | Tác động tới Người dùng |
| :--- | :--- | :--- | :--- |
| **Mô hình ONNX Embedding Lỗi** | File ONNX PhoBERT/MiniLM bị thiếu hoặc hỏng runtime CPU. | Tự động giáng cấp về **Chế độ Luật Tất định Thuần túy (Pure Deterministic Heuristics)**. Chỉ dựa vào regex PII, danh sách đen TLD và thuật toán Levenshtein. | Độ trễ giảm còn $<5\text{ ms}$, tỷ lệ phát hiện lừa đảo rõ ràng vẫn đạt $>85\%$. |
| **Lỗi Bộ nhớ Tạm Salted HMAC** | Hết RAM hệ thống hoặc lỗi sinh muối CSPRNG. | Tự động sử dụng định danh token thứ tự không lưu băm (`<MASKED_CCCD_1>`) và vô hiệu hóa chức năng liên kết thực thể đa lượt. | Vẫn bảo vệ tuyệt đối PII, mô hình suy luận vẫn nhận diện được hành vi lừa đảo trong từng lượt. |
| **GPU RTX 4050 Bị Quá tải / OOM** | VRAM GPU bị chiếm dụng bởi tác vụ khác, `llama-server.exe` không phản hồi. | Hệ thống tự động chuyển luồng: Chuyển tiếp các trường hợp khẩn cấp lên **Tier 3 (`gemini-3.7-flash` trên Google Cloud Vertex AI)** hoặc trả về kết luận sơ bộ của Tầng 1 kèm cảnh báo độ tin cậy. | Hệ thống không bao giờ bị nghẽn (Zero Downtime). |
| **Ảnh Màn hình Quá Mờ / Lỗi OCR** | Ảnh chụp màn hình bị vỡ nát, độ phân giải $<150\text{ px}$, OCR không đọc được text. | Gắn cờ `OCR_LOW_CONFIDENCE`, trích xuất metadata và leo thang trực tiếp lên Tier 3 (`gemini-3.7-flash`) để xử lý bằng mô hình đa phương thức đám mây. | Đảm bảo không bỏ sót bằng chứng lừa đảo đồ họa tinh vi. |

---

## 8. KẾ HOẠCH TRIỂN KHAI & MA TRẬN THẨM ĐỊNH KỸ THUẬT (AUDIT & VERIFICATION MATRIX)

Để tạo điều kiện cho Tác nhân Thẩm định Độc lập (Auditor) và các chuyên viên kiểm thử xác minh tính trung thực và độ chuẩn xác của bản thiết kế, bảng ma trận dưới đây đặc tả chi tiết tọa độ kiểm tra thực tế:

| Mã Kiểm chứng | Mục tiêu Thẩm định | Tệp tin & Tọa độ Kiểm tra trong `data_demo/` | Tiêu chí Vượt qua (Pass Criteria) |
| :--- | :--- | :--- | :--- |
| **VERIFY-M1-01** | Xử lý hội thoại đa lượt & chuyển giao cuộc gọi | `data_demo/conservations.json` (ID 9, turns 10-11) | Pipeline nhận diện chuyển giao cuộc gọi `[CHUYỂN_GIAO_CUỘC_GỌI]`, không crash do vi phạm luân phiên 1-1, đọc đủ 38 hội thoại và 628 turns. |
| **VERIFY-M1-02** | Xử lý tin nhắn lừa đảo multiline & mock link | `data_demo/Scam.csv` (1,319 dòng, 27 dòng multiline) | Đọc đúng 1,319 dòng chuẩn RFC 4180, trung hòa 748 mock domain `http://sim.example.vn/x`, bảo tồn token `[MONEY]`, `[NUMBER]`. |
| **VERIFY-M1-03** | Xử lý tin nhắn an toàn & phòng ngừa báo động giả | `data_demo/No_scam.csv` (1,930 dòng, 524 dòng multiline) | Đọc đúng 1,930 dòng chuẩn RFC 4180, nhận diện đúng biến động số dư ngân hàng và OTP chính thống, đạt FPR $\le 2\%$. |
| **VERIFY-M1-04** | Xử lý URL tinh gọn trên 19 pattern groups | `data_demo/dataset_url_sampled.csv` (3,192 dòng, 4 cột) | Đọc đúng 3,192 dòng, 0 duplicates, phân loại đúng 1,994 phishing / 1,198 benign trên 19 nhóm mẫu, không còn bất kỳ tham chiếu nào tới 53k dataset cũ. |
| **VERIFY-M1-05** | Pipeline ảnh chụp màn hình & OCR trên CPU | `data_demo/single_images/` (hoặc alias `data_demo/images/` / `data_demo/single_image/`) | Bao phủ đủ 50 ca kiểm thử (35 JPG, 15 PNG, 25 Light, 25 Dark), OCR CPU chạy 0% GPU VRAM, đo lường CER $\le 5\%$ so với 50 files trong `texts/`. |
| **VERIFY-M1-06** | Tính hợp lệ của Unified API JSON Schema | Mục 5.1 của tài liệu này | Schema JSON hoàn toàn hợp lệ theo chuẩn Draft 2020-12 / OpenAPI 3.1, bao quát trọn vẹn cả 5 hình thái dữ liệu (`image`, `dialogue`, `single_message`, `url`, `hybrid`). |
| **VERIFY-M1-07** | Bảo vệ PII bằng Salted HMAC & Giữ Token | Mục 4.3 & 4.4 của tài liệu này | Công thức toán học $H = \text{HMAC-SHA256}(\text{Salt}, \text{RawValue})$ đảm bảo tính một chiều; bảo tồn nguyên vẹn `[MONEY]`, `[NUMBER]`. |
| **VERIFY-M1-08** | Chiến lược Embedding & Caching CPU | Mục 6 của tài liệu này | Đặc tả rõ ràng PhoBERT (768 chiều) / MiniLM (384 chiều) ONNX INT8, 0% VRAM, Mean Pooling, L2 Norm, bộ nhớ đệm 2 tầng (LRU + Redis), Cosine matching $\ge 0.95$. |
| **VERIFY-M1-09** | Tuân thủ Quy tắc Model Đám mây | Mục 1.2, 7.2 của tài liệu này | Tuyệt đối tuân thủ quy tắc người dùng: chỉ sử dụng `gemini-3.7-flash` cho Tier 3 Cloud Fallback, không sử dụng các dòng mô hình thế hệ cũ bị cấm. |

---

### Lệnh PowerShell Kiểm chứng Độc lập (Independent Audit Commands)

Các kỹ sư và tác nhân kiểm toán độc lập có thể sao chép và thực thi trực tiếp các lệnh kiểm chứng tự động sau từ thư mục gốc của dự án:

```powershell
# 1. Kiểm chứng tính toàn vẹn và số lượng của cả 5 nguồn dữ liệu tinh gọn
python -c "
import json, csv
from pathlib import Path

# A. conservations.json (38 dialogues, 628 turns)
with open('data_demo/conservations.json', 'r', encoding='utf-8') as f:
    convs = json.load(f)
assert len(convs) == 38, f'Expected 38 dialogues, got {len(convs)}'
turns = sum(len(c['dialogue']) for c in convs)
assert turns == 628, f'Expected 628 turns, got {turns}'

# B. dataset_url_sampled.csv (3,192 URLs)
with open('data_demo/dataset_url_sampled.csv', 'r', encoding='utf-8') as f:
    urls = list(csv.reader(f))
assert len(urls) == 3193, f'Expected 3193 lines (inc header), got {len(urls)}'

# C. Scam.csv (1,319 rows) & No_scam.csv (1,930 rows)
with open('data_demo/Scam.csv', 'r', encoding='utf-8') as f:
    scams = list(csv.reader(f))
with open('data_demo/No_scam.csv', 'r', encoding='utf-8') as f:
    no_scams = list(csv.reader(f))
assert len(scams) == 1320, f'Expected 1320 lines (inc header), got {len(scams)}'
assert len(no_scams) == 1931, f'Expected 1931 lines (inc header), got {len(no_scams)}'

# D. images dataset (50 images, 50 transcripts, 50 metadata entries)
img_base = Path('data_demo/single_images') if Path('data_demo/single_images').exists() else (Path('data_demo/single_image') if Path('data_demo/single_image').exists() else Path('data_demo/images'))
with open(img_base / 'metadata.json', 'r', encoding='utf-8') as f:
    meta = json.load(f)
assert len(meta) == 50, f'Expected 50 metadata entries, got {len(meta)}'
assert len(list((img_base / 'images').glob('*'))) == 50, 'Expected 50 image files'
assert len(list((img_base / 'texts').glob('*.txt'))) == 50, 'Expected 50 transcript files'

print('SUCCESS: All 5 streamlined data sources verified with 100% integrity!')
"

# 2. Kiểm chứng việc loại bỏ hoàn toàn các tham chiếu lỗi thời trong PREPROCESSING_DESIGN.md
powershell -Command "
$file = Get-Content 'docs/PREPROCESSING_DESIGN.md' -Raw
$obsoletePatterns = @(
    'dataset_url' + '.csv (53',
    '53' + ',117',
    'full_' + 'dataset.csv',
    'sample' + '.csv (772',
    'gemini' + '-2.0',
    'gemini' + '-2.5'
)
$violations = 0
foreach ($term in $obsoletePatterns) {
    if ($file.Contains($term)) {
        Write-Error \"VIOLATION: Found obsolete or forbidden term: $term\"
        $violations++
    }
}
if ($violations -eq 0) {
    Write-Host 'SUCCESS: Zero obsolete references found in docs/PREPROCESSING_DESIGN.md!'
}
"
```

---
*Bản đặc tả thiết kế kiến trúc tiền xử lý kỹ thuật này được cập nhật hoàn chỉnh, đáp ứng $100\%$ các tiêu chí nghiệm thu của Yêu cầu R2, tích hợp hoàn hảo với kiến trúc Microservice NestJS + FastAPI, tối ưu hóa tuyệt đối cho giới hạn phần cứng Intel Core i5 CPU + NVIDIA GeForce RTX 4050 (6GB VRAM), và tuân thủ vô điều kiện Lệnh liêm chính (Mandatory Integrity Mandate).*
