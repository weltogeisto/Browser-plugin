import type { ProviderConfig } from '../providers/base';

export type ValidationIssue = {
  level: 'error' | 'warning';
  message: string;
};

export function validateSelectedProviders(
  selectedProviderIds: [string, string],
  configs: ProviderConfig[]
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (selectedProviderIds[0] === selectedProviderIds[1]) {
    issues.push({ level: 'error', message: 'Choose two different providers.' });
  }

  for (const providerId of selectedProviderIds) {
    const config = configs.find((item) => item.providerId === providerId);
    if (!config) {
      issues.push({ level: 'error', message: `Missing config for ${providerId}.` });
      continue;
    }
    if (!config.enabled) {
      issues.push({ level: 'error', message: `${providerId} is not enabled.` });
    }
    if (!config.apiKey.trim()) {
      issues.push({ level: 'error', message: `${providerId} is missing an API key.` });
    }
    if (!config.model.trim()) {
      issues.push({ level: 'warning', message: `${providerId} has no model set.` });
    }
  }

  return issues;
}