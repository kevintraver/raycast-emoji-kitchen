import {
  Action,
  ActionPanel,
  clearSearchBar,
  Clipboard,
  Detail,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useMemo, useState } from "react";
import fs from "fs";
import os from "os";
import path from "path";
import EmojiKitchen from "./lib/emoji-kitchen";
import { saveToHistory } from "./lib/storage";

// Global callback to reset the root search state
let resetRootSearch: (() => void) | null = null;

function ResultScreen(props: { first: string; second: string }) {
  const { first, second } = props;
  const { pop } = useNavigation();
  const mashupData = EmojiKitchen.getMashupData(first, second);

  const markdown = mashupData ? `![Emoji Mashup](${mashupData.url}?raycast-height=350)` : "# No mashup available 😢";

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
                  await showToast({ style: Toast.Style.Animated, title: "Downloading image..." });

                  const response = await fetch(mashupData.url);

                  if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                  }

                  const blob = await response.blob();
                  const buffer = await blob.arrayBuffer();

                  const tempFile = path.join(os.tmpdir(), "emoji-mashup.png");
                  fs.writeFileSync(tempFile, Buffer.from(buffer));

                  await Clipboard.copy({ file: tempFile });
                  await saveToHistory(first, second, mashupData.url);
                  await showToast({ style: Toast.Style.Success, title: "Copied Image!" });
                } catch (error) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: "Failed to Copy Image",
                    message: error instanceof Error ? error.message : String(error),
                  });
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
            onAction={async () => {
              if (resetRootSearch) resetRootSearch();
              await clearSearchBar();
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

  useEffect(() => {
    resetRootSearch = () => setSearchText("");
    return () => {
      resetRootSearch = null;
    };
  }, []);

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
