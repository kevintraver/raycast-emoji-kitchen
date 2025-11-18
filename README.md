# Emoji Kitchen

## Metadata refresh

The extension ships compact metadata built from `src/data/raw-metadata.json`. To regenerate the smaller datasets (`src/data/emoji-kitchen.json` and `src/data/emoji-index.json`), run:

```bash
npm run generate:metadata
```

This keeps the Raycast bundle small (latest variants only) without loading the 90 MB raw file at runtime.
