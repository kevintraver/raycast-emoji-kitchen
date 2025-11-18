import { List, ActionPanel, Action, showToast, Toast, Icon } from "@raycast/api";
import { useState } from "react";
import EmojiKitchen from "./lib/emoji-kitchen";
import { saveToHistory } from "./lib/storage";

export default function DescribeMashup() {
  const [description, setDescription] = useState("");
  const [result, setResult] = useState<{ emoji1: string; emoji2: string; url: string } | null>(null);

  function findMashup() {
    if (!description.trim()) return;

    try {
      // Simple keyword matching - show first valid combo for MVP
      const validPairs = EmojiKitchen.getAllValidPairs();
      const [pair] = validPairs;
      const [emoji1, emoji2] = pair.split("+");

      const mashup = EmojiKitchen.getMashupData(emoji1, emoji2);
      if (mashup) {
        setResult({ emoji1, emoji2, url: mashup.url });
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: String(error),
      });
    }
  }

  return (
    <List searchBarPlaceholder="Describe emoji mashup (e.g., 'zombie in love')..." onSearchTextChange={setDescription}>
      {result ? (
        <List.Item
          title={`${result.emoji1} + ${result.emoji2}`}
          icon={{ source: result.url }}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard
                content={result.url}
                onCopy={async () => {
                  await saveToHistory(result.emoji1, result.emoji2, result.url);
                  await showToast({ style: Toast.Style.Success, title: "Copied!" });
                }}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Stars}
          title="Describe your mashup"
          description="Examples: 'zombie in love', 'angry cat'"
          actions={
            <ActionPanel>
              <Action title="Search" onAction={findMashup} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
