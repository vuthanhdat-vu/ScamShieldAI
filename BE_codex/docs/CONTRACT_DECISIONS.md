# ScamShield AI API contract decisions

## Authority and compatibility

The [v1.1 DOCX](ScamShield_AI_API_Spec_v1.1.docx) supplies detailed behavior and business rules. The [v1.1 OpenAPI document](ScamShield_AI_OpenAPI_v1.1.yaml) supplies the public interface. The approved amendments supersede the two sources where applicable. The old BA PDF is outside the requirements baseline.

The [v1.2 DOCX](ScamShield_AI_API_Spec_v1.2.docx) and [v1.2 OpenAPI document](ScamShield_AI_OpenAPI_v1.2.yaml) retain these routes and methods:

| Method | Route |
| --- | --- |
| GET | `/api/v1/health` |
| POST | `/api/v1/analysis/text` |
| POST | `/api/v1/analysis/images` |
| POST | `/api/v1/guidance/emergency` |

The contract release is `1.2.0`. The URL prefix stays `/api/v1`. The YAML preserves all operation IDs, request and response schemas, response statuses, field names, types, required fields, nullability, enums, and error codes.

## Approved amendments and frontend impact

| Area | Approved contract | Frontend impact |
| --- | --- | --- |
| Images | 1–5 JPEG, PNG, or WebP files. Maximum 5 MiB (5,242,880 bytes) per file and 20 MiB (20,971,520 bytes) across the image files. Context and multipart framing are outside the combined image count. The prior combined limit was 15 MiB. | Update any 15 MiB validation, help text, and fixtures to 20 MiB. Append each file under the same `images` key, oldest first. Keep optional `context` and let FormData generate the boundary. Keep handling HTTP 413 with `IMAGE_TOO_LARGE`. |
| Timeouts | OpenAI upstream timeout is 45 seconds, formerly 30. Recommended frontend timeout is 60 seconds, formerly 45. Health and emergency guidance make no OpenAI call. | Set the client deadline to the recommended 60 seconds. Keep handling server HTTP 504 with `AI_TIMEOUT` and client-side timeouts separately. The recommended client timeout is guidance, and the upstream timeout does not define a total request SLA. |
| Scope | Anonymous and stateless. No JWT, database, Family Guardian, audio analysis, persistent history, or automatic notifications. | Requests require no auth token. Local text-to-speech still consumes `speech_summary`. `analysis_id` does not support history lookup. |

The YAML expresses file count and MIME types in the multipart definition. It documents byte limits and timeouts in descriptions. Those descriptions do not make generated clients enforce the limits.

## Differences carried forward from v1.1

| Area | DOCX and YAML difference | v1.2 treatment |
| --- | --- | --- |
| Text HTTP 413 | YAML declares an image-size 413 on text analysis. DOCX §5 uses 400 `INVALID_INPUT` for invalid text or text over its limit, and §9 ties `IMAGE_TOO_LARGE` to image bytes. | Keep the published 413 declaration. It supplies no rule for mapping oversized text to `IMAGE_TOO_LARGE`. |
| Text length | DOCX §§2 and 5 validate length after trimming. YAML `minLength` and `maxLength` describe the JSON string and cannot perform trimming. | Keep both. Generated validation of the raw value can reject a padded string that would fit after trim, or accept whitespace that the server rejects. |
| JSON naming | DOCX §2 describes snake_case generally. DOCX §9 and YAML both define the same camelCase error envelope. | Preserve `statusCode`, `errorCode`, `message`, `requestId`, and `timestamp` exactly. |
| Analysis relationships | DOCX §§6–7 tie the input type to the route, require `risk_score: null` for `UNABLE_TO_ASSESS`, map numeric scores to risk bands, and tie `image_index` to the input type and uploaded files. YAML uses a shared schema with independent fields. | The DOCX business rules still apply. Generated clients alone cannot verify those relationships. Keep handling HTTP 200 `UNABLE_TO_ASSESS` separately from provider failures. |
| Error mapping and headers | DOCX §9 maps statuses to codes and allows `Retry-After` on 429. YAML shares one error enum across statuses and declares no `Retry-After` header. The DOCX also describes a uniform JSON error envelope, while YAML documents only 200 on health. | Keep the status declarations and shared error schema. Do not assume every enum value is valid for every status, a 429 always has `Retry-After`, or health declares a typed non-200 response. |
| Behavioral details | YAML leaves `service` as a string, while the health example uses `scamshield-backend`. DOCX describes UTC timestamps, signature and decode checks, one multimodal analysis, Vietnamese analysis summaries, and deterministic guidance. YAML gives shapes and selected format constraints. | Keep existing schema constraints and behavior. The health example does not establish a new enum or constant. |

## Remaining ambiguities

- **Request validation and parser failures.** The sources do not assign an explicit error code to more than five images, define treatment of unknown or repeated multipart fields, specify whether unknown emergency JSON keys are rejected, or map malformed multipart, unsupported request media types, and gateway rejections to the JSON envelope. Missing images, unsupported image formats, invalid files, and excess image bytes retain their existing documented mappings. Precedence when several checks fail is unspecified. Unicode length counting and normalization for `text` and `context` are also unspecified.
- **Image classification and ordering.** DOCX distinguishes a valid but unreadable image (200 `UNABLE_TO_ASSESS`) from corrupt or unsupported files (400). It does not specify a readability threshold, what to do if only some valid images are readable, or how to classify an unrecognized signature between `INVALID_IMAGE` and `UNSUPPORTED_IMAGE_FORMAT`. DOCX §11 says to order images, while §§2 and 6 preserve submitted multipart order. No independent chronology or reordering method is defined. Pixel, decode-resource, and whole-request limits beyond the approved image bytes are unspecified.
- **Timeouts, retries, and throttling.** DOCX §5 describes one AI call, while §10 allows zero or one conditional retry. Retry eligibility, whether the 45 seconds covers one attempt or the whole upstream interaction if retried, gateway deadlines, and exact distinctions between 502 and 503 provider errors remain open. The rate-limit identity, thresholds, windows, concurrency and budget rules, and when to send `Retry-After` are also unspecified.
- **Analysis output policy.** Risk bands are documented, but weights, normalization, deduplication, and category tie-breaking are unspecified. The v1.1 DOCX labels thresholds as subject to testing. The image example pairs `UNABLE_TO_ASSESS` with `NONE` and empty evidence and URLs. The sources do not define whether those three values must always accompany that result or when text can return it. Exact URL heuristic thresholds, evidence matching rules beyond the documented checks, and output length bounds are unspecified. DOCX §14 still lists the no-full-OCR-transcript and evidence-index decisions for team review. The published response has evidence and image indices, with no transcript or bounding-box fields.
- **Emergency guidance and deployment.** The contract gives six scenarios and one complete example. It does not fully specify the urgency and step text for every scenario or how an optional `scam_category` changes guidance. A production base URL, CORS allowlist, and operational behavior of health on failure remain unspecified.

## Verification

The v1.2 YAML declares OpenAPI 3.0.3 and passed Draft 4 validation against the [OpenAPI Initiative 3.0 schema](https://spec.openapis.org/oas/3.0/schema/2024-10-18). Local references resolve, and operation IDs are unique. A parsed comparison with v1.1 found changes only in the API version, API description, and image operation description. SHA-256 hashes confirmed both v1.1 files are byte-for-byte intact. Validation covers the contract documents. Runtime behavior has not been tested.

