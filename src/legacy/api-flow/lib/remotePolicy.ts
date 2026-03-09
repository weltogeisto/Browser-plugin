const PRIVACY_ACK_KEY = 'remote-send-acknowledged';

export async function hasAcknowledgedRemoteSend(): Promise<boolean> {
  const result = await chrome.storage.local.get(PRIVACY_ACK_KEY);
  return Boolean(result[PRIVACY_ACK_KEY]);
}

export async function acknowledgeRemoteSend(): Promise<void> {
  await chrome.storage.local.set({ [PRIVACY_ACK_KEY]: true });
}