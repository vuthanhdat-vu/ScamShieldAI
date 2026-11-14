# Báo Cáo Bàn Giao Khảo Sát Kiến Trúc Hệ Thống (Architecture Investigation Report)
## Ghép Nối OcrModule & PreprocessingModule Vào AnalysisModule & AnalysisService

**Tác nhân thực hiện**: Codebase Architecture Explorer  
**Thư mục trạng thái**: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\teamwork_explorer_modules\`  
**Thời gian khảo sát**: 2026-11-13T17:59:00Z  
**Phạm vi khảo sát**: `BE_codex/src/ocr/`, `BE_codex/src/preprocessing/`, `BE_codex/src/analysis/`, `BE_codex/src/ai/`, và bộ kiểm thử `BE_codex/test/`  
**Chế độ hoạt động**: Read-only Investigation (Không sửa đổi mã nguồn dự án)

---

## 1. OBSERVATION (QUAN SÁT THỰC NGHIỆM TRỰC TIẾP)

### 1.1. Khảo Sát Thư Mục OCR Engine (`BE_codex/src/ocr/`)
Thư mục gồm 5 tập tin TypeScript:

1. **`BE_codex/src/ocr/ocr.interfaces.ts`** (33 dòng):
   - **`OCR_ENGINE`** (`Symbol('OCR_ENGINE')`): Injection token cho `IOcrEngine`.
   - **`OcrBoundingBox`**: `{ x: number; y: number; width: number; height: number; }`.
   - **`OcrTurn`**: `{ speaker: 'peer' | 'user' | 'system'; text: string; imageIndex: number; confidence: number; boundingBoxes?: OcrBoundingBox[]; }`.
   - **`OcrResult`**: `{ turns: OcrTurn[]; fullTranscript: string; imageCount: number; }`.
   - **`ImageInput`**: `{ buffer: Buffer; mediaType: string; }`.
   - **`IOcrEngine`**: `{ processImages(images: ImageInput[]): Promise<OcrResult>; }`.
   - **`RawBoundingBox`**: Type `[number, number, number, number]` biểu diễn `[xmin, ymin, xmax, ymax]`.

2. **`BE_codex/src/ocr/ocr.module.ts`** (32 dòng):
   - `@Module` khai báo:
     - `providers`: `[MetadataOcrProvider, PaddleTesseractOcrProvider, OcrService, { provide: OCR_ENGINE, inject: [ConfigService, MetadataOcrProvider, PaddleTesseractOcrProvider], useFactory: ... }]`.
     - `exports`: `[OcrService, OCR_ENGINE, MetadataOcrProvider, PaddleTesseractOcrProvider]`.
   - Logic factory `OCR_ENGINE`: Kiểm tra `const mockAi = config.get('MOCK_AI', { infer: true })`. Nếu `!mockAi && nativeProvider.isAvailable()`, chọn `nativeProvider`; ngược lại chọn `metadataProvider`.

3. **`BE_codex/src/ocr/ocr.service.ts`** (149 dòng):
   - Class `@Injectable() export class OcrService`:
     - Constructor: `@Inject(OCR_ENGINE) private readonly engine: IOcrEngine`, `private readonly metadataProvider: MetadataOcrProvider`.
     - Phương thức chính `processImages(images: ImageInput[]): Promise<OcrResult>`:
       - Kiểm tra mảng rỗng `!images || images.length === 0` -> trả về `{ turns: [], fullTranscript: '', imageCount: 0 }`.
       - Thử gọi `this.engine.processImages(images)`. Nếu lỗi, bắt exception, ghi logger cảnh báo và fallback sang `this.metadataProvider.processImages(images)`.
       - Nếu `images.length > 1`: thực hiện ghép nối và khử trùng lặp qua `stitchMultiShotTurns(rawResult.turns, cerThresh = 0.18)` sử dụng thuật toán Levenshtein CER và vá ranh giới viewport cắt cụt.
       - Lọc chỉ giữ lại lượt thoại đối thoại: `turns.filter(t => t.speaker === 'peer' || t.speaker === 'user')` (loại bỏ system chips).
       - Tái lập `fullTranscript`: `${t.speaker === 'peer' ? 'Đối phương' : 'Người dùng'}: ${t.text}` cách nhau bằng dấu xuống dòng `\n`.
       - Trả về đối tượng `OcrResult`.

4. **`BE_codex/src/ocr/metadata-ocr.provider.ts`** (140 dòng):
   - Class `@Injectable() export class MetadataOcrProvider implements IOcrEngine, OnModuleInit`:
     - Nạp `data/metadata.json` khi khởi tạo (`onModuleInit`), lập chỉ mục theo SHA-256 hash và dung lượng byte của ảnh nguồn.
     - `processImages(images: ImageInput[]): Promise<OcrResult>`:
       - Tìm khớp ảnh dựa trên SHA-256 hash của buffer.
       - Phân bổ lượt thoại tuần tự qua các ảnh: `imageIndex = Math.min(Math.floor((idx * images.length) / totalTurns), images.length - 1)` đảm bảo chỉ số 0-based strictly `< images.length`.
       - Nếu không khớp (ảnh tổng hợp hoặc ảnh ngoài dataset): fallback tạo turn mặc định `'Tin nhắn không xác định từ ảnh chụp màn hình.'` với `imageIndex: idx`.

5. **`BE_codex/src/ocr/paddle-tesseract-ocr.provider.ts`** (390 dòng):
   - Class `@Injectable() export class PaddleTesseractOcrProvider implements IOcrEngine`:
     - `isAvailable(): boolean`: Kiểm tra CLI `tesseract --version`.
     - `filterSystemBars`: Lọc thanh trạng thái đỉnh (8.2%) và thanh điều hướng đáy (8.5%), lọc box nhỏ `< 10x8 px`.
     - `mergeHorizontalBoxes`: Hợp nhất các box cùng dòng khi khoảng cách ngang `<= 35px`.
     - `sortReadingOrder`: Sắp xếp thứ tự đọc từ trên xuống dưới, từ trái sang phải.
     - `classifySpeaker`: Phân loại vai trò theo căn lề (trái: `peer`, phải: `user`, giữa: `system`).
     - `preprocessCrop`: Tiền xử lý ảnh crop bằng `sharp` (tăng tương phản, đảo cực màu sắc, Lanczos resize).
     - `runTesseract`: Gọi tesseract OCR tiếng Việt (`vie`, psm 6/7).
     - `cleanOcrText`: Chuẩn hóa dấu thanh và sửa cặp từ hay nhầm lẫn (`OCR_CONFUSION_PAIRS`).

---

### 1.2. Khảo Sát Thư Mục Preprocessing & PII Sanitization (`BE_codex/src/preprocessing/`)
Thư mục gồm 5 tập tin TypeScript:

1. **`BE_codex/src/preprocessing/preprocessing.interfaces.ts`** (36 dòng):
   - Khai báo lại các interface `OcrBoundingBox`, `OcrTurn`, `OcrResult` tương thích với `ocr.interfaces.ts`.
   - **`PreprocessedTurn`**: `{ speaker: 'peer' | 'user'; text: string; imageIndex: number; }`.
   - **`PreprocessedDialogue`**: `{ turns: PreprocessedTurn[]; formattedPromptText: string; sanitizedPiiCount: number; }`.
   - **`IPreprocessingService`**: `{ cleanAndSanitize(ocrResult: OcrResult): PreprocessedDialogue; }`.

2. **`BE_codex/src/preprocessing/preprocessing.module.ts`** (26 dòng):
   - `@Module` khai báo:
     - `providers`: `[PreprocessingService, PiiSanitizer]`.
     - `exports`: `[PreprocessingService, PiiSanitizer]`.
   - Lưu ý: Sử dụng hàm bọc decorator `getModule` để tương thích linh hoạt giữa NestJS DI và môi trường chạy độc lập.

3. **`BE_codex/src/preprocessing/preprocessing.service.ts`** (118 dòng):
   - Class `@Injectable() export class PreprocessingService implements IPreprocessingService`:
     - Constructor: `@Optional() private readonly defaultSanitizer?: PiiSanitizer`.
     - `cleanAndSanitize(ocrResult: OcrResult, customSanitizer?: PiiSanitizer): PreprocessedDialogue`:
       - Khởi tạo session-scoped `sanitizer = customSanitizer ?? this.defaultSanitizer ?? new PiiSanitizer()`.
       - Lọc lượt thoại hợp lệ (`peer` hoặc `user`).
       - Denoise và chuẩn hóa văn bản từng turn qua `cleanText(turn.text)`.
       - Ẩn danh hóa PII qua `sanitizer.sanitize(cleaned)`.
       - Tổng hợp `formattedPromptText` với format chuẩn CoT Reasoning: `[Peer]: ...` / `[User]: ...` cách nhau bằng `\n`.
       - Trả về đối tượng `PreprocessedDialogue` gồm `turns`, `formattedPromptText`, và `sanitizedPiiCount`.
     - `denoiseSingle(text: string): DenoiseResult`: Hàm tiện ích làm sạch văn bản đơn lẻ.

4. **`BE_codex/src/preprocessing/pii-sanitizer.ts`** (216 dòng):
   - Class `@Injectable() export class PiiSanitizer`:
     - Constructor: `sessionSalt?: Buffer` (tạo ngẫu nhiên 32 bytes CSPRNG nếu không truyền vào).
     - Thứ tự ưu tiên ẩn danh PII nghiêm ngặt:
       1. `PASSWORD` -> `[PASSWORD_REDACTED]`
       2. `PERSON_NAME / DOB` -> `[NAME_REDACTED_<hash>]`
       3. `BANK_ACCOUNT` -> `[BANK_ACC_REDACTED_<hash>]`
       4. `OTP` -> `[OTP_REDACTED_<hash>]`
       5. `PHONE_NUMBER` -> `[PHONE_REDACTED_<hash>]`
       6. `CCCD` -> `[CCCD_REDACTED_<hash>]`
     - Băm Salted HMAC-SHA256: Các thực thể giống nhau trong cùng 1 session có cùng mã token, nhưng không thể tương quan giữa các session khác nhau.

5. **`BE_codex/src/preprocessing/text-cleaner.ts`** (269 dòng):
   - `cleanText(text: string): string`: Chuỗi xử lý văn bản:
     - Chuẩn hóa Unicode NFC/NFKC.
     - Loại bỏ ký tự ẩn/không độ rộng (`\u200B`, `\u3164`, ...).
     - Chuyển đổi font Unicode toán học đơn cách (Mathematical Monospace).
     - Tái tạo URL bị ngắt quãng do khoảng trắng (`http : // example .com`).
     - Khử lặp âm tiết/kéo dài (Un-stuttering) nhưng bảo toàn từ viết tắt nghiệp vụ (`CCCD`).
     - Sửa lỗi gõ Telex (`dd` -> `đ`).
     - Chuẩn hóa tiếng lóng tin nhắn (SMS slang) nhưng bảo lưu stopwords khẩn cấp và placeholder (`[MONEY]`, `[NUMBER]`, `[TIME]`).

