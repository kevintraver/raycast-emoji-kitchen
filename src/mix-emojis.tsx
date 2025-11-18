import { List, ActionPanel, Action, Icon, showToast, Toast, clearSearchBar, Image } from "@raycast/api";
import { useState, useMemo } from "react";
import EmojiKitchen from "./lib/emoji-kitchen";
import { saveToHistory } from "./lib/storage";

export default function MixEmojis() {
  const [input1, setInput1] = useState("");
  const [input2, setInput2] = useState("");

  const [firstEmoji, setFirstEmoji] = useState<string | null>(null);
  const [secondEmoji, setSecondEmoji] = useState<string | null>(null);

  const allEmojis = useMemo(() => EmojiKitchen.getAllBaseEmojis(), []);

  // ── STEP 3: Result (inside List for Escape support!) ───────────────────────────────────
  if (firstEmoji && secondEmoji) {
    const mashupData = EmojiKitchen.getMashupData(firstEmoji, secondEmoji);

    return (
      <List navigationTitle={`${firstEmoji} + ${secondEmoji} = Mashup!`} isShowingDetail>
        <List.Item
          title={`${firstEmoji} + ${secondEmoji}`}
          icon={{ source: mashupData?.url || "", mask: Image.Mask.RoundedRectangle }}
          detail={
            <List.Item.Detail
              markdown={mashupData ? `![](${mashupData.url})` : "No mashup available"}
              metadata={
                mashupData ? (
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="First" text={firstEmoji} />
                    <List.Item.Detail.Metadata.Label title="Second" text={secondEmoji} />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Link title="Mashup URL" text={mashupData.url} target={mashupData.url} />
                  </List.Item.Detail.Metadata>
                ) : undefined
              }
            />
          }
          actions={
            <ActionPanel>
              {mashupData ? (
                <>
                  <Action.CopyToClipboard
                    title="Copy Mashup URL"
                    content={mashupData.url}
                    onCopy={async () => {
                      await saveToHistory(firstEmoji, secondEmoji, mashupData.url);
                      await showToast({
                        style: Toast.Style.Success,
                        title: "Copied to Clipboard!",
                      });
                    }}
                  />
                  <Action.OpenInBrowser title="Open in Browser" url={mashupData.url} />
                </>
              ) : null}

              <Action
                title="Back to Second Emoji"
                icon={Icon.ArrowLeft}
                shortcut={{ modifiers: ["cmd"], key: "[" }}
                onAction={() => setSecondEmoji(null)}
              />

              <Action
                title="Try Another Second Emoji"
                icon={Icon.Repeat}
                shortcut={{ modifiers: ["cmd"], key: "t" }}
                onAction={async () => {
                  setSecondEmoji(null);
                  setInput2("");
                  await clearSearchBar();
                }}
              />

              <Action
                title="Start over"
                icon={Icon.RotateAntiClockwise}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={() => {
                  setFirstEmoji(null);
                  setSecondEmoji(null);
                  setInput1("");
                  setInput2("");
                }}
              />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // ── STEP 2: Pick Second Emoji ─────────────────────────────────────
  if (firstEmoji) {
    const validCombinations = EmojiKitchen.getValidCombinations(firstEmoji);

    // Filter by current input2
    const filtered = validCombinations.filter(
      (item) => item.name.toLowerCase().includes(input2.toLowerCase()) || item.emoji.includes(input2),
    );

    return (
      <List
        searchBarPlaceholder={`Mix ${firstEmoji} with...`}
        navigationTitle={`Mix ${firstEmoji} + ?`}
        searchText={input2}
        onSearchTextChange={setInput2}
        throttle
      >
        {filtered.length > 0 ? (
          <List.Section title={`Available Combinations (${filtered.length})`}>
            {filtered.map((item) => (
              <List.Item
                key={item.emoji}
                icon={item.emoji}
                title={item.name}
                subtitle={item.emoji}
                actions={
                  <ActionPanel>
                    <Action
                      title="Select This Emoji"
                      icon={Icon.Checkmark}
                      onAction={async () => {
                        setSecondEmoji(item.emoji);
                        await clearSearchBar();
                      }}
                    />
                    <Action
                      title="Change First Emoji"
                      icon={Icon.ArrowLeft}
                      shortcut={{ modifiers: ["cmd"], key: "[" }}
                      onAction={() => setFirstEmoji(null)}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        ) : (
          <List.EmptyView
            icon={Icon.QuestionMark}
            title={input2 ? "No combinations found" : "Start typing"}
            description={
              input2 ? `Nothing matches "${input2}"` : `This emoji has ${validCombinations.length} combinations`
            }
          />
        )}
      </List>
    );
  }

  // ── STEP 1: Pick First Emoji ─────────────────────────────────────
  const filteredFirst = allEmojis.filter(
    (item) => item.name.toLowerCase().includes(input1.toLowerCase()) || item.emoji.includes(input1),
  );

  return (
    <List searchBarPlaceholder="Search first emoji..." searchText={input1} onSearchTextChange={setInput1} throttle>
      {filteredFirst.map((item) => (
        <List.Item
          key={item.emoji}
          icon={item.emoji}
          title={item.name}
          subtitle={item.emoji}
          actions={
            <ActionPanel>
              <Action
                title="Mix This Emoji"
                icon={Icon.ArrowRight}
                onAction={async () => {
                  setFirstEmoji(item.emoji);
                  setInput2("");
                  await clearSearchBar();
                }}
              />
            </ActionPanel>
          }
        />
      ))}

      {filteredFirst.length === 0 && (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="No emoji found" description='Try "heart", "fire", "cat"' />
      )}
    </List>
  );
}
