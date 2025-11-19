# 🎨 Emoji Kitchen for Raycast

**Combine two emojis into creative mashups powered by Google's Emoji Kitchen. Quickly search, mix, and copy unique emoji combinations right from Raycast.**



## ✨ Features

-   **Mix Emojis:** Manually select any two emojis and instantly see their creative mashup.
-   **Describe Mashup (AI-Powered):** Simply describe the emoji you're thinking of (e.g., "a cowboy cat"), and let AI find the perfect combination for you.
-   **Recent Mashups:** Easily access and reuse your previously created emoji mashups from your history.
-   **Copy & Paste:** Quickly copy your creation to the clipboard and paste it anywhere.


## 💻 Development

This project is a [Raycast extension](https://developers.raycast.com/). Here’s how to get started with development:

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/your-repo-name.git
    cd your-repo-name
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Start development mode:**
    ```bash
    npm run dev
    ```
    This will open the extension in Raycast, and it will automatically reload as you make changes to the code.

### Metadata Refresh

The extension ships with compact metadata. The raw 90MB metadata file is processed into smaller, optimized files (`src/data/emoji-kitchen.json` and `src/data/emoji-index.json`) to keep the extension lightweight.

To regenerate these datasets from `src/data/raw-metadata.json` after updating it, run:

```bash
npm run generate:metadata
```

## 📜 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.