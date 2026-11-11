# ScamShield AI frontend architecture

## Scope and sources

Phase 1 specifies an anonymous, stateless Vietnamese-first Expo SDK 58 mobile app. The five routes are Home, Text Analysis, Image Analysis, Analysis Result, and Emergency Guidance. Keep all implementation in FE_codex. Accounts, persistent history, notifications, and additional endpoints are outside MVP scope.

Use the published schemas and approved amendments for the wire contract, the Word spec for behavioral rules, and the implementation notes below for integration tests.

- [OpenAPI v1.2](../../BE_codex/docs/ScamShield_AI_OpenAPI_v1.2.yaml)
- [API specification v1.2](../../BE_codex/docs/ScamShield_AI_API_Spec_v1.2.docx)
- [Contract decisions](../../BE_codex/docs/CONTRACT_DECISIONS.md)

## API integration

All paths below are relative to the configured base ending in `/api/v1`. Send no authentication header. All successes are HTTP 200 JSON.

| Operation | Request | Response |
| --- | --- | --- |
| GET /health | No body | `{ status: 'ok', service: string, timestamp: string }`. Implementation returns `scamshield-backend` and UTC ISO timestamp. Process reachability only. |
| POST /analysis/text | JSON `{ text: string }` only. Trim before validating and sending, 1–5,000 characters. | Shared `AnalysisResponse` with `input_type: 'TEXT'`. |
| POST /analysis/images | Multipart, 1–5 repeated `images` parts, oldest first. Optional single `context` string up to 1,000 characters. | Shared `AnalysisResponse` with `input_type: 'IMAGE'`, including for one image. |
| POST /guidance/emergency | JSON `{ scenario: EmergencyScenario, scam_category?: ScamCategory }`. Omit an unused category. Null and unknown fields fail validation. | `{ scenario: EmergencyScenario, title: string, urgency: EmergencyUrgency, steps: string[] }`. Preserve step order. |

### TypeScript model inventory

Use readonly literal arrays and derived unions for enum values. Mirror snake_case wire names and preserve the camelCase error envelope. Parse incoming JSON as unknown before narrowing with small boundary decoders. Keep wire models distinct from local drafts and display copy.

| Type | Exact wire values |
| --- | --- |
| InputType | TEXT, IMAGE |
| RiskLevel | SAFE, SUSPICIOUS, DANGER, UNABLE_TO_ASSESS |
| ScamCategory | BANK_IMPERSONATION, GOVERNMENT_IMPERSONATION, PHISHING, OTP_THEFT, FINANCIAL_FRAUD, FAKE_RECRUITMENT, FAKE_DELIVERY, SOCIAL_ENGINEERING, OTHER, NONE |
| SignalType | URGENCY, THREAT, CREDENTIAL_REQUEST, MONEY_REQUEST, IMPERSONATION, SUSPICIOUS_URL, TOO_GOOD_TO_BE_TRUE, OTHER |
| UrlSignal | IP_HOST, PUNYCODE, SHORTENER, MISLEADING_SUBDOMAIN, USERINFO_AT, LONG_URL, HTTP_ONLY |
| EmergencyScenario | NOT_INTERACTED, CLICKED_LINK, SHARED_CREDENTIALS, SHARED_OTP, TRANSFERRED_MONEY, INSTALLED_APP |
| EmergencyUrgency | LOW, MEDIUM, HIGH |
| ImageMediaType | image/jpeg, image/png, image/webp |

```ts
interface Evidence {
  quote: string
  reason: string
  signal_type: SignalType
  image_index: number | null
}

interface DetectedUrl {
  url: string
  signals: UrlSignal[]
  is_verified_malicious: false
}

interface AnalysisResponse {
  analysis_id: string
  input_type: InputType
  risk_score: number | null
  risk_level: RiskLevel
  scam_category: ScamCategory
  summary: string
  evidence: Evidence[]
  detected_urls: DetectedUrl[]
  recommended_actions: string[]
  speech_summary: string
  analyzed_at: string
}

interface ErrorResponse {
  statusCode: number
  errorCode: ErrorCode
  message: string
  requestId: string
  timestamp: string
}
```

