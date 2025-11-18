import { Detail } from "@raycast/api";
import { useState, useEffect } from "react";
import fs from "fs";
import { ensureMetadataExists, getCompactMetadataPath } from "./lib/metadata";
import path from "path";
import { environment } from "@raycast/api";

export default function DebugMetadata() {
  const [status, setStatus] = useState("Initializing...");

  useEffect(() => {
    async function run() {
      try {
        const dataDir = path.join(environment.supportPath, "data");
        const rawPath = path.join(dataDir, "raw-metadata.json");
        const compactPath = getCompactMetadataPath();

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
      }
    }
    run();
  }, []);

  return <Detail markdown={`\`\`\`\n${status}\n\`\`\``} />;
}

