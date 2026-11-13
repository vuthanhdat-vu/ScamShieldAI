# BRIEFING — 2026-11-12T10:17:30Z

## Mission
Conduct a technical investigation into the microservice architecture and hardware constraints for ScamShieldAI (6GB VRAM RTX 4050 Laptop GPU, NestJS Gateway + Python FastAPI Service).

## 🔒 My Identity
- Archetype: explorer
- Roles: investigation, synthesis
- Working directory: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI
- State folder: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\explorer_arch_1\
- Original parent: 432e0a44-5488-4ca3-b0fb-fd41e17d59f3
- Milestone: Milestone 1 - Architectural & Hardware Constraint Investigation

## 🔒 Key Constraints
- Read-only investigation — do NOT implement
- Target hardware: Intel Core i5, NVIDIA RTX 4050 Laptop (6GB VRAM), 16GB/32GB host RAM
- Rigorous mathematical VRAM budget for 6.0 GB VRAM
- Evaluate model serving options and multimodal/OCR strategy
- Define interface boundary between NestJS Gateway and FastAPI AI Service

## Current Parent
- Conversation ID: 432e0a44-5488-4ca3-b0fb-fd41e17d59f3
- Updated: 2026-11-12T10:17:30Z

## Investigation State
- **Explored paths**:
  - `BE_codex/` (full NestJS gateway codebase, routes, services, DTOs, image upload validation, risk service, evidence validator)
  - `docs/REASONING_HARNESS_DESIGN.md` (ADK Recipe architecture, CoT 4-stage prompts, 3-tier hybrid defense, VRAM budget)
  - `docs/PREPROCESSING_DESIGN.md` (CPU tier 1 preprocessing, de-obfuscation, PII masking)
  - `data_demo/` (`conservations.json`, `dataset_url_sampled.csv`, `Scam.csv`, `No_scam.csv`, `images/`)
- **Key findings**:
  - `BE_codex` implements deterministic backend risk scoring and evidence grounding validation (`EvidenceValidator`, `RiskService`). AI model serves as an evidence extraction candidate provider (`AiAnalysisCandidate`), not the final score arbiter.
  - VRAM budget proves mathematically that Qwen2.5-3B Q4_K_M consumes 3.04 - 3.76 GB VRAM on RTX 4050 (6,144 MB), leaving >1.2 GB safe margin. 7B/8B models cause OOM or violate the 5,000 MB Windows paging ceiling.
  - `llama-server.exe` (native Windows) selected over vLLM (WSL2 bloat) and bitsandbytes (slow/fragmentation).
  - OCR on CPU (PaddleOCR-v4 CPU / VietOCR, 0% VRAM) + Local 3B LLM selected over small VLM (which balloons VRAM by 1.5 - 3.0 GB and risks OOM).
  - HTTP REST (JSON & multipart) confirmed as optimal communication protocol between Gateway and FastAPI Service.
- **Unexplored areas**: None. All core investigation requirements fully satisfied.

## Key Decisions Made
- Completed technical investigation and mathematical VRAM budget modeling.
- Documented findings in `analysis.md` and created 5-component `handoff.md`.

## Artifact Index
- DISPATCH.md — record of dispatch instruction
- BRIEFING.md — persistent working memory
- progress.md — liveness heartbeat
- analysis.md — detailed technical investigation and synthesis report
- handoff.md — 5-component handoff report
