# DISPATCH — Reviewer 2 (M3 & ADK / Hardware Evaluation)

## Objective
Thẩm định độc lập và khách quan tài liệu thiết kế:
`c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\docs\REASONING_HARNESS_DESIGN.md` (Milestone M3)

## Inputs to Read
- `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\ORIGINAL_REQUEST.md` (MANDATORY)
- `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\PROJECT.md`
- `docs/REASONING_HARNESS_DESIGN.md`
- Tài liệu mẫu tại `c:\Users\leemi\Desktop (PC)\Projects\adk-recipes`

## Evaluation Criteria
- Đánh giá tính chuẩn mực ADK Recipe (6 canonical serving files, mô hình phân tầng agent, chuẩn Fast API và Vertex AI Reasoning Engine Adapter).
- Đánh giá thiết kế Prompt Scaffolding (4-stage CoT, XML boundary tags, prompt prefix caching).
- Đánh giá tính khả thi và độ chính xác toán học của mô hình ngân sách VRAM trên RTX 4050 6GB VRAM + CPU Core i5 (KV cache, context length, lựa chọn llama.cpp server vs vLLM, thông lượng và độ trễ).
- Đánh giá kiến trúc phòng thủ 3 tầng (3-Tier Hybrid Defense).
- Kết luận phán quyết rõ ràng: **APPROVE** hoặc **REQUEST_CHANGES**.
- Báo cáo kết quả ra `handoff.md` trong thư mục trạng thái `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\reviewer_2`.


## 2026-11-12T04:29:57Z
From: 10be6ed3-def1-4119-a72c-b7321b6b8474
Priority: MESSAGE_PRIORITY_HIGH
Content:
You are Reviewer 2 assigned to independently evaluate docs/REASONING_HARNESS_DESIGN.md (Milestone M3) and ADK / Hardware Conformance.
Read:
- c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\ORIGINAL_REQUEST.md (MANDATORY)
- c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\PROJECT.md
- c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\reviewer_2\DISPATCH.md
- c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\docs\REASONING_HARNESS_DESIGN.md
- Reference ADK recipes at c:\Users\leemi\Desktop (PC)\Projects\adk-recipes

Your state folder: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\reviewer_2.

Perform an objective, rigorous review against Requirement R3:
- ADK recipe conformance (6 canonical serving files, Fast API runner, a2a.py, reasoning engine adapter, runnability smoke tests).
- Prompt scaffolding (4-stage CoT, XML boundary tags, prompt prefix caching).
- Hardware constraints feasibility (Intel Core i5 + RTX 4050 6GB VRAM, mathematical VRAM budgeting, GQA KV cache derivation, llama.cpp serving engine, latency/throughput models).
- 3-Tier Hybrid Defense architecture.
- Deliver an explicit verdict: APPROVE or REQUEST_CHANGES.
- Write your complete handoff report to handoff.md in your state folder and send a message when finished.


## 2026-11-12T10:34:37Z
From: 432e0a44-5488-4ca3-b0fb-fd41e17d59f3
Priority: MESSAGE_PRIORITY_HIGH
Content:
You are a teamwork_reviewer agent.
Working directory: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI
State folder: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\reviewer_2\
Original request path: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\ORIGINAL_REQUEST.md
Scope document: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\orchestrator_2\SCOPE.md

You MUST read ORIGINAL_REQUEST.md and SCOPE.md before starting your review.

Your objective:
Conduct an independent, rigorous technical review of `docs/REASONING_HARNESS_DESIGN.md` (and check consistency with `docs/PREPROCESSING_DESIGN.md`):
1. Microservice boundary & architecture: Are responsibilities between NestJS Gateway (`BE_codex`) and Python FastAPI AI Reasoning Service clearly delineated? Are client validation, rate limiting, magic bytes image checks, `EvidenceValidator`, and `RiskService` properly attributed to the Gateway, while CoT reasoning and `AiAnalysisProvider` are attributed to FastAPI?
2. Hardware constraints (Intel Core i5 + RTX 4050 6GB VRAM): Is the mathematical VRAM budget table sound, detailed, and realistic? Does it account for OS/CUDA context (~800MB), 5.0GB safe ceiling, Qwen2.5-3B Q4_K_M (1.92GB), GQA KV cache (~590MB), and proof why 7B/8B fail? Does it prove peak VRAM <= 3.75GB with >1.25GB safe buffer?
3. Model serving & offloading: Is `llama-server.exe` native Win32 properly specified with FlashAttention-2? Is Offline OCR on CPU (0% GPU VRAM) thoroughly specified?
4. Test harness suites: Are all 5 data sources covered (38 conversations, 1,319 scam messages, 1,930 non-scam messages, 3,192 URLs on 19 pattern groups, 50 screenshot cases)?
5. Evaluation metrics: Are P50/P95 latency, VRAM peak, Precision, Recall, F1, FPR < 2%, and OCR CER/WER properly defined?
6. Model compliance: Does it strictly adhere to AGENTS.md (using `gemini-3.7-flash` instead of deprecated `gemini-2.0-flash` or `gemini-2.5-flash`)?
7. Synchronization: Is `docs/REASONING_HARNESS_DESIGN.md` completely consistent with `docs/PREPROCESSING_DESIGN.md`?

Write your detailed review and verdict (APPROVE or REQUEST_CHANGES) to:
`c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\reviewer_2\handoff.md`
When finished, notify the orchestrator via send_message to conversation ID: 432e0a44-5488-4ca3-b0fb-fd41e17d59f3.
