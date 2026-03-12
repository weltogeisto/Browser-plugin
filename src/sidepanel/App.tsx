import { useEffect, useMemo, useState } from 'react';
import type { PanelStateResponse, ProviderId, ProviderTabInfo, RunProviderResponse, SelectionResult } from '../shared/messages';

const DEFAULT_TEMPLATE = [
  'You are helping me analyze selected webpage text.',
  '',
  'Please answer clearly and directly.',
  '',
  'Selected text:',
  '{{selection}}',
].join('\n');

const STORAGE_KEY = 'promptTemplate';

async function loadPromptTemplate(): Promise<string> {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY);
    const value = stored[STORAGE_KEY];
    return typeof value === 'string' && value.trim() ? value : DEFAULT_TEMPLATE;
  } catch {
    return DEFAULT_TEMPLATE;
  }
}

async function savePromptTemplate(template: string): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: template });
  } catch {
    // Non-critical: template will still work in-session even if storage fails.
  }
}

function formatProvider(providerId: ProviderId) {
  return providerId === 'chatgpt' ? 'ChatGPT' : providerId === 'claude' ? 'Claude' : 'Perplexity';
}

async function fetchPanelState() {
  return chrome.runtime.sendMessage({ type: 'GET_PANEL_STATE' }) as Promise<PanelStateResponse>;
}

async function runProvider(providerId: ProviderId, selectionText: string, promptTemplate: string) {
  return chrome.runtime.sendMessage({
    type: 'RUN_PROVIDER',
    providerId,
    selectionText,
    promptTemplate,
  }) as Promise<RunProviderResponse>;
}

export function App() {
  const [selection, setSelection] = useState<SelectionResult | null>(null);
  const [providerTabs, setProviderTabs] = useState<ProviderTabInfo[]>([]);
  const [promptTemplate, setPromptTemplate] = useState(DEFAULT_TEMPLATE);

  useEffect(() => {
    void loadPromptTemplate().then(setPromptTemplate);
  }, []);
  const [result, setResult] = useState('');
  const [resultProvider, setResultProvider] = useState<ProviderId | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] = useState<ProviderId | null>(null);

  async function refresh() {
    setError(null);
    const state = await fetchPanelState();
    setSelection(state.selection);
    setProviderTabs(state.providerTabs);
    setLogs(state.logs);
  }

  async function handleRunProvider(providerId: ProviderId) {
    if (!selection?.text) {
      setError('Select text on a page first.');
      return;
    }

    setLoadingProvider(providerId);
    setError(null);
    setResult('');

    try {
      const response = await runProvider(providerId, selection.text, promptTemplate);
      if (response.type === 'ERROR') {
        setError(response.message);
      } else {
        setResultProvider(response.providerId);
        setResult(response.responseText);
      }
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : 'Provider run failed.');
    } finally {
      setLoadingProvider(null);
      await refresh();
    }
  }

  const providerSummary = useMemo(() => {
    const map = new Map<ProviderId, number>();
    providerTabs.forEach((tab) => {
      map.set(tab.providerId, (map.get(tab.providerId) ?? 0) + 1);
    });
    return (['chatgpt', 'claude', 'perplexity'] as ProviderId[]).map((id) => ({
      id,
      count: map.get(id) ?? 0,
    }));
  }, [providerTabs]);

  return (
    <main style={{ fontFamily: 'Inter, Arial, sans-serif', padding: 12, lineHeight: 1.35 }}>
      <h1 style={{ margin: 0 }}>Tab Compare MVP</h1>
      <p style={{ marginTop: 6 }}>No APIs. Reuse open AI tabs directly.</p>

      <button onClick={() => void refresh()} disabled={Boolean(loadingProvider)} style={{ marginBottom: 10 }}>
        Refresh selection + tabs
      </button>

      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10, marginBottom: 10 }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: 15 }}>Detected provider tabs</h2>
        {providerSummary.map((item) => (
          <div key={item.id}>
            {formatProvider(item.id)}: {item.count}
          </div>
        ))}
      </section>

      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10, marginBottom: 10 }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: 15 }}>Selection preview</h2>
        <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 6 }}>{selection?.title ?? 'No active selection'}</div>
        <div style={{ whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'auto' }}>{selection?.text ?? '—'}</div>
      </section>

      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10, marginBottom: 10 }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: 15 }}>Prompt template ({"{{selection}}"} placeholder)</h2>
        <textarea
          value={promptTemplate}
          onChange={(event) => {
            setPromptTemplate(event.target.value);
            void savePromptTemplate(event.target.value);
          }}
          rows={7}
          style={{ width: '100%', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button onClick={() => void handleRunProvider('chatgpt')} disabled={Boolean(loadingProvider)}>
            {loadingProvider === 'chatgpt' ? 'Running ChatGPT…' : 'Run ChatGPT'}
          </button>
          <button onClick={() => void handleRunProvider('claude')} disabled={Boolean(loadingProvider)}>
            {loadingProvider === 'claude' ? 'Running Claude…' : 'Run Claude'}
          </button>
          <button onClick={() => void handleRunProvider('perplexity')} disabled={Boolean(loadingProvider)}>
            {loadingProvider === 'perplexity' ? 'Running Perplexity…' : 'Run Perplexity'}
          </button>
        </div>
      </section>

      {error && (
        <section style={{ border: '1px solid #ffb4b4', background: '#fff3f3', borderRadius: 8, padding: 10, marginBottom: 10 }}>
          <strong>Error:</strong> {error}
        </section>
      )}

      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10, marginBottom: 10 }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: 15 }}>{resultProvider ? `${formatProvider(resultProvider)} result` : 'Provider result'}</h2>
        <div style={{ whiteSpace: 'pre-wrap', maxHeight: 220, overflow: 'auto' }}>{result || 'No result yet.'}</div>
      </section>

      <section style={{ border: '1px solid #ddd', borderRadius: 8, padding: 10 }}>
        <h2 style={{ margin: '0 0 8px 0', fontSize: 15 }}>Debug log (service worker)</h2>
        <div style={{ maxHeight: 160, overflow: 'auto', fontFamily: 'monospace', fontSize: 11 }}>
          {logs.length ? logs.map((line) => <div key={line}>{line}</div>) : <div>No logs yet.</div>}
        </div>
      </section>
    </main>
  );
}
