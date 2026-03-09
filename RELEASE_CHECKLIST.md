# Release Checklist

## Build
- [ ] `npm install` or `pnpm install`
- [ ] `npm run release:ship` completes without errors (recommended one-command path)
- [ ] OR: `npm run build` completes without errors
- [ ] `npm run validate:build-targets` confirms manifest targets exist in `dist/` (`serviceWorker.js` and `src/sidepanel/index.html`)
- [ ] `model-judge-mvp-extension.zip` exists in the repo root and is ready for upload
- [ ] manifest loads in Chrome

## Install
- [ ] extension loads via `Load unpacked`
- [ ] side panel opens from toolbar action

## Core flow
- [ ] selected text appears in side panel
- [ ] settings save correctly
- [ ] remote-send notice blocks first compare until acknowledged
- [ ] ChatGPT tab detected and executable from panel
- [ ] Claude tab detected and executable from panel
- [ ] Perplexity tab detected and executable from panel
- [ ] provider run returns output or clean isolated error
- [ ] history/log visibility persists after panel reload

## Hardening
- [ ] excluded page blocks compare clearly
- [ ] truncation notice appears for long text
- [ ] export markdown works
- [ ] copy winner works