Validate required fields, literal values, array elements, integer fields, UUIDs and date-time strings at the API boundary. Check that analysis input type matches the submitted route and that guidance echoes the submitted scenario. Backend risk bands are SAFE 0–39, SUSPICIOUS 40–74, DANGER 75–100 and UNABLE_TO_ASSESS null. Use these relationships to detect a malformed response. Always render the server's risk level and omit score for null. The score is a heuristic and the UI omits numeric scoring for MVP. Treat an out-of-range image index or non-null text index as invalid response data. Use the submitted image snapshot when resolving indices. UI labels start at one. Highlight text only when there is a literal match in the submitted text. Treat URLs as inert text. The literal false flag represents the absence of a verified malicious finding and provides no safety assurance. The UUID is ephemeral and has no lookup endpoint.

### Validation and multipart

- Match the backend's installed validator length semantics with shared tests for surrogate pairs and presentation selectors. It subtracts surrogate pairs and matched base-plus-U+FE0E/U+FE0F presentation sequences from UTF-16 length. NFC normalization is not part of the request validation. Use the same helper for the counter and submit validation. Trim text before counting. Count context as entered and omit the part when empty. Keep the full pasted text visible when it exceeds the limit so the user can edit it.
- Select photos using `expo-image-picker` with multiple image selection and the remaining-slot limit where supported. Start with library selection for screenshots. Handle cancel as a no-op, provider or permission failure as recoverable, and Android activity recreation with `getPendingResultAsync` routed through the same validation path. Recovered selections start a new draft if the prior draft was lost. Require review and an explicit submit.
- Inspect the actual upload file using `expo-file-system` when picker metadata is missing or unreliable. Confirm readable URI and size and check a bounded header for JPEG, PNG or WebP when determining the upload MIME. Resolve inaccessible URIs through a scoped local cache copy only where supported. Preserve originals and reject unreadable or unsupported files with per-item recovery. Defer transcoding. Use neutral filenames with the matching extension. The backend is authoritative for signature and full decode. Surface the current server's 16,000,000 decoded pixel limit as a possible cause of an invalid image. Avoid adding it to the public size contract.
- Enforce 5,242,880 bytes per file and 20,971,520 bytes in total across the files. Context and multipart overhead are excluded. Preview, remove, and explicitly reorder files using accessible move-up and move-down controls. Submit the order shown. Snapshot stable image identifiers and local URIs, and append each URI descriptor with `uri`, `name`, and `type` under the exact key `images`. Keep the React Native-specific FormData typing inside the adapter and verify it on-device. Let the networking runtime generate the Content-Type and boundary. Avoid loading file bodies as base64 in JS.
- Distinguish files supplied by the system picker from copies owned by the app. Clean up app-owned copies after removal or when neither a draft nor the current result holds a reference. Keep drafts and results in memory. Never delete source gallery assets. Sweep abandoned app-owned temporary files on a later launch.

### Errors and timeouts

| HTTP | ErrorCode | Frontend recovery |
| --- | --- | --- |
| 400 | INVALID_INPUT | Keep the draft and show a field-specific hint where possible. |
| 400 | UNSUPPORTED_IMAGE_FORMAT, INVALID_IMAGE | Explain allowed formats or unreadable file. Let the user replace individual files. Avoid guessing the offending file if the backend supplies no index. |
| 413 | IMAGE_TOO_LARGE | Show per-file and total limits in the image flow. In text, handle 413 generically as a request-size failure. |
| 429 | RATE_LIMIT_EXCEEDED | Preserve draft. Respect a valid Retry-After delay (support seconds or date). Missing or malformed header gets a generic wait message. |
| 502 | AI_INVALID_RESPONSE, AI_PROVIDER_ERROR | Show temporary analysis failure and manual retry. |
| 503 | AI_PROVIDER_ERROR | Show temporary unavailability and manual retry. |
| 504 | AI_TIMEOUT | Show server analysis timeout and manual retry. |
| 500 | INTERNAL_ERROR | Show generic service failure and manual retry. |

Use known codes to select Vietnamese copy. Parse the envelope defensively and fall back by actual HTTP status for unknown codes, HTML gateway responses, or malformed error JSON. Retain a valid `requestId` or `X-Request-Id` for support. Log only sanitized technical metadata in development. A malformed 200 is a response-format failure. Transport failure, device deadline, cancellation, and valid HTTP 200 UNABLE_TO_ASSESS are distinct outcomes.

Wrap fetch with one AbortController per request and keep the 60,000 ms analysis deadline active through response consumption. Mark whether an abort came from the deadline or the user, cancel on owner exit, clear timers in finally, and ignore completions from canceled or superseded requests. The backend sets a 45,000 ms upstream timeout and disables OpenAI SDK retries. Validation, upload and decode take additional time. A device abort does not establish that server work stopped. Propose a separate 10,000 ms client deadline for health and guidance, neither of which calls OpenAI. Use manual retries only. Do not gate emergency guidance or analysis on a health probe.

### Contract comparison and observed behavior

| Finding | Phase 2 handling |
| --- | --- |
| OpenAPI declares image-size 413 for text. DOCX and TextRequestDto use 400 INVALID_INPUT above 5,000 characters after trim. | Keep the published declaration. Test 400 for DTO length and a generic fallback for any 413. |
| YAML raw string lengths omit trim semantics. Current validator counts some Unicode sequences differently from JS string length. | Follow DTO behavior for UX, document the counting gap and test boundary cases. |
| Multipart handler rejects extra or repeated fields, wrong field names, missing files, too many files and malformed multipart with INVALID_INPUT. Recognized unsupported signatures and failed decodes get distinct 400 codes. Pixel and parser guardrails go beyond published limits. | Treat those as observed behaviors, not new promises. The installed Multer offsets Busboy file, field and part limits to preserve inclusive maxima. Verify exactly 5 MiB and five files plus context on the running stack. |
| Global DTO validation rejects unknown guidance keys. The service validates but currently ignores `scam_category` and selects steps by scenario only. | Send a scenario only for MVP. Do not promise tailored emergency advice. |
| Health documents only 200. The filter builds the common envelope for caught exceptions and the analysis guard currently sends Retry-After on 429. Gateway responses can differ. | Support optional headers and generic non-JSON failures. |
| Mock AI returns an insufficient candidate for every valid image submission. The mapper can replace the provider summary with generic image copy. Mock text uses deterministic rules and can also yield UNABLE_TO_ASSESS. | Mock images test multipart validation and the insufficient state. Use synthetic FE response fixtures for other image result states, and controlled real-mode tests for actual image interpretation. Never infer mock mode from the API response. |

Source inspection covered [controllers and DTOs](../../BE_codex/src/analysis/analysis.controller.ts), [multipart validation](../../BE_codex/src/analysis/image-upload.ts), [global validation](../../BE_codex/src/configure-app.ts), [error filter](../../BE_codex/src/common/http/api-exception.filter.ts), [OpenAI provider](../../BE_codex/src/ai/openai-analysis.provider.ts), [mock provider](../../BE_codex/src/ai/mock-ai-analysis.provider.ts), [response mapper](../../BE_codex/src/analysis/analysis-response.mapper.ts), and [guidance service](../../BE_codex/src/guidance/guidance.service.ts). These findings are from source inspection.

## Project layout and state ownership

```text
src/
  app/
    _layout.tsx
    index.tsx
    analysis/text.tsx
    analysis/images.tsx
    analysis/result.tsx
    emergency.tsx
  components/ui/            Screen, AppText, Button, Card, FormField, InlineNotice
  features/analysis/        drafts, validation, image adapter, result, speech
  features/guidance/        scenario copy, selection, guidance presentation
  lib/api/                  client, endpoints, models, decoders, error normalization
  config/                   public environment and deadlines
  theme/                    colors, typography, spacing and semantic tokens
  copy/                     shared Vietnamese labels and error strings
```

Use a typed Expo Router Stack. Thin routes compose feature modules. Root layout provides theme, safe area and a single in-memory analysis session. Drafts stay with their form while it is on the stack. Successful submit stores one result and submitted source snapshot, then pushes Result. Back returns to the originating draft. Clear the result when leaving it except when Emergency is pushed above it. Starting over clears the session and returns Home. On missing result after reload or direct entry, show a recovery CTA to Home. Route paths and params carry no evidence, URIs or result content. Emergency is reachable from Home and Result and returns to its entry screen. See [screen states](DESIGN_SYSTEM.md).

Use React state for draft inputs and a small reducer or request hook for idle, submitting, success and failure. Use a synchronous in-flight guard to block double taps and an attempt ID for latest-result ownership. Disable editing the submitted snapshot until cancellation or completion. Preserve the draft on error. Guidance scenario changes cancel or invalidate the previous request and clear its steps immediately. Derive form validity and byte totals from source state. Keep native IO and fetch out of presentational components.

## Environment and privacy

Set `EXPO_PUBLIC_API_BASE_URL` in `FE_codex/.env.local` and reload Expo Go after changes. With NestJS on the emulator's host, use `EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3000`. The client appends `/api/v1` once and accepts the versioned base in the contract for compatibility. Physical devices need a reachable development LAN host or HTTPS endpoint. The client permits HTTP only in development. Native Android builds can still require debug cleartext configuration. Set an explicit HTTPS origin in the release environment. Expo embeds `EXPO_PUBLIC_*` values in the bundle. Keep OpenAI keys and mock configuration in the backend environment.

Phase 3A adds [the JSON client](../src/lib/api/httpClient.ts) and [the health operation](../src/lib/api/health.ts). Call `getHealth({ signal })` for a typed response or a safe `ApiError`. Health checks backend process reachability and defaults to a 10-second deadline. The reusable client defaults to 60 seconds and applies the deadline through response body reading. HTTP errors retain the status and a valid request ID when available. The client does not retain raw errors or response bodies in the error object. Run `node --test tests/httpClient.test.mjs` for mocked transport tests. Phase 3A leaves the screens independent of this layer.

Phase 3B connects Text Analysis through [analyzeText](../src/lib/api/textAnalysis.ts). The service sends trimmed text to `POST /api/v1/analysis/text` and validates the response against v1.2 and the expected `TEXT` input type. Leaving the form cancels its active request. The form retains its draft when a request fails or the user returns from Result. On success, a single in-memory handoff under the root layout stages the response before pushing Result. The destination takes ownership and clears the handoff. Analysis content is absent from route parameters and storage. The explicit development demo parameter is the only entry for fixtures. Run `node --test tests/textAnalysis.test.mjs` for mocked integration tests.

Phase 3C connects Image Analysis through [analyzeImages](../src/lib/api/imageAnalysis.ts). The service checks the draft, reopens each local file to verify its size and signature, then appends URI-backed Expo File objects under repeated `images` fields in the displayed order. Optional non-empty context is sent verbatim within the 1,000-character limit. Expo SDK 58's default fetch encodes the multipart body and generates its boundary. It reads the original bytes without base64 or transcoding. The same cancellation, retry, and in-memory result handoff apply to both forms. The result must have `input_type: IMAGE` and any numeric evidence index must be within the submitted list. The backend still validates full image integrity. Run `node --test tests/imageAnalysis.test.mjs` for mocked upload tests.

Phase 3D connects Emergency Guidance through [getEmergencyGuidance](../src/lib/api/emergency.ts). The Steps route sends the chosen scenario to `POST /api/v1/guidance/emergency` with a 10-second deadline. A validated category from a live analysis is transferred in memory and sent when available. The selected scenario and category stay available for retry. The response must match the selected scenario and is rendered in the returned order. Leaving the Steps route cancels its active request. The development demo remains explicit and does not call the endpoint. Run `node --test tests/emergencyApi.test.mjs` for mocked guidance tests.

Give a short disclosure beside both submit actions that the evidence is sent for analysis and may be processed by an AI provider. Ask users to hide passwords, OTPs, or unrelated personal information. Never log text, screenshots, context, URLs, speech or raw response bodies. TTS is opt-in using local platform speech with `speech_summary` and a Vietnamese voice when available. Stop on navigation away and keep the written summary usable if no suitable voice is installed.

See [dependency and test sequence](IMPLEMENTATION_PLAN.md).
