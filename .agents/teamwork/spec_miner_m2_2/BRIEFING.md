# BRIEFING — 2026-11-13T16:16:30Z

## Mission
Discover and document complete specifications for Section 3 of Preprocessing Design (Denoising, Adversarial De-obfuscation & Vietnamese Normalization) for Milestone 2.

## 🔒 My Identity
- Archetype: Specification Miner
- Roles: Teamwork specialist, Specification Mining
- Working directory: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI
- State folder: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\spec_miner_m2_2
- Original parent: 4f2bff1b-5b15-404e-bce6-b3a8463b81a0
- Milestone: Milestone 2: Preprocessing & PII Sanitization Module

## 🔒 Key Constraints
- Read-only: do NOT implement code or modify application source code
- Prioritize authoritative sources over LLM prior knowledge
- Deeply analyze Section 3 of docs/PREPROCESSING_DESIGN.md
- 100% preservation of placeholders [MONEY], [NUMBER], [TIME]
- Risk-preserving stopword retention (never remove conditional/urgency words)
- Exact Unicode codepoints, math font transcoding offsets, regex patterns, slang dictionaries, telex repair rules

## Current Parent
- Conversation ID: 4f2bff1b-5b15-404e-bce6-b3a8463b81a0
- Updated: 2026-11-13T16:16:30Z

## Task Summary
- **What to build**: Specification mining for Preprocessing Denoising, Adversarial De-obfuscation & Vietnamese Normalization pipeline
- **Success criteria**: Exhaustive specification with regex, unicode points, math font mappings, telex rules, slang dictionary, edge cases in handoff.md
- **Interface contracts**: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\.agents\teamwork\sub_orch_m2\SCOPE.md, docs/PREPROCESSING_DESIGN.md
- **Code layout**: c:\Users\leemi\Desktop (PC)\Projects\ScamShieldAI\PROJECT.md

## Key Decisions Made
- Discovered that standard JS `\b` fails on Vietnamese accented vowels; specified Unicode lookaround boundaries `(?<![\p{L}\p{N}]) ... (?![\p{L}\p{N}])/u`.
- Discovered `cccd` 3-letter compression hazard; specified protection vault before stutter compression.
- Discovered Hangul Fillers `\u3164` / `\uFFA0` decompose to `\u1160` under NFKC; specified stripping before and after normalization and including `\u1160`.
- Verified and specified double-loop safe regex replacement pattern to prevent `while (regex.test(res))` infinite loops in V8.
- Validated 100% test pass on battery of 8 representative adversarial test cases.

## Artifact Index
- DISPATCH.md — Dispatch assignment
- BRIEFING.md — Persistent context & identity
- progress.md — Liveness heartbeat & progress tracking
- test_probe.js — Empirical test harness validating edge cases & regex behavior
- handoff.md — Final 5-component handoff report
