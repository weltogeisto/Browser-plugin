type Props = {
  patterns: string[];
  onChange: (patterns: string[]) => void;
};

export function ExclusionEditor({ patterns, onChange }: Props) {
  return (
    <section style={{ marginTop: 16 }}>
      <h3 style={{ fontSize: 14, marginBottom: 8 }}>Excluded domains / patterns</h3>
      <textarea
        rows={6}
        value={patterns.join('\n')}
        onChange={(e) => onChange(e.target.value.split('\n'))}
        style={{ width: '100%' }}
      />
    </section>
  );
}