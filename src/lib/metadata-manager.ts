import { Cache, showToast, Toast } from "@raycast/api";
import { RawMetadata, ProcessedMetadata } from "../types";

const METADATA_URL =
  "https://raw.githubusercontent.com/xsalazar/emoji-kitchen-backend/main/app/metadata.json";
const CACHE_KEY = "processed-metadata";
const cache = new Cache();

function codepointToEmoji(codepoint: string): string {
  return String.fromCodePoint(...codepoint.split("-").map((p) => parseInt(`0x${p}`)));
}

function processRawMetadata(raw: RawMetadata): ProcessedMetadata {
  const processed: ProcessedMetadata = {};

  for (const codepoint of raw.knownSupportedEmoji) {
    const emoji = codepointToEmoji(codepoint);
    const data = raw.data[codepoint];

    if (!data?.combinations) continue;

    processed[emoji] = {};

    for (const [rightCodepoint, variants] of Object.entries(data.combinations)) {
      const rightEmoji = codepointToEmoji(rightCodepoint);
      const latest = variants.find((v) => v.isLatest) || variants[0];
      processed[emoji][rightEmoji] = { url: latest.gStaticUrl };
    }
  }

  return processed;
}

export async function getMetadata(): Promise<ProcessedMetadata> {
  // Try cache first
  const cached = cache.get(CACHE_KEY);
  if (cached) {
    return JSON.parse(cached);
  }

  // Download and process
  return await refreshMetadata();
}

export async function refreshMetadata(): Promise<ProcessedMetadata> {
  await showToast({
    style: Toast.Style.Animated,
    title: "Downloading emoji metadata...",
  });

  try {
    const response = await fetch(METADATA_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const raw: RawMetadata = await response.json();
    const processed = processRawMetadata(raw);

    // Cache for future use
    cache.set(CACHE_KEY, JSON.stringify(processed));

    await showToast({
      style: Toast.Style.Success,
      title: "Metadata updated!",
      message: `${Object.keys(processed).length} emojis loaded`,
    });

    return processed;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to download metadata",
      message: String(error),
    });
    throw error;
  }
}

