import fs from "fs";
import path from "path";

interface RawMetadata {
  knownSupportedEmoji: string[];
  data: {
    [codepoint: string]: {
      combinations: {
        [otherCodepoint: string]: Array<{
          gStaticUrl: string;
          isLatest: boolean;
          date: string;
        }>;
      };
    };
  };
}

function codepointToEmoji(codepoint: string): string {
  return String.fromCodePoint(...codepoint.split("-").map((p) => parseInt(`0x${p}`)));
}

const rawPath = path.join(__dirname, "../src/data/raw-metadata.json");
const outputDir = path.join(__dirname, "../src/data");

console.log("Reading raw metadata...");
const rawMetadata: RawMetadata = JSON.parse(fs.readFileSync(rawPath, "utf-8"));

// Create index file (just emoji -> combinations list, no URLs)
const index: Record<string, string[]> = {};

console.log("Creating index (combinations only, no URLs)...");

for (const codepoint of rawMetadata.knownSupportedEmoji) {
  const emoji = codepointToEmoji(codepoint);
  const data = rawMetadata.data[codepoint];

  if (!data?.combinations) continue;

  index[emoji] = Object.keys(data.combinations).map((cp) => codepointToEmoji(cp));
}

const indexPath = path.join(outputDir, "emoji-index.json");
fs.writeFileSync(indexPath, JSON.stringify(index));

const indexSizeMB = (fs.statSync(indexPath).size / 1024 / 1024).toFixed(2);
console.log(`✅ Created index file: ${indexSizeMB} MB`);
console.log(`   - ${Object.keys(index).length} base emojis`);
console.log(`   - Only stores which emojis can combine (no URLs)`);
console.log(`   - URLs will be constructed on-demand`);

