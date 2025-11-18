import fs from "node:fs";
import { getCompactMetadataPath } from "./metadata-updater";

// Compact index: { "😀": { n: "Grinning", c: { "❤️": "20201001:1f600:2764" } }, ... }
export interface EmojiIndexData {
  n: string; // name
  c: Record<string, string>; // combos with date:leftCp:rightCp
}

type EmojiIndex = Record<string, EmojiIndexData>;

export function getEmojiIndex(): EmojiIndex {
  console.log("[metadata-manager] Loading emoji index");
  
  const dynamicPath = getCompactMetadataPath();
  console.log("[metadata-manager] Looking for metadata at:", dynamicPath);

  if (dynamicPath && fs.existsSync(dynamicPath)) {
      try {
          const data = fs.readFileSync(dynamicPath, "utf-8");
          const index = JSON.parse(data) as EmojiIndex;
          console.log("[metadata-manager] Loaded index with", Object.keys(index).length, "entries");
          return index;
      } catch (e) {
          console.error("Failed to load dynamic metadata:", e);
      }
  } else {
      console.warn("[metadata-manager] Metadata file not found at:", dynamicPath);
  }

  return {};
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

  const getUrlPart = (cp: string) => `u${cp.split("-").join("-u")}`;

  const uLeft = getUrlPart(leftCp);
  const uRight = getUrlPart(rightCp);

  const url = `https://www.gstatic.com/android/keyboard/emojikitchen/${date}/${uLeft}/${uLeft}_${uRight}.png`;

  return url;
}
