import { Action, ActionPanel, clearSearchBar, Detail, Icon, List, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import EmojiKitchen from "./lib/emoji-kitchen";
import { ensureMetadataExists } from "./lib/metadata";
import { copyResizedImage, downloadAndCopyImage } from "./lib/image-utils";

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
            <>
              <Action
                title="Copy Mashup Image"
                icon={Icon.Clipboard}
                onAction={async () => {
                  await downloadAndCopyImage(mashupData.url, "Mashup Image", {
                    emoji1: first,
                    emoji2: second,
                  });
                }}
              />
              <Action
                title="Copy Small Sticker (256Px)"
                icon={Icon.Image}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                onAction={() =>
                  copyResizedImage(mashupData.url, {
                    width: 256,
                    emoji1: first,
                    emoji2: second,
                  })
                }
              />
            </>
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
  const { pop } = useNavigation();
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
              <Action
                title="Start over"
                icon={Icon.RotateAntiClockwise}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={async () => {
                  if (resetRootSearch) resetRootSearch();
                  await clearSearchBar();
                  pop();
                }}
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
  const [allEmojis, setAllEmojis] = useState<Array<{ emoji: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        // Ensure metadata exists (download + process if needed)
        await ensureMetadataExists((status) => {
          setDownloadStatus(status);
        });

        // Clear download status and load emojis
        setDownloadStatus(null);

        // Reload and update state
        EmojiKitchen.reload();
        setAllEmojis(EmojiKitchen.getAllBaseEmojis());
      } catch (error) {
        console.error(error);
        setDownloadStatus(`Error: ${error}`);
      } finally {
        setIsLoading(false);
      }
    };

    init();

    resetRootSearch = () => setSearchText("");
    return () => {
      resetRootSearch = null;
    };
  }, []);

  // Show download progress if metadata is being downloaded
  if (downloadStatus) {
    return (
      <Detail
        markdown={`# First Time Setup\n\n${downloadStatus}\n\nThis only happens on first launch. Please wait...`}
        isLoading={isLoading}
      />
    );
  }

  const filtered = allEmojis.filter(
    (i) => i.name.toLowerCase().includes(searchText.toLowerCase()) || i.emoji.includes(searchText),
  );

  return (
    <List
      isLoading={isLoading}
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
              <Action
                title="Start over"
                icon={Icon.RotateAntiClockwise}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={async () => {
                  setSearchText("");
                  await clearSearchBar();
                }}
              />
            </ActionPanel>
          }
        />
      ))}

      {filtered.length === 0 && <List.EmptyView icon={Icon.MagnifyingGlass} title="No emoji found" />}
    </List>
  );
}
