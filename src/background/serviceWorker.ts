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
const LOGIN_PATH_FRAGMENTS = ['/login', '/signin', '/sign-in', '/auth', '/oauth'];
const debugLogs: string[] = [];

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

async function getActiveSelection(): Promise<SelectionResult | null> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || isBlockedUrl(tab.url)) return null;

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const text = window.getSelection()?.toString().trim() ?? '';
        return {
          text,
          url: window.location.href,
          title: document.title,
        };
      },
    });

    if (!result?.text) return null;
    return result;
  } catch {
    return null;
  }
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

/**
 * Races a promise against the target tab being closed, so a tab removal
 * surfaces a clear error instead of a cryptic Chrome scripting rejection.
 */
function raceAgainstTabRemoval<T>(tabId: number, promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const onRemoved = (removedTabId: number) => {
      if (removedTabId === tabId) {
        chrome.tabs.onRemoved.removeListener(onRemoved);
        reject(new Error('Provider tab was closed before a response was received.'));
      }
    };
    chrome.tabs.onRemoved.addListener(onRemoved);
    promise.then(
      (value) => { chrome.tabs.onRemoved.removeListener(onRemoved); resolve(value); },
      (err: unknown) => { chrome.tabs.onRemoved.removeListener(onRemoved); reject(err); },
    );
  });
}

/**
 * Pre-flight check: verifies the tab shows a ready chat interface, not a login page.
 * Throws a user-facing message distinguishing "not logged in" from "selector broken".
 */
async function checkProviderReady(tabId: number, inputSelectors: string[]): Promise<void> {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    args: [inputSelectors, LOGIN_PATH_FRAGMENTS],
    func: (selectors: string[], loginFragments: string[]) => {
      const inputFound = selectors.some((s) => Boolean(document.querySelector(s)));
      const path = window.location.pathname.toLowerCase();
      const isLoginPage = loginFragments.some((fragment) => path.includes(fragment));
      return { inputFound, isLoginPage };
    },
  });

  if (!result) return;
  if (result.isLoginPage) {
    throw new Error('Provider tab is showing a login page — please sign in and try again.');
  }
  if (!result.inputFound) {
    throw new Error('Provider chat interface not found. Make sure you are logged in and a chat is open.');
  }
}

/**
 * Polls for a completed provider response entirely within the tab's page context.
 * Running the loop inside the injected script means the service worker is not
 * needed during the wait, eliminating the MV3 idle-termination risk.
 */
