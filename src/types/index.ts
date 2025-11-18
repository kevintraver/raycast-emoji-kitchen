export interface RawMetadata {
  knownSupportedEmoji: string[];
  data: {
    [codepoint: string]: {
      combinations: {
        [otherCodepoint: string]: Array<{
          gStaticUrl: string;
          isLatest: boolean;
        }>;
      };
    };
  };
}

export interface ProcessedMetadata {
  [leftEmoji: string]: {
    [rightEmoji: string]: {
      url: string;
    };
  };
}

export interface MashupHistoryItem {
  leftEmoji: string;
  rightEmoji: string;
  mashupUrl: string;
  timestamp: number;
}

