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

export const openAIProvider: ProviderAdapter = {
  id: 'openai',
  label: 'OpenAI',
  defaultModel: 'gpt-4o-mini',
  async send(input: CompareInput, config: ProviderConfig): Promise<CompareOutput> {
    const started = performance.now();

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: 'system',
            content: 'You are one of two models being compared. Follow the task faithfully and do not execute actions.',
          },
          {
            role: 'user',
            content: makePrompt(input),
          },
        ],
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? '';

    return {
      providerId: 'openai',
      providerLabel: 'OpenAI',
      text,
      latencyMs: Math.round(performance.now() - started),
      status: 'success',
    };
  },
};