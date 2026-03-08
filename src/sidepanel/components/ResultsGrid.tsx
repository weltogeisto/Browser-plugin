import type { CompareOutput } from '../../providers/base';
import { ResultCard } from './ResultCard';

type Props = {
  outputs: CompareOutput[];
  winnerProviderId: string | null;
  onSelectWinner: (providerId: string) => void;
};

export function ResultsGrid({ outputs, winnerProviderId, onSelectWinner }: Props) {
  if (!outputs.length) return null;

  return (
    <section style={{ display: 'grid', gap: 12, marginTop: 16 }}>
      {outputs.map((output) => (
        <ResultCard
          key={output.providerId}
          output={output}
          isWinner={winnerProviderId === output.providerId}
          onSelectWinner={onSelectWinner}
        />
      ))}
    </section>
  );
}