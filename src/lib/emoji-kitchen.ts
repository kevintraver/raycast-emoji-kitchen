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
      name: data.name,
    }));
  }

  static getValidCombinations(emoji: string): Array<{ emoji: string; name: string }> {
    this.ensureLoaded();
    const data = this.index![emoji];
    if (!data) return [];

    return data.combos.map((comboEmoji) => ({
      emoji: comboEmoji,
      name: this.index![comboEmoji]?.name || comboEmoji,
    }));
  }

  static isValidCombo(emoji1: string, emoji2: string): boolean {
    this.ensureLoaded();
    const data1 = this.index![emoji1];
    const data2 = this.index![emoji2];
    return !!(data1?.combos.includes(emoji2) || data2?.combos.includes(emoji1));
  }

  static getMashupData(emoji1: string, emoji2: string): { url: string } | null {
    if (!this.isValidCombo(emoji1, emoji2)) return null;
    return { url: buildMashupUrl(emoji1, emoji2) };
  }

  static getAllValidPairs(): string[] {
    this.ensureLoaded();
    const pairs: string[] = [];

    for (const [left, data] of Object.entries(this.index!)) {
      for (const right of data.combos) {
        pairs.push(`${left}+${right}`);
      }
    }

    return pairs;
  }
}

export default EmojiKitchen;
