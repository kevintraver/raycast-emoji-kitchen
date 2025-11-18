import { getCompactMetadata, buildMashupUrl } from "./metadata-manager";

class EmojiKitchen {
  private static metadata: Record<string, Record<string, string>> | null = null;

  private static ensureLoaded(): void {
    if (!this.metadata) {
      console.log("[emoji-kitchen] Loading metadata...");
      this.metadata = getCompactMetadata();
      console.log("[emoji-kitchen] Metadata loaded, emoji count:", Object.keys(this.metadata).length);
    }
  }

  static getAllBaseEmojis(): string[] {
    this.ensureLoaded();
    return Object.keys(this.metadata!);
  }

  static getValidCombinations(emoji: string): string[] {
    this.ensureLoaded();
    const combos = this.metadata![emoji];
    return combos ? Object.keys(combos) : [];
  }

  static isValidCombo(emoji1: string, emoji2: string): boolean {
    this.ensureLoaded();
    return !!(this.metadata![emoji1]?.[emoji2] || this.metadata![emoji2]?.[emoji1]);
  }

  static getMashupData(emoji1: string, emoji2: string): { url: string } | null {
    this.ensureLoaded();
    
    const dataString = this.metadata![emoji1]?.[emoji2] || this.metadata![emoji2]?.[emoji1];
    if (!dataString) return null;
    
    return { url: buildMashupUrl(dataString) };
  }

  static getAllValidPairs(): string[] {
    this.ensureLoaded();
    const pairs: string[] = [];
    
    for (const [left, combos] of Object.entries(this.metadata!)) {
      for (const right of Object.keys(combos)) {
        pairs.push(`${left}+${right}`);
      }
    }
    
    return pairs;
  }
}

export default EmojiKitchen;
