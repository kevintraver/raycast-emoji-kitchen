import emojiData from "../data/emoji-kitchen.json";

// Minimal index: { "😀": { n: "Grinning", c: ["❤️", "🔥"] }, ... }
export interface EmojiIndexData {
  n: string; // name
  c: string[]; // combos
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

// Build mashup URL - try multiple date patterns
export function buildMashupUrl(emoji1: string, emoji2: string): string {
  const cp1 = emojiToCodepoint(emoji1);
  const cp2 = emojiToCodepoint(emoji2);
  
  // Use most common date that works for majority of combinations
  const date = "20201001";
  
  const url = `https://www.gstatic.com/android/keyboard/emojikitchen/${date}/u${cp1}/u${cp1}_u${cp2}.png`;
  
  console.log("[metadata-manager] Built URL for", emoji1, "+", emoji2, "=>", url);
  
  return url;
}
