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

async function waitForChatGptResponse(tabId: number, timeoutMs = 90000): Promise<string> {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const candidateSelectors = [
          '[data-message-author-role="assistant"]',
          'article[data-testid^="conversation-turn-"]',
          'main article',
        ];

        let nodeList: Element[] = [];
        for (const selector of candidateSelectors) {
          const found = Array.from(document.querySelectorAll(selector));
          if (found.length) {
            nodeList = found;
            break;
          }
        }

        const latest = nodeList[nodeList.length - 1] as HTMLElement | undefined;
        if (!latest) return { done: false, text: '' };

        const streaming = document.querySelector('[data-testid="stop-button"]');
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

  throw new Error('Timed out waiting for ChatGPT response.');
}

async function runChatGpt(tabId: number, prompt: string): Promise<string> {
  await chrome.tabs.update(tabId, { active: true });
  log(`Running ChatGPT automation on tab ${tabId}.`);

  await chrome.scripting.executeScript({
    target: { tabId },
    args: [prompt],
    func: async (promptText: string) => {
      const input = (document.querySelector('#prompt-textarea') ||
        document.querySelector('textarea[data-id="root"]') ||
        document.querySelector('textarea')) as HTMLTextAreaElement | null;

      if (!input) {
        throw new Error('ChatGPT input was not found. Ensure you are logged in and chat is ready.');
      }

      input.focus();
      input.value = promptText;
      input.dispatchEvent(new Event('input', { bubbles: true }));

      const submit = (document.querySelector('[data-testid="send-button"]') ||
        input.closest('form')?.querySelector('button[type="submit"]')) as HTMLButtonElement | null;

      if (!submit) {
        throw new Error('ChatGPT submit button not found.');
      }

      submit.click();
    },
  });

  return waitForChatGptResponse(tabId);
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

  throw new Error(`${request.providerId} adapter is a placeholder in this MVP.`);
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
