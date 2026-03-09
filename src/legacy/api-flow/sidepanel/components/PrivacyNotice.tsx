type Props = {
  visible: boolean;
  onAcknowledge: () => void;
};

export function PrivacyNotice({ visible, onAcknowledge }: Props) {
  if (!visible) return null;

  return (
    <section style={{ marginTop: 16, border: '1px solid #ccc', borderRadius: 8, padding: 12 }}>
      <strong>Remote send notice</strong>
      <p style={{ marginBottom: 8 }}>
        Comparing models will send your selected text and instruction to the chosen external AI providers.
      </p>
      <button onClick={onAcknowledge}>I understand</button>
    </section>
  );
}