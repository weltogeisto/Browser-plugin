import type { ComparisonRecord } from '../../lib/storage';

type Props = {
  history: ComparisonRecord[];
};

export function HistoryList({ history }: Props) {
  if (!history.length) return null;

  return (
    <section style={{ marginTop: 20 }}>
      <h2 style={{ fontSize: 16, marginBottom: 8 }}>Recent comparisons</h2>
      <div style={{ display: 'grid', gap: 8 }}>
        {history.map((record) => (
          <div key={record.id} style={{ border: '1px solid #ccc', borderRadius: 8, padding: 10 }}>
            <div style={{ fontSize: 12, opacity: 0.7 }}>{record.taskType}</div>
            <div style={{ marginTop: 4 }}>{record.selectedTextPreview}</div>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
              Winner: {record.winnerProviderId ?? 'none selected'}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}