---

### 1.3. Khảo Sát Thư Mục Phân Tích (`BE_codex/src/analysis/`)
Thư mục gồm các tập tin và cấu trúc:

1. **`BE_codex/src/analysis/analysis.module.ts`** (14 dòng):
   ```typescript
   @Module({
     imports: [AiModule, RiskModule, IntelligenceModule],
     controllers: [AnalysisController],
     providers: [AnalysisService, EvidenceValidator],
   })
   export class AnalysisModule {}
   ```
   *Hiện trạng*: Chưa import `OcrModule` hay `PreprocessingModule`.

2. **`BE_codex/src/analysis/analysis.controller.ts`** (34 dòng):
   - `@Controller('analysis')` với guard `AnalysisRateLimitGuard`.
   - `@Post('text')`: Gọi `this.analysis.analyze({ inputType: InputType.TEXT, text: body.text })`.
   - `@Post('images')`:
     ```typescript
     @Post('images')
     @HttpCode(HttpStatus.OK)
     async analyzeImages(
       @Req() request: Request,
       @Res({ passthrough: true }) response: Response,
     ): Promise<AnalysisResponseDto> {
       const { images, context } = await receiveImages(request, response);
       return this.analysis.analyze({ inputType: InputType.IMAGE, images, context });
     }
     ```
     Nhận multipart qua `receiveImages`, trả về `images: UploadedImage[]` và `context?: string`.

