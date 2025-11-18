import { getEmojiIndex, buildMashupUrl, EmojiIndexData } from "./metadata-manager";

class EmojiKitchen {
  private static index: Record<string, EmojiIndexData> | null = null;

  private static ensureLoaded(): void {
    if (!this.index) {
      console.log("[emoji-kitchen] Loading index...");
      this.index = getEmojiIndex();
      console.log("[emoji-kitchen] Index loaded, emoji count:", Object.keys(this.index).length);
    }
  }

  static getAllBaseEmojis(): Array<{ emoji: string; name: string }> {
    this.ensureLoaded();
    return Object.entries(this.index!).map(([emoji, data]) => ({
      emoji,
      name: data.n,
    }));
  }

  static getValidCombinations(emoji: string): Array<{ emoji: string; name: string }> {
    this.ensureLoaded();
    const data = this.index![emoji];
    if (!data) return [];

    return Object.keys(data.c).map((comboEmoji) => ({
      emoji: comboEmoji,
      name: this.index![comboEmoji]?.n || comboEmoji,
    }));
  }

  static isValidCombo(emoji1: string, emoji2: string): boolean {
    this.ensureLoaded();
    const data1 = this.index![emoji1];
    const data2 = this.index![emoji2];
    return !!(data1?.c[emoji2] || data2?.c[emoji1]);
  }

  static getMashupData(emoji1: string, emoji2: string): { url: string } | null {
    this.ensureLoaded();
    
    const data1 = this.index![emoji1];
    const data2 = this.index![emoji2];
    
    const dataString = data1?.c[emoji2] || data2?.c[emoji1];
    
    if (!dataString) {
      console.log("[emoji-kitchen] No mashup data for:", emoji1, "+", emoji2);
      return null;
    }
    
    console.log("[emoji-kitchen] Found data:", dataString);
    return { url: buildMashupUrl(dataString) };
  }

  static getAllValidPairs(): string[] {
    this.ensureLoaded();
    const pairs: string[] = [];

    for (const [left, data] of Object.entries(this.index!)) {
      for (const right of Object.keys(data.c)) {
        pairs.push(`${left}+${right}`);
      }
    }

    return pairs;
  }
}

export default EmojiKitchen;
