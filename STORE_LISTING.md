# Chrome Web Store Listing

## Short Description (132 chars max)
Compare ChatGPT, Claude & Perplexity responses side-by-side using your existing authenticated tabs. No API keys required.

## Detailed Description (max 16,000 chars)
Model Judge MVP helps you compare responses from multiple AI assistants without changing your workflow. Instead of copying prompts between tools, you can select text on any page, open the extension side panel, and run the same prompt across ChatGPT, Claude, and Perplexity tabs you already have open.

This extension is built for researchers, developers, writers, and power users who evaluate model output quality across providers. Whether you are validating facts, comparing writing styles, or testing prompt strategies, Model Judge MVP keeps the process fast and consistent.

Key design principles are zero-friction setup and privacy-first behavior. You do not need API keys or external accounts for the extension itself. It uses local browser storage for settings and prompt templates, and automation runs only against tabs where you are already authenticated.

The workflow is simple: select text on a webpage, refresh selection and tab detection in the side panel, customize your prompt template (using `{{selection}}`), and run provider automation. Results and debug context stay visible in the side panel so you can iterate quickly.

## Key Features (bullet list)
- Zero-friction setup: Use your existing logged-in AI tabs
- Privacy-first: All processing happens locally in your browser
- Multi-provider: Compare ChatGPT, Claude, and Perplexity responses
- Customizable prompts: Edit templates with {{selection}} placeholder
- Debug-friendly: Real-time logs in the side panel

## How to Use
1. Open any regular webpage and highlight the text you want to compare.
2. Open Model Judge MVP in the Chrome side panel.
3. Click **Refresh selection + tabs** to capture selection and detect provider tabs.
4. Edit your prompt template if needed (use `{{selection}}` for injected text).
5. Click provider run actions to automate prompt entry in your open AI tabs.
