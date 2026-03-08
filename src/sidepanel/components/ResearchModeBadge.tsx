type Props = {
  visible: boolean;
};

export function ResearchModeBadge({ visible }: Props) {
  if (!visible) return null;

  return (
    <div style={{ marginTop: 12, display: 'inline-block', border: '1px solid #ccc', borderRadius: 999, padding: '4px 10px' }}>
      Research-style comparison
    </div>
  );
}