import emojiData from "../data/emoji-kitchen.json";

// Compact index: { "😀": { n: "Grinning", c: { "❤️": "20201001:1f600:2764" } }, ... }
export interface EmojiIndexData {
  n: string; // name
  c: Record<string, string>; // combos with date:leftCp:rightCp
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

// Build mashup URL from date:leftCp:rightCp string
export function buildMashupUrl(dataString: string): string {
  const [date, leftCp, rightCp] = dataString.split(":");
  
  const url = `https://www.gstatic.com/android/keyboard/emojikitchen/${date}/u${leftCp}/u${leftCp}_u${rightCp}.png`;
  
  console.log("[metadata-manager] Built URL from", dataString, "=>", url);
  
  return url;
}
