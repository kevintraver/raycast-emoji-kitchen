import { Action, ActionPanel, Icon, List, AI, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import EmojiKitchen from "./lib/emoji-kitchen";
import { ensureMetadataExists } from "./lib/metadata";
import { MashupResult } from "./components/MashupResult";
import { saveToHistory } from "./lib/storage";
import { usePromise } from "@raycast/utils";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const [result, setResult] = useState<{ emoji1: string; emoji2: string } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { isLoading: isInitializing } = usePromise(async () => {
    await ensureMetadataExists();
    EmojiKitchen.reload();
  });

  const processQuery = async (query: string, maxRetries = 3) => {
    if (!query.trim()) return;

    setIsProcessing(true);

    try {
      const allEmojis = EmojiKitchen.getAllBaseEmojis();
      const emojiList = allEmojis.map((e) => `${e.emoji} ${e.name}`).join("\n");
      const failedAttempts: string[] = [];

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        const avoidClause = failedAttempts.length > 0
          ? `\n\nDo NOT use these combinations (no mashup exists): ${failedAttempts.join(", ")}`
          : "";

        const prompt = `You are an emoji interpreter. Given a user's message, identify the two emojis they want to combine.

Available emojis:
${emojiList}

The user may:
- Explicitly name emojis: "smile and heart" → 😄,❤️
- Describe a concept: "robot who needs caffeine" → 🤖,☕
- Use emoji characters directly: "😀❤️" → 😀,❤️

Return ONLY two emoji characters separated by a comma. Nothing else.${avoidClause}

User message: ${query}`;

        const response = await AI.ask(prompt, { creativity: "low" });
        const emojis = response.trim().split(",").map((e) => e.trim());

        if (emojis.length !== 2) {
          continue;
        }

        const [emoji1, emoji2] = emojis;
        const mashupData = EmojiKitchen.getMashupData(emoji1, emoji2);

        if (!mashupData) {
          failedAttempts.push(`${emoji1}+${emoji2}`);
          continue;
        }

        await saveToHistory(emoji1, emoji2, mashupData.url);
        setResult({ emoji1, emoji2 });
        return;
      }

      // All retries failed
      await showToast({
        style: Toast.Style.Failure,
        title: "Could not find valid mashup",
        message: "Try a different description",
      });
    } catch (err) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: String(err),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (result) {
    return (
      <MashupResult
        emoji1={result.emoji1}
        emoji2={result.emoji2}
        extraActions={
          <Action
            title="New Search"
            icon={Icon.MagnifyingGlass}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => {
              setResult(null);
              setSearchText("");
            }}
          />
        }
      />
    );
  }

  return (
    <List
      isLoading={isInitializing || isProcessing}
      searchBarPlaceholder="Describe the emoji mashup you want..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
    >
      {searchText.trim() && !isProcessing ? (
        <List.Item
          icon={Icon.Wand}
          title={`Mix: "${searchText}"`}
          subtitle="Press Enter to generate mashup"
          actions={
            <ActionPanel>
              <Action
                title="Generate Mashup"
                icon={Icon.Wand}
                onAction={() => processQuery(searchText)}
              />
            </ActionPanel>
          }
        />
      ) : (
        <List.EmptyView
          icon={Icon.Wand}
          title={isProcessing ? "Generating mashup..." : "Describe your emoji mashup"}
          description={isProcessing ? "" : 'Try "robot who needs caffeine" or "happy love"'}
        />
      )}
    </List>
  );
}
