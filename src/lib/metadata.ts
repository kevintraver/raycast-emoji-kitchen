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

// Progress callback type
export type ProgressCallback = (status: string) => void;

/**
 * Generate worker script content dynamically
 * This avoids file path issues in compiled Raycast extensions
 */
function getWorkerScript(): string {
  return `
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
  `.trim();
}

/**
 * Download a file from URL with progress logging
 */
async function downloadFile(url: string, dest: string, onProgress?: ProgressCallback): Promise<void> {
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
      let lastProgressBytes = 0;

      const totalMB = (totalBytes / 1024 / 1024).toFixed(2);
      console.log(`Starting download. Total size: ${totalMB} MB`);
      onProgress?.(`Downloading metadata (0 MB / ${totalMB} MB)...`);

      response.on("data", (chunk) => {
        receivedBytes += chunk.length;
        // Update progress every 10MB
        if (receivedBytes - lastProgressBytes > 10 * 1024 * 1024) {
          const downloadedMB = (receivedBytes / 1024 / 1024).toFixed(2);
          console.log(`Downloaded: ${downloadedMB} MB`);
          onProgress?.(`Downloading metadata (${downloadedMB} MB / ${totalMB} MB)...`);
          lastProgressBytes = receivedBytes;
        }
      });

      response.pipe(file);

      file.on("finish", () => {
        file.close(() => {
          // Validate download after file is fully closed and flushed
          if (totalBytes > 0 && receivedBytes !== totalBytes) {
            fs.unlink(dest, () => {});
            reject(new Error(`Download incomplete: ${receivedBytes}/${totalBytes} bytes`));
          } else {
            console.log(`Download validated: ${receivedBytes} bytes`);
            onProgress?.(`Download complete (${totalMB} MB). Processing...`);
            resolve();
          }
        });
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

  try {
    fs.writeFileSync(scriptPath, getWorkerScript());
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
export async function ensureMetadataExists(onProgress?: ProgressCallback): Promise<void> {
  // If download is already in progress, wait for it
  if (downloadPromise) {
    console.log("[metadata] Download already in progress, waiting...");
    onProgress?.("Waiting for existing download to complete...");
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

      // Download raw metadata if it doesn't exist
      if (!fs.existsSync(RAW_METADATA_PATH)) {
        console.log("Downloading raw metadata from:", RAW_METADATA_URL);
        onProgress?.("Starting metadata download...");
        await downloadFile(RAW_METADATA_URL, RAW_METADATA_PATH, onProgress);
        console.log("Download complete.");
      } else {
        console.log("Raw metadata already exists, skipping download.");
      }

      // Process raw metadata if compact version doesn't exist
      if (!fs.existsSync(COMPACT_METADATA_PATH)) {
        console.log("Compact metadata missing. Processing raw metadata...");
        onProgress?.("Processing metadata (this may take 10-15 seconds)...");

        try {
          await processMetadata(RAW_METADATA_PATH, COMPACT_METADATA_PATH);
          console.log("Metadata processing complete.");
          onProgress?.("Metadata ready!");
        } catch (e) {
          console.error("Processing failed:", e);

          // Only delete raw file if it's corrupted (JSON parse error indicates corrupt download)
          if (e instanceof Error && (e.message.includes("JSON") || e.message.includes("SyntaxError"))) {
            console.error("Raw metadata appears corrupted. Deleting for fresh download next time.");
            if (fs.existsSync(RAW_METADATA_PATH)) {
              fs.unlinkSync(RAW_METADATA_PATH);
            }
          } else {
            console.error("Processing failed for unknown reason. Keeping raw file for retry.");
          }
          throw e;
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
