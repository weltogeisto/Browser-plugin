import type { CompareOutput, ProviderAdapter, ProviderConfig, TaskType } from '../providers/base';
import { normalizeCompareInput, type NormalizedCompareInput } from './prompts';

function classifyError(error: unknown): Pick<CompareOutput, 'status' | 'errorMessage'> {
  const message = error instanceof Error ? error.message : 'Unknown provider error.';
  const lower = message.toLowerCase();

  if (lower.includes('401') || lower.includes('403') || lower.includes('api key')) {
    return { status: 'auth-error', errorMessage: message };
  }
  if (lower.includes('timeout')) {
    return { status: 'timeout', errorMessage: message };
  }
  if (lower.includes('network')) {
    return { status: 'network-error', errorMessage: message };
  }
  return { status: 'error', errorMessage: message };
}

export async function runComparison(args: {
  taskType: TaskType;
  selectedText: string;
  userInstruction?: string;
  selected: Array<{ adapter: ProviderAdapter; config: ProviderConfig }>;
}): Promise<{ normalized: NormalizedCompareInput; outputs: CompareOutput[] }> {
  const normalized = normalizeCompareInput({
    taskType: args.taskType,
    selectedText: args.selectedText,
    userInstruction: args.userInstruction,
  });

  const outputs = await Promise.all(
    args.selected.map(async ({ adapter, config }) => {
      try {
        return await adapter.send(normalized, config);
      } catch (error) {
        const classified = classifyError(error);
        return {
          providerId: adapter.id,
          providerLabel: adapter.label,
          text: '',
          latencyMs: 0,
          status: classified.status,
          errorMessage: classified.errorMessage,
        } satisfies CompareOutput;
      }
    })
  );

  return { normalized, outputs };
}