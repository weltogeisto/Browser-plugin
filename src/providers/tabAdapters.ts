import type { ProviderId } from '../shared/messages';

export type TabProviderAdapter = {
  id: ProviderId;
  label: string;
  hostPatterns: string[];
  supported: boolean;
};

export const chatgptTabAdapter: TabProviderAdapter = {
  id: 'chatgpt',
  label: 'ChatGPT',
  hostPatterns: ['chatgpt.com', 'chat.openai.com'],
  supported: true,
};

export const claudeTabAdapter: TabProviderAdapter = {
  id: 'claude',
  label: 'Claude',
  hostPatterns: ['claude.ai'],
  supported: true,
};

export const perplexityTabAdapter: TabProviderAdapter = {
  id: 'perplexity',
  label: 'Perplexity',
  hostPatterns: ['perplexity.ai'],
  supported: true,
};

export const TAB_ADAPTERS: TabProviderAdapter[] = [
  chatgptTabAdapter,
  claudeTabAdapter,
  perplexityTabAdapter,
];
