import type { SelectionError, SelectionResponse } from '../shared/messages';

const BLOCKED_PROTOCOLS = ['chrome:', 'chrome-extension:', 'edge:', 'about:', 'moz-extension:'];
const BLOCKED_HOST_PATTERNS = [/mail\./i, /docs\./i, /drive\./i, /bank/i, /account/i, /admin/i, /webmail/i];

function isBlockedUrl(rawUrl?: string): boolean {
  if (!rawUrl) return true;

  try {
    const url = new URL(rawUrl);
    if (BLOCKED_PROTOCOLS.some((protocol) => url.protocol === protocol)) return true;
    return BLOCKED_HOST_PATTERNS.some((pattern) => pattern.test(url.hostname));
  } catch {
    return true;
  }
}

async function getSelectionForTab(tabId: number): Promise<SelectionResponse | SelectionError> {
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const text = window.getSelection()?.toString().trim() ?? '';
        return {
          text,
          url: window.location.href,
          title: document.title,
        };
      },
    });

    if (!result?.text) {
      return {
        type: 'SELECTION_ERROR',
        code: 'NO_SELECTION',
        message: 'No selected text found on the current page.',
      };
    }

    return {
      type: 'SELECTION_RESULT',
      text: result.text,
      url: result.url,
      title: result.title,
    };
  } catch {
    return {
      type: 'SELECTION_ERROR',
      code: 'INJECTION_FAILED',
      message: 'Could not access the current page selection.',
    };
  }
}

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.windowId) return;
  await chrome.sidePanel.open({ windowId: tab.windowId });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'GET_SELECTION') return false;

  void (async () => {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!activeTab?.id) {
      sendResponse({
        type: 'SELECTION_ERROR',
        code: 'NO_ACTIVE_TAB',
        message: 'No active tab is available.',
      } satisfies SelectionError);
      return;
    }

    if (isBlockedUrl(activeTab.url)) {
      sendResponse({
        type: 'SELECTION_ERROR',
        code: 'BLOCKED_URL',
        message: 'Selection capture is blocked on this site for safety.',
      } satisfies SelectionError);
      return;
    }

    const result = await getSelectionForTab(activeTab.id);
    sendResponse(result);
  })();

  return true;
});