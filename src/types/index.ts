export interface EmojiMetadata {
  knownSupportedEmoji: string[];
  data: {
    [emojiCodepoint: string]: EmojiData;
  };
}

export interface EmojiData {
  alt: string;
  keywords: string[];
  emojiCodepoint: string;
  gBoardOrder: number;
  combinations: { [otherEmojiCodepoint: string]: EmojiCombination[] };
}

export interface EmojiCombination {
  gStaticUrl: string;
  alt: string;
  leftEmoji: string;
  leftEmojiCodepoint: string;
  rightEmoji: string;
  rightEmojiCodepoint: string;
  date: string;
  isLatest: boolean;
  gBoardOrder: number;
}

export interface MashupHistoryItem {
  leftEmoji: string;
  rightEmoji: string;
  mashupUrl: string;
  timestamp: number;
}

