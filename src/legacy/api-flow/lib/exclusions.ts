const KEY = 'excluded-domain-patterns';

const DEFAULT_EXCLUSIONS = ['mail.', 'docs.', 'drive.', 'bank', 'account', 'admin', 'webmail'];

export async function getExclusions(): Promise<string[]> {
  const result = await chrome.storage.local.get(KEY);
  return (result[KEY] as string[] | undefined) ?? DEFAULT_EXCLUSIONS;
}

export async function saveExclusions(patterns: string[]): Promise<void> {
  const cleaned = patterns.map((value) => value.trim()).filter(Boolean);
  await chrome.storage.local.set({ [KEY]: cleaned });
}

export function isExcludedUrl(rawUrl: string | undefined, patterns: string[]): boolean {
  if (!rawUrl) return true;

  try {
    const url = new URL(rawUrl);
    const haystack = `${url.hostname}${url.pathname}`.toLowerCase();
    return patterns.some((pattern) => haystack.includes(pattern.toLowerCase()));
  } catch {
    return true;
  }
}