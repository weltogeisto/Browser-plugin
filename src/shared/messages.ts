export type ProviderId = 'chatgpt' | 'claude' | 'perplexity';

export type ProviderTabInfo = {
  providerId: ProviderId;
  label: string;
  tabId: number;
  url: string;
  title: string;
};

export type SelectionResult = {
  text: string;
  url: string;
  title: string;
};

export type PanelStateResponse = {
  type: 'PANEL_STATE';
  selection: SelectionResult | null;
  providerTabs: ProviderTabInfo[];
  logs: string[];
};

export type ExtensionError = {
  type: 'ERROR';
  message: string;
};

export type RunProviderRequest = {
  type: 'RUN_PROVIDER';
  providerId: ProviderId;
  selectionText: string;
  promptTemplate: string;
};

export type RunProviderResponse =
  | {
      type: 'RUN_RESULT';
      providerId: ProviderId;
      responseText: string;
    }
  | ExtensionError;

export type ExtensionMessage =
  | { type: 'GET_PANEL_STATE' }
  | RunProviderRequest
  | PanelStateResponse
  | RunProviderResponse
  | ExtensionError;
