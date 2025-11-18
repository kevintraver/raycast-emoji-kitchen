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
  return alt
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const rawPath = path.join(__dirname, "../src/data/raw-metadata.json");
const outputPath = path.join(__dirname, "../src/data/emoji-kitchen.json");

console.log("Reading raw metadata...");
const rawMetadata: RawMetadata = JSON.parse(fs.readFileSync(rawPath, "utf-8"));

// MINIMAL: { emoji: { n: "Name", c: ["emoji1", "emoji2"] } }
// Use single-letter keys to save space
const index: Record<string, { n: string; c: string[] }> = {};

console.log("Creating minimal index...");

for (const codepoint of rawMetadata.knownSupportedEmoji) {
  const emoji = codepointToEmoji(codepoint);
  const data = rawMetadata.data[codepoint];

  if (!data) continue;

  index[emoji] = {
    n: formatName(data.alt),
    c: data.combinations ? Object.keys(data.combinations).map((cp) => codepointToEmoji(cp)) : [],
  };
}

fs.writeFileSync(outputPath, JSON.stringify(index));

const sizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);
console.log(`✅ Created minimal index: ${sizeMB} MB`);
console.log(`   - ${Object.keys(index).length} emojis`);
console.log(`   - Single-letter keys for space savings`);

