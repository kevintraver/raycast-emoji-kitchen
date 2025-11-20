import { Action, ActionPanel, clearSearchBar, Detail, Icon, LaunchProps, List, popToRoot, useNavigation } from "@raycast/api";
import { useEffect, useState } from "react";
import EmojiKitchen from "./lib/emoji-kitchen";
import { ensureMetadataExists } from "./lib/metadata";
import { MashupResult } from "./components/MashupResult";

interface LaunchContext {
  emoji1?: string;
  emoji2?: string;
}

// Global callback to reset the root search state
let resetRootSearch: (() => void) | null = null;

function ResultScreen(props: { first: string; second: string }) {
  const { first, second } = props;
  const { pop } = useNavigation();

  return (
    <MashupResult
      emoji1={first}
      emoji2={second}
      extraActions={
        <>
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
              pop(); // Pop ResultScreen
              pop(); // Pop SecondEmojiScreen
            }}
          />
        </>
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

export default function Command(props: LaunchProps<{ launchContext: LaunchContext }>) {
  const [searchText, setSearchText] = useState("");
  const [allEmojis, setAllEmojis] = useState<Array<{ emoji: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [directResult, setDirectResult] = useState<{ emoji1: string; emoji2: string } | null>(null);

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

        // Check if launched with context (from AI tool)
        const context = props.launchContext;
        if (context?.emoji1 && context?.emoji2) {
          setDirectResult({ emoji1: context.emoji1, emoji2: context.emoji2 });
        }
      } catch (error) {
        console.error(error);
        setDownloadStatus(`Error: ${error}`);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [props.launchContext]);

  // Ensure we have a way to clear search when "Start over" is called from children
  useEffect(() => {
    resetRootSearch = () => setSearchText("");
    return () => {
      resetRootSearch = null;
    };
  }, [setSearchText]);

  // Show download progress if metadata is being downloaded
  if (downloadStatus) {
    return (
      <Detail
        markdown={`# First Time Setup\n\n${downloadStatus}\n\nThis only happens on first launch. Please wait...`}
        isLoading={isLoading}
      />
    );
  }

  // Show result directly if launched with context (from AI tool)
  if (directResult) {
    return (
      <MashupResult
        emoji1={directResult.emoji1}
        emoji2={directResult.emoji2}
        extraActions={
          <Action
            title="Back to AI Chat"
            icon={Icon.ArrowLeft}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={() => popToRoot()}
          />
        }
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
