# TinyMind Quick Thoughts - Chrome Extension

A Chrome extension that lets you quickly post Thoughts to TinyMind from anywhere in your browser.

## Features

- **Quick Access**: Click the extension icon to open a popup editor
- **Markdown Support**: Write thoughts in Markdown with live preview
- **Image Upload**: Upload images via click, drag & drop, or paste
- **Session-Based Auth**: Uses your existing TinyMind login (no separate authentication)
- **Keyboard Shortcut**: Press `Ctrl+Enter` (or `Cmd+Enter` on Mac) to publish
- **Context Menu**: Select text on any webpage, right-click and choose "Add to TinyMind thoughts" to save it with source attribution

## Installation

### From Source (Developer Mode)

1. Clone or download this extension folder
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `tinymind-extension` folder
6. The extension icon should appear in your toolbar

### Icons Setup

Before loading the extension, you need to add icon files:

1. Create PNG icons at these sizes:
   - `icons/icon16.png` (16x16 pixels)
   - `icons/icon48.png` (48x48 pixels)
   - `icons/icon128.png` (128x128 pixels)

2. Recommended: Use the TinyMind logo or a simple "T" icon

You can use tools like:
- [Favicon.io](https://favicon.io/) to generate icons from text
- Any image editor to resize an existing logo

## Usage

### Popup Editor

1. **Login First**: Make sure you're logged into [tinymind.me](https://tinymind.me) in your browser
2. **Click Extension**: Click the TinyMind icon in your Chrome toolbar
3. **Write**: Type your thought in Markdown format
4. **Preview**: Click "Preview" tab to see how it will look
5. **Add Images**:
   - Click the image icon to select a file
   - Drag & drop an image into the editor
   - Paste an image from clipboard
6. **Publish**: Click "Publish" or press `Ctrl+Enter`

### Quick Save from Any Page

1. **Select Text**: Highlight any text on a webpage
2. **Right-Click**: Open the context menu
3. **Add to Thoughts**: Click "Add to TinyMind thoughts"
4. **Automatic**: The thought is created with:
   - Source attribution: `From [Page Title](page-url)`
   - Selected text as a blockquote
5. **Badge Feedback**: A ✓ appears on the extension icon when successful

## Requirements

- Google Chrome (or Chromium-based browser)
- Active login session on tinymind.me
- Internet connection

## How It Works

1. The extension checks for your TinyMind session cookie
2. When you publish, it sends your thought to the TinyMind API
3. Images are uploaded to your GitHub repository (same as the web app)
4. Your thought appears on your TinyMind thoughts page

## Troubleshooting

### "Please log in to TinyMind first"

- Open [tinymind.me](https://tinymind.me) and log in with GitHub
- Make sure you're logged in (check if you see your profile)
- Try again with the extension

### Image upload fails

- Check that the image is under 10MB
- Ensure the image format is supported (PNG, JPG, GIF, WebP)
- Make sure you have a stable internet connection

### Publish fails

- Verify you're still logged into TinyMind
- Check your internet connection
- Try refreshing the TinyMind website and logging in again

## Privacy

- This extension only communicates with tinymind.me
- No data is sent to third parties
- Your session cookie is used securely for authentication
- All data is stored in your own GitHub repository

## Development

### File Structure

```
tinymind-extension/
├── manifest.json          # Extension configuration
├── background/
│   └── service-worker.js  # API communication
├── popup/
│   ├── popup.html         # UI structure
│   ├── popup.css          # Styles
│   └── popup.js           # UI logic
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

### Building Icons

To create icons from an SVG or image:

```bash
# Using ImageMagick
convert logo.png -resize 16x16 icons/icon16.png
convert logo.png -resize 48x48 icons/icon48.png
convert logo.png -resize 128x128 icons/icon128.png
```

## License

MIT License - Part of the TinyMind project
