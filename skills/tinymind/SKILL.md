---
name: tinymind
description: Post thoughts, blog articles, and update about page to TinyMind (tinymind.me) using GitHub. Use when managing TinyMind blog content, posting thoughts, writing blog posts, or updating profile images.
---

# TinyMind Blog Skill

Post thoughts, blog articles, and update about page to TinyMind (tinymind.me) using GitHub.

## Overview

TinyMind stores all content in a GitHub repository. This skill provides commands to:
- Post a thought (short message)
- Post a blog article (longer format with markdown)
- Update the About page
- Upload and link images
- Clean up unused images

## Configuration

Set environment variables:

```bash
export TINYMIND_USER="your-github-username"
export TINYMIND_REPO="your-username/tinymind-blog"
export TINYMIND_URL="https://tinymind.me"
```

## CLI Usage

### Post a Thought

```bash
{skillDir}/cli.sh thought "Your message here"
```

Example:
```bash
{skillDir}/cli.sh thought "今天天氣真好"
```

### Post a Thought with Image

```bash
{skillDir}/cli.sh thought "Message" /path/to/image.jpg
```

### Post a Blog Article

```bash
{skillDir}/cli.sh blog "Title" /path/to/article.md
```

### Update About Page

```bash
{skillDir}/cli.sh about /path/to/about.md
```

### Upload Image

```bash
{skillDir}/cli.sh upload /path/to/image.png
```

## Repository Structure

```
your-username/tinymind-blog/
├── content/
│   ├── about.md      # About page content
│   ├── thoughts.json  # Array of thought objects
│   └── blog/          # Markdown blog posts
│       └── post.md
└── assets/
    └── images/
        └── YYYY-MM-DD/
            └── {timestamp}.png
```

## File Formats

### Thoughts (`thoughts.json`)

```json
[
  {
    "id": "1775464679964",
    "content": "Your thought here...",
    "timestamp": "2026-04-07T08:37:59.964Z"
  }
]
```

### Blog Post

```yaml
---
title: Your Article Title
date: 2026-04-07T10:00:00.000Z
---

Your article content in markdown...

## Section

More content...
```

### About Page

Simple markdown file. Can include images.

```markdown
![Image](https://raw.githubusercontent.com/your-username/tinymind-blog/main/assets/images/YYYY-MM-DD/IMAGE_ID.png)

About content here...
```

## Image Workflow

### Step 1: Upload Image

```bash
# Download from URL
curl -sk "https://example.com/image.png" -o /tmp/image.png

# Upload to GitHub
DATE=$(date +%Y-%m-%d)
ID=$(date +%s%3N)
gh api -X PUT repos/${TINYMIND_REPO}/contents/assets/images/${DATE}/${ID}.png \
  -F "content=$(base64 -w0 /tmp/image.png)" \
  -F "message=Upload image"
```

### Step 2: Link Image in Content

Use the raw GitHub URL format:
```markdown
![Alt text](https://raw.githubusercontent.com/${TINYMIND_REPO}/main/assets/images/YYYY-MM-DD/IMAGE_ID.png)
```

## Cleaning Unused Images

Check which images are referenced in content:
```bash
curl -s https://raw.githubusercontent.com/${TINYMIND_REPO}/main/content/about.md | grep -oE 'assets/images/[^)]+\.(png|jpg|jpeg)'
curl -s https://raw.githubusercontent.com/${TINYMIND_REPO}/main/content/thoughts.json | grep -oE 'assets/images/[^)]+\.(png|jpg|jpeg)'
curl -s https://raw.githubusercontent.com/${TINYMIND_REPO}/main/content/blog/*.md | grep -oE 'assets/images/[^)]+\.(png|jpg|jpeg)'
```

Delete unused images:
```bash
SHA=$(gh api repos/${TINYMIND_REPO}/contents/assets/images/PATH/IMAGE.png --jq '.sha')
gh api -X DELETE repos/${TINYMIND_REPO}/contents/assets/images/PATH/IMAGE.png \
  -F "message=Remove unused image" -F "sha=$SHA"
```

## Notes

- New thoughts are prepended to the thoughts list
- Images are uploaded to daily folders with timestamp-based IDs
- Timestamps are in ISO 8601 UTC format
- Markdown frontmatter uses `---` delimiters
- Image URLs must use `raw.githubusercontent.com` format