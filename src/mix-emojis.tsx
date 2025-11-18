import { List, Detail, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import EmojiKitchen from "./lib/emoji-kitchen";
import { saveToHistory } from "./lib/storage";

export default function MixEmojis() {
  const [firstEmoji, setFirstEmoji] = useState<string | null>(null);
  const [secondEmoji, setSecondEmoji] = useState<string | null>(null);

  // Step 3: Show result
  if (firstEmoji && secondEmoji) {
    const mashupData = EmojiKitchen.getMashupData(firstEmoji, secondEmoji);

    if (!mashupData) {
      return (
        <Detail
          markdown="# Error\n\nCouldn't generate mashup"
          actions={
            <ActionPanel>
              <Action
                title="Start over"
                onAction={() => {
                  setFirstEmoji(null);
                  setSecondEmoji(null);
                }}
              />
            </ActionPanel>
          }
        />
      );
    }

    const markdown = `# ${firstEmoji} + ${secondEmoji}

![Mashup](${mashupData.url})

**Your emoji mashup is ready!**`;

    return (
      <Detail
        markdown={markdown}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Mashup URL"
              content={mashupData.url}
              onCopy={async () => {
                await saveToHistory(firstEmoji, secondEmoji, mashupData.url);
                await showToast({
                  style: Toast.Style.Success,
                  title: "Copied!",
                  message: `${firstEmoji} + ${secondEmoji}`,
                });
              }}
            />
            <Action.OpenInBrowser title="Open in Browser" url={mashupData.url} />
            <Action
              title="Try Another"
              icon={Icon.Repeat}
              onAction={() => setSecondEmoji(null)}
              shortcut={{ modifiers: ["cmd"], key: "t" }}
            />
            <Action
              title="Start over"
              icon={Icon.RotateAntiClockwise}
              onAction={() => {
                setFirstEmoji(null);
                setSecondEmoji(null);
              }}
              shortcut={{ modifiers: ["cmd"], key: "n" }}
            />
          </ActionPanel>
        }
      />
    );
  }

  // Step 2: Select second emoji
  if (firstEmoji) {
    const validCombinations = EmojiKitchen.getValidCombinations(firstEmoji);

    return (
      <List searchBarPlaceholder={`Mix ${firstEmoji} with...`} navigationTitle={`Mix with ${firstEmoji}`}>
        {validCombinations.length > 0 ? (
          <List.Section title={`Available Combinations (${validCombinations.length})`}>
            {validCombinations.map((item) => (
              <List.Item
                key={item.emoji}
                icon={item.emoji}
                title={item.name}
                actions={
                  <ActionPanel>
                    <Action title="Select" icon={Icon.CheckCircle} onAction={() => setSecondEmoji(item.emoji)} />
                  <Action
                    title="Change First Emoji"
                    icon={Icon.ArrowLeft}
                    onAction={() => setFirstEmoji(null)}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ) : (
          <List.EmptyView
            title="No combinations available"
            description={`${firstEmoji} doesn't have any mashups`}
            icon={Icon.EmojiSad}
            actions={
              <ActionPanel>
                <Action title="Pick Different Emoji" onAction={() => setFirstEmoji(null)} />
              </ActionPanel>
            }
          />
        )}
      </List>
    );
  }

  // Step 1: Select first emoji
  const allEmojis = EmojiKitchen.getAllBaseEmojis();

  return (
    <List searchBarPlaceholder="Search first emoji...">
      {allEmojis.map((item) => (
        <List.Item
          key={item.emoji}
          icon={item.emoji}
          title={item.name}
          actions={
            <ActionPanel>
              <Action title="Select" icon={Icon.ArrowRight} onAction={() => setFirstEmoji(item.emoji)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
