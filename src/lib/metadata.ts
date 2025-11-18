/**
 * Unified metadata manager for Emoji Kitchen
 *
 * Handles:
 * - Downloading raw metadata from GitHub (92MB)
 * - Processing to compact format (8-9MB)
 * - Loading and accessing compact metadata
 * - URL construction for emoji mashups
 */

import fs from "node:fs";
import path from "node:path";
import https from "node:https";
import { environment } from "@raycast/api";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// Configuration
const RAW_METADATA_URL = "https://raw.githubusercontent.com/xsalazar/emoji-kitchen-backend/main/app/metadata.json";
const DATA_DIR = path.join(environment.supportPath, "data");
const RAW_METADATA_PATH = path.join(DATA_DIR, "raw-metadata.json");
const COMPACT_METADATA_PATH = path.join(DATA_DIR, "emoji-kitchen.json");

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Type definitions
export interface EmojiIndexData {
  n: string; // name
  c: Record<string, string>; // combos with date:leftCp:rightCp
}

type EmojiIndex = Record<string, EmojiIndexData>;

// In-memory lock to prevent concurrent downloads
let downloadPromise: Promise<void> | null = null;

// Processing worker script (runs in child process to avoid memory issues)
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

/**
 * Download a file from URL with progress logging
 */
async function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);

    function handleResponse(response: import("http").IncomingMessage) {
      if (response.statusCode === 301 || response.statusCode === 302) {
        if (response.headers.location) {
          https.get(response.headers.location, handleResponse).on("error", onError);
          return;
        }
      }

      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(dest, () => {});
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }

      const totalBytes = parseInt(response.headers["content-length"] || "0", 10);
      let receivedBytes = 0;
      let lastLogBytes = 0;

      console.log(`Starting download. Total size: ${(totalBytes / 1024 / 1024).toFixed(2)} MB`);

      response.on("data", (chunk) => {
        receivedBytes += chunk.length;
        if (receivedBytes - lastLogBytes > 5 * 1024 * 1024) {
          console.log(`Downloaded: ${(receivedBytes / 1024 / 1024).toFixed(2)} MB`);
          lastLogBytes = receivedBytes;
        }
      });

      response.pipe(file);

      file.on("finish", () => {
        file.close();
        if (totalBytes > 0 && receivedBytes !== totalBytes) {
          fs.unlink(dest, () => {});
          reject(new Error(`Download incomplete: ${receivedBytes}/${totalBytes} bytes`));
        } else {
          resolve();
        }
      });
    }

    function onError(err: Error) {
      file.close();
      fs.unlink(dest, () => {});
      reject(err);
    }

    https.get(url, handleResponse).on("error", onError);
  });
}

/**
 * Process raw metadata into compact format using child process
 */
async function processMetadata(rawPath: string, compactPath: string): Promise<void> {
  console.log("Processing raw metadata via child process...");
  const scriptPath = path.join(path.dirname(rawPath), "processor.js");
  fs.writeFileSync(scriptPath, WORKER_SCRIPT);

  try {
    await execFileAsync(process.execPath, [scriptPath, rawPath, compactPath]);
  } finally {
    if (fs.existsSync(scriptPath)) {
      fs.unlinkSync(scriptPath);
    }
  }
}

/**
 * Ensure metadata exists - download and process if needed
 * This is the main function to call on app startup
 * Uses in-memory lock to prevent concurrent downloads
 */
export async function ensureMetadataExists(): Promise<void> {
  // If download is already in progress, wait for it
  if (downloadPromise) {
    console.log("[metadata] Download already in progress, waiting...");
    await downloadPromise;
    return;
  }

  // Check if files already exist
  if (fs.existsSync(RAW_METADATA_PATH) && fs.existsSync(COMPACT_METADATA_PATH)) {
    console.log("[metadata] Metadata files already exist.");
    return;
  }

  // Start download/processing and store promise
  downloadPromise = (async () => {
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
      console.error("Failed to ensure metadata exists:", error);
      throw error;
    } finally {
      downloadPromise = null;
    }
  })();

  await downloadPromise;
}

/**
 * Load compact emoji index from disk
 */
export function getEmojiIndex(): EmojiIndex {
  console.log("[metadata] Loading emoji index");

  if (!fs.existsSync(COMPACT_METADATA_PATH)) {
    console.warn("[metadata] Compact metadata not found at:", COMPACT_METADATA_PATH);
    return {};
  }

  try {
    const data = fs.readFileSync(COMPACT_METADATA_PATH, "utf-8");
    const index = JSON.parse(data) as EmojiIndex;
    console.log("[metadata] Loaded index with", Object.keys(index).length, "entries");
    return index;
  } catch (e) {
    console.error("Failed to load compact metadata:", e);
    return {};
  }
}

/**
 * Convert emoji character to codepoint string
 */
export function emojiToCodepoint(emoji: string): string {
  const codePoints = [];
  for (let i = 0; i < emoji.length; i++) {
    const cp = emoji.codePointAt(i);
    if (cp) {
      codePoints.push(cp.toString(16));
      // Skip the second code unit of surrogate pairs
      if (cp > 0xffff) i++;
    }
  }
  return codePoints.join("-");
}

/**
 * Build mashup URL from date:leftCp:rightCp string
 */
export function buildMashupUrl(dataString: string): string {
  const [date, leftCp, rightCp] = dataString.split(":");

  const getUrlPart = (cp: string) => `u${cp.split("-").join("-u")}`;

  const uLeft = getUrlPart(leftCp);
  const uRight = getUrlPart(rightCp);

  const url = `https://www.gstatic.com/android/keyboard/emojikitchen/${date}/${uLeft}/${uLeft}_${uRight}.png`;

  return url;
}

/**
 * Get path to compact metadata file
 */
export function getCompactMetadataPath(): string {
  return COMPACT_METADATA_PATH;
}
