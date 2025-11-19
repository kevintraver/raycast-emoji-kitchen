import { List, ActionPanel, Action, Icon, confirmAlert, showToast, Toast, Clipboard } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getHistory, removeFromHistory, clearHistory } from "./lib/storage";
import { copyResizedImage, downloadAndCopyImage } from "./lib/image-utils";

export default function RecentMashups() {
  const { isLoading, data: history, revalidate } = usePromise(getHistory);

  async function handleRemove(timestamp: number) {
    await removeFromHistory(timestamp);
    await revalidate();
    await showToast({ style: Toast.Style.Success, title: "Removed" });
  }

  async function handleClearAll() {
    if (await confirmAlert({ title: "Clear all history?" })) {
      await clearHistory();
      await revalidate();
      await showToast({ style: Toast.Style.Success, title: "History cleared" });
    }
  }

  if (history && history.length === 0) {
    return (
      <List isLoading={isLoading}>
        <List.EmptyView title="No mashups yet" description="Try mixing some emojis first!" icon={Icon.EmojiSad} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading} isShowingDetail>
      {history?.map((item) => (
        <List.Item
          key={item.timestamp}
          title={`${item.leftEmoji} + ${item.rightEmoji}`}
          icon={Icon.Clock}
          subtitle={formatTimeAgo(item.timestamp)}
          detail={
            <List.Item.Detail
              markdown={`![Mashup](${item.mashupUrl})`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Date" text={new Date(item.timestamp).toLocaleString()} />
                  <List.Item.Detail.Metadata.Label title="Emojis" text={`${item.leftEmoji} + ${item.rightEmoji}`} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Copy Image"
                icon={Icon.Clipboard}
                onAction={async () => {
                  await downloadAndCopyImage(item.mashupUrl, "Image", {
                    emoji1: item.leftEmoji,
                    emoji2: item.rightEmoji,
                  });
                  revalidate();
                }}
              />
              <Action
                title="Paste Image"
                icon={Icon.Pencil}
                shortcut={{ modifiers: ["cmd"], key: "enter" }}
                onAction={async () => {
                  const file = await downloadAndCopyImage(item.mashupUrl, "Image", {
                    emoji1: item.leftEmoji,
                    emoji2: item.rightEmoji,
                  });
                  await Clipboard.paste({ file });
                  revalidate();
                }}
              />
              <Action
                title="Copy Small Sticker (256Px)"
                icon={Icon.Image}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                onAction={async () => {
                  await copyResizedImage(item.mashupUrl, {
                    width: 256,
                    emoji1: item.leftEmoji,
                    emoji2: item.rightEmoji,
                  });
                  revalidate();
                }}
              />
              <Action.CopyToClipboard
                title="Copy URL"
                content={item.mashupUrl}
                shortcut={{ modifiers: ["cmd", "shift"], key: "u" }}
              />
              <Action.OpenInBrowser url={item.mashupUrl} />
              <ActionPanel.Section>
                <Action
                  title="Remove"
                  onAction={() => handleRemove(item.timestamp)}
                  icon={Icon.Trash}
                  shortcut={{ modifiers: ["cmd"], key: "delete" }}
                  style={Action.Style.Destructive}
                />
                <Action
                  title="Clear All"
                  onAction={handleClearAll}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}

function formatTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
