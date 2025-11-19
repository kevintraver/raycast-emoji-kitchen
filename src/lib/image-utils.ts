import { Clipboard, showToast, Toast } from "@raycast/api";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { saveToHistory } from "./storage";

const execFileAsync = promisify(execFile);

export async function copyResizedImage(
  url: string,
  options: { width: number; height?: number; emoji1: string; emoji2: string },
) {
  const { width, height = width, emoji1, emoji2 } = options;

  try {
    await showToast({ style: Toast.Style.Animated, title: "Preparing sticker..." });

    // 1. Download original image
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to download image: ${response.status}`);
    const buffer = await response.arrayBuffer();

    // 2. Save original to temp
    const tempOriginal = path.join(os.tmpdir(), `original-${Date.now()}.png`);
    fs.writeFileSync(tempOriginal, Buffer.from(buffer));

    // 3. Resize using sips
    const tempResized = path.join(os.tmpdir(), `sticker-${width}x${height}-${Date.now()}.png`);

    // sips -z <height> <width> <input> --out <output>
    await execFileAsync("sips", ["-z", String(height), String(width), tempOriginal, "--out", tempResized]);

    // 4. Copy to clipboard
    await Clipboard.copy({ file: tempResized });

    // 5. Save to history
    await saveToHistory(emoji1, emoji2, url);

    // Cleanup
    try {
      fs.unlinkSync(tempOriginal);
      // keep tempResized for clipboard
    } catch {
      // ignore cleanup errors
    }

    await showToast({ style: Toast.Style.Success, title: "Copied Sticker!" });
  } catch (error) {
    console.error("Failed to resize image:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to copy",
      message: String(error),
    });
  }
}

export async function downloadAndCopyImage(
  url: string,
  title: string = "Image",
  historyContext?: { emoji1: string; emoji2: string },
) {
  try {
    await showToast({ style: Toast.Style.Animated, title: `Downloading ${title}...` });

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();

    const tempFile = path.join(os.tmpdir(), "emoji-mashup.png");
    fs.writeFileSync(tempFile, Buffer.from(buffer));

    await Clipboard.copy({ file: tempFile });

    if (historyContext) {
      await saveToHistory(historyContext.emoji1, historyContext.emoji2, url);
    }

    await showToast({ style: Toast.Style.Success, title: `Copied ${title}!` });
    return tempFile;
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: `Failed to Copy ${title}`,
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
