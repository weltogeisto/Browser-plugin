import type { CompareOutput, TaskType } from '../providers/base';

export function buildMarkdownExport(args: {
  taskType: TaskType;
  selectionPreview: string;
  outputs: CompareOutput[];
  winnerProviderId: string | null;
}): string {
  const lines = [
    '# Model comparison',
    '',
    `Task type: ${args.taskType}`,
    `Winner: ${args.winnerProviderId ?? 'none selected'}`,
    '',
    '## Selected text preview',
    args.selectionPreview,
    '',
  ];

  for (const output of args.outputs) {
    lines.push(`## ${output.providerLabel}`);
    lines.push(`Status: ${output.status}`);
    lines.push(`Latency: ${output.latencyMs} ms`);
    lines.push('');
    lines.push(output.status === 'success' ? output.text : output.errorMessage ?? 'No output');
    lines.push('');
  }

  return lines.join('\n');
}

export async function copyText(value: string): Promise<void> {
  await navigator.clipboard.writeText(value);
}

export function downloadTextFile(filename: string, text: string): void {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}