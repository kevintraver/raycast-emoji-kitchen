import emojiData from "../data/emoji-kitchen.json";

// Index format: { "😀": { name: "Grinning", combos: ["❤️", "🔥"] }, ... }
export interface EmojiIndexData {
  name: string;
  combos: string[];
}

type EmojiIndex = Record<string, EmojiIndexData>;

export function getEmojiIndex(): EmojiIndex {
  console.log("[metadata-manager] Loading emoji index");
  return emojiData as EmojiIndex;
}

export function emojiToCodepoint(emoji: string): string {
  const codePoints = [];
  for (let i = 0; i < emoji.length; i++) {
    const cp = emoji.codePointAt(i);
    if (cp) {
      codePoints.push(cp.toString(16));
      // Skip the second code unit of surrogate pairs
      if (cp > 0xffff) i++;
    }
  }
  return codePoints.join("-");
}

// Build mashup URL using most common date pattern
export function buildMashupUrl(emoji1: string, emoji2: string): string {
  const cp1 = emojiToCodepoint(emoji1);
  const cp2 = emojiToCodepoint(emoji2);
  const date = "20201001";

  return `https://www.gstatic.com/android/keyboard/emojikitchen/${date}/u${cp1}/u${cp1}_u${cp2}.png`;
}