async function waitForProviderResponse(
  tabId: number,
  candidateSelectors: string[],
  streamingSelectors: string[],
  timeoutMs = 90000,
): Promise<string> {
  const [{ result }] = await chrome.scripting.executeScript({
    target: { tabId },
    args: [candidateSelectors, streamingSelectors, timeoutMs],
    func: async (
      selectors: string[],
      streamingChecks: string[],
      timeout: number,
    ): Promise<{ text: string; timedOut: boolean }> => {
      const start = Date.now();

      while (Date.now() - start < timeout) {
        let nodeList: Element[] = [];
        for (const selector of selectors) {
          const found = Array.from(document.querySelectorAll(selector));
          if (found.length) { nodeList = found; break; }
        }

        const latest = nodeList[nodeList.length - 1] as HTMLElement | undefined;
        if (latest) {
          const streaming = streamingChecks.some((s) => Boolean(document.querySelector(s)));
          const text = latest.innerText?.trim() ?? '';
          if (text && !streaming) return { text, timedOut: false };
        }

        await new Promise<void>((resolve) => setTimeout(resolve, 1200));
      }

      return { text: '', timedOut: true };
    },
  });

  if (!result || result.timedOut) {
    throw new Error('Timed out waiting for provider response.');
  }
  return result.text;
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
        if (found) { input = found; break; }
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
        if (found) { submit = found; break; }
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

// --- Provider selector constants (prefer data-testid and ARIA attributes over CSS classes) ---

const CHATGPT_INPUT_SELECTORS = [
  '#prompt-textarea',
  '[data-testid="prompt-textarea"]',
  'textarea[data-id="root"]',
  '[role="textbox"][aria-label]',
  'textarea',
];
const CHATGPT_SUBMIT_SELECTORS = [
  '[data-testid="send-button"]',
  'button[aria-label*="Send message"]',
  'button[aria-label*="Send"]',
];
const CHATGPT_RESPONSE_SELECTORS = [
  '[data-message-author-role="assistant"]',
  'article[data-testid^="conversation-turn-"]',
  'main article',
];
const CHATGPT_STREAMING_SELECTORS = [
  '[data-testid="stop-button"]',
  'button[aria-label*="Stop generating"]',
  'button[aria-label*="Stop"]',
];

async function runChatGpt(tabId: number, prompt: string): Promise<string> {
  log(`Running ChatGPT automation on tab ${tabId}.`);
  await checkProviderReady(tabId, CHATGPT_INPUT_SELECTORS);
  await submitPromptOnTab(tabId, prompt, CHATGPT_INPUT_SELECTORS, CHATGPT_SUBMIT_SELECTORS);
  return waitForProviderResponse(tabId, CHATGPT_RESPONSE_SELECTORS, CHATGPT_STREAMING_SELECTORS);
}

const CLAUDE_INPUT_SELECTORS = [
  'div[contenteditable="true"][role="textbox"]',
  '[aria-label*="Message"][contenteditable="true"]',
  '[aria-label*="message"][contenteditable="true"]',
  'div[contenteditable="true"]',
];
const CLAUDE_SUBMIT_SELECTORS = [
  'button[aria-label*="Send message"]',
  'button[aria-label*="Send"]',
  'button[data-testid*="send"]',
  'button[type="submit"]',
];
const CLAUDE_RESPONSE_SELECTORS = [
  '[data-testid="assistant-message"]',
  '[role="presentation"] .prose',
  'main .prose',
  'article .prose',
];
const CLAUDE_STREAMING_SELECTORS = [
  'button[aria-label*="Stop"]',
  '[data-testid*="stop"]',
];

async function runClaude(tabId: number, prompt: string): Promise<string> {
  log(`Running Claude automation on tab ${tabId}.`);
  await checkProviderReady(tabId, CLAUDE_INPUT_SELECTORS);
  await submitPromptOnTab(tabId, prompt, CLAUDE_INPUT_SELECTORS, CLAUDE_SUBMIT_SELECTORS);
  return waitForProviderResponse(tabId, CLAUDE_RESPONSE_SELECTORS, CLAUDE_STREAMING_SELECTORS);
}

const PERPLEXITY_INPUT_SELECTORS = [
  'textarea[placeholder]',
  '[role="textbox"][contenteditable="true"]',
  'div[contenteditable="true"][role="textbox"]',
  'textarea',
];
const PERPLEXITY_SUBMIT_SELECTORS = [
  'button[aria-label*="Submit"]',
  'button[aria-label*="Send"]',
  'button[type="submit"]',
];
const PERPLEXITY_RESPONSE_SELECTORS = [
  '[data-testid*="answer"]',
  '[role="main"] .prose',
  'main .prose',
  'article .prose',
];
const PERPLEXITY_STREAMING_SELECTORS = [
  'button[aria-label*="Stop"]',
  '[data-testid*="stop"]',
];

async function runPerplexity(tabId: number, prompt: string): Promise<string> {
  log(`Running Perplexity automation on tab ${tabId}.`);
  await checkProviderReady(tabId, PERPLEXITY_INPUT_SELECTORS);
  await submitPromptOnTab(tabId, prompt, PERPLEXITY_INPUT_SELECTORS, PERPLEXITY_SUBMIT_SELECTORS);
  return waitForProviderResponse(tabId, PERPLEXITY_RESPONSE_SELECTORS, PERPLEXITY_STREAMING_SELECTORS);
}

async function runProvider(request: RunProviderRequest): Promise<string> {
  const providerTab = (await getProviderTabs()).find((tab) => tab.providerId === request.providerId);
  if (!providerTab) {
    throw new Error(`No open ${request.providerId} tab found.`);
  }

  const prompt = request.promptTemplate.replace('{{selection}}', request.selectionText);

  if (request.providerId === 'chatgpt') {
    return raceAgainstTabRemoval(providerTab.tabId, runChatGpt(providerTab.tabId, prompt));
  }

  if (request.providerId === 'claude') {
    return raceAgainstTabRemoval(providerTab.tabId, runClaude(providerTab.tabId, prompt));
  }

  return raceAgainstTabRemoval(providerTab.tabId, runPerplexity(providerTab.tabId, prompt));
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
