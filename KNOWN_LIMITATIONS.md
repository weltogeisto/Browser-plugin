# Known Limitations

## Architecture
- Uses direct provider API calls with user-owned keys
- Not yet suitable for enterprise shared-key deployment

## Comparison quality
- Cross-provider fairness is improved but not perfect
- Different providers may format answers differently even with normalized prompts
- Research-style outputs are not always directly comparable to non-research outputs

## Permissions and capture
- Some pages cannot be accessed by Chrome extension scripting
- Excluded domains may block valid pages if patterns are broad

## UX
- No cloud sync
- No team workspace
- No automatic winner judging
- No tab-wide or multi-page research mode

## Storage
- History is local only
- No encryption layer beyond browser storage behavior

## Provider execution coverage
- ChatGPT, Claude, and Perplexity execution are all implemented via browser-tab automation
- Provider automations rely on DOM selectors and can break when provider UIs change
