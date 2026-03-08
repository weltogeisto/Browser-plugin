import { useEffect, useMemo, useState } from 'react';
import type { SelectionError, SelectionResponse } from '../shared/messages';
import { isSelectionResponse } from '../shared/messages';
import type { CompareOutput, ProviderConfig, TaskType } from '../providers/base';
import { getProviderById } from '../providers/registry';
import { runComparison } from '../lib/compare';
import { getHistory, saveRecord, type ComparisonRecord } from '../lib/storage';
import { getProviderConfigs, saveProviderConfigs } from '../lib/providerConfig';
import { acknowledgeRemoteSend, hasAcknowledgedRemoteSend } from '../lib/remotePolicy';
import { getExclusions, isExcludedUrl, saveExclusions } from '../lib/exclusions';
import { validateSelectedProviders, type ValidationIssue } from '../lib/validation';
import { buildMarkdownExport, copyText, downloadTextFile } from '../lib/export';
import { MAX_SELECTED_TEXT_CHARS } from '../lib/prompts';
import { CompareForm } from './components/CompareForm';
import { ProviderPicker } from './components/ProviderPicker';
import { PrivacyNotice } from './components/PrivacyNotice';
import { ProviderStatusBanner } from './components/ProviderStatusBanner';
import { ResearchModeBadge } from './components/ResearchModeBadge';
import { ResultsGrid } from './components/ResultsGrid';
import { HistoryList } from './components/HistoryList';
import { SettingsView } from './components/SettingsView';
import { TruncationNotice } from './components/TruncationNotice';
import { ExportActions } from './components/ExportActions';

async function fetchSelection() {
  return chrome.runtime.sendMessage({ type: 'GET_SELECTION' });
}

function makeRecord(args: {
  taskType: TaskType;
  selectionText: string;
  outputs: CompareOutput[];
  winnerProviderId: string | null;
}): ComparisonRecord {
  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    taskType: args.taskType,
    selectedTextPreview: args.selectionText.slice(0, 120),
    providerIds: args.outputs.map((output) => output.providerId),
    winnerProviderId: args.winnerProviderId,
    outputs: args.outputs,
  };
}

