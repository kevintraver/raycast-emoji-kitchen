# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension that combines emojis using Google's Emoji Kitchen API. The extension works completely offline using bundled metadata (~8-9MB compressed from 92MB raw data).

## Development Commands

### Core Development
- `npm run dev` - Start Raycast develop mode (console logs appear in terminal)
- `npm run build` - Build extension for production
- `npm run lint` - Run ESLint checks
- `npm run fix-lint` - Auto-fix linting issues
- `npm run publish` - Publish to Raycast Store

### Metadata Management
- Metadata is **automatically** downloaded and processed on first run
- All metadata operations are handled by the unified `src/lib/metadata.ts` module
- Manual regeneration (if needed): `npm run generate:metadata`

## Architecture

### Metadata Strategy (Critical)

The extension uses an **automatic two-tier metadata system**:

1. **Raw metadata** (`environment.supportPath/data/raw-metadata.json`): 92MB source from GitHub
2. **Compact metadata** (`environment.supportPath/data/emoji-kitchen.json`): 8-9MB optimized runtime file

**Compact format structure:**
```json
{
  "😀": {
    "n": "Grinning",
    "c": {
      "❤️": "20201001:1f600:2764",
      "😎": "20210831:1f600:1f60e"
    }
  }
}
```

The compact format uses:
- `n`: Emoji name
- `c`: Combinations object mapping emojis to `date:leftCodepoint:rightCodepoint` strings
- This reduces file size by ~90% while preserving all combination data

### Data Flow

1. **On first run**: `ensureMetadataExists()` automatically downloads raw metadata and processes it
2. **Subsequent runs**: Loads existing compact metadata (no network call)
3. **Runtime loading**: `EmojiKitchen.ensureLoaded()` loads compact metadata from `environment.supportPath`
4. **URL construction**: `buildMashupUrl()` converts `date:leftCp:rightCp` to full gstatic URLs
5. **Lookups**: O(1) dictionary access using emoji string keys

**URL Building Example:**
```
Input: "20201001:1f600:2764"
Output: https://www.gstatic.com/android/keyboard/emojikitchen/20201001/u1f600/u1f600_u2764.png
```

### Core Module Responsibilities

- **`src/lib/metadata.ts`** - Unified metadata module (handles everything):
  - `ensureMetadataExists()` - Auto-download and process if needed (call on startup)
  - `getEmojiIndex()` - Loads compact metadata from disk
  - `buildMashupUrl(dataString)` - Constructs gstatic URLs
  - `emojiToCodepoint(emoji)` - Converts emoji to hex codepoint
  - `getCompactMetadataPath()` - Returns path to compact metadata
  - Private functions for downloading (92MB with progress logging) and processing (child process)

- **`src/lib/emoji-kitchen.ts`** - Main API singleton with static methods:
  - `getAllBaseEmojis()` - Returns all available base emojis
  - `getValidCombinations(emoji)` - Returns valid combinations for an emoji
  - `getMashupData(emoji1, emoji2)` - Returns mashup URL
  - `isValidCombo(emoji1, emoji2)` - Validates combination
  - `reload()` - Force re-index (use after metadata update)

- **`src/lib/storage.ts`** - LocalStorage wrapper for mashup history (max 50 items)

### Commands

1. **mix-emojis.tsx** - Two-step picker; second step shows only valid combinations
2. **describe-mashup.tsx** - Natural language search (basic keyword matching)
3. **recent-mashups.tsx** - History viewer using LocalStorage
4. **debug-metadata.tsx** - Metadata diagnostics and reload

## Important Patterns

### Metadata Loading
- Each command calls `ensureMetadataExists()` on startup - this checks if metadata exists
- First run triggers automatic download (92MB) + processing (to 8-9MB) via child process
- Subsequent runs skip download if files exist (instant startup)
- All data stored in `environment.supportPath/data/` (not in repo)
- Use `EmojiKitchen.reload()` to force re-indexing after metadata changes

### Testing in Development
- Run `npm run dev` and test in Raycast
- Console logs appear in terminal where dev command runs
- Use `debug-metadata.tsx` command to verify metadata loading

### Performance Considerations
- All lookups are O(1) - avoid iterating over full dataset
- Use `getValidCombinations(emoji)` instead of checking all possible pairs
- Compact metadata keeps bundle size manageable for Raycast

## Known Issues

- First run downloads 92MB raw metadata - takes 30-60 seconds depending on connection
- Compact metadata (~8-9MB) can cause slow load in Raycast, but much better than 92MB
- No automated tests - verify changes manually in Raycast develop mode
- If metadata becomes corrupted, delete `environment.supportPath/data/` directory and restart extension to re-download

## Troubleshooting

If the extension fails to load or shows no emojis:
1. Check console logs in terminal running `npm run dev`
2. Verify metadata exists: Run the "Debug Metadata" command
3. Delete metadata: `rm -rf ~/Library/Application\ Support/com.raycast.macos/extensions/emoji-kitchen/data/`
4. Restart extension to trigger fresh download