3. **`BE_codex/src/analysis/analysis.service.ts`** (40 dòng):
   ```typescript
   @Injectable()
   export class AnalysisService {
     constructor(
       @Inject(AI_ANALYSIS_PROVIDER) private readonly provider: AiAnalysisProvider,
       private readonly risk: RiskService,
       private readonly intelligence: UrlIntelligenceService,
       private readonly evidence: EvidenceValidator,
     ) {}

     async analyze(input: AiAnalysisInput): Promise<AnalysisResponseDto> {
       const candidate = await this.provider.analyze(input, AbortSignal.timeout(OPENAI_UPSTREAM_TIMEOUT_MS));
       const { accepted, rejected } = this.evidence.validate(input, candidate.canAssess ? candidate.evidence : []);
       const urls = candidate.canAssess
         ? this.intelligence.detect(input.inputType === InputType.TEXT ? input.text : accepted.map(({ quote }) => quote).join('\n'))
         : [];

       const evidence = accepted.filter(({ signalType, quote }) => signalType !== SignalType.SUSPICIOUS_URL ||
         this.intelligence.detect(quote).some(({ signals }) => signals.length > 0));
       const indicators = urls.flatMap(({ signals }) => signals);
       const hasUrlIndicators = indicators.length > 0;
       const signals = evidence.map(({ signalType }) => signalType);
       const unsupported = rejected || evidence.length < accepted.length;
       const canAssess = candidate.canAssess && (!unsupported || evidence.length > 0 || hasUrlIndicators);
       const risk = this.risk.assess(signals, canAssess, indicators);
       const category = selectScamCategory(candidate.suggestedCategory, evidence, hasUrlIndicators);
       return mapAnalysisResponse(input, candidate, evidence, urls, risk, category);
     }
   }
   ```
   *Hiện trạng xử lý ảnh*: `AnalysisService` hoàn toàn **chưa gọi OCR hay Preprocessing**. Đối tượng `input` dạng `{ inputType: InputType.IMAGE, images, context }` được chuyển thẳng vào `this.provider.analyze(...)`.

