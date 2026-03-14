import { TAB_ADAPTERS } from '../providers/tabAdapters';
import type {
  CompareResult,
  ExtensionMessage,
  PanelStateResponse,
  ProviderId,
  ProviderTabInfo,
  RunCompareRequest,
  RunProviderRequest,
  SelectionResult,
} from '../shared/messages';
import { MAX_SELECTION_CHARS } from '../shared/messages';

const BLOCKED_PROTOCOLS = ['chrome:', 'chrome-extension:', 'edge:', 'about:', 'moz-extension:'];
const debugLogs: string[] = [];
let lastKnownSelection: SelectionResult | null = null;

function log(message: string) {
  const line = `[SW ${new Date().toISOString()}] ${message}`;
  debugLogs.unshift(line);
  if (debugLogs.length > 120) debugLogs.length = 120;
  console.log(line);
}

function isBlockedUrl(rawUrl?: string): boolean {
  if (!rawUrl) return true;
  try {
    const url = new URL(rawUrl);
    return BLOCKED_PROTOCOLS.includes(url.protocol);
  } catch {
    return true;
  }
}

async function getSelectionFromTab(tabId: number): Promise<SelectionResult | null> {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const text = window.getSelection()?.toString().trim() ?? '';
        if (!text) return null;
        return { text, url: window.location.href, title: document.title };
      },
    });
    return result ?? null;
  } catch {
    return null;
  }
}

async function getActiveSelection(): Promise<SelectionResult | null> {
  // Try the active tab first
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (activeTab?.id && !isBlockedUrl(activeTab.url)) {
    const result = await getSelectionFromTab(activeTab.id);
    if (result) {
      lastKnownSelection = result;
      return result;
    }
  }

  // Active tab had no selection (e.g. focus is on the side panel).
  // Scan all normal tabs in the current window for a selection.
  const allTabs = await chrome.tabs.query({ currentWindow: true });
  for (const tab of allTabs) {
    if (!tab.id || isBlockedUrl(tab.url)) continue;
    if (tab.id === activeTab?.id) continue; // already checked
    const result = await getSelectionFromTab(tab.id);
    if (result) {
      lastKnownSelection = result;
      return result;
    }
  }

  // Nothing found live — return the cached selection so clicking the panel
  // doesn't wipe out what the user just highlighted.
  return lastKnownSelection;
}

function urlMatchesHost(rawUrl: string, hostPattern: string): boolean {
  try {
    const url = new URL(rawUrl);
    return url.hostname === hostPattern || url.hostname.endsWith(`.${hostPattern}`);
  } catch {
    return false;
  }
}

async function getProviderTabs(): Promise<ProviderTabInfo[]> {
  const allTabs = await chrome.tabs.query({});
  const matches: ProviderTabInfo[] = [];

  for (const tab of allTabs) {
    if (!tab.id || !tab.url) continue;

    for (const adapter of TAB_ADAPTERS) {
      if (adapter.hostPatterns.some((pattern) => urlMatchesHost(tab.url!, pattern))) {
        matches.push({
          providerId: adapter.id,
          label: adapter.label,
          tabId: tab.id,
          url: tab.url,
          title: tab.title ?? adapter.label,
        });
      }
    }
  }

  return matches;
}

async function waitForProviderResponse(tabId: number, candidateSelectors: string[], streamingSelectors: string[], timeoutMs = 90000): Promise<string> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      args: [candidateSelectors, streamingSelectors],
      func: (selectors: string[], streamingChecks: string[]) => {
        let nodeList: Element[] = [];
        for (const selector of selectors) {
          const found = Array.from(document.querySelectorAll(selector));
          if (found.length) {
            nodeList = found;
            break;
          }
        }

        const latest = nodeList[nodeList.length - 1] as HTMLElement | undefined;
        if (!latest) return { done: false, text: '' };

        const streaming = streamingChecks.some((selector) => Boolean(document.querySelector(selector)));
        const text = latest.innerText?.trim() ?? '';
        return {
          done: Boolean(text) && !streaming,
          text,
        };
      },
    });

    if (result?.done && result.text) {
      return result.text;
    }

    await new Promise((resolve) => setTimeout(resolve, 1200));
  }

  throw new Error('Timed out waiting for provider response.');
}

