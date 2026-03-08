import { useEffect } from 'react';
import type { ProviderConfig } from '../../providers/base';
import {
  areSameProviderSelection,
  getEnabledProviderIds,
  normalizeSelectedProviderIds,
} from '../../lib/selectedProviders';

type Props = {
  configs: ProviderConfig[];
  selectedProviderIds: [string, string];
  onChange: (next: [string, string]) => void;
};

export function ProviderPicker({ configs, selectedProviderIds, onChange }: Props) {
  const enabledProviderIds = getEnabledProviderIds(configs);
  const normalizedSelectedProviderIds = normalizeSelectedProviderIds(selectedProviderIds, enabledProviderIds);

  useEffect(() => {
    if (!areSameProviderSelection(selectedProviderIds, normalizedSelectedProviderIds)) {
      onChange(normalizedSelectedProviderIds);
    }
  }, [onChange, normalizedSelectedProviderIds, selectedProviderIds]);

  return (
    <section style={{ marginTop: 16 }}>
      <h2 style={{ fontSize: 16, marginBottom: 8 }}>Providers</h2>

      {enabledProviderIds.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
          Enable providers and add API keys in Settings first.
        </p>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {[0, 1].map((index) => (
            <select
              key={index}
              value={normalizedSelectedProviderIds[index]}
              onChange={(e) => {
                const next: [string, string] = [...normalizedSelectedProviderIds] as [string, string];
                next[index] = e.target.value;
                onChange(normalizeSelectedProviderIds(next, enabledProviderIds));
              }}
            >
              {enabledProviderIds.map((providerId) => (
                <option key={providerId} value={providerId}>
                  {providerId}
                </option>
              ))}
            </select>
          ))}
        </div>
      )}
    </section>
  );
}
