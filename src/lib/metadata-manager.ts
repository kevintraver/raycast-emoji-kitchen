import compactMetadata from "../data/emoji-kitchen.json";

// Compact format: { "😀": { "❤️": "20201001:1f600:2764", ... } }
type CompactMetadata = Record<string, Record<string, string>>;

export function getCompactMetadata(): CompactMetadata {
  console.log("[metadata-manager] Loading compact metadata");
  return compactMetadata as CompactMetadata;
}

export function buildMashupUrl(dataString: string): string {
  // Parse "date:leftCodepoint:rightCodepoint"
  const [date, leftCp, rightCp] = dataString.split(":");
  return `https://www.gstatic.com/android/keyboard/emojikitchen/${date}/u${leftCp}/u${leftCp}_u${rightCp}.png`;
}
