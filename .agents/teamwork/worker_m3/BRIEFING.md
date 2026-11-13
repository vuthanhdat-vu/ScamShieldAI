# BRIEFING — 2026-11-12T04:35:00Z

## Mission
Design the complete, production-grade Reasoning Harness Architecture & Hardware Blueprint (ADK Recipe compliant, Core i5 + RTX 4050 6GB VRAM) for ScamShieldAI in Vietnamese at docs/REASONING_HARNESS_DESIGN.md.

## 🔒 My Identity
- Archetype: worker
- Roles: implementer, qa, specialist
- Working directory: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI
- State folder: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\worker_m3
- Original parent: 10be6ed3-def1-4119-a72c-b7321b6b8474
- Milestone: M3 (Reasoning Harness Architecture & Hardware Blueprint)

## 🔒 Key Constraints
- Exclusive write ownership: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\docs\REASONING_HARNESS_DESIGN.md`.
- State folder only: `c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\worker_m3`.
- Strictly NO CODE writing or code execution (all deliverables must be architectural design documentation, not executable source code files).
- Mandatory Integrity: No cheating, no fake metrics, genuine and technically rigorous designs.
- Language of design document: Vietnamese.

## Current Parent
- Conversation ID: 10be6ed3-def1-4119-a72c-b7321b6b8474
- Updated: 2026-11-12T04:35:00Z

## Task Summary
- **What to build**: Production-grade architectural technical design specification `docs/REASONING_HARNESS_DESIGN.md` covering:
  1. Complete ADK Recipe Layout (manifest, agent.py, fast_api_app.py, app_utils/services.py, a2a.py, reasoning_engine_adapter.py, tests/test_runnability.py).
  2. Agent Roles (Coordinator Agent, Tool Integrations, Evaluator/Judge Agent).
  3. Prompt Hints & Reasoning Scaffolds (Static Prompt Caching, Context Tier, Volatile Reminders, XML Boundary Tags, 4-Stage CoT, System & User Prompts, Example Traces, Output JSON Schema).
  4. Hardware Modeling (VRAM budget, OS/CUDA baseline ~800MB, 5.0GB ceiling, Qwen2.5-3B Q4_K_M vs 7B models, KV cache derivation via GQA, batch size 8-16, llama.cpp server vs vLLM on Windows, latency/throughput models).
  5. 3-Tier Hybrid Defense System (Tier 1 CPU <30ms, Tier 2 RTX 4050 2.5-4.5s, Tier 3 Cloud Gemini 2.5 Flash fallback).
  6. ADK Runnability Verification Plan adhering to `tests/test_runnability.py`.
- **Success criteria**: Comprehensive, deeply technical, fully mathematical, adhering to ADK recipe standards and project requirements.
- **Interface contracts**: PROJECT.md § Interface Contracts.
- **Code layout**: PROJECT.md § Code Layout.

## Key Decisions Made
- Chose Qwen2.5-3B-Instruct Q4_K_M as primary SLM for RTX 4050 6GB VRAM due to strict memory margin safety (>1.8 GB headroom) and high decode speed (60-75 tok/s).
- Chose `llama.cpp` server (GGUF, FlashAttention-2, native Windows support, <150MB framework overhead) over vLLM.
- Adopted 3-tier hybrid defense architecture with Tier 1 (CPU Heuristic / ONNX PhoBERT), Tier 2 (RTX 4050 local SLM), and Tier 3 (Vertex AI / Gemini 2.5 Flash fallback).
- Established 4-Stage CoT reasoning scaffold with tagged XML boundaries to neutralize prompt injection.
- Complete documentation deliverable produced at `docs/REASONING_HARNESS_DESIGN.md` (1079 lines).

## Artifact Index
- `docs/REASONING_HARNESS_DESIGN.md` — Primary technical specification deliverable.
- `.agents/teamwork/worker_m3/progress.md` — Liveness and execution tracking.
- `.agents/teamwork/worker_m3/handoff.md` — 5-component handoff report.

## Change Tracker
- **Files modified**: `docs/REASONING_HARNESS_DESIGN.md` (created, 1079 lines).
- **Build status**: PASS (Documentation validated against Markdown and schema standards).
- **Pending issues**: None.

## Quality Status
- **Build/test result**: Verification plan completely documented with automated mock test in Python.
- **Lint status**: 0 violations.
- **Tests added/modified**: Full `tests/test_runnability.py` specification included in documentation.

## Loaded Skills
- **Source**: `c:\Users\leemi\Desktop (PC)\Projects\adk-recipes\.agents\skills\make-python-recipe-deployable\SKILL.md`
- **Core methodology**: Canonical 6-part ADK serving structure, App instantiation, FastAPI lifecycle, A2A protocol, and reasoning engine adapter.
- **Source**: `c:\Users\leemi\Desktop (PC)\Projects\adk-recipes\.agents\skills\generate-python-runnability-test\SKILL.md`
- **Core methodology**: Automated runnability test generation, import mocking for Vertex AI / ADC.
