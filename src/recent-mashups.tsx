import { List, ActionPanel, Action, Icon, confirmAlert, showToast, Toast } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { getHistory, removeFromHistory, clearHistory } from "./lib/storage";

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
    <List isLoading={isLoading}>
      {history?.map((item) => (
        <List.Item
          key={item.timestamp}
          title={`${item.leftEmoji} + ${item.rightEmoji}`}
          icon={{ source: item.mashupUrl }}
          subtitle={formatTimeAgo(item.timestamp)}
          actions={
            <ActionPanel>
              <Action.CopyToClipboard content={item.mashupUrl} />
              <Action.OpenInBrowser url={item.mashupUrl} />
              <Action
                title="Remove"
                onAction={() => handleRemove(item.timestamp)}
                icon={Icon.Trash}
                shortcut={{ modifiers: ["cmd"], key: "delete" }}
              />
              <Action title="Clear All" onAction={handleClearAll} icon={Icon.Trash} style={Action.Style.Destructive} />
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
