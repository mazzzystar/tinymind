# TinyMind Blog Skill

Post thoughts, blog articles, and update about page to TinyMind (tinymind.me) using GitHub.

## Quick Start

```bash
# Set environment variables
export TINYMIND_REPO="your-username/tinymind-blog"

# Post a thought
./cli.sh thought "Hello world!"

# Post a blog article
./cli.sh blog "My Post" /path/to/post.md

# Update about page
./cli.sh about /path/to/about.md

# Upload an image
./cli.sh upload /path/to/image.png
```

## Requirements

- GitHub CLI (`gh`) authenticated with `repo` scope
- GitHub Personal Access Token with repo access

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TINYMIND_REPO` | GitHub repository (format: `user/repo`) | `user/repo` |

## Commands

| Command | Description |
|---------|-------------|
| `thought "msg"` | Post a short thought |
| `thought "msg" image.jpg` | Post a thought with image |
| `blog "Title" file.md` | Post a blog article |
| `about file.md` | Update about page |
| `upload image.png` | Upload image, returns URL |

## Setup

1. Create a GitHub Personal Access Token with `repo` scope
2. Configure gh CLI: `gh auth login`
3. Set environment variable: `export TINYMIND_REPO="your-username/tinymind-blog"`
4. Authorize TinyMind to access your GitHub repository

## License

MIT