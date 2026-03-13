# Model Judge MVP

A Chrome side-panel extension for tab-automation based prompting against already-open AI tabs.

## Canonical source layout
The canonical development layout is checked in directly under this repository (for example `src/background`, `src/sidepanel`, `src/lib`, `src/providers`, and `src/shared`).

No manual unzip step is required for local development.

## Current capabilities (active MVP)
- safe selected-text capture from current page
- open-tab detection for ChatGPT, Claude, and Perplexity
- prompt template editing with `{{selection}}` placeholder
- ChatGPT, Claude, and Perplexity automation runs from the side panel
- service-worker debug log output in the panel


## Screenshots

Binary screenshot files are not stored in this repository. Regeneration steps and expected filenames are documented in `docs/screenshots/README.md`.

## Inactive API comparison modules

The project previously contained an API-key based compare architecture. Those modules are intentionally archived under:

- `src/legacy/api-flow/providers`
- `src/legacy/api-flow/lib`
- `src/legacy/api-flow/sidepanel/components`

These legacy files are currently **not wired** into `src/sidepanel/App.tsx` and are kept for reference only.

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

## Versioning strategy
- `manifest.json` is the leading source for the Chrome Web Store version (`manifest.version`).
- `package.json` mirrors the same version for local tooling and release consistency.
- Use `npm run validate:version-sync` to ensure both files stay aligned.
- `npm run release:check` now includes version-sync validation to prevent version drift before packaging.

## Development scripts
- `npm run dev` — run Vite in development mode
- `npm run typecheck` — run TypeScript checks
- `npm run build` — produce a production build
- `npm run validate:build-targets` — verify manifest build targets exist in `dist/` (`serviceWorker.js` and `src/sidepanel/index.html`)
- `npm run release:check` — run the full release gate (`npm run build` + `npm run validate:build-targets` + `npm run validate:version-sync`)
- `npm run validate:version-sync` — verify `package.json` and `manifest.json` versions are identical
- `npm run release:source-zip` — generate `model-judge-mvp.zip` from the current git commit for release/CI artifacts
- `npm run release:package-extension` — zip the built `dist/` output into `model-judge-mvp-extension.zip` for Chrome Web Store upload
- `npm run release:ship` — one-command release flow (`assets:generate-icons` + `build` + `validate:build-targets` + extension zip packaging)


## Dependency security workflow
- `npm run audit` — check known dependency vulnerabilities
- `npm run audit:fix` — apply non-breaking security fixes
- `npm run audit:fix:force` — apply all security fixes, including potential breaking updates

Recommended sequence after `npm install`:
1. Run `npm run audit`.
2. If issues are reported, run `npm run audit:fix`.
3. Re-run `npm run audit` and then `npm run build` to verify the extension still compiles.
4. Use `npm run audit:fix:force` only when needed, then validate behavior manually in Chrome.

## Run (tab automation MVP)
1. Open a normal content webpage.
2. Select text.
3. Click the extension icon to open the side panel.
4. Click `Refresh selection + tabs` to fetch current selection and detected provider tabs.
5. Ensure an authenticated provider tab is open (ChatGPT, Claude, or Perplexity).
6. Edit the prompt template if needed.
7. Click the provider run button (`Run ChatGPT`, `Run Claude`, or `Run Perplexity`).
8. Review the response and debug logs.

## Security posture
- Manifest V3
- no hardcoded shared provider keys
- on-demand selection capture only
- exclusion support for sensitive domains
- local-only history by default

## Architecture note
The active architecture favors browser-tab automation to validate UX quickly. Archived API-based code remains in `src/legacy/api-flow` for future iterations.