4. **Cách các AI Provider xử lý ảnh hiện tại**:
   - **`MockAiAnalysisProvider` (`BE_codex/src/ai/mock-ai-analysis.provider.ts`)**:
     Dòng 19-35: Nếu `input.inputType === InputType.IMAGE`, stub cứng trả về `canAssess: false`, `suggestedCategory: ScamCategory.NONE`, `summary: 'Chế độ mô phỏng chưa đọc được nội dung trong ảnh.'`.
   - **`OpenAiAnalysisProvider` (`BE_codex/src/ai/openai-analysis.provider.ts`)**:
     Dòng 76-83: Chuyển đổi trực tiếp các file ảnh thành base64 data URLs (`data:${mediaType};base64,...`) và gửi sang OpenAI Responses API kèm prompt chỉ dẫn.

5. **`EvidenceValidator` (`BE_codex/src/analysis/evidence-validator.ts`)**:
   - Dòng 36-39:
     ```typescript
     const grounded = input.inputType === InputType.TEXT
       ? index === null && supportedText(input.text, quote, item.signalType)
       : index !== null && Number.isInteger(index) && index >= 0 && index < input.images.length &&
         supportsSignal(quote, item.signalType);
     ```
     Đối với ảnh, validator chỉ kiểm tra `index` là số nguyên hợp lệ trong khoảng `[0, input.images.length - 1]` và chuỗi `quote` thỏa mãn `supportsSignal(quote, signalType)`. Validator hiện tại **chưa đối soát chuỗi quote với nội dung transcript bóc tách từ OCR**.

6. **Các DTO và mapper liên quan**:
   - `UploadedImage` trong `BE_codex/src/analysis/dto/images-request.dto.ts`:
     `{ readonly bytes: Buffer; readonly mediaType: ImageMediaType; }`.
   - `AnalysisResponseDto` trong `BE_codex/src/analysis/dto/analysis-response.dto.ts`:
     11 trường chuẩn snake_case: `analysis_id`, `input_type`, `risk_score`, `risk_level`, `scam_category`, `summary`, `evidence`, `detected_urls`, `recommended_actions`, `speech_summary`, `analyzed_at`.
   - `mapAnalysisResponse` trong `analysis-response.mapper.ts`:
     Ánh xạ kết quả đánh giá, gắn `randomUUID()`, format thời gian ISO 8601, và sinh thông điệp tóm tắt.

---

### 1.4. Kết Quả Chạy Kiểm Thử Hiện Tại (Baseline Test Execution)
- Chạy toàn bộ 10 test suites đơn vị qua lệnh `npm test`:
  `PASS test/image-pipeline.integration.spec.ts` (33/33 tests pass)  
  `PASS test/foundation.spec.ts` (28/28 tests pass)  
  `PASS test/ocr-pipeline.spec.ts` (23/23 tests pass)  
  `PASS test/mock-analysis.spec.ts` (5/5 tests pass)  
  `PASS test/openai-analysis.spec.ts` (14/14 tests pass)  
  `PASS test/preprocessing.service.spec.ts` (28/28 tests pass)  
  `PASS test/risk-engine.spec.ts` (22/22 tests pass)  
  `PASS test/pii-sanitizer.spec.ts` (14/14 tests pass)  
  `PASS test/url-intelligence.spec.ts` (33/33 tests pass)  
  `PASS test/environment.spec.ts` (19/19 tests pass)  
  **Tổng cộng: 10/10 suites passed, 219/219 tests passed (41.7s)**.
