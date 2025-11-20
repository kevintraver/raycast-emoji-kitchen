import { Action, Detail, Icon } from "@raycast/api";
import { useEffect, useState } from "react";
import EmojiKitchen from "./lib/emoji-kitchen";
import { ensureMetadataExists } from "./lib/metadata";
import { MashupResult } from "./components/MashupResult";

export default function Command() {
  const [isLoading, setIsLoading] = useState(true);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [mashup, setMashup] = useState<{ emoji1: string; emoji2: string } | null>(null);

  const pickRandom = () => {
    const pairs = EmojiKitchen.getAllValidPairs();
    const randomPair = pairs[Math.floor(Math.random() * pairs.length)];
    const [emoji1, emoji2] = randomPair.split("+");
    setMashup({ emoji1, emoji2 });
  };

  useEffect(() => {
    const init = async () => {
      try {
        await ensureMetadataExists((status) => {
          setDownloadStatus(status);
        });

        setDownloadStatus(null);
        EmojiKitchen.reload();
        pickRandom();
      } catch (error) {
        console.error(error);
        setDownloadStatus(`Error: ${error}`);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, []);

  if (downloadStatus) {
    return (
      <Detail
        markdown={`# First Time Setup\n\n${downloadStatus}\n\nThis only happens on first launch. Please wait...`}
        isLoading={isLoading}
      />
    );
  }

  if (!mashup) {
    return <Detail markdown="# Loading..." isLoading={true} />;
  }

  return (
    <MashupResult
      emoji1={mashup.emoji1}
      emoji2={mashup.emoji2}
      extraActions={
        <Action
          title="Shuffle"
          icon={Icon.Shuffle}
          onAction={pickRandom}
        />
      }
    />
  );
}
