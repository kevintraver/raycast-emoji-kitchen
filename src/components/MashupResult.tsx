import { Action, ActionPanel, Detail, Icon } from "@raycast/api";
import EmojiKitchen from "../lib/emoji-kitchen";
import { copyResizedImage, downloadAndCopyImage } from "../lib/image-utils";

interface MashupResultProps {
  emoji1: string;
  emoji2: string;
  extraActions?: React.ReactNode;
}

export function MashupResult({ emoji1, emoji2, extraActions }: MashupResultProps) {
  const mashupData = EmojiKitchen.getMashupData(emoji1, emoji2);

  const markdown = mashupData
    ? `![Emoji Mashup](${mashupData.url}?raycast-height=350)`
    : "# No mashup available 😢";

  return (
    <Detail
      navigationTitle={`${emoji1} + ${emoji2}`}
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
                    emoji1,
                    emoji2,
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
                    emoji1,
                    emoji2,
                  })
                }
              />
              <Action.OpenInBrowser title="Open in Browser" url={mashupData.url} />
            </>
          )}
          {extraActions}
        </ActionPanel>
      }
    />
  );
}
