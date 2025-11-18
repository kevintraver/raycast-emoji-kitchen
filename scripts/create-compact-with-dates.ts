import fs from "fs";
import path from "path";

interface RawMetadata {
  knownSupportedEmoji: string[];
  data: {
    [codepoint: string]: {
      alt: string;
      combinations: {
        [otherCodepoint: string]: Array<{
          gStaticUrl: string;
          isLatest: boolean;
          date: string;
          leftEmojiCodepoint: string;
          rightEmojiCodepoint: string;
        }>;
      };
    };
  };
}

function codepointToEmoji(codepoint: string): string {
  return String.fromCodePoint(...codepoint.split("-").map((p) => parseInt(`0x${p}`)));
}

function formatName(alt: string): string {
  return alt
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const rawPath = path.join(__dirname, "../src/data/raw-metadata.json");
const outputPath = path.join(__dirname, "../src/data/emoji-kitchen.json");

console.log("Reading raw metadata...");
const rawMetadata: RawMetadata = JSON.parse(fs.readFileSync(rawPath, "utf-8"));

// Compact: { "😀": { "n": "Grinning", "c": { "❤️": "20201001:1f600:2764" } } }
const index: Record<string, { n: string; c: Record<string, string> }> = {};

console.log("Creating compact index with dates...");
let totalCombos = 0;

for (const codepoint of rawMetadata.knownSupportedEmoji) {
  const emoji = codepointToEmoji(codepoint);
  const data = rawMetadata.data[codepoint];

  if (!data) continue;

  const combos: Record<string, string> = {};
  
  if (data.combinations) {
    for (const [rightCp, variants] of Object.entries(data.combinations)) {
      const rightEmoji = codepointToEmoji(rightCp);
      const latest = variants.find((v) => v.isLatest) || variants[0];
      // Store: "date:leftCp:rightCp" - exactly as they appear in Google's URL
      combos[rightEmoji] = `${latest.date}:${latest.leftEmojiCodepoint}:${latest.rightEmojiCodepoint}`;
      totalCombos++;
    }
  }

  index[emoji] = {
    n: formatName(data.alt),
    c: combos,
  };
}

fs.writeFileSync(outputPath, JSON.stringify(index));

const sizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
console.log(`✅ Created compact index with dates: ${sizeMB} MB`);
console.log(`   - ${Object.keys(index).length} emojis`);
console.log(`   - ${totalCombos} combinations with correct dates`);

