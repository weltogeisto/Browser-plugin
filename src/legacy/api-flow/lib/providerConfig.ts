import type { ProviderConfig } from '../providers/base';

const KEY = 'provider-configs';

const DEFAULTS: ProviderConfig[] = [
  { providerId: 'openai', apiKey: '', model: 'gpt-4o-mini', enabled: false },
  { providerId: 'anthropic', apiKey: '', model: 'claude-3-7-sonnet-latest', enabled: false },
  { providerId: 'perplexity', apiKey: '', model: 'sonar', enabled: false },
];

export async function getProviderConfigs(): Promise<ProviderConfig[]> {
  const result = await chrome.storage.local.get(KEY);
  return (result[KEY] as ProviderConfig[] | undefined) ?? DEFAULTS;
}

export async function saveProviderConfigs(configs: ProviderConfig[]): Promise<void> {
  await chrome.storage.local.set({ [KEY]: configs });
}