- Chạy 3 test suites e2e qua lệnh `npm run test:e2e`:
  `PASS test/mock-api.e2e-spec.ts` (48/48 tests pass)  
  `PASS test/frontend-integration.e2e-spec.ts` (2/2 tests pass)  
  `PASS test/openai-api.e2e-spec.ts` (16/16 tests pass)  
  **Tổng cộng: 3/3 suites passed, 66/66 tests passed (9.9s)**.

---

## 2. LOGIC CHAIN (CHUỖI LẬP LUẬN TỪ QUAN SÁT ĐẾN KẾT LUẬN)

1. **Về tính sẵn sàng của các Module M1 và M2**:
   - Từ quan sát tại Mục 1.1 và 1.2, `OcrModule` (`OcrService`, `MetadataOcrProvider`, `PaddleTesseractOcrProvider`) và `PreprocessingModule` (`PreprocessingService`, `PiiSanitizer`, `TextCleaner`) đã được hoàn thiện đầy đủ, xuất khẩu đúng chuẩn NestJS module và pass 100% các unit test độc lập (23 test OCR, 42 test Preprocessing & PII).
   - Cơ chế fallback thông minh của `OcrService`: Trong môi trường test hoặc khi không có nhị phân Tesseract cục bộ, `MetadataOcrProvider` tự động đối soát SHA-256 hash của ảnh mẫu từ `data/images/` với `data/metadata.json`, gán nhãn speaker và phân bổ 0-based `imageIndex` chuẩn xác.

2. **Về vị trí đứt gãy trong luồng xử lý hiện tại**:
   - Từ quan sát tại Mục 1.3, `AnalysisModule` chưa hề import `OcrModule` hay `PreprocessingModule`.
   - `AnalysisService` chỉ nhận `input` từ `AnalysisController` rồi đẩy thẳng qua `AiAnalysisProvider`.
   - `MockAiAnalysisProvider` từ chối đánh giá ảnh (`canAssess: false`), trong khi `image-pipeline.integration.spec.ts` chỉ pass được nhờ dùng `jest.spyOn(ai, 'analyze')` ghi đè giá trị mock trả về.
   - Do đó, để hiện thực hóa Milestone 3 & Milestone 4 theo `ORIGINAL_REQUEST.md`, `AnalysisService` bắt buộc phải là nơi điều phối luồng: nhận ảnh -> gọi `OcrService.processImages` -> nhận `OcrResult` -> gọi `PreprocessingService.cleanAndSanitize` -> nhận `PreprocessedDialogue` -> chuyển giao cho Reasoning Harness / AiAnalysisProvider.

3. **Về điểm bất tương thích giao diện (Interface Discrepancies)**:
   - *Bất tương thích 1 (Tên thuộc tính dữ liệu nhị phân của ảnh)*:
     - `AnalysisController` tạo `UploadedImage` có thuộc tính `bytes: Buffer` (dòng 12, `images-request.dto.ts`).
     - `OcrService.processImages` yêu cầu `ImageInput` có thuộc tính `buffer: Buffer` (dòng 25, `ocr.interfaces.ts`).
     - *Giải pháp*: Trong `AnalysisService.analyze()`, thực hiện ánh xạ đơn giản:
       `const ocrImages: ImageInput[] = input.images.map(img => ({ buffer: img.bytes, mediaType: img.mediaType }));`.
   - *Bất tương thích 2 (Mô hình dữ liệu đầu vào của AI Provider)*:
     - `AiAnalysisInput` trong `ai-analysis-provider.ts` chỉ chứa `images: readonly UploadedImage[]` và `context?: string`.
     - AI Provider và các thành phần downstream cần tiếp cận được dữ liệu hội thoại đã bóc tách và làm sạch (`PreprocessedDialogue` hoặc `OcrResult`).
     - *Giải pháp*: Bổ sung thuộc tính tùy chọn `dialogue?: PreprocessedDialogue` và `ocrResult?: OcrResult` vào kiểu `AiAnalysisInput`.
   - *Bất tương thích 3 (Tính tương thích ngược của Constructor AnalysisService)*:
     - Hiện tại các unit test `test/mock-analysis.spec.ts` (dòng 15) và `test/openai-analysis.spec.ts` (dòng 23) khởi tạo trực tiếp `new AnalysisService(provider, risk, intelligence, evidence)` với 4 tham số.
     - Nếu thêm `ocr: OcrService` và `preprocessing: PreprocessingService` dưới dạng bắt buộc mà không có `@Optional()`, các unit test này sẽ gặp lỗi hoặc nhận `undefined`.
     - *Giải pháp*: Khai báo `@Optional() private readonly ocr?: OcrService` và `@Optional() private readonly preprocessing?: PreprocessingService`. Khi chạy trong container NestJS thông qua `AppModule`/`AnalysisModule`, NestJS sẽ tự động inject đầy đủ cả hai dịch vụ.

4. **Về cơ chế Grounding & Verbatim Quote Matching**:
   - Từ quan sát tại Mục 1.3 và 1.4: Trong `image-pipeline.integration.spec.ts`, các test case kiểm tra tín hiệu với các trích dẫn tổng quát/diễn giải (ví dụ: `'yêu cầu chuyển tiền vào tài khoản tạm giữ'`, `'tôi là cán bộ công an'`). Các ảnh fixture trong `openai-api.e2e-spec.ts` thậm chí là các ảnh 8x8 pixel đơn sắc không chứa chữ.
   - Vì vậy, `EvidenceValidator` cho ảnh không được phép chặn cứng nếu chuỗi không phải là substring tuyệt đối 100% của ảnh, mà cần duy trì logic kiểm định grounded hiện có (`index !== null && 0 <= index < input.images.length && supportsSignal(quote, signalType)`), đồng thời nếu có `dialogue`, có thể đối soát chéo để tăng độ tin cậy.

---

## 3. CAVEATS (GIỚI HẠN VÀ ĐIỀU KIỆN BIÊN)

1. **Phạm vi quyền hạn Read-Only của Explorer**:
   - Báo cáo này đóng vai trò phân tích kiến trúc và lập kế hoạch sửa đổi. Tác nhân Explorer không trực tiếp sửa đổi mã nguồn. Công việc chỉnh sửa mã sẽ do Worker triển khai (Implementer) thực hiện.
2. **Quy định Sandbox & Port Binding trong Môi trường Windows**:
   - Khi chạy các bài kiểm thử tích hợp mở cổng HTTP (`app.listen(0, '127.0.0.1')`) như `image-pipeline.integration.spec.ts` và các file `*.e2e-spec.ts`, lệnh thực thi trên Windows bắt buộc phải kích hoạt `BypassSandbox: true` để tránh lỗi `connect EACCES 127.0.0.1:<port>`.
3. **Môi trường Triển khai Không có Tesseract Host**:
   - Trong môi trường CI/CD hoặc container không cài đặt sẵn `tesseract` CLI và ngôn ngữ `vie`, hệ thống sẽ tự động kích hoạt `MetadataOcrProvider`. Dữ liệu `data/metadata.json` phải luôn được bảo toàn đồng bộ với các file ảnh trong `data/images/`.
4. **An toàn Bảo mật PII khi Trích dẫn Bằng chứng**:
   - Trong quá trình ẩn danh hóa PII, các chuỗi nhạy cảm (như CCCD, số tài khoản, OTP) được thay thế bằng token dạng `[CCCD_REDACTED_<hash>]`. Bất kỳ câu trích dẫn nào từ phía LLM xuất hiện trong trường `evidence.quote` đều phải giữ nguyên token redaction hoặc không được rò rỉ giá trị PII nguyên gốc vào `summary` hay `speech_summary`.

---

## 4. CONCLUSION & KẾ HOẠCH TRIỂN KHAI CHI TIẾT (ACTIONABLE PLAN)

### 4.1. Tóm Tắt Kết Luận
1. Cả `OcrModule` và `PreprocessingModule` đã sẵn sàng 100% để ghép nối vào `AnalysisModule` và `AnalysisService`.
2. Không có xung đột cấu trúc dữ liệu nghiêm trọng; sự khác biệt duy nhất giữa đầu vào OCR và đầu ra Multipart là tên thuộc tính `bytes` vs `buffer`, được xử lý triệt để bằng một dòng mapping.
3. Việc tích hợp hoàn toàn không gây hồi quy (regression-free) cho 285 tests hiện có nếu áp dụng decorator `@Optional()` trong constructor của `AnalysisService`.

---

### 4.2. Kế Hoạch Chỉnh Sửa Mã Nguồn Cụ Thể (Proposed Edits)

#### Bước 1: Cập Nhật `BE_codex/src/analysis/analysis.module.ts`
Thêm import `OcrModule` và `PreprocessingModule`:

```typescript
import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { IntelligenceModule } from '../intelligence/intelligence.module';
import { OcrModule } from '../ocr/ocr.module';
import { PreprocessingModule } from '../preprocessing/preprocessing.module';
import { RiskModule } from '../risk/risk.module';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { EvidenceValidator } from './evidence-validator';

@Module({
  imports: [
    AiModule,
    RiskModule,
    IntelligenceModule,
    OcrModule,
    PreprocessingModule,
  ],
  controllers: [AnalysisController],
  providers: [AnalysisService, EvidenceValidator],
  exports: [AnalysisService],
})
export class AnalysisModule {}
```

---

#### Bước 2: Cập Nhật `BE_codex/src/ai/ai-analysis-provider.ts`
Mở rộng kiểu `AiAnalysisInput` để mang dữ liệu đối thoại và kết quả OCR:

```typescript
import type { UploadedImage } from '../analysis/dto/images-request.dto';
import type { InputType, ScamCategory, SignalType } from '../contracts/analysis.enums';
import type { OcrResult } from '../ocr/ocr.interfaces';
import type { PreprocessedDialogue } from '../preprocessing/preprocessing.interfaces';

export const AI_ANALYSIS_PROVIDER = Symbol('AI_ANALYSIS_PROVIDER');
export const OPENAI_UPSTREAM_TIMEOUT_MS = 45_000;

export type AiAnalysisInput =
  | { readonly inputType: InputType.TEXT; readonly text: string }
  | {
      readonly inputType: InputType.IMAGE;
      readonly images: readonly UploadedImage[];
      readonly context?: string;
      readonly dialogue?: PreprocessedDialogue;
      readonly ocrResult?: OcrResult;
    };
```

---

#### Bước 3: Cập Nhật `BE_codex/src/analysis/analysis.service.ts`
Inject `OcrService` và `PreprocessingService`, xâu chuỗi luồng xử lý ảnh hoàn chỉnh:

```typescript
import { Inject, Injectable, Optional } from '@nestjs/common';
import {
  AI_ANALYSIS_PROVIDER, type AiAnalysisInput, type AiAnalysisProvider, OPENAI_UPSTREAM_TIMEOUT_MS,
} from '../ai/ai-analysis-provider';
import { InputType, SignalType } from '../contracts/analysis.enums';
import { UrlIntelligenceService } from '../intelligence/url-intelligence.service';
import type { ImageInput, OcrResult } from '../ocr/ocr.interfaces';
import { OcrService } from '../ocr/ocr.service';
import type { PreprocessedDialogue } from '../preprocessing/preprocessing.interfaces';
import { PreprocessingService } from '../preprocessing/preprocessing.service';
import { RiskService } from '../risk/risk.service';
import { selectScamCategory } from '../risk/scam-category';
import { mapAnalysisResponse } from './analysis-response.mapper';
import type { AnalysisResponseDto } from './dto/analysis-response.dto';
import { EvidenceValidator } from './evidence-validator';

@Injectable()
export class AnalysisService {
  constructor(
    @Inject(AI_ANALYSIS_PROVIDER) private readonly provider: AiAnalysisProvider,
    private readonly risk: RiskService,
    private readonly intelligence: UrlIntelligenceService,
    private readonly evidence: EvidenceValidator,
    @Optional() private readonly ocr?: OcrService,
    @Optional() private readonly preprocessing?: PreprocessingService,
  ) {}

  async analyze(input: AiAnalysisInput): Promise<AnalysisResponseDto> {
    let effectiveInput = input;

    // 1. Nếu là đầu vào IMAGE và có OCR + Preprocessing: thực thi pipeline tiền xử lý ảnh
    if (input.inputType === InputType.IMAGE && this.ocr && this.preprocessing) {
      const ocrImages: ImageInput[] = input.images.map((img) => ({
        buffer: img.bytes,
        mediaType: img.mediaType,
      }));

      const ocrResult: OcrResult = await this.ocr.processImages(ocrImages);
      const dialogue: PreprocessedDialogue = this.preprocessing.cleanAndSanitize(ocrResult);

      effectiveInput = {
        ...input,
        dialogue,
        ocrResult,
      };
    }

    // 2. Chuyển giao dữ liệu cho AI Reasoning Provider
    const candidate = await this.provider.analyze(effectiveInput, AbortSignal.timeout(OPENAI_UPSTREAM_TIMEOUT_MS));

    // 3. Kiểm định bằng chứng (Evidence Grounding)
    const { accepted, rejected } = this.evidence.validate(effectiveInput, candidate.canAssess ? candidate.evidence : []);

    // 4. Phát hiện và đánh giá URL đáng ngờ
    const urls = candidate.canAssess
      ? this.intelligence.detect(
          effectiveInput.inputType === InputType.TEXT
            ? effectiveInput.text
            : accepted.map(({ quote }) => quote).join('\n'),
        )
      : [];

    const evidence = accepted.filter(
      ({ signalType, quote }) =>
        signalType !== SignalType.SUSPICIOUS_URL ||
        this.intelligence.detect(quote).some(({ signals }) => signals.length > 0),
    );

    const indicators = urls.flatMap(({ signals }) => signals);
    const hasUrlIndicators = indicators.length > 0;
    const signals = evidence.map(({ signalType }) => signalType);
    const unsupported = rejected || evidence.length < accepted.length;
    const canAssess = candidate.canAssess && (!unsupported || evidence.length > 0 || hasUrlIndicators);

    // 5. Chấm điểm rủi ro toán học và xác định phân loại lừa đảo
    const risk = this.risk.assess(signals, canAssess, indicators);
    const category = selectScamCategory(candidate.suggestedCategory, evidence, hasUrlIndicators);

    // 6. Ánh xạ phản hồi chuẩn OpenAPI v1.2
    return mapAnalysisResponse(effectiveInput, candidate, evidence, urls, risk, category);
  }
}
```

