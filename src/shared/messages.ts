export type TaskType = 'rewrite' | 'summarize' | 'explain' | 'brainstorm' | 'research';

export type GetSelectionRequest = {
  type: 'GET_SELECTION';
};

export type SelectionResponse = {
  type: 'SELECTION_RESULT';
  text: string;
  url?: string;
  title?: string;
};

export type SelectionErrorCode =
  | 'NO_ACTIVE_TAB'
  | 'BLOCKED_URL'
  | 'NO_SELECTION'
  | 'INJECTION_FAILED';

export type SelectionError = {
  type: 'SELECTION_ERROR';
  code: SelectionErrorCode;
  message: string;
};

export type ExtensionMessage = GetSelectionRequest | SelectionResponse | SelectionError;

export function isSelectionResponse(value: unknown): value is SelectionResponse {
  return (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    (value as { type?: string }).type === 'SELECTION_RESULT'
  );
}