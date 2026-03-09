import type { ProviderConfig } from '../../providers/base';
import { ExclusionEditor } from './ExclusionEditor';

type Props = {
  configs: ProviderConfig[];
  exclusions: string[];
  onConfigsChange: (configs: ProviderConfig[]) => void;
  onExclusionsChange: (patterns: string[]) => void;
  onSave: () => void;
};

export function SettingsView({ configs, exclusions, onConfigsChange, onExclusionsChange, onSave }: Props) {
  function update(index: number, patch: Partial<ProviderConfig>) {
    const next = configs.map((config, currentIndex) =>
      currentIndex === index ? { ...config, ...patch } : config
    );
    onConfigsChange(next);
  }

  return (
    <section style={{ marginTop: 20 }}>
      <h2 style={{ fontSize: 16, marginBottom: 8 }}>Settings</h2>
      <div style={{ display: 'grid', gap: 12 }}>
        {configs.map((config, index) => (
          <div key={config.providerId} style={{ border: '1px solid #ccc', borderRadius: 8, padding: 10 }}>
            <strong>{config.providerId}</strong>
            <label style={{ display: 'block', marginTop: 8 }}>
              API key
              <input
                type="password"
                value={config.apiKey}
                onChange={(e) => update(index, { apiKey: e.target.value })}
                style={{ display: 'block', width: '100%', marginTop: 4 }}
              />
            </label>
            <label style={{ display: 'block', marginTop: 8 }}>
              Model
              <input
                value={config.model}
                onChange={(e) => update(index, { model: e.target.value })}
                style={{ display: 'block', width: '100%', marginTop: 4 }}
              />
            </label>
            <label style={{ display: 'block', marginTop: 8 }}>
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) => update(index, { enabled: e.target.checked })}
              />{' '}
              Enabled
            </label>
          </div>
        ))}
      </div>

      <ExclusionEditor patterns={exclusions} onChange={onExclusionsChange} />

      <button style={{ marginTop: 12 }} onClick={onSave}>Save settings</button>
    </section>
  );
}