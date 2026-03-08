import type { CompareInput, CompareOutput, ProviderAdapter, ProviderConfig } from './base';

function makePrompt(input: CompareInput): string {
  return [
    `Task: ${input.taskType}`,
    `Instruction: ${input.userInstruction?.trim() || 'No extra instruction.'}`,
    '',
    'Selected text:',
    input.selectedText,
  ].join('\n');
}

export const anthropicProvider: ProviderAdapter = {
  id: 'anthropic',
  label: 'Anthropic',
  defaultModel: 'claude-3-7-sonnet-latest',
  async send(input: CompareInput, config: ProviderConfig): Promise<CompareOutput> {
    const started = performance.now();

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: 900,
        system: 'You are one of two models being compared. Follow the task faithfully and do not execute actions.',
        messages: [
          {
            role: 'user',
            content: makePrompt(input),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content?.map((part: { text?: string }) => part.text ?? '').join('\n') ?? '';

    return {
      providerId: 'anthropic',
      providerLabel: 'Anthropic',
      text,
      latencyMs: Math.round(performance.now() - started),
      status: 'success',
    };
  },
};