async function submitPromptOnTab(tabId: number, prompt: string, inputSelectors: string[], submitSelectors: string[]): Promise<void> {
  await chrome.tabs.update(tabId, { active: true });

  await chrome.scripting.executeScript({
    target: { tabId },
    args: [prompt, inputSelectors, submitSelectors],
    func: async (promptText: string, inputs: string[], submits: string[]) => {
      let input: HTMLElement | null = null;

      for (const selector of inputs) {
        const found = document.querySelector(selector) as HTMLElement | null;
        if (found) {
          input = found;
          break;
        }
      }

      if (!input) {
        throw new Error('Provider input was not found. Ensure you are logged in and chat is ready.');
      }

      input.focus();
      // Small delay to let the editor initialize after focus
      await new Promise((r) => setTimeout(r, 200));

      if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
        input.value = promptText;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (input.getAttribute('contenteditable') === 'true') {
        // ProseMirror editors ignore innerHTML/textContent changes.
        // Use execCommand('insertText') which triggers proper state updates.
        input.focus();
        // Select all existing content first
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(input);
        sel?.removeAllRanges();
        sel?.addRange(range);
        // Insert text via execCommand — this updates ProseMirror internal state
        document.execCommand('insertText', false, promptText);
      } else {
        throw new Error('Unsupported provider input element type.');
      }

      let submit: HTMLElement | null = null;
      for (const selector of submits) {
        const found = document.querySelector(selector) as HTMLElement | null;
        if (found) {
          submit = found;
          break;
        }
      }

      if (!submit && input.closest('form')) {
        submit = input.closest('form')?.querySelector('button[type="submit"]') as HTMLElement | null;
      }

      if (!submit) {
        throw new Error('Provider submit button not found.');
      }

      submit.click();
    },
  });
}

async function runChatGpt(tabId: number, prompt: string): Promise<string> {
  log(`Running ChatGPT automation on tab ${tabId}.`);
  await submitPromptOnTab(
    tabId,
    prompt,
    ['#prompt-textarea', 'textarea[data-id="root"]', 'textarea'],
    ['[data-testid="send-button"]', 'button[aria-label*="Send"]'],
  );

  return waitForProviderResponse(
    tabId,
    ['[data-message-author-role="assistant"]', 'article[data-testid^="conversation-turn-"]', 'main article'],
    ['[data-testid="stop-button"]'],
  );
}

async function runClaude(tabId: number, prompt: string): Promise<string> {
  log(`Running Claude automation on tab ${tabId}.`);
  await submitPromptOnTab(
    tabId,
    prompt,
    ['div.ProseMirror[contenteditable="true"]', 'div[contenteditable="true"][data-testid]', 'div[contenteditable="true"][placeholder]', 'div[contenteditable="true"]'],
    ['button[aria-label*="Send"]', 'button[data-testid*="send"]', 'button[type="submit"]'],
  );

  return waitForProviderResponse(
    tabId,
    ['[data-testid*="assistant-message"]', '.font-claude-message', '[data-testid*="message-content"]', 'div[class*="message"]', 'div.prose', 'main .prose'],
    ['button[aria-label*="Stop"]', '[data-testid*="stop"]', 'button[class*="stop"]'],
  );
}

async function runPerplexity(tabId: number, prompt: string): Promise<string> {
  log(`Running Perplexity automation on tab ${tabId}.`);
  await submitPromptOnTab(
    tabId,
    prompt,
    ['textarea', 'div[contenteditable="true"][role="textbox"]'],
    ['button[aria-label*="Submit"]', 'button[aria-label*="Send"]', 'button[type="submit"]'],
  );

  return waitForProviderResponse(
    tabId,
    ['main .prose', '[data-testid*="answer"]', 'article .prose'],
    ['button[aria-label*="Stop"]', '[data-testid*="stop"]'],
  );
}

async function runProvider(request: RunProviderRequest): Promise<string> {
  const providerTab = (await getProviderTabs()).find((tab) => tab.providerId === request.providerId);
  if (!providerTab) {
    throw new Error(`No open ${request.providerId} tab found.`);
  }

  const truncatedText = request.selectionText.slice(0, MAX_SELECTION_CHARS);
  const prompt = request.promptTemplate.replace('{{selection}}', truncatedText);

  if (request.providerId === 'chatgpt') {
    return runChatGpt(providerTab.tabId, prompt);
  }

  if (request.providerId === 'claude') {
    return runClaude(providerTab.tabId, prompt);
  }

  return runPerplexity(providerTab.tabId, prompt);
}

