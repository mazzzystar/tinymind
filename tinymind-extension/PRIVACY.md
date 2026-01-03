# Privacy Policy for TinyMind Quick Thoughts Chrome Extension

**Last Updated: January 3, 2026**

## Overview

TinyMind Quick Thoughts is a browser extension that allows you to quickly save thoughts and quotes to your TinyMind blog. We are committed to protecting your privacy.

## Data Collection

### What We Collect
- **Content you create**: The text and images you choose to publish as "thoughts"
- **Page information**: When you use the right-click "Add to TinyMind thoughts" feature, we capture the selected text, page URL, and page title to attribute the source of your quote

### What We Do NOT Collect
- Browsing history
- Personal information
- Analytics or tracking data
- Any data from pages you visit (unless you explicitly use the extension to save content)

## Data Storage

All your content is stored in **your own GitHub repository** (`yourusername/tinymind-blog`), not on our servers. TinyMind acts as an interface to help you write to your GitHub repository.

## Data Transmission

- Data is transmitted securely via HTTPS to tinymind.me
- tinymind.me uses your GitHub OAuth session to write to your repository
- No data is sent to third parties

## Permissions Used

| Permission | Purpose |
|------------|---------|
| `cookies` | Check if you're logged into tinymind.me (read-only, no cookies are created) |
| `contextMenus` | Add "Add to TinyMind thoughts" to right-click menu |
| `activeTab` | Get page URL/title when saving a quote (only when you use the context menu) |
| `host_permissions: tinymind.me` | Communicate with TinyMind API to save your content |

## Third-Party Services

This extension interacts with:
- **tinymind.me** - To authenticate and save your content
- **GitHub** - Where your content is ultimately stored (via tinymind.me)

## Your Rights

- You can uninstall the extension at any time
- All your data remains in your GitHub repository, which you fully control
- You can delete your data directly from your GitHub repository

## Changes to This Policy

We may update this privacy policy from time to time. Changes will be reflected in the "Last Updated" date.

## Contact

For questions or concerns about this privacy policy:
- GitHub Issues: https://github.com/mazzzystar/tinymind/issues
- Website: https://tinymind.me

## Open Source

This extension is open source. You can review the code at:
https://github.com/mazzzystar/tinymind/tree/main/tinymind-extension
