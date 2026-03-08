import type { ProviderConfig } from '../../providers/base';

type Props = {
  configs: ProviderConfig[];
  selectedProviderIds: [string, string];
  onChange: (next: [string, string]) => void;
};

export function ProviderPicker({ configs, selectedProviderIds, onChange }: Props) {
  const enabled = configs.filter((config) => config.enabled && config.apiKey.trim());

  return (
    <section style={{ marginTop: 16 }}>
      <h2 style={{ fontSize: 16, marginBottom: 8 }}>Providers</h2>
      <div style={{ display: 'grid', gap: 8 }}>
        {[0, 1].map((index) => (
          <select
            key={index}
            value={selectedProviderIds[index]}
            onChange={(e) => {
              const next: [string, string] = [...selectedProviderIds] as [string, string];
              next[index] = e.target.value;
              onChange(next);
            }}
          >
            {enabled.map((config) => (
              <option key={config.providerId} value={config.providerId}>
                {config.providerId}
              </option>
            ))}
          </select>
        ))}
      </div>
    </section>
  );
}
