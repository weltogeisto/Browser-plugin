type Props = {
  onCopyWinner: () => void;
  onCopyAll: () => void;
  onExportMarkdown: () => void;
  disabled: boolean;
};

export function ExportActions({ onCopyWinner, onCopyAll, onExportMarkdown, disabled }: Props) {
  return (
    <section style={{ display: 'grid', gap: 8, marginTop: 16 }}>
      <button onClick={onCopyWinner} disabled={disabled}>Copy winner</button>
      <button onClick={onCopyAll} disabled={disabled}>Copy all outputs</button>
      <button onClick={onExportMarkdown} disabled={disabled}>Export markdown</button>
    </section>
  );
}