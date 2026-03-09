import type { CompareInput } from '../providers/base';

export const MAX_SELECTED_TEXT_CHARS = 6000;

export type NormalizedCompareInput = CompareInput & {
  wasTruncated: boolean;
  originalLength: number;
};

export function normalizeCompareInput(input: CompareInput): NormalizedCompareInput {
  const trimmed = input.selectedText.trim();
  const sliced = trimmed.slice(0, MAX_SELECTED_TEXT_CHARS);

  return {
    taskType: input.taskType,
    userInstruction: input.userInstruction?.trim() || '',
    selectedText: sliced,
    originalLength: trimmed.length,
    wasTruncated: trimmed.length > sliced.length,
  };
}