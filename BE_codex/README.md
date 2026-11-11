# ScamShield AI backend

The backend serves the anonymous ScamShield AI API in mock mode by default. Phase 3 adds an OpenAI Responses API adapter verified offline. The [approved OpenAPI contract](docs/ScamShield_AI_OpenAPI_v1.2.yaml), [behavioral specification](docs/ScamShield_AI_API_Spec_v1.2.docx), and [contract decisions](docs/CONTRACT_DECISIONS.md) define the interface and behavior.

## Start locally

Use Node.js 22 or newer and npm. From the `BE_codex` directory in PowerShell:

```powershell
npm ci
npm run start:dev
```

The defaults are port 3000 and `MOCK_AI=true`. Mock mode requires no key or model.

Swagger UI is at [http://localhost:3000/api/docs](http://localhost:3000/api/docs) and uses the same host and port as the UI. The raw specification at `/api/docs-json` matches the approved YAML. If you change `PORT`, use that port in the manual requests below. Keep the `docs` directory alongside `dist` when deploying the compiled app. See the [frontend integration guide](docs/FRONTEND_INTEGRATION.md) for device URLs, browser CORS, and request examples.

## Try all four endpoints

```powershell
$api = 'http://localhost:3000/api/v1'

Invoke-RestMethod "$api/health"

Invoke-RestMethod "$api/analysis/text" -Method Post -ContentType 'application/json' `
  -Body (@{ text = 'Send your OTP urgently.' } | ConvertTo-Json -Compress)

# Replace the paths with real local JPEG, PNG, or WebP files.
curl.exe -i -F "images=@C:/path/oldest.jpg" -F "images=@C:/path/newest.png" `
  -F "context=Example conversation" "$api/analysis/images"

Invoke-RestMethod "$api/guidance/emergency" -Method Post -ContentType 'application/json' `
  -Body (@{ scenario = 'CLICKED_LINK'; scam_category = 'PHISHING' } | ConvertTo-Json -Compress)
```

- Health reports process availability with an ISO 8601 UTC timestamp.
- For text, try `Hello` for `SAFE`, `Vui lòng chuyển tiền` for `SUSPICIOUS`, `Gửi mã OTP ngay để tránh bị khóa tài khoản` for `DANGER`, and `OTP` or `...` for `UNABLE_TO_ASSESS`. Whitespace-only input returns HTTP 400. The mock uses limited action and warning patterns. See the [risk engine design](docs/RISK_ENGINE_DESIGN.md) for scoring and URL handling.
- Send 1–5 images under the same `images` key, oldest first, with optional `context` up to 1000 characters. Each file may be at most 5 MiB and the combined image data at most 20 MiB. The server validates file bytes in memory, regardless of the client-declared MIME type or filename extension. Oversize files return HTTP 413 `IMAGE_TOO_LARGE`. Recognizable unsupported formats return HTTP 400 `UNSUPPORTED_IMAGE_FORMAT`, while invalid signatures and decode failures return HTTP 400 `INVALID_IMAGE`. The decoder allows up to 16 million pixels per file across decoded frames. The image mock returns `UNABLE_TO_ASSESS` with a null score because it does not read screenshot content.
- Guidance selects fixed Vietnamese instructions by scenario. The optional `scam_category` is validated. Health and emergency guidance never call AI in either mode.

The analysis routes share a process-local limit of 60 requests per minute per client IP, with `Retry-After` on HTTP 429. Each process maintains its own counters. Requests receive a server-generated UUID in `X-Request-Id`. API errors include the same ID in `requestId`. HTTP logs omit request bodies, URLs, headers, and exception details.

## Enable OpenAI when a key is available

Choose a model that your OpenAI project can access and whose model page lists image input, the Responses endpoint, and Structured Outputs. For example, those capabilities are listed for the [GPT-4.1 mini model](https://developers.openai.com/api/docs/models/gpt-4.1-mini). Confirm project access before switching modes.

Set these values in the backend's private `.env` and restart the app. Replace the key placeholder with your actual project key.

```dotenv
MOCK_AI=false
OPENAI_API_KEY=<your-project-key>
OPENAI_MODEL=gpt-4.1-mini
```

Keep the key out of frontend configuration and source control. Startup fails with a configuration error if the key or model is blank in real mode. Set `MOCK_AI=true` and restart to return to offline development.

In real mode, submitted text, screenshots, and optional context are sent to OpenAI. Screenshots are submitted in order in one request, and the adapter requests `store: false`. It uses a 45-second upstream deadline and zero automatic retries. The backend validates strict structured output, checks text quotes against the input, and checks screenshot evidence indices against the submitted files. Image URLs are extracted only from accepted screenshot quotes. Screenshot transcription still depends on the model. The backend computes the public risk score and supplies fixed safety recommendations.

| Upstream outcome | Public response |
| --- | --- |
| Valid result with insufficient or unreadable material | HTTP 200 `UNABLE_TO_ASSESS`, with a null score |
| Invalid structured output, refusal, or incomplete response | HTTP 502 `AI_INVALID_RESPONSE` |
| Other provider error, such as invalid credentials or model configuration | HTTP 502 `AI_PROVIDER_ERROR` |
| Temporary provider failure, such as provider throttling or a connection failure | HTTP 503 `AI_PROVIDER_ERROR` |
| Upstream timeout | HTTP 504 `AI_TIMEOUT` |

Phase 3 tests use simulated SDK responses and an intercepted SDK transport. Live authentication, project model access, service acceptance of the multimodal payload and schema, screenshot transcription quality, and live latency, limits, and error behavior remain unverified. The offline prompt-injection tests verify input separation and backend safeguards. They do not measure a live model's resistance.

## Project layout

| Directory | Purpose |
| --- | --- |
| `src/analysis` | Analysis routes, DTOs, multipart validation, and rate limit |
| `src/ai` | Provider interface, mock and OpenAI adapters, and internal output schema |
| `src/risk`, `src/intelligence` | Mock risk scoring and local URL indicators |
| `src/guidance` | Emergency route, DTOs, and scenario instructions |
| `src/health` | Health route and DTO |
| `src/contracts`, `src/common/http` | Public enums, JSON request checks, error envelope, and request context |
| `src/config` | Startup environment validation |
| `test` | Unit, foundation, and mock API E2E tests |

## Checks

```powershell
npm run lint
npm run test
npm run test:e2e
npm run build
```

After a build, run `npm run start:prod` to launch the compiled application.

