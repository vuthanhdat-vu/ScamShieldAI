# Scope: E2E Testing Track

## Architecture
- Target: ScamShield AI End-to-End Image Analysis Pipeline
- Test Framework: Jest / ts-jest inside NestJS `BE_codex`
- Test Runner: `npm test` or `npm run test:e2e` in `BE_codex`
- Validation: Ajv for OpenAPI v1.2 schema validation + TypeScript contract runtime assertions from FE contracts (`contracts.ts`)
- Fixtures: `data/images/` and `data/metadata.json`

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Test Infra & Strategy (TEST_INFRA.md) | Opaque-box 4-tier methodology, Ajv schema validator setup, fixture mapping | Sub-M1 | ORIGINAL_REQUEST.md / OpenAPI v1.2 |
| 2 | Tier 1: Feature Coverage | Happy path tests per category: MD, DT, MB, DC, HN (>=5 per category) | Sub-M2 | ORIGINAL_REQUEST.md / metadata.json |
| 3 | Tier 2: Boundary & Corner Cases | Limits (1 image, 5 images, 0 images, >5 images, >5MB, >20MB, corrupt images, unreadable images returning UNABLE_TO_ASSESS) | Sub-M2 | OpenAPI v1.2 / CONTRACT_DECISIONS.md |
| 4 | Tier 3: Cross-Feature Combinations | Multi-image + URL heuristic, impersonation + threat + OTP, PII presence + clean reasoning | Sub-M2 | REASONING_HARNESS_DESIGN.md |
| 5 | Tier 4: Real-World Scenarios | Integration on real cases from data/images/ cross-referenced with data/metadata.json | Sub-M2 | ORIGINAL_REQUEST.md |
| 6 | OpenAPI v1.2 Schema Conformance | Strict validation of all response payloads (11 snake_case fields, no additionalProperties, verbatim quote checks, 0-based image_index) | Sub-M3 | OpenAPI v1.2 / contracts.ts |
| 7 | Publication of TEST_READY.md | Runner command, full tier breakdown, passing test suite report | Sub-M3 | Project Pattern |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | Survey & Test Infrastructure | Survey existing test setup in BE_codex, OpenAPI schema, FE contracts, data fixtures; produce `TEST_INFRA.md` | none | IN_PROGRESS |
| 2 | E2E Test Suite Implementation | Implement test suite under `BE_codex/test/` (e.g. `image-pipeline.integration.spec.ts`) covering Tiers 1-4 with Ajv schema validator | M1 | PLANNED |
| 3 | Verification & TEST_READY Publication | Execute tests, verify pass, generate `TEST_READY.md` at project root | M2 | PLANNED |
