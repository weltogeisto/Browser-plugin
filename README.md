# Model Judge MVP

A Chrome side-panel extension for comparing two AI providers on the same selected browser text.

## Canonical source layout
The canonical development layout is checked in directly under this repository (for example `src/background`, `src/sidepanel`, `src/lib`, `src/providers`, and `src/shared`).

No manual unzip step is required for local development.

## Current capabilities
- selected-text capture from the active tab (when scripting is allowed)
- detection of open provider tabs for ChatGPT, Claude, and Perplexity
- ChatGPT tab automation run path (inject prompt, submit, wait for response)
- side-panel debug log view sourced from service-worker events

## Install locally in Chrome
1. Install dependencies:
   ```bash
   npm install
   ```
2. Build the extension:
   ```bash
   npm run build
   ```
3. Open Chrome and go to `chrome://extensions`.
4. Enable Developer mode.
5. Click `Load unpacked`.
6. Select the project folder (or `dist/` if your local workflow expects built assets there).

## Development scripts
- `npm run dev` — run Vite in development mode
- `npm run typecheck` — run TypeScript checks
- `npm run build` — produce a production build
- `npm run release:source-zip` — generate `model-judge-mvp.zip` from the current git commit for release/CI artifacts


## Dependency security workflow
- `npm run audit` — check known dependency vulnerabilities
- `npm run audit:fix` — apply non-breaking security fixes
- `npm run audit:fix:force` — apply all security fixes, including potential breaking updates

Recommended sequence after `npm install`:
1. Run `npm run audit`.
2. If issues are reported, run `npm run audit:fix`.
3. Re-run `npm run audit` and then `npm run build` to verify the extension still compiles.
4. Use `npm run audit:fix:force` only when needed, then validate behavior manually in Chrome.

## Run
1. Open a normal content webpage.
2. Select text on that page.
3. Open ChatGPT in another tab and make sure the chat UI is ready.
4. Click the extension icon to open the side panel.
5. Click **Refresh selection + tabs**.
6. Optionally adjust the prompt template.
7. Click **Run ChatGPT**.
8. Review the ChatGPT result and debug log output in the panel.

## Security posture
- Manifest V3
- no hardcoded shared provider keys
- on-demand selection capture only
- exclusion support for sensitive domains
- local-only history by default

## Architecture note
This MVP uses user-supplied provider keys directly from the extension runtime. That is acceptable for personal MVP use, but not the final enterprise architecture.
