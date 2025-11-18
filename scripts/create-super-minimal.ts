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
const outputPath = path.join(__dirname, "../src/data/emoji-kitchen.json");

console.log("Reading raw metadata...");
const rawMetadata: RawMetadata = JSON.parse(fs.readFileSync(rawPath, "utf-8"));

// Super minimal: { "😀": { "❤️": "20201001|1f600|2764" } }
// Use | separator (shorter than :)
const compact: Record<string, Record<string, string>> = {};

console.log("Creating super-minimal format...");
let totalCombinations = 0;

for (const codepoint of rawMetadata.knownSupportedEmoji) {
  const emoji = codepointToEmoji(codepoint);
  const data = rawMetadata.data[codepoint];

  if (!data?.combinations) continue;

  compact[emoji] = {};

  for (const [rightCodepoint, variants] of Object.entries(data.combinations)) {
    const rightEmoji = codepointToEmoji(rightCodepoint);
    const latest = variants.find((v) => v.isLatest) || variants[0];
    // Super compact: date|left|right (no prefixes, shorter separator)
    compact[emoji][rightEmoji] = `${latest.date}|${codepoint}|${rightCodepoint}`;
    totalCombinations++;
  }
}

console.log("Writing super-minimal metadata...");
// No pretty printing - save every byte
fs.writeFileSync(outputPath, JSON.stringify(compact));

const sizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
const originalSize = 92;
const savings = ((1 - parseFloat(sizeMB) / originalSize) * 100).toFixed(1);

console.log(`✅ Successfully created super-minimal metadata!`);
console.log(`   - ${Object.keys(compact).length} base emojis`);
console.log(`   - ${totalCombinations} combinations`);
console.log(`   - File size: ${sizeMB} MB (was ${originalSize} MB)`);
console.log(`   - Savings: ${savings}%`);
console.log(`   - Output: ${outputPath}`);

