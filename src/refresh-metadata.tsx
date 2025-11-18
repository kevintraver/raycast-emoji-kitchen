import { showHUD, popToRoot } from "@raycast/api";
import { refreshMetadata } from "./lib/metadata-manager";

export default async function RefreshMetadata() {
  try {
    await refreshMetadata();
    await showHUD("✅ Emoji metadata refreshed!");
    await popToRoot();
  } catch (error) {
    await showHUD(`❌ Failed: ${error}`);
  }
}

