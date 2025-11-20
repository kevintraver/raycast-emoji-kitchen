import { launchCommand, LaunchType } from "@raycast/api";
import EmojiKitchen from "../lib/emoji-kitchen";
import { ensureMetadataExists } from "../lib/metadata";

type Input = {
  /**
   * The first emoji to combine (as an emoji character like 😀 or ❤️)
   */
  emoji1: string;
  /**
   * The second emoji to combine (as an emoji character like 😀 or ❤️)
   */
  emoji2: string;
};

/**
 * Create an emoji mashup by combining two emojis using Google's Emoji Kitchen.
 * Users can describe emojis by name (e.g., "smile", "heart", "cat") or by concept
 * (e.g., "robot who needs caffeine" → 🤖 + ☕, "angry love" → 😠 + ❤️).
 * Opens the result view with the mashup image.
 */
export default async function tool(input: Input): Promise<string> {
  await ensureMetadataExists();

  const result = EmojiKitchen.getMashupData(input.emoji1, input.emoji2);

  if (!result) {
    return `No mashup available for ${input.emoji1} + ${input.emoji2}. Try different emojis.`;
  }

  await launchCommand({
    name: "mix-emojis",
    type: LaunchType.UserInitiated,
    context: { emoji1: input.emoji1, emoji2: input.emoji2 },
  });

  return `Opening ${input.emoji1} + ${input.emoji2} mashup...`;
}
