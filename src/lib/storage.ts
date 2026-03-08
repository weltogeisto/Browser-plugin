import type { CompareOutput, TaskType } from '../providers/base';

export type ComparisonRecord = {
  id: string;
  createdAt: string;
  taskType: TaskType;
  selectedTextPreview: string;
  providerIds: string[];
  winnerProviderId: string | null;
  outputs: CompareOutput[];
};

const HISTORY_KEY = 'comparison-history';
const MAX_HISTORY = 10;

export async function getHistory(): Promise<ComparisonRecord[]> {
  const result = await chrome.storage.local.get(HISTORY_KEY);
  return (result[HISTORY_KEY] as ComparisonRecord[] | undefined) ?? [];
}

export async function saveRecord(record: ComparisonRecord): Promise<void> {
  const current = await getHistory();
  const next = [record, ...current].slice(0, MAX_HISTORY);
  await chrome.storage.local.set({ [HISTORY_KEY]: next });
}