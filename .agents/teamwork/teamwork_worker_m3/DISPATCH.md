# Dispatch: Milestone 3 Implementation Worker

## Task Objective
Implement Milestone 3: Reasoning Harness & NestJS Integration for ScamShield AI (`BE_codex`).
Specifically:
1. Update `BE_codex/src/analysis/analysis.module.ts`:
   - Import `OcrModule` from `../ocr/ocr.module` and `PreprocessingModule` from `../preprocessing/preprocessing.module`.
   - Export `AnalysisService`.
2. Update `BE_codex/src/ai/ai-analysis-provider.ts`:
   - Extend `AiAnalysisInput` image variant to include optional `dialogue?: PreprocessedDialogue` and `ocrResult?: OcrResult`.
3. Update `BE_codex/src/analysis/analysis.service.ts`:
   - Inject `@Optional() private readonly ocr?: OcrService` and `@Optional() private readonly preprocessing?: PreprocessingService`.
   - In `analyze(input)`: When `input.inputType === InputType.IMAGE` and both `this.ocr` and `this.preprocessing` are defined:
     * Map `input.images` (`bytes`, `mediaType`) to `ImageInput[]` (`buffer`, `mediaType`).
     * Call `const ocrResult = await this.ocr.processImages(ocrImages);`
     * Call `const dialogue = this.preprocessing.cleanAndSanitize(ocrResult);`
     * Create `effectiveInput = { ...input, dialogue, ocrResult };`
     * Pass `effectiveInput` to `this.provider.analyze()`.
     * Downstream `EvidenceValidator`, `UrlIntelligenceService`, `RiskService`, and `mapAnalysisResponse` continue to work seamlessly.
4. Update `BE_codex/src/ai/mock-ai-analysis.provider.ts`:
   - In the `input.inputType === InputType.IMAGE` branch:
     * Extract `const turns = input.dialogue?.turns ?? [];`
     * If `turns.length === 0`: return `canAssess: false`, `suggestedCategory: ScamCategory.NONE`, summary `'Chế độ mô phỏng chưa đọc được nội dung trong ảnh.'`.
     * If `turns.length > 0`: evaluate clauses in `turn.text` against `mockRules` with `supportsSignal`, attaching `imageIndex: turn.imageIndex`.
     * Return `canAssess: true`, `suggestedCategory: ScamCategory.NONE`, summary, evidence, and `recommendedActions`.
5. Update `BE_codex/src/ai/openai-analysis.provider.ts`:
   - Embed the 4-Stage CoT Reasoning protocol into `INSTRUCTIONS`:
     * Stage 1: Authority Verification (`Xác thực Danh xưng và Thẩm quyền`)
     * Stage 2: Psychological Pressure (`Bóc tách Đòn Tâm lý & Sự Hối thúc`)
     * Stage 3: Risk Entities & Artifacts (`Giám định Thực thể & Dữ vật Nguy cơ Cao`)
     * Stage 4: Synthesis & Defense Actions (`Tổng hợp Suy luận & Khuyến cáo Phòng vệ`)
   - When `input.inputType === InputType.IMAGE` and `input.dialogue?.formattedPromptText` is present, include the formatted dialogue transcript in the user prompt content alongside the high-detail screenshot parts.
6. Run builds and tests to verify:
   - `npm --prefix BE_codex run build`
   - `npm --prefix BE_codex test` (must pass 100% of test suites)
   - `npm --prefix BE_codex run test:e2e` (must pass 100% of test suites)

## MANDATORY INTEGRITY WARNING
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

## Relevant Paths & Reports to Read First
- `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\ORIGINAL_REQUEST.md`
- `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\orchestrator_1\SCOPE.md`
- `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\teamwork_explorer_modules\handoff.md`
- `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\teamwork_explorer_llm_tests\handoff.md`
- `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\teamwork_spec_miner_openapi\handoff.md`

## Output
Write your handoff report to `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\teamwork_worker_m3\handoff.md`.
Send a message to your parent when complete.


## 2026-11-13T18:01:09Z
You are the Milestone 3 Implementation Worker for ScamShield AI.
Your working directory is c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI.
Your state folder is c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\teamwork_worker_m3\.

Read your task details in c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\teamwork_worker_m3\DISPATCH.md.
Also read the explorer reports:
- c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\teamwork_explorer_modules\handoff.md
- c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\teamwork_explorer_llm_tests\handoff.md
- c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\teamwork_spec_miner_openapi\handoff.md

Implement the wiring of OcrModule & PreprocessingModule into AnalysisModule & AnalysisService, extend AiAnalysisInput, update MockAiAnalysisProvider to evaluate OCR dialogue turns, embed 4-Stage CoT Reasoning protocol into OpenAiAnalysisProvider, and verify that all build and test commands pass 100%.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Write your handoff report to c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\teamwork_worker_m3\handoff.md.
Send a message to your parent when done.
