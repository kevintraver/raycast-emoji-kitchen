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

// MINIMAL format using arrays instead of objects for maximum compression
// Structure: [baseEmoji, [combo1, combo2, ...]]
// Each combo: "emoji|date|left|right"
const minimal: [string, string[]][] = [];

console.log("Creating minimal array format...");
let totalCombinations = 0;

for (const codepoint of rawMetadata.knownSupportedEmoji) {
  const emoji = codepointToEmoji(codepoint);
  const data = rawMetadata.data[codepoint];

  if (!data?.combinations) continue;

  const combos: string[] = [];

  for (const [rightCodepoint, variants] of Object.entries(data.combinations)) {
    const rightEmoji = codepointToEmoji(rightCodepoint);
    const latest = variants.find((v) => v.isLatest) || variants[0];
    // Format: emoji|date|leftCp|rightCp
    combos.push(`${rightEmoji}|${latest.date}|${codepoint}|${rightCodepoint}`);
    totalCombinations++;
  }

  minimal.push([emoji, combos]);
}

console.log("Writing minimal metadata...");
fs.writeFileSync(outputPath, JSON.stringify(minimal));

const sizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
console.log(`✅ Successfully created minimal metadata!`);
console.log(`   - ${minimal.length} base emojis`);
console.log(`   - ${totalCombinations} combinations`);
console.log(`   - File size: ${sizeMB} MB (was 92 MB)`);
console.log(`   - Savings: ${((1 - parseFloat(sizeMB) / 92) * 100).toFixed(1)}%`);

