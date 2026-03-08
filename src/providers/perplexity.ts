import type { CompareInput, CompareOutput, ProviderAdapter, ProviderConfig } from './base';

function makePrompt(input: CompareInput): string {
  const researchHint = input.taskType === 'research'
    ? 'Return a research-style answer with clear sourcing if available.'
    : 'Return a direct answer for the task.';

  return [
    `Task: ${input.taskType}`,
    `Instruction: ${input.userInstruction?.trim() || 'No extra instruction.'}`,
    researchHint,
    '',
    'Selected text:',
    input.selectedText,
  ].join('\n');
}

export const perplexityProvider: ProviderAdapter = {
  id: 'perplexity',
  label: 'Perplexity',
  defaultModel: 'sonar',
  supportsResearchMode: true,
  async send(input: CompareInput, config: ProviderConfig): Promise<CompareOutput> {
    const started = performance.now();

    const response = await fetch('https://api.perplexity.ai/chat/completions', {
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
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      throw new Error(`Perplexity error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content ?? '';

    return {
      providerId: 'perplexity',
      providerLabel: 'Perplexity',
      text,
      latencyMs: Math.round(performance.now() - started),
      status: 'success',
    };
  },
};