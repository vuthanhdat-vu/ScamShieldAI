# DISPATCH — Worker M3 (Reasoning Harness Architecture & Hardware Blueprint)

## Objective
Biên soạn tài liệu thiết kế kỹ thuật kiến trúc Quy trình Tác nhân Suy luận (Reasoning Harness Architecture), Prompt Scaffolds theo chuẩn ADK Recipe, và Đánh giá Tối ưu hóa Phần cứng (CPU Core i5 + GPU RTX 4050 6GB VRAM) tại `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\docs\REASONING_HARNESS_DESIGN.md`.

## Exclusive Write Ownership
- File duy nhất bạn được phép ghi/tạo: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\docs\REASONING_HARNESS_DESIGN.md`.
- Thư mục trạng thái của bạn: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\worker_m3`.

## Inputs & Context
1. `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\ORIGINAL_REQUEST.md` (BẮT BUỘC ĐỌC)
2. `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\PROJECT.md`
3. Báo cáo khảo sát của Explorer 1: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\explorer_survey_1\handoff.md`
4. Báo cáo khảo sát của Explorer 2: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\explorer_survey_2\handoff.md`
5. Báo cáo khảo sát của Explorer 3: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\explorer_survey_3\handoff.md`
6. Mẫu thiết kế và skills trong: `c:\Users\leemi\Desktop (PC)\Projects\adk-recipes`

## Required Content in docs/REASONING_HARNESS_DESIGN.md
Tài liệu thiết kế kỹ thuật kiến trúc phải bao gồm đầy đủ:
1. **Kiến trúc Tổng thể Quy trình Tác nhân Suy luận (Agentic Reasoning Harness)**:
   - Sơ đồ kiến trúc Agentic Reasoning theo chuẩn Google ADK (Agent Development Kit).
   - Thiết kế cấu trúc ADK Recipe 6 phần chuẩn mực: `manifest.yaml`, `pyproject.toml`, `agent.py`, `fast_api_app.py`, `app_utils/services.py`, `app_utils/a2a.py`, `app_utils/reasoning_engine_adapter.py`.
   - Phân định các tầng tác nhân (Coordinator Agent, Tool-calling agents, Evaluator / Judge Agent).
2. **Thiết kế Gợi ý vào Input Prompts hỗ trợ Model Suy luận (Prompt Hints / Reasoning Scaffolds)**:
   - Cấu trúc Prompt đa tầng: Static System Prompt (prefix caching), Dynamic Project Context, Ephemeral Reminder Scaffolds.
   - Cơ chế đóng khung thẻ XML an toàn (`<system_instructions>`, `<input_payload>`, `<cot_reasoning_scaffold>`, `<output_verdict>`) chống Prompt Injection.
   - Quy trình suy luận 4 bước (4-Stage Chain-of-Thought):
     - *Stage 1: Xác thực Danh xưng & Thẩm quyền (Authority & Legitimacy Verification)*.
     - *Stage 2: Bóc tách Thủ đoạn Tâm lý & Mức độ Hối thúc (Psychological Tactics & Urgency Detection)*.
     - *Stage 3: Giám định Thực thể & Dữ vật Nguy cơ cao (High-Risk Artifact Audit: OTP, tài khoản ngân hàng cá nhân, đường link rủi ro)*.
     - *Stage 4: Tổng hợp Suy luận, Đánh giá Rủi ro (Risk Scoring 0.0 - 1.0) & Đề xuất Phòng thủ*.
   - Mẫu System Prompt và User Prompt cụ thể kèm ví dụ minh họa suy luận qua từng stage.
   - Cấu trúc Output Schema định dạng JSON có cấu trúc nghiêm ngặt (`ScamInspectionVerdict`).
3. **Phân tích Ràng buộc Phần cứng & Tối ưu hóa Triển khai (CPU Core i5 + GPU RTX 4050 6GB VRAM)**:
   - *Mô hình toán học tính toán ngân sách VRAM*: Trừ hao OS/Windows DWM & CUDA context (~800 MB), trần an toàn VRAM (5.000 MB). So sánh kích thước trọng số các mô hình (Qwen2.5-3B Q4_K_M: 1.92 GB vs Qwen2.5-7B Q4_K_M: 4.48 GB vs PhoGPT-4B: 2.35 GB). Chứng minh tại sao Qwen2.5-3B-Instruct Q4_K_M là lựa chọn tối ưu tuyệt đối cho 6GB VRAM.
   - *Tính toán bộ nhớ KV Cache (GQA)*: Công thức toán học KV cache cho context 2048 và 4096 tokens, chứng minh khả năng phục vụ batch size 8-16 mà không bị tràn bộ nhớ (OOM).
   - *Lựa chọn Serving Engine*: So sánh chi tiết vLLM vs `llama.cpp` server / Ollama trên Windows GPU 6GB. Phân tích lý do chọn `llama.cpp` server (overhead <150MB, FlashAttention-2, native GGUF, tránh lỗi paging VRAM sang RAM).
   - *Đánh giá Thông lượng (Throughput) và Độ trễ (Latency)*: Băng thông bộ nhớ 192 GB/s, tốc độ giải mã (60-75 tok/s), P50 latency (~3.75s), P95 latency (~4.5s), thông lượng batch scoring (220-280 tok/s).
4. **Kiến trúc Phòng thủ Đa tầng Lai ghép (3-Tier Hybrid Defense Architecture)**:
   - Sơ đồ phối hợp giữa Tier 1 (CPU Heuristics / Regex / ONNX PhoBERT classifier deflecting 65-75% traffic), Tier 2 (RTX 4050 Local SLM Reasoning), và Tier 3 (Cloud API Fallback - Gemini 2.5 Flash qua Vertex AI Reasoning Engine Adapter).
5. **Kế hoạch Kiểm chứng Thực thi & Smoke Test Runnability**:
   - Thiết kế kịch bản test runnability theo chuẩn `tests/test_runnability.py` của ADK.

## Mandatory Integrity Warning
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.


## 2026-11-12T04:22:01Z
You are Worker M3 assigned to design the Reasoning Harness Architecture & Hardware Blueprint (ADK Recipe compliant, Core i5 + RTX 4050 6GB VRAM) for ScamShieldAI.
Read:
- c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\ORIGINAL_REQUEST.md (MANDATORY)
- c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\PROJECT.md
- c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\worker_m3\DISPATCH.md
- c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\explorer_survey_1\handoff.md
- c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\explorer_survey_2\handoff.md
- c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\explorer_survey_3\handoff.md
- Reference ADK recipes and skills in c:\Users\leemi\Desktop (PC)\Projects\adk-recipes

Your exclusive write ownership: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\docs\REASONING_HARNESS_DESIGN.md.
Your state folder: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\worker_m3.

MANDATORY INTEGRITY WARNING:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A teamwork_auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

CRITICAL INSTRUCTIONS:
1. Design the complete, production-grade technical specification in Vietnamese at c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\docs\REASONING_HARNESS_DESIGN.md.
2. Architecture & ADK Recipe Layout:
   - Canonical 6-part deployable ADK recipe structure (`manifest.yaml`, `pyproject.toml`, `agent.py`, `fast_api_app.py`, `app_utils/services.py`, `app_utils/a2a.py`, `app_utils/reasoning_engine_adapter.py`, `tests/test_runnability.py`).
   - Detailed specification of the Coordinator Agent, Tool Integrations, and Evaluator/Judge Agent.
3. Prompt Hints & Reasoning Scaffolds:
   - Tiered prompt structure: Static System Prompt (prefix caching enabled), Project Context, and Volatile Scaffolding Reminders.
   - Enforce XML delimiter boundary tags (<system_instructions>, <input_payload>, <cot_reasoning_scaffold>, <output_verdict>) to prevent prompt injection.
   - 4-Stage Chain-of-Thought (CoT) reasoning flow:
     * Stage 1: Authority & Identity Verification.
     * Stage 2: Psychological Tactics & Urgency Deconstruction (Fear, Greed, Social Proof, Isolation).
     * Stage 3: High-Risk Artifact Audit (personal bank accounts, OTP capture, deceptive links, APK downloads).
     * Stage 4: Risk Scoring (0.0 - 1.0) & Defensive Guidance.
   - Concrete System and User Prompt templates with step-by-step example reasoning trace.
   - Output JSON Schema for `ScamInspectionVerdict`.
4. Hardware Constraints & Deployment Optimization (Core i5 + RTX 4050 6GB VRAM):
   - Detailed mathematical VRAM budget modeling (OS/CUDA baseline ~800MB, 5.0GB ceiling, Qwen2.5-3B Q4_K_M 1.92GB weights vs 7B models, KV cache derivation using GQA for 2048 and 4096 context, batch size 8-16 capacity).
   - Serving Engine selection: why `llama.cpp` server (GGUF, FlashAttention-2, low overhead <150MB) is chosen over vLLM for Windows 6GB VRAM.
   - Throughput (220-280 tok/s batch) and latency (P50 ~3.75s) empirical models based on 192 GB/s memory bandwidth.
5. 3-Tier Hybrid Defense System:
   - Tier 1 (CPU Heuristic / ONNX PhoBERT classifier deflecting 65-75% traffic in <30ms).
   - Tier 2 (RTX 4050 Local SLM Reasoning Harness in 2.5-4.5s).
   - Tier 3 (Cloud API Fallback - Gemini 2.5 Flash / Vertex AI for confidence in [0.40, 0.70] or multi-modal).
6. ADK Runnability Verification Plan adhering to `tests/test_runnability.py`.
7. Write the document directly. DO NOT write or execute source code.
8. Update progress.md and write handoff.md upon completion. Send a message when finished.