export function App() {
  const [taskType, setTaskType] = useState<TaskType>('summarize');
  const [instruction, setInstruction] = useState('');
  const [selection, setSelection] = useState<SelectionResponse | null>(null);
  const [outputs, setOutputs] = useState<CompareOutput[]>([]);
  const [winnerProviderId, setWinnerProviderId] = useState<string | null>(null);
  const [history, setHistory] = useState<ComparisonRecord[]>([]);
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfig[]>([]);
  const [selectedProviderIds, setSelectedProviderIds] = useState<[string, string]>(['openai', 'anthropic']);
  const [exclusions, setExclusions] = useState<string[]>([]);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [hasRemoteAck, setHasRemoteAck] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wasTruncated, setWasTruncated] = useState(false);
  const [originalLength, setOriginalLength] = useState(0);

  useEffect(() => {
    void refreshSelection();
    void loadHistory();
    void loadProviderConfigs();
    void loadExclusions();
    void loadRemoteAck();
  }, []);

  async function loadHistory() {
    setHistory(await getHistory());
  }

  async function loadProviderConfigs() {
    setProviderConfigs(await getProviderConfigs());
  }

  async function loadExclusions() {
    setExclusions(await getExclusions());
  }

  async function loadRemoteAck() {
    setHasRemoteAck(await hasAcknowledgedRemoteSend());
  }

  async function refreshSelection() {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchSelection();

      if (isSelectionResponse(result)) {
        setSelection(result);
        if (!result.text.trim()) {
          setError('Select text on the page to begin.');
        }
        return;
      }

      const selectionError = result as SelectionError | null;
      setSelection(null);
      setError(selectionError?.message ?? 'Could not read selection.');
    } catch (err) {
      setSelection(null);
      setError(err instanceof Error ? err.message : 'Could not read selection.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSettings() {
    await saveProviderConfigs(providerConfigs);
    await saveExclusions(exclusions);
  }

  async function handleAcknowledgeRemoteSend() {
    await acknowledgeRemoteSend();
    setHasRemoteAck(true);
  }

  async function handleCompare() {
    if (!selection?.text.trim()) return;

    const issues = validateSelectedProviders(selectedProviderIds, providerConfigs);
    setValidationIssues(issues);
    if (issues.some((issue) => issue.level === 'error')) {
      setError('Fix provider setup before comparing.');
      return;
    }

    if (!hasRemoteAck) {
      setError('Please acknowledge the remote send notice first.');
      return;
    }

    if (isExcludedUrl(selection.url, exclusions)) {
      setError('This page is excluded from comparison for safety.');
      return;
    }

    const selected = selectedProviderIds
      .map((providerId) => {
        const adapter = getProviderById(providerId);
        const config = providerConfigs.find((item) => item.providerId === providerId);
        if (!adapter || !config?.enabled || !config.apiKey.trim()) return null;
        return { adapter, config };
      })
      .filter(Boolean) as Array<{ adapter: NonNullable<ReturnType<typeof getProviderById>>; config: ProviderConfig }>;

    if (selected.length !== 2) {
      setError('Please configure and enable exactly two providers for this run.');
      return;
    }

    setLoading(true);
    setError(null);
    setWinnerProviderId(null);

    try {
      const result = await runComparison({
        taskType,
        selectedText: selection.text,
        userInstruction: instruction,
        selected,
      });

      setWasTruncated(result.normalized.wasTruncated);
      setOriginalLength(result.normalized.originalLength);
      setOutputs(result.outputs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Comparison failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleWinner(providerId: string) {
    setWinnerProviderId(providerId);

    if (!selection?.text.trim() || !outputs.length) return;

    const record = makeRecord({
      taskType,
      selectionText: selection.text,
      outputs,
      winnerProviderId: providerId,
    });

    await saveRecord(record);
    await loadHistory();
  }

  const hasText = Boolean(selection?.text?.trim());
  const researchModeVisible = useMemo(
    () => taskType === 'research' || selectedProviderIds.includes('perplexity'),
    [taskType, selectedProviderIds]
  );
  const winnerOutput = outputs.find((output) => output.providerId === winnerProviderId);

  async function handleCopyWinner() {
    if (!winnerOutput?.text) return;
    await copyText(winnerOutput.text);
  }

  async function handleCopyAll() {
    const text = outputs
      .map((output) => `${output.providerLabel}\n\n${output.status === 'success' ? output.text : output.errorMessage ?? ''}`)
      .join('\n\n---\n\n');
    if (!text) return;
    await copyText(text);
  }

  function handleExportMarkdown() {
    const text = buildMarkdownExport({
      taskType,
      selectionPreview: selection?.text.slice(0, 240) ?? '',
      outputs,
      winnerProviderId,
    });
    downloadTextFile('model-judge-comparison.md', text);
  }

  return (
    <main style={{ fontFamily: 'Arial, sans-serif', padding: 16, lineHeight: 1.4 }}>
      <h1 style={{ marginTop: 0 }}>Model Judge MVP</h1>
      <p>Selected-text AI comparison in a secure side panel.</p>

      <section style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 16 }}>Selected text</h2>
          <button onClick={() => void refreshSelection()} disabled={loading}>Refresh</button>
        </div>

        {!loading && !hasText && (
          <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 12, marginTop: 8 }}>
            <p style={{ margin: 0 }}>{error ?? 'Select text on the page to begin.'}</p>
          </div>
        )}

        {hasText && (
          <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 12, marginTop: 8 }}>
            <p style={{ marginTop: 0, whiteSpace: 'pre-wrap' }}>{selection?.text}</p>
            <p style={{ fontSize: 12, opacity: 0.75, marginBottom: 0 }}>{selection?.title}</p>
          </div>
        )}
      </section>

      <ResearchModeBadge visible={researchModeVisible} />
      <PrivacyNotice visible={!hasRemoteAck} onAcknowledge={() => void handleAcknowledgeRemoteSend()} />
      <ProviderPicker configs={providerConfigs} selectedProviderIds={selectedProviderIds} onChange={setSelectedProviderIds} />
      <ProviderStatusBanner issues={validationIssues} />

      <CompareForm
        taskType={taskType}
        instruction={instruction}
        compareDisabled={!hasText}
        loading={loading}
        onTaskTypeChange={setTaskType}
        onInstructionChange={setInstruction}
        onCompare={() => void handleCompare()}
      />

      <TruncationNotice visible={wasTruncated} originalLength={originalLength} currentLength={MAX_SELECTED_TEXT_CHARS} />

      <ResultsGrid
        outputs={outputs}
        winnerProviderId={winnerProviderId}
        onSelectWinner={(providerId) => void handleWinner(providerId)}
      />

      <ExportActions
        disabled={!outputs.length}
        onCopyWinner={() => void handleCopyWinner()}
        onCopyAll={() => void handleCopyAll()}
        onExportMarkdown={handleExportMarkdown}
      />

      <SettingsView
        configs={providerConfigs}
        exclusions={exclusions}
        onConfigsChange={setProviderConfigs}
        onExclusionsChange={setExclusions}
        onSave={() => void handleSaveSettings()}
      />

      <HistoryList history={history} />
    </main>
  );
}
