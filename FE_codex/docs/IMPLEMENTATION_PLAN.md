# ScamShield AI implementation plan

## Phase 1 approval

Review the [frontend architecture](FRONTEND_ARCHITECTURE.md) and [mobile design system](DESIGN_SYSTEM.md) before authorizing app changes. The current scope is the three planning documents. Preserve the approved v1.2 API and keep all future frontend changes in FE_codex.

## Dependencies after approval

| Dependency | Purpose |
| --- | --- |
| Existing Expo, React, React Native, TypeScript and expo-status-bar | Retain the SDK 58 scaffold and platform primitives. |
| expo-router, react-native-safe-area-context, react-native-screens, expo-linking, expo-constants | Stack routing and its SDK dependencies. Retain the existing expo-status-bar. |
| expo-image-picker and expo-file-system | System image selection, upload metadata, bounded signature read and temporary file handling. |
| expo-clipboard | User-initiated paste. System editor paste remains available. |
| expo-speech | Device speech for the API's Vietnamese summary. |
| @expo/vector-icons and expo-font | One outline icon family and its font loader. |
| eslint and eslint-config-expo | Development lint once code changes begin. |
| jest-expo, jest, @types/jest and @testing-library/react-native | Development-only SDK-matched unit and component testing. Verify React 19 renderer peer requirements at setup. |
| expo-build-properties or expo-dev-client | Conditional. Add build properties only if required for the development cleartext configuration. Use a custom development client if native configuration or module support requires it. |

Resolve Expo and native package versions via `npx expo install`. Verify the actual SDK 58 project dependency tree after installation. Use React hooks, fetch, AbortController, FormData and StyleSheet for the MVP. No additional server-state, form, schema, navigation, persistence, animation or design-system framework is planned.

- [Expo SDK 58 reference](https://docs.expo.dev/versions/v58.0.0/)
- [Expo Router installation](https://docs.expo.dev/router/installation/)
- [SDK 58 ImagePicker](https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/)
- [SDK 58 FileSystem](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/)
- [SDK 58 Clipboard](https://docs.expo.dev/versions/v58.0.0/sdk/clipboard/)
- [SDK 58 Speech](https://docs.expo.dev/versions/v58.0.0/sdk/speech/)
- [Expo icon guide](https://docs.expo.dev/guides/icons/)

## Implementation sequence

1. **Bootstrap navigation and theme.** Switch the entry to `expo-router/entry`. Set up the five routes and shared layout, typography, palette and controls. Build Home and verify Android hardware Back and safe-area behavior. Confirm no extra user-facing routes.
2. **Build the API boundary.** Add typed models, runtime decoders, centralized environment config, request cancellation and Vietnamese errors. Verify the emulator can reach health using the development base URL. Add lint, typecheck and contract-focused unit checks before integrating feature screens.
3. **Deliver the text vertical slice.** Build the editor, paste, validation, submit and cancel. Implement the shared result layout, in-memory session, four risk treatments and opt-in speech. Verify back to edit, start over and missing session recovery.
4. **Integrate image analysis.** Implement picker recovery, size/type validation, previews, ordering and multipart upload. Verify labels and image evidence against the submitted order. Test valid uploads in Mock AI and assessed results using local FE fixtures.
5. **Integrate emergency guidance.** Add scenario selection and deterministic API steps. Verify it is reachable from Home and Result, handles all six scenarios, and still works when the AI provider is unavailable. Verify the failure message and static fallback.
6. **Run Android acceptance and review release configuration.** Verify the Pixel 8 API 35 emulator, then a smaller viewport and large fonts. Test a production-like HTTPS build after the host is known. Test the real image path with synthetic examples if an authorized non-mock environment is available.

## Verification matrix

| Layer | Cases |
| --- | --- |
| Unit | Trim and empty text, 1/5,000/5,001 characters, emoji and variation selectors, context 1,000/1,001, 0/1/5/6 files, exact and excess per-file and total limits, unsupported signatures and inaccessible metadata. Use byte counts from the upload descriptors. |
| API adapter | JSON keys and headers, ordered repeated `images`, absent multipart header override, optional context, risk-band boundaries, null score, input type and indices, enum drift, malformed 200, every documented error code, non-JSON gateway failure, optional Retry-After and request ID. |
| Request state | Double submit, device deadline at 60,000 ms, backend 504 before deadline, manual retry, cancel, back during loading, stale completions after newer requests and slow guidance after scenario change. |
| Components | All four statuses using copy and icon as well as color, actionable empty/error states, no clickable suspect URLs, available and unavailable Vietnamese speech, optional section omission, radio row labels, and pending action feedback. |
| Android emulator | Health, text to Result, one and multiple images, five files plus context, exactly 5 MiB and 20 MiB, Mock AI insufficient result, native picker cancellation and activity recreation, interrupted upload, back stack, text-to-speech and all emergency scenarios. |
| Accessibility and privacy | TalkBack order and announcements, large font/keyboard/insets, touch targets and contrast. Confirm temporary data clears when its owning flow ends, no draft or result survives a cold start, and development logs contain only sanitized request metadata. |

Run `npx expo lint`, `npx tsc --noEmit`, and the selected test suite before implementation handoff. Use manual emulator checks for native behavior until repeated regressions justify an automated device suite.

## Open decisions and release checks

- Confirm the production HTTPS host, development cleartext needs, and access to a real-mode environment for image acceptance. The 60-second device deadline covers the complete analysis exchange, including upload, while the backend's 45-second setting applies upstream. Measure large uploads and keep the timeout recovery clear.
- Confirm exact upload boundary behavior over HTTP and the image response on controlled readable, unreadable and partially readable samples. The implementation's decode guardrails and Mock AI behavior are recorded in the architecture. A live finding that conflicts with v1.2 goes back to the contract owner.
- Confirm Vietnamese voice availability on target Android devices and review Vietnamese labels and the evidence-processing disclosure before public release. Written instructions are the default when speech is unavailable.
- Keep the approved payload unchanged if the upstream returns provider errors, if the gateway emits a different envelope, or if optional guidance category behavior evolves. Track any contract decision explicitly before changing the client.
