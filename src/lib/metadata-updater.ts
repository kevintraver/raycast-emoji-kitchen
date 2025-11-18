import fs from "node:fs";
import path from "node:path";
import { environment } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

const RAW_METADATA_URL = "https://raw.githubusercontent.com/xsalazar/emoji-kitchen-backend/main/app/metadata.json";
const DATA_DIR = path.join(environment.supportPath, "data");
const RAW_METADATA_PATH = path.join(DATA_DIR, "raw-metadata.json");
const COMPACT_METADATA_PATH = path.join(DATA_DIR, "emoji-kitchen.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const WORKER_SCRIPT = `
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
        combos[rightEmoji] = \`\${latest.date}:\${latest.leftEmojiCodepoint}:\${latest.rightEmojiCodepoint}\`;
        totalCombos++;
      }
    }

    index[emoji] = {
      n: formatName(data.alt),
      c: combos,
    };
  }

  fs.writeFileSync(compactPath, JSON.stringify(index));
  console.log(\`Processed \${totalCombos} combinations.\`);
} catch (err) {
  console.error(err);
  process.exit(1);
}
`;

async function downloadFile(url: string, dest: string): Promise<void> {
  console.log(`Downloading via curl: ${url}`);
  await execFileAsync("curl", ["-L", "-o", dest, url]);
  
  if (fs.existsSync(dest)) {
      const stats = fs.statSync(dest);
      if (stats.size < 1000000) { // < 1MB is suspicious for this file
          console.warn(`Downloaded file is suspiciously small (${stats.size} bytes). Deleting.`);
          fs.unlinkSync(dest);
          throw new Error("Download failed: File too small (likely error page or partial)");
      }
  } else {
      throw new Error("Download failed: File not created");
  }
}

async function processMetadata(rawPath: string, compactPath: string): Promise<void> {
  console.log("Processing raw metadata via child process...");
  const scriptPath = path.join(path.dirname(rawPath), "processor.js");
  fs.writeFileSync(scriptPath, WORKER_SCRIPT);

  try {
    // Use process.execPath to ensure we use the correct node executable
    await execFileAsync(process.execPath, [scriptPath, rawPath, compactPath]);
  } finally {
    if (fs.existsSync(scriptPath)) {
        fs.unlinkSync(scriptPath);
    }
  }
}

export async function updateMetadata(): Promise<void> {
  try {
    console.log("Checking metadata at:", RAW_METADATA_PATH);
    
    if (!fs.existsSync(RAW_METADATA_PATH)) {
      console.log("Downloading raw metadata from:", RAW_METADATA_URL);
      await downloadFile(RAW_METADATA_URL, RAW_METADATA_PATH);
      console.log("Download complete. Processing...");
      
      try {
        await processMetadata(RAW_METADATA_PATH, COMPACT_METADATA_PATH);
        console.log("Metadata processing complete.");
      } catch (e) {
        console.error("Processing failed, deleting potentially corrupted raw file.");
        if (fs.existsSync(RAW_METADATA_PATH)) {
            fs.unlinkSync(RAW_METADATA_PATH);
        }
        throw e;
      }
    } else {
      console.log("Raw metadata already exists.");
      // Ensure compact metadata also exists
      if (!fs.existsSync(COMPACT_METADATA_PATH)) {
          console.log("Compact metadata missing. Reprocessing...");
          try {
            await processMetadata(RAW_METADATA_PATH, COMPACT_METADATA_PATH);
          } catch (e) {
            console.error("Processing failed (existing raw file), deleting corrupted raw file.");
            if (fs.existsSync(RAW_METADATA_PATH)) {
                fs.unlinkSync(RAW_METADATA_PATH);
            }
            throw e;
          }
      }
    }
  } catch (error) {
    console.error("Failed to update metadata:", error);
  }
}

export function getCompactMetadataPath(): string {
    return COMPACT_METADATA_PATH;
}
