import { TAB_ADAPTERS } from '../providers/tabAdapters';
import type {
  ExtensionMessage,
  PanelStateResponse,
  ProviderId,
  ProviderTabInfo,
  RunProviderRequest,
  SelectionResult,
} from '../shared/messages';

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
      if (input instanceof HTMLTextAreaElement || input instanceof HTMLInputElement) {
        input.value = promptText;
      } else if (input.getAttribute('contenteditable') === 'true') {
        input.textContent = promptText;
      } else {
        throw new Error('Unsupported provider input element type.');
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));

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
    ['div[contenteditable="true"][role="textbox"]', 'div[contenteditable="true"]'],
    ['button[aria-label*="Send"]', 'button[data-testid*="send"]', 'button[type="submit"]'],
  );

  return waitForProviderResponse(
    tabId,
    ['[data-testid="assistant-message"]', 'main .prose', 'article .prose'],
    ['button[aria-label*="Stop"]', '[data-testid*="stop"]'],
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

  const prompt = request.promptTemplate.replace('{{selection}}', request.selectionText);

  if (request.providerId === 'chatgpt') {
    return runChatGpt(providerTab.tabId, prompt);
  }

  if (request.providerId === 'claude') {
    return runClaude(providerTab.tabId, prompt);
  }

  return runPerplexity(providerTab.tabId, prompt);
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
