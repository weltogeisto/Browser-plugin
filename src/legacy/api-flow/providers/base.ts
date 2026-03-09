export type TaskType = 'rewrite' | 'summarize' | 'explain' | 'brainstorm' | 'research';

export type ProviderStatus =
  | 'idle'
  | 'loading'
  | 'success'
  | 'timeout'
  | 'auth-error'
  | 'network-error'
  | 'error';

export type CompareInput = {
  taskType: TaskType;
  selectedText: string;
  userInstruction?: string;
};

export type CompareOutput = {
  providerId: string;
  providerLabel: string;
  text: string;
  latencyMs: number;
  status: ProviderStatus;
  errorMessage?: string;
};

export type ProviderConfig = {
  providerId: string;
  apiKey: string;
  model: string;
  enabled: boolean;
};

export interface ProviderAdapter {
  id: string;
  label: string;
  defaultModel: string;
  supportsResearchMode?: boolean;
  send(input: CompareInput, config: ProviderConfig): Promise<CompareOutput>;
}