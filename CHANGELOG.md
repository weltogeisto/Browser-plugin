# Changelog

## 0.2.0
- Pivoted fully to tab-based automation — no API keys required
- Added Claude and Perplexity execution flows alongside ChatGPT
- Archived legacy API-key-based compare modules under `src/legacy/`
- Flattened dist/ output so Chrome loads the extension correctly
- Added auto-refresh polling for selection while side panel is idle
- Persisted last known selection so side panel focus doesn't wipe it
- Added one-command release packaging (`npm run release:ship`)
- Added build-target and version-sync validation scripts
- Replaced binary icon assets with a generated-icons workflow
- Fixed built extension icon paths in manifest
- Added Windows build helpers (`build:windows`, `build-windows.bat`)
- Added `autocomplete="off"` to prompt textarea
- Fixed selection detection on non-AI-provider pages
- Refactored sidepanel polling to a single interval effect
- Synchronized versioning between `package.json` and `manifest.json`

## 0.1.1-tab-automation-mvp
- Clarified current execution model: side panel captures selection and detects provider tabs
- Implemented ChatGPT tab automation path for prompt injection, submit, and response polling
- Added service-worker debug log visibility in the side panel state
- Documented that Claude and Perplexity adapters are currently placeholders

## 0.1.0-mvp
- Added secure MV3 side-panel extension shell
- Added on-demand selected-text capture
- Added provider comparison flow
- Added OpenAI, Anthropic, and Perplexity provider integrations
- Added provider settings and explicit remote-send acknowledgement
- Added local comparison history
- Added exclusion patterns and truncation notices
- Added copy/export actions
- Added provider validation and clearer error states
