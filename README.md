# Model Judge MVP

A Chrome side-panel extension for comparing two AI providers on the same selected browser text.

## Canonical source layout
The canonical development layout is checked in directly under this repository (for example `src/background`, `src/sidepanel`, `src/lib`, `src/providers`, and `src/shared`).

No manual unzip step is required for local development.

## Current capabilities
- safe selected-text capture from current page
- 2-provider comparison flow
- provider support for OpenAI, Anthropic, and Perplexity
- local history
- exclusion patterns
- truncation notices
- copy and markdown export

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
- `npm run validate:build-targets` — verify manifest build targets exist in `dist/` (`serviceWorker.js` and `src/sidepanel/index.html`)
- `npm run release:check` — run the full release gate (`npm run build` + `npm run validate:build-targets`)
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
2. Select text.
3. Click the extension icon to open the side panel.
4. Configure provider keys in Settings.
5. Acknowledge remote send notice.
6. Choose two providers.
7. Click Compare.
8. Review outputs and mark a winner.

## Security posture
- Manifest V3
- no hardcoded shared provider keys
- on-demand selection capture only
- exclusion support for sensitive domains
- local-only history by default

## Architecture note
This MVP uses user-supplied provider keys directly from the extension runtime. That is acceptable for personal MVP use, but not the final enterprise architecture.
