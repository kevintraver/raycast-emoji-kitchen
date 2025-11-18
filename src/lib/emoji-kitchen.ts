import { ProcessedMetadata } from "../types";
import { getMetadata } from "./metadata-manager";

class EmojiKitchen {
  private static data: ProcessedMetadata | null = null;
  private static loadPromise: Promise<void> | null = null;

  private static async ensureLoaded(): Promise<void> {
    if (this.data) return;

    if (!this.loadPromise) {
      this.loadPromise = getMetadata().then((data) => {
        this.data = data;
      });
    }

    await this.loadPromise;
  }

  static async getAllBaseEmojis(): Promise<string[]> {
    await this.ensureLoaded();
    return Object.keys(this.data!);
  }

  static async getValidCombinations(leftEmoji: string): Promise<string[]> {
    await this.ensureLoaded();
    const combos = this.data![leftEmoji];
    return combos ? Object.keys(combos) : [];
  }

  static async isValidCombo(emoji1: string, emoji2: string): Promise<boolean> {
    await this.ensureLoaded();
    return !!(this.data![emoji1]?.[emoji2] || this.data![emoji2]?.[emoji1]);
  }

  static async getMashupData(emoji1: string, emoji2: string): Promise<{ url: string } | null> {
    await this.ensureLoaded();
    return this.data![emoji1]?.[emoji2] || this.data![emoji2]?.[emoji1] || null;
  }

  static async getAllValidPairs(): Promise<string[]> {
    await this.ensureLoaded();
    const pairs: string[] = [];
    for (const [left, combos] of Object.entries(this.data!)) {
      for (const right of Object.keys(combos)) {
        pairs.push(`${left}+${right}`);
      }
    }
    return pairs;
  }
}

export default EmojiKitchen;

