import { Detail, ActionPanel, Action, showToast, Toast, Icon, environment } from "@raycast/api";
import { useState, useEffect } from "react";
import fs from "fs";
import { ensureMetadataExists, getCompactMetadataPath } from "./lib/metadata";
import path from "path";

export default function DebugMetadata() {
  const [status, setStatus] = useState("Initializing...");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const dataDir = path.join(environment.supportPath, "data");
  const rawPath = path.join(dataDir, "raw-metadata.json");
  const compactPath = getCompactMetadataPath();

  async function checkMetadata() {
    setIsRefreshing(true);
    try {
      let log = `Data Dir: ${dataDir}\n`;
      log += `Raw Path: ${rawPath}\n`;
      log += `Compact Path: ${compactPath}\n\n`;

      log += `Checking raw file...\n`;
      if (fs.existsSync(rawPath)) {
        const stats = fs.statSync(rawPath);
        log += `✅ Raw file exists. Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB\n`;
      } else {
        log += `❌ Raw file missing.\n`;
      }

      log += `Checking compact file...\n`;
      if (fs.existsSync(compactPath)) {
        const stats = fs.statSync(compactPath);
        log += `✅ Compact file exists. Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB\n`;
      } else {
        log += `❌ Compact file missing.\n`;
      }

      log += `\nRunning ensureMetadataExists()...\n`;
      setStatus(log);

      await ensureMetadataExists();

      log += `✅ ensureMetadataExists() finished.\n`;

      if (fs.existsSync(compactPath)) {
        const stats = fs.statSync(compactPath);
        log += `✅ Compact file now exists. Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB\n`;
      } else {
        log += `❌ Compact file still missing.\n`;
      }

      setStatus(log);
    } catch (e) {
      setStatus((s) => s + `\n❌ Error: ${String(e)}`);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function deleteMetadata() {
    try {
      await showToast({ style: Toast.Style.Animated, title: "Deleting metadata files..." });

      let deleted = 0;
      if (fs.existsSync(rawPath)) {
        fs.unlinkSync(rawPath);
        deleted++;
      }
      if (fs.existsSync(compactPath)) {
        fs.unlinkSync(compactPath);
        deleted++;
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Metadata Deleted",
        message: `${deleted} file(s) removed`,
      });

      // Refresh status
      await checkMetadata();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete",
        message: String(e),
      });
    }
  }

  useEffect(() => {
    checkMetadata();
  }, []);

  return (
    <Detail
      markdown={`\`\`\`\n${status}\n\`\`\``}
      actions={
        <ActionPanel>
          <Action
            title="Delete Metadata Files"
            icon={Icon.Trash}
            style={Action.Style.Destructive}
            onAction={deleteMetadata}
            shortcut={{ modifiers: ["cmd"], key: "delete" }}
          />
          <Action
            title="Refresh Status"
            icon={Icon.ArrowClockwise}
            onAction={checkMetadata}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
        </ActionPanel>
      }
      isLoading={isRefreshing}
    />
  );
}