function buildJudgingPrompt(claudeAnswer: string | null, perplexityAnswer: string | null, originalText: string): string {
  return [
    'You are an impartial judge comparing two AI responses to the same prompt.',
    '',
    '## Original selected text',
    originalText.slice(0, 2000),
    '',
    '## Claude response',
    claudeAnswer ?? '[Error: no response received]',
    '',
    '## Perplexity response',
    perplexityAnswer ?? '[Error: no response received]',
    '',
    '## Instructions',
    'Compare both responses for accuracy, completeness, and clarity.',
    'Declare a winner or a tie, and explain your reasoning in 2-3 sentences.',
  ].join('\n');
}

async function runCompare(request: RunCompareRequest): Promise<CompareResult> {
  const tabs = await getProviderTabs();
  const claudeTab = tabs.find((t) => t.providerId === 'claude');
  const perplexityTab = tabs.find((t) => t.providerId === 'perplexity');
  const chatgptTab = tabs.find((t) => t.providerId === 'chatgpt');

  const missing: string[] = [];
  if (!claudeTab) missing.push('Claude');
  if (!perplexityTab) missing.push('Perplexity');
  if (!chatgptTab) missing.push('ChatGPT');
  if (missing.length) {
    throw new Error(`Missing open tabs: ${missing.join(', ')}. Open all three provider tabs first.`);
  }

  const truncatedText = request.selectionText.slice(0, MAX_SELECTION_CHARS);
  const prompt = request.promptTemplate.replace('{{selection}}', truncatedText);

  // Run sequentially to avoid tab focus conflicts
  log('Compare: step 1/3 — running Claude...');
  let claudeResponse: string | null = null;
  let claudeError: string | null = null;
  try {
    claudeResponse = await runClaude(claudeTab!.tabId, prompt);
  } catch (err) {
    claudeError = err instanceof Error ? err.message : String(err);
  }
  log(`Compare: Claude ${claudeResponse ? 'OK' : 'FAILED'}.`);

  // Brief pause before switching tabs
  await new Promise((resolve) => setTimeout(resolve, 1000));

  log('Compare: step 2/3 — running Perplexity...');
  let perplexityResponse: string | null = null;
  let perplexityError: string | null = null;
  try {
    perplexityResponse = await runPerplexity(perplexityTab!.tabId, prompt);
  } catch (err) {
    perplexityError = err instanceof Error ? err.message : String(err);
  }
  log(`Compare: Perplexity ${perplexityResponse ? 'OK' : 'FAILED'}. Step 3/3 — sending to ChatGPT for judgment...`);

  await new Promise((resolve) => setTimeout(resolve, 1000));

  const judgingPrompt = buildJudgingPrompt(claudeResponse, perplexityResponse, truncatedText);
  let judgmentResponse: string | null = null;
  let judgmentError: string | null = null;

  try {
    judgmentResponse = await runChatGpt(chatgptTab!.tabId, judgingPrompt);
  } catch (err) {
    judgmentError = err instanceof Error ? err.message : String(err);
  }

  log(`Compare: judgment ${judgmentResponse ? 'OK' : 'FAILED'}.`);

  return { claudeResponse, claudeError, perplexityResponse, perplexityError, judgmentResponse, judgmentError };
}

async function buildPanelState(): Promise<PanelStateResponse> {
  const selection = await getActiveSelection();
  const providerTabs = await getProviderTabs();

  return {
    type: 'PANEL_STATE',
    selection,
    providerTabs,
    logs: [...debugLogs],
  };
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.windowId) return;
  await chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  void (async () => {
    try {
      if (message.type === 'GET_PANEL_STATE') {
        sendResponse(await buildPanelState());
        return;
      }

      if (message.type === 'CLEAR_SELECTION') {
        lastKnownSelection = null;
        sendResponse(await buildPanelState());
        return;
      }

      if (message.type === 'RUN_PROVIDER') {
        log(`Received RUN_PROVIDER for ${message.providerId}.`);
        const responseText = await runProvider(message);
        sendResponse({ type: 'RUN_RESULT', providerId: message.providerId, responseText });
        return;
      }

      if (message.type === 'RUN_COMPARE') {
        log('Received RUN_COMPARE.');
        const result = await runCompare(message);
        sendResponse({ type: 'COMPARE_RESULT', result });
        return;
      }

      sendResponse({ type: 'ERROR', message: 'Unsupported message type.' });
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unknown error';
      log(`Error: ${detail}`);
      sendResponse({ type: 'ERROR', message: detail });
    }
  })();

  return true;
});

log('Service worker booted.');
