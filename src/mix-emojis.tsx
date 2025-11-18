import { List, Detail, ActionPanel, Action, Icon, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import EmojiKitchen from "./lib/emoji-kitchen";
import { saveToHistory } from "./lib/storage";

type Step = "first" | "second" | "result";

export default function MixEmojis() {
  const [step, setStep] = useState<Step>("first");
  const [firstEmoji, setFirstEmoji] = useState("");
  const [secondEmoji, setSecondEmoji] = useState("");

  const startOver = () => {
    setStep("first");
    setFirstEmoji("");
    setSecondEmoji("");
  };

  const tryAnotherWithSameFirst = () => {
    setStep("second");
    setSecondEmoji("");
  };

  // Step 1: Select first emoji
  if (step === "first") {
    return (
      <SelectFirstEmoji
        onSelect={(emoji) => {
          setFirstEmoji(emoji);
          setStep("second");
        }}
      />
    );
  }

  // Step 2: Select second emoji from valid combinations
  if (step === "second") {
    return (
      <SelectSecondEmoji
        firstEmoji={firstEmoji}
        onSelect={(emoji) => {
          setSecondEmoji(emoji);
          setStep("result");
        }}
        onBack={startOver}
      />
    );
  }

  // Step 3: Show result
  return <ResultScreen firstEmoji={firstEmoji} secondEmoji={secondEmoji} onStartOver={startOver} onTryAnother={tryAnotherWithSameFirst} />;
}

function SelectFirstEmoji({ onSelect }: { onSelect: (emoji: string) => void }) {
  const allEmojis = EmojiKitchen.getAllBaseEmojis();

  return (
    <List searchBarPlaceholder="Search first emoji...">
      {allEmojis.map((emoji) => (
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

function SelectSecondEmoji({
  firstEmoji,
  onSelect,
  onBack,
}: {
  firstEmoji: string;
  onSelect: (emoji: string) => void;
  onBack: () => void;
}) {
  const validCombinations = EmojiKitchen.getValidCombinations(firstEmoji);

  if (validCombinations.length === 0) {
    return (
      <List navigationTitle={`Mix with ${firstEmoji}`}>
        <List.EmptyView
          icon={Icon.EmojiSad}
          title="No combinations available"
          description={`${firstEmoji} doesn't have any mashups`}
          actions={
            <ActionPanel>
              <Action title="Pick Different Emoji" icon={Icon.ArrowLeft} onAction={onBack} />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  return (
    <List searchBarPlaceholder={`Search to mix with ${firstEmoji}...`} navigationTitle={`Mix with ${firstEmoji}`}>
      <List.Section title={`Available Combinations (${validCombinations.length})`}>
        {validCombinations.map((emoji) => {
          const mashupData = EmojiKitchen.getMashupData(firstEmoji, emoji);
          if (!mashupData) return null;

          return (
            <List.Item
              key={emoji}
              icon={emoji}
              title={emoji}
              accessories={[
                {
                  icon: { source: mashupData.url },
                  tooltip: "Mashup preview",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action title="Create Mashup" icon={Icon.CheckCircle} onAction={() => onSelect(emoji)} />
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
        })}
      </List.Section>
    </List>
  );
}

function ResultScreen({
  firstEmoji,
  secondEmoji,
  onStartOver,
  onTryAnother,
}: {
  firstEmoji: string;
  secondEmoji: string;
  onStartOver: () => void;
  onTryAnother: () => void;
}) {
  const mashupData = EmojiKitchen.getMashupData(firstEmoji, secondEmoji);

  if (!mashupData) {
    return (
      <Detail
        markdown="# Error\n\nCouldn't find mashup data"
        actions={
          <ActionPanel>
            <Action title="Start over" icon={Icon.RotateAntiClockwise} onAction={onStartOver} />
          </ActionPanel>
        }
      />
    );
  }

  async function handleCopy() {
    await saveToHistory(firstEmoji, secondEmoji, mashupData!.url);
    await showToast({
      style: Toast.Style.Success,
      title: "Copied to clipboard!",
      message: `${firstEmoji} + ${secondEmoji}`,
    });
  }

  const markdown = `# ${firstEmoji} + ${secondEmoji}

![Emoji Mashup](${mashupData.url})

**Your emoji mashup is ready!**

Copy the URL to share this mashup with friends.`;

  return (
    <Detail
      markdown={markdown}
      navigationTitle="Mashup Result"
      actions={
        <ActionPanel>
          <Action.CopyToClipboard title="Copy Mashup URL" content={mashupData.url} onCopy={handleCopy} />
          <Action.OpenInBrowser title="Open in Browser" url={mashupData.url} shortcut={{ modifiers: ["cmd"], key: "o" }} />
          <Action
            title="Try Another with Same First"
            icon={Icon.Repeat}
            onAction={onTryAnother}
            shortcut={{ modifiers: ["cmd"], key: "t" }}
          />
          <Action
            title="Start over"
            icon={Icon.RotateAntiClockwise}
            onAction={onStartOver}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
          />
        </ActionPanel>
      }
    />
  );
}
