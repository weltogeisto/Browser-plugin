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

export const MAX_SELECTION_CHARS = 4000;

export type CompareResult = {
  claudeResponse: string | null;
  claudeError: string | null;
  perplexityResponse: string | null;
  perplexityError: string | null;
  judgmentResponse: string | null;
  judgmentError: string | null;
};

export type RunCompareRequest = {
  type: 'RUN_COMPARE';
  selectionText: string;
  promptTemplate: string;
};

export type RunCompareResponse =
  | { type: 'COMPARE_RESULT'; result: CompareResult }
  | ExtensionError;

export type ExtensionMessage =
  | { type: 'GET_PANEL_STATE' }
  | { type: 'CLEAR_SELECTION' }
  | RunProviderRequest
  | RunCompareRequest
  | PanelStateResponse
  | RunProviderResponse
  | RunCompareResponse
  | ExtensionError;
