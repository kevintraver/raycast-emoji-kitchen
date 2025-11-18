# Repository Guidelines

## Project Structure & Module Organization
- `src/` — Raycast extension code (commands in `*.tsx`, utilities in `lib/`, types in `types/`, and prebuilt metadata in `data/`).
  - `src/data/emoji-kitchen.json` — Ultra-compact metadata (~8-9MB) with emoji keys and date:codepoint strings
  - `src/data/raw-metadata.json` — Original 92MB metadata from GitHub (used only for rebuilding compact version)
- `app-code/emoji-kitchen/` — Web UI reference implementation (MUI React) that consumes full metadata.
- `app-code/emoji-kitchen-backend/` — AWS Lambda + API Gateway backend used by the web UI (search endpoint and metadata artifacts).
- `assets/` — Icons and static assets referenced by the extension manifest.
- `scripts/` — Build scripts to regenerate compact metadata from raw source.

## Build, Test, and Development Commands
- `npm install` — Install Raycast extension dependencies.
- `npm run dev` — Start Raycast develop mode for local iteration.
- `npm run build` — Build the extension with Raycast CLI.
- `npm run lint` — Run ESLint with the repo's Raycast config; use `npm run fix-lint` to auto-fix.
- Publishing: `npm run publish` uses `npx @raycast/api@latest publish`.

### Metadata Management
- Download raw metadata: `curl -L --compressed https://raw.githubusercontent.com/xsalazar/emoji-kitchen-backend/main/app/metadata.json -o src/data/raw-metadata.json`
- Rebuild compact metadata: Create and run a script in `scripts/` to convert raw (92MB) → compact (8-9MB) format
- Compact format: `{ "😀": { "❤️": "date:leftCodepoint:rightCodepoint", ... } }` allows efficient bundling and runtime URL construction
- The compact format reduces file size by ~90% while preserving all combination data

## Coding Style & Naming Conventions
- Language: TypeScript with React (Raycast components).
- Formatting: Prettier (`.prettierrc`), 2-space indentation, trailing commas enabled by default.
- Linting: `@raycast/eslint-config`; follow its rules for imports, hooks, and accessibility.
- Naming: Commands use `kebab-case` filenames matching `package.json` command names (e.g., `mix-emojis.tsx`); components/utilities use `camelCase` exports and PascalCase React components.

## Testing Guidelines
- No automated tests are defined. When adding logic, prefer small pure functions in `lib/` and cover via lightweight unit tests (future-friendly) or manual verification in Raycast develop mode.
- Keep data-dependent logic deterministic; avoid loading the 92 MB raw metadata at runtime—always use the compact `emoji-kitchen.json` file (~8-9MB).
- Test in Raycast development mode with `npm run dev` - console logs appear in terminal.

## Commit & Pull Request Guidelines
- Commits: Use concise, imperative messages (e.g., "Add compact metadata loader", "Fix mashup URL builder"). Group related changes; avoid noisy reformat-only commits.
- Pull Requests: Provide a short summary, note user-facing impacts, and include screenshots/GIFs for UI changes (Raycast lists, actions). Link related issues for traceability and mention any metadata updates or new scripts.

## Architecture Notes
- **Metadata Strategy**: The extension uses ultra-compact metadata (~8-9MB) with emoji keys mapping to "date:leftCodepoint:rightCodepoint" strings. URLs are built dynamically via `buildMashupUrl()` in `src/lib/metadata-manager.ts`.
- **Why Compact Format**: The raw 92MB metadata from Google is too large for Raycast's runtime to handle efficiently (causes "connection interrupted" errors). The compact format reduces size by 90% while preserving all combination data and URLs.
- **Data Flow**: `emoji-kitchen.json` (bundled) → `getCompactMetadata()` → `EmojiKitchen` static methods → UI components
- **URL Construction**: `buildMashupUrl("20201001:1f600:2764")` → `https://www.gstatic.com/android/keyboard/emojikitchen/20201001/u1f600/u1f600_u2764.png`
- **No Network Required**: All data is bundled; the extension works completely offline after installation.
- **Performance**: All lookups are O(1) using emoji string keys. No async loading needed - data loads synchronously from bundled JSON.

## Commands
1. **Mix Emojis** (`mix-emojis.tsx`) - Two-step emoji picker; shows only valid combinations in second step
2. **Describe Mashup** (`describe-mashup.tsx`) - Natural language search (basic MVP, ready for AI enhancement)
3. **Recent Mashups** (`recent-mashups.tsx`) - History viewer with LocalStorage persistence (max 50 items)

## Known Issues & Limitations
- Large metadata file (~8-9MB) can cause slow initial load in Raycast; this is minimized as much as possible while preserving full functionality
- If metadata becomes too large in future, consider: chunking by emoji category, lazy-loading combinations, or using external CDN