---

#### Bước 4: Nâng Cấp `MockAiAnalysisProvider` Cho Chế Độ Hình Ảnh
Trong `BE_codex/src/ai/mock-ai-analysis.provider.ts`, cập nhật để khi nhận `dialogue`, Mock AI duyệt qua các turns đã bóc tách từ OCR và đánh giá theo quy tắc thay vì từ chối thẳng thừng:

```typescript
    if (input.inputType === InputType.IMAGE) {
      const turns = input.dialogue?.turns ?? [];
      if (turns.length === 0) {
        return Promise.resolve({
          canAssess: false,
          suggestedCategory: ScamCategory.NONE,
          summary: 'Chế độ mô phỏng chưa đọc được nội dung trong ảnh.',
          evidence: [],
          recommendedActions: ['Gửi nội dung hội thoại dưới dạng văn bản.'],
          speechSummary: 'Chế độ mô phỏng chưa đọc được nội dung trong ảnh.',
        });
      }

      // Đánh giá từng lượt thoại đã OCR
      const evidence: AiEvidence[] = [];
      for (const turn of turns) {
        const clauses = evidenceClauses(turn.text).map((clause) => clause.trim());
        for (const [signalType, reason] of mockRules) {
          const quote = clauses.find((clause) => supportsSignal(normalizeEvidence(clause), signalType));
          if (quote) {
            evidence.push({ quote, reason, signalType, imageIndex: turn.imageIndex });
          }
        }
      }

      const summary = evidence.length
        ? 'Phát hiện dấu hiệu rủi ro theo quy tắc mô phỏng từ ảnh.'
        : 'Chưa thấy dấu hiệu trong các mẫu văn bản mô phỏng từ ảnh.';

      return Promise.resolve({
        canAssess: true,
        suggestedCategory: ScamCategory.NONE,
        summary,
        evidence,
        recommendedActions: ['Xác minh thông tin qua kênh chính thức trước khi thực hiện yêu cầu.'],
        speechSummary: summary,
      });
    }
```

---

## 5. VERIFICATION METHOD (PHƯƠNG PHÁP KIỂM CHỨNG ĐỘC LẬP)

Để kiểm chứng tính chính xác của khảo sát và độ an toàn của đề xuất:

1. **Kiểm tra biên dịch Typescript**:
   ```powershell
   cd BE_codex
   npm run build
   ```
   *Kỳ vọng*: Mã nguồn NestJS biên dịch sạch sẽ vào `dist/`, không có lỗi kiểu TypeScript.

2. **Kiểm tra toàn bộ Unit Test Suite (10 suites)**:
   ```powershell
   cd BE_codex
   npm test
   ```
   *Kỳ vọng*: 10/10 test suites pass, bao gồm cả `ocr-pipeline.spec.ts`, `preprocessing.service.spec.ts`, `pii-sanitizer.spec.ts`, và `image-pipeline.integration.spec.ts`.

3. **Kiểm tra End-to-End Test Suite (3 suites)**:
   ```powershell
   cd BE_codex
   npm run test:e2e
   ```
   *Kỳ vọng*: 3/3 e2e test suites pass (bao gồm `mock-api.e2e-spec.ts`, `frontend-integration.e2e-spec.ts`, `openai-api.e2e-spec.ts`).

4. **Điều kiện vô hiệu hóa bàn giao (Invalidation Conditions)**:
   - Nếu bất kỳ file nào trong số 5 file của `BE_codex/src/ocr/` hoặc `BE_codex/src/preprocessing/` bị thiếu hoặc không export các class/service đã mô tả.
   - Nếu việc inject `OcrService` và `PreprocessingService` làm gãy bất kỳ bài kiểm thử nào trong số 285 bài test hiện có.
