import { LocalStorage } from "@raycast/api";
import { MashupHistoryItem } from "../types";

const HISTORY_KEY = "emoji-kitchen-history";
const MAX_HISTORY = 50;

export async function saveToHistory(leftEmoji: string, rightEmoji: string, mashupUrl: string): Promise<void> {
  const history = await getHistory();
  const newItem: MashupHistoryItem = {
    leftEmoji,
    rightEmoji,
    mashupUrl,
    timestamp: Date.now(),
  };

  const updated = [newItem, ...history].slice(0, MAX_HISTORY);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export async function getHistory(): Promise<MashupHistoryItem[]> {
  const stored = await LocalStorage.getItem<string>(HISTORY_KEY);
  return stored ? JSON.parse(stored) : [];
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_KEY);
}

export async function removeFromHistory(timestamp: number): Promise<void> {
  const history = await getHistory();
  const filtered = history.filter((item) => item.timestamp !== timestamp);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
}
