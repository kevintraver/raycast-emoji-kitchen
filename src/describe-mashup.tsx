import { List, ActionPanel, Action, showToast, Toast, Icon, clearSearchBar } from "@raycast/api";
import { useState, useMemo, useEffect } from "react";
import EmojiKitchen from "./lib/emoji-kitchen";
import { saveToHistory } from "./lib/storage";

import { copyResizedImage } from "./lib/image-utils";

interface SearchResult {
  emoji1: string;
  emoji2: string;
  url: string;
  score: number;
}

function searchMashups(query: string): SearchResult[] {
  if (!query.trim()) return [];

  const queryLower = query.toLowerCase().trim();
  const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 0);

  if (queryWords.length === 0) return [];

  const allEmojis = EmojiKitchen.getAllBaseEmojis();
  const matches: Array<{ emoji: string; name: string; score: number }> = [];

  // Score emojis based on query match
  for (const { emoji, name } of allEmojis) {
    const nameLower = name.toLowerCase();
    let score = 0;

    // Exact phrase match gets highest score
    if (nameLower.includes(queryLower)) {
      score += 100;
    }

    // Word-by-word matching
    for (const word of queryWords) {
      if (nameLower.includes(word)) {
        score += 10;
        // Bonus for word starting with query word
        if (nameLower.startsWith(word)) {
          score += 5;
        }
      }
    }

    if (score > 0) {
      matches.push({ emoji, name, score });
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score);

  // Find valid combinations between matched emojis
  const results: SearchResult[] = [];
  const seen = new Set<string>();

  // Try combinations of top matches (limit to top 20 for performance)
  const topMatches = matches.slice(0, 20);

  for (let i = 0; i < topMatches.length; i++) {
    for (let j = i; j < topMatches.length; j++) {
      const emoji1 = topMatches[i].emoji;
      const emoji2 = topMatches[j].emoji;

      // Skip if same emoji
      if (emoji1 === emoji2) continue;

      // Create a canonical key for the pair
      const pairKey = emoji1 < emoji2 ? `${emoji1}+${emoji2}` : `${emoji2}+${emoji1}`;
      if (seen.has(pairKey)) continue;
      seen.add(pairKey);

      const mashup = EmojiKitchen.getMashupData(emoji1, emoji2);
      if (mashup) {
        const combinedScore = topMatches[i].score + topMatches[j].score;
        results.push({
          emoji1,
          emoji2,
          url: mashup.url,
          score: combinedScore,
        });
      }
    }
  }

  // Sort results by combined score
  results.sort((a, b) => b.score - a.score);

  return results.slice(0, 10); // Return top 10 results
}

export default function DescribeMashup() {
  const [description, setDescription] = useState("");

  useEffect(() => {
    // Only clear if we are NOT launching with a specific context (future-proofing)
    // and if the user explicitly wants a fresh start on every launch.
    // However, Raycast's default behavior preserves state.
    // To FORCE clear on every mount (re-open), we can use a ref to track if it's the initial mount.

    const clear = async () => {
      await clearSearchBar();
      setDescription("");
    };

    clear();
  }, []);

  const results = useMemo(() => {
    if (!description.trim()) return [];
    return searchMashups(description);
  }, [description]);

  const handleCopy = async (result: SearchResult) => {
    await saveToHistory(result.emoji1, result.emoji2, result.url);
    await showToast({ style: Toast.Style.Success, title: "Copied!" });
  };

  const handleClearSearch = async () => {
    setDescription("");
    await clearSearchBar();
  };

  return (
    <List
      searchText={description}
      searchBarPlaceholder="Describe emoji mashup (e.g., 'zombie in love')..."
      onSearchTextChange={setDescription}
      throttle
      actions={
        <ActionPanel>
          <Action
            title="New Search"
            icon={Icon.ArrowCounterClockwise}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={handleClearSearch}
          />
        </ActionPanel>
      }
    >
      {results.length > 0 ? (
        results.map((result, index) => (
          <List.Item
            key={`${result.emoji1}+${result.emoji2}`}
            title={`${result.emoji1} + ${result.emoji2}`}
            icon={{ source: result.url }}
            subtitle={index === 0 ? "Best match" : undefined}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard content={result.url} onCopy={() => handleCopy(result)} title="Copy Image URL" />
                <Action.OpenInBrowser url={result.url} title="Open in Browser" />
                <Action
                  title="Copy Small Sticker (256Px)"
                  icon={Icon.Image}
                  shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  onAction={() =>
                    copyResizedImage(result.url, {
                      width: 256,
                      emoji1: result.emoji1,
                      emoji2: result.emoji2,
                    })
                  }
                />
                <Action
                  title="New Search"
                  icon={Icon.ArrowCounterClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "n" }}
                  onAction={handleClearSearch}
                />
              </ActionPanel>
            }
          />
        ))
      ) : (
        <List.EmptyView
          icon={Icon.Stars}
          title={description.trim() ? "No matches found" : "Describe your mashup"}
          description={
            description.trim()
              ? `Try different keywords (e.g., 'happy', 'cat', 'heart')`
              : "Examples: 'zombie in love', 'angry cat', 'happy birthday'"
          }
          actions={
            <ActionPanel>
              <Action
                title="New Search"
                icon={Icon.ArrowCounterClockwise}
                shortcut={{ modifiers: ["cmd"], key: "n" }}
                onAction={handleClearSearch}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
