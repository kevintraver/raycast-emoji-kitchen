import {
  Action,
  ActionPanel,
  List,
  Detail,
  Icon,
  showToast,
  Toast,
  clearSearchBar,
  useNavigation,
  Clipboard,
} from "@raycast/api";
import { useState, useMemo } from "react";
import EmojiKitchen from "./lib/emoji-kitchen";
import { saveToHistory } from "./lib/storage";

function ResultScreen(props: { first: string; second: string }) {
  const { first, second } = props;
  const { pop } = useNavigation();
  const mashupData = EmojiKitchen.getMashupData(first, second);

  const markdown = mashupData ? `![Emoji Mashup](${mashupData.url})` : "# No mashup available 😢";

  return (
    <Detail
      navigationTitle={`${first} + ${second}`}
      markdown={markdown}
      actions={
        <ActionPanel>
          {mashupData && (
            <Action
              title="Copy Mashup Image"
              icon={Icon.Clipboard}
              onAction={async () => {
                try {
                  // Fetch the image and copy it to clipboard
                  const response = await fetch(mashupData.url);
                  const blob = await response.blob();
                  const buffer = await blob.arrayBuffer();

                  await Clipboard.copy({ file: Buffer.from(buffer) });
                  await saveToHistory(first, second, mashupData.url);
                  await showToast({ style: Toast.Style.Success, title: "Copied Image!" });
                } catch {
                  await showToast({ style: Toast.Style.Failure, title: "Failed to Copy Image" });
                }
              }}
            />
          )}
          {mashupData && <Action.OpenInBrowser title="Open in Browser" url={mashupData.url} />}
          <Action
            title="Back"
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: ["cmd"], key: "[" }}
            onAction={() => pop()}
          />
          <Action
            title="Start over"
            icon={Icon.RotateAntiClockwise}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => {
              pop();
              pop();
            }}
          />
        </ActionPanel>
      }
    />
  );
}

function SecondEmojiScreen(props: { firstEmoji: string }) {
  const { firstEmoji } = props;
  const [searchText, setSearchText] = useState("");
  const validCombinations = EmojiKitchen.getValidCombinations(firstEmoji);
  const filtered = validCombinations.filter(
    (i) => i.name.toLowerCase().includes(searchText.toLowerCase()) || i.emoji.includes(searchText),
  );

  return (
    <List
      searchBarPlaceholder={`Mix ${firstEmoji} with...`}
      navigationTitle={`Mix ${firstEmoji} + ?`}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
    >
      {filtered.map((item) => (
        <List.Item
          key={item.emoji}
          icon={item.emoji}
          title={item.name}
          actions={
            <ActionPanel>
              <Action.Push
                title="Select This Emoji"
                icon={Icon.Checkmark}
                target={<ResultScreen first={firstEmoji} second={item.emoji} />}
              />
            </ActionPanel>
          }
        />
      ))}

      {filtered.length === 0 && (
        <List.EmptyView
          title={searchText ? "No matches" : "Start typing"}
          description={
            searchText ? `Nothing for "${searchText}"` : `${validCombinations.length} combinations available`
          }
          icon={Icon.QuestionMark}
        />
      )}
    </List>
  );
}

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const allEmojis = useMemo(() => EmojiKitchen.getAllBaseEmojis(), []);

  const filtered = allEmojis.filter(
    (i) => i.name.toLowerCase().includes(searchText.toLowerCase()) || i.emoji.includes(searchText),
  );

  return (
    <List
      searchBarPlaceholder="Search first emoji..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      throttle
    >
      {filtered.map((item) => (
        <List.Item
          key={item.emoji}
          icon={item.emoji}
          title={item.name}
          actions={
            <ActionPanel>
              <Action.Push
                title="Mix This Emoji"
                icon={Icon.ArrowRight}
                target={<SecondEmojiScreen firstEmoji={item.emoji} />}
                onPush={async () => await clearSearchBar()}
              />
            </ActionPanel>
          }
        />
      ))}

      {filtered.length === 0 && <List.EmptyView icon={Icon.MagnifyingGlass} title="No emoji found" />}
    </List>
  );
}
