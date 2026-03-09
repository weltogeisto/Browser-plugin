import type { ProviderAdapter } from './base';
import { openAIProvider } from './openai';
import { anthropicProvider } from './anthropic';
import { perplexityProvider } from './perplexity';

export const PROVIDERS: ProviderAdapter[] = [openAIProvider, anthropicProvider, perplexityProvider];

export function getProviderById(id: string): ProviderAdapter | undefined {
  return PROVIDERS.find((provider) => provider.id === id);
}