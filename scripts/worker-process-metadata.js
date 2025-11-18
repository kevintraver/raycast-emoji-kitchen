/**
 * Worker script to process raw metadata into compact format
 * Runs in child process to avoid memory issues with large JSON file
 *
 * Usage: node worker-process-metadata.js <rawPath> <compactPath>
 */

const fs = require('fs');

const [,, rawPath, compactPath] = process.argv;

function codepointToEmoji(codepoint) {
  return String.fromCodePoint(...codepoint.split("-").map((p) => parseInt(p, 16)));
}

function formatName(alt) {
  return alt
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

try {
  console.log("Reading raw metadata...");
  const rawMetadata = JSON.parse(fs.readFileSync(rawPath, "utf-8"));

  const index = {};
  let totalCombos = 0;

  console.log("Processing...");
  for (const codepoint of rawMetadata.knownSupportedEmoji) {
    const emoji = codepointToEmoji(codepoint);
    const data = rawMetadata.data[codepoint];

    if (!data) continue;

    const combos = {};

    if (data.combinations) {
      for (const [rightCp, variants] of Object.entries(data.combinations)) {
        const rightEmoji = codepointToEmoji(rightCp);
        const latest = variants.find((v) => v.isLatest) || variants[0];
        combos[rightEmoji] = `${latest.date}:${latest.leftEmojiCodepoint}:${latest.rightEmojiCodepoint}`;
        totalCombos++;
      }
    }

    index[emoji] = {
      n: formatName(data.alt),
      c: combos,
    };
  }

  fs.writeFileSync(compactPath, JSON.stringify(index));
  console.log(`Processed ${totalCombos} combinations.`);
} catch (err) {
  console.error(err);
  process.exit(1);
}
