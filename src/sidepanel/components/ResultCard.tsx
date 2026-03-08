import type { CompareOutput } from '../../providers/base';

type Props = {
  output: CompareOutput;
  isWinner: boolean;
  onSelectWinner: (providerId: string) => void;
};

function getStatusLabel(status: CompareOutput['status']): string {
  switch (status) {
    case 'success':
      return 'Success';
    case 'loading':
      return 'Loading';
    case 'timeout':
      return 'Timeout';
    case 'auth-error':
      return 'Auth error';
    case 'network-error':
      return 'Network error';
    case 'idle':
      return 'Idle';
    default:
      return 'Error';
  }
}

export function ResultCard({ output, isWinner, onSelectWinner }: Props) {
  return (
    <article
      style={{
        border: '1px solid #ccc',
        borderRadius: 8,
        padding: 12,
        background: isWinner ? '#f4f8ff' : '#fff',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
        <strong>{output.providerLabel}</strong>
        <span>{getStatusLabel(output.status)}</span>
      </div>
      <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>{output.latencyMs} ms</div>
      <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>
        {output.status === 'success' ? output.text : output.errorMessage}
      </div>
      <button style={{ marginTop: 12, width: '100%' }} onClick={() => onSelectWinner(output.providerId)}>
        {isWinner ? 'Winner selected' : 'Mark as winner'}
      </button>
    </article>
  );
}