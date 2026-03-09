type Props = {
  visible: boolean;
  originalLength: number;
  currentLength: number;
};

export function TruncationNotice({ visible, originalLength, currentLength }: Props) {
  if (!visible) return null;

  return (
    <section style={{ marginTop: 12, border: '1px solid #ccc', borderRadius: 8, padding: 12 }}>
      Selection truncated before send. Original length: {originalLength} characters. Sent length: {currentLength} characters.
    </section>
  );
}