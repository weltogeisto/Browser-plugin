# Model Judge MVP

A Chrome side-panel extension for comparing two AI providers on the same selected browser text.

## Current capabilities
- safe selected-text capture from current page
- 2-provider comparison flow
- provider support for OpenAI, Anthropic, and Perplexity
- local history
- exclusion patterns
- truncation notices
- copy and markdown export

## Install locally in Chrome
1. Install dependencies.
2. Build the extension.
3. Open Chrome and go to `chrome://extensions`.
4. Enable Developer mode.
5. Click `Load unpacked`.
6. Select the project folder.

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
