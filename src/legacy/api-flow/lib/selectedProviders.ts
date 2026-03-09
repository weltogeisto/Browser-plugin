import type { ProviderConfig } from '../providers/base';

export function getEnabledProviderIds(configs: ProviderConfig[]): string[] {
  return configs
    .filter((config) => config.enabled && config.apiKey.trim())
    .map((config) => config.providerId);
}

export function normalizeSelectedProviderIds(
  selectedProviderIds: [string, string],
  enabledProviderIds: string[]
): [string, string] {
  if (enabledProviderIds.length === 0) {
    return ['', ''];
  }

  const first = enabledProviderIds.includes(selectedProviderIds[0]) ? selectedProviderIds[0] : enabledProviderIds[0];

  if (enabledProviderIds.length === 1) {
    return [first, first];
  }

  const secondIsValid = enabledProviderIds.includes(selectedProviderIds[1]) && selectedProviderIds[1] !== first;
  if (secondIsValid) {
    return [first, selectedProviderIds[1]];
  }

  const fallbackSecond = enabledProviderIds.find((providerId) => providerId !== first) ?? first;
  return [first, fallbackSecond];
}

export function areSameProviderSelection(left: [string, string], right: [string, string]): boolean {
  return left[0] === right[0] && left[1] === right[1];
}
