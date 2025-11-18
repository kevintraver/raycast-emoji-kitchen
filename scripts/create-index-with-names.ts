import fs from "fs";
import path from "path";

interface RawMetadata {
  knownSupportedEmoji: string[];
  data: {
    [codepoint: string]: {
      alt: string;
      combinations: {
        [otherCodepoint: string]: Array<any>;
      };
    };
  };
}

function codepointToEmoji(codepoint: string): string {
  return String.fromCodePoint(...codepoint.split("-").map((p) => parseInt(`0x${p}`)));
}

function formatName(alt: string): string {
  // Convert "grinning" to "Grinning Face"
  return alt
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const rawPath = path.join(__dirname, "../src/data/raw-metadata.json");
const outputPath = path.join(__dirname, "../src/data/emoji-kitchen.json");

console.log("Reading raw metadata...");
const rawMetadata: RawMetadata = JSON.parse(fs.readFileSync(rawPath, "utf-8"));

// Format: { emoji: { name: "...", combos: ["emoji1", "emoji2", ...] } }
const index: Record<string, { name: string; combos: string[] }> = {};

console.log("Creating index with names...");

for (const codepoint of rawMetadata.knownSupportedEmoji) {
  const emoji = codepointToEmoji(codepoint);
  const data = rawMetadata.data[codepoint];

  if (!data) continue;

  index[emoji] = {
    name: formatName(data.alt),
    combos: data.combinations ? Object.keys(data.combinations).map((cp) => codepointToEmoji(cp)) : [],
  };
}

fs.writeFileSync(outputPath, JSON.stringify(index));

const sizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
console.log(`✅ Created index with names: ${sizeMB} MB`);
console.log(`   - ${Object.keys(index).length} emojis with names`);

