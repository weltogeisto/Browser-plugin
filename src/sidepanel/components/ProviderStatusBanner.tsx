type Props = {
  issues: Array<{ level: 'error' | 'warning'; message: string }>;
};

export function ProviderStatusBanner({ issues }: Props) {
  if (!issues.length) return null;

  return (
    <section style={{ marginTop: 12, border: '1px solid #ccc', borderRadius: 8, padding: 12 }}>
      <strong>Provider checks</strong>
      <ul style={{ marginBottom: 0 }}>
        {issues.map((issue, index) => (
          <li key={`${issue.message}-${index}`}>
            {issue.level.toUpperCase()}: {issue.message}
          </li>
        ))}
      </ul>
    </section>
  );
}