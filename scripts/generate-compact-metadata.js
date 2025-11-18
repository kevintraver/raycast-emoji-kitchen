const fs = require("fs");
const path = require("path");

/**
 * Convert a codepoint string like "1f600-200d-1f9b0" to a printable emoji.
 */
function codepointToEmoji(codepoint) {
  return String.fromCodePoint(
    ...codepoint.split("-").map((part) => Number.parseInt(part, 16)),
  );
}

function pickLatestVariant(variants) {
  if (!Array.isArray(variants) || variants.length === 0) return null;
  return variants.find((v) => v.isLatest) || variants[0];
}

function main() {
  const rawPath = path.join(__dirname, "../src/data/raw-metadata.json");
  const compactPath = path.join(__dirname, "../src/data/emoji-kitchen.json");
  const indexPath = path.join(__dirname, "../src/data/emoji-index.json");

  console.log("[generate-metadata] Reading raw metadata...");
  const raw = JSON.parse(fs.readFileSync(rawPath, "utf8"));

  const compact = {};
  const adjacency = {};
  let totalCombos = 0;

  console.log("[generate-metadata] Building compact maps (latest variants only)...");
  for (const leftCodepoint of raw.knownSupportedEmoji) {
    const leftEmoji = codepointToEmoji(leftCodepoint);
    const combinationMap = raw.data[leftCodepoint]?.combinations || {};

    const rightEntries = Object.entries(combinationMap)
      .map(([rightCodepoint, variants]) => {
        const latest = pickLatestVariant(variants);
        if (!latest) return null;
        return {
          rightEmoji: codepointToEmoji(rightCodepoint),
          gBoardOrder: latest.gBoardOrder,
          dataString: `${latest.date}:${latest.leftEmojiCodepoint}:${latest.rightEmojiCodepoint}`,
        };
      })
      .filter(Boolean)
      // Stable order for reproducible output
      .sort((a, b) => a.gBoardOrder - b.gBoardOrder);

    if (rightEntries.length === 0) continue;

    compact[leftEmoji] = {};
    adjacency[leftEmoji] = [];

    for (const entry of rightEntries) {
      compact[leftEmoji][entry.rightEmoji] = entry.dataString;
      adjacency[leftEmoji].push(entry.rightEmoji);
      totalCombos++;
    }
  }

  console.log("[generate-metadata] Writing compact metadata...");
  fs.writeFileSync(compactPath, JSON.stringify(compact));
  fs.writeFileSync(indexPath, JSON.stringify(adjacency));

  const compactSizeMB = (fs.statSync(compactPath).size / 1024 / 1024).toFixed(2);
  const indexSizeMB = (fs.statSync(indexPath).size / 1024 / 1024).toFixed(2);

  console.log("[generate-metadata] Done:");
  console.log(`  - Base emojis: ${Object.keys(compact).length}`);
  console.log(`  - Combinations: ${totalCombos}`);
  console.log(`  - compact file: ${compactSizeMB} MB -> ${compactPath}`);
  console.log(`  - index file:   ${indexSizeMB} MB -> ${indexPath}`);
}

main();
