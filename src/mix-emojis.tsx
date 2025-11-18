import { List, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useState, useEffect } from "react";
import EmojiKitchen from "./lib/emoji-kitchen";
import { saveToHistory } from "./lib/storage";

export default function MixEmojis() {
  const [selectedLeftEmoji, setSelectedLeftEmoji] = useState<string>("");

  if (!selectedLeftEmoji) {
    return <FirstEmojiPicker onSelect={setSelectedLeftEmoji} />;
  }

  return <SecondEmojiPicker leftEmoji={selectedLeftEmoji} onBack={() => setSelectedLeftEmoji("")} />;
}

function FirstEmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  const [emojis, setEmojis] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    EmojiKitchen.getAllBaseEmojis().then((data) => {
      setEmojis(data);
      setIsLoading(false);
    });
  }, []);

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search first emoji...">
      {emojis.map((emoji) => (
        <List.Item
          key={emoji}
          icon={emoji}
          title={emoji}
          actions={
            <ActionPanel>
              <Action title="Select" icon={Icon.ArrowRight} onAction={() => onSelect(emoji)} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function SecondEmojiPicker({ leftEmoji, onBack }: { leftEmoji: string; onBack: () => void }) {
  const [validCombinations, setValidCombinations] = useState<string[]>([]);
  const [mashupUrls, setMashupUrls] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadCombinations() {
      const combos = await EmojiKitchen.getValidCombinations(leftEmoji);
      setValidCombinations(combos);

      // Pre-fetch all mashup URLs
      const urls: Record<string, string> = {};
      for (const emoji of combos) {
        const mashupData = await EmojiKitchen.getMashupData(leftEmoji, emoji);
        if (mashupData) {
          urls[emoji] = mashupData.url;
        }
      }
      setMashupUrls(urls);
      setIsLoading(false);
    }

    loadCombinations();
  }, [leftEmoji]);

  async function handleCopy(rightEmoji: string, url: string) {
    await showToast({
      style: Toast.Style.Success,
      title: "Copied!",
      message: `${leftEmoji} + ${rightEmoji} mashup`,
    });
    await saveToHistory(leftEmoji, rightEmoji, url);
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder={`Mix ${leftEmoji} with...`} navigationTitle={`${leftEmoji} + ?`}>
      {validCombinations.length > 0 ? (
        validCombinations.map((emoji) => {
          const mashupUrl = mashupUrls[emoji];
          if (!mashupUrl) return null;

          return (
            <List.Item
              key={emoji}
              icon={emoji}
              title={emoji}
              subtitle={`Creates ${leftEmoji}+${emoji} mashup`}
              accessories={[
                {
                  icon: { source: mashupUrl },
                  tooltip: "Mashup preview",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Mashup URL"
                    content={mashupUrl}
                    onCopy={() => handleCopy(emoji, mashupUrl)}
                  />
                  <Action.OpenInBrowser title="View Mashup" url={mashupUrl} />
                  <Action
                    title="Change First Emoji"
                    icon={Icon.ArrowLeft}
                    onAction={onBack}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  />
                </ActionPanel>
              }
            />
          );
        })
      ) : (
        <List.EmptyView
          icon={Icon.EmojiSad}
          title="No combinations available"
          description={`${leftEmoji} doesn't have any mashups`}
          actions={
            <ActionPanel>
              <Action title="Pick Different Emoji" icon={Icon.ArrowLeft} onAction={onBack} />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}

