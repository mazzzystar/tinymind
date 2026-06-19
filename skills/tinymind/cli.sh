#!/bin/bash

# TinyMind Blog CLI
# Usage: tinymind-cli thought "message" [image]
#        tinymind-cli blog "title" /path/to/markdown.md
#        tinymind-cli about /path/to/content.md
#        tinymind-cli upload /path/to/image.png

set -e

REPO="${TINYMIND_REPO:-user/repo}"
THOUGHTS_FILE="content/thoughts.json"
BLOG_DIR="content/blog"
ABOUT_FILE="content/about.md"
IMAGES_DIR="assets/images"

command -v gh >/dev/null 2>&1 || { echo "gh CLI required"; exit 1; }

post_thought() {
    local message="$1"
    local image="$2"
    local timestamp now id img_url sha base64
    
    timestamp=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
    now=$(date +%s%3N)
    
    if [ -n "$image" ]; then
        local date_f
        date_f=$(date +%Y-%m-%d)
        
        # Upload image first
        local img_content
        img_content=$(base64 -w0 "$image")
        gh api -X PUT "repos/$REPO/contents/${IMAGES_DIR}/${date_f}/${now}.png" \
            -F "content=$img_content" \
            -F "message=Upload image ${now}" \
            -F "parents=$(gh api "repos/$REPO/git/main" --jq '.sha')" > /dev/null
        
        img_url="https://raw.githubusercontent.com/$REPO/main/${IMAGES_DIR}/${date_f}/${now}.png"
    fi
    
    sha=$(gh api "repos/$REPO/contents/$THOUGHTS_FILE" --jq '.sha')
    
    # Get current thoughts and add new one at beginning
    local tmp_current tmp_new
    tmp_current=$(mktemp)
    tmp_new=$(mktemp)
    
    curl -s "https://raw.githubusercontent.com/$REPO/main/$THOUGHTS_FILE" > "$tmp_current"
    
    if [ -n "$img_url" ]; then
        message="${message}"$'\n\n'"![image]($img_url)"
    fi
    
    jq --arg id "$now" --arg timestamp "$timestamp" --arg content "$message" \
        '[{id: $id, content: $content, timestamp: $timestamp}] + .' "$tmp_current" > "$tmp_new"
    
    base64=$(base64 -w0 "$tmp_new")
    
    gh api -X PUT "repos/$REPO/contents/$THOUGHTS_FILE" \
        -F "content=$base64" \
        -F "message=Add thought via tinymind-cli" \
        -F "sha=$sha"
    
    rm -f "$tmp_current" "$tmp_new"
    
    echo "Thought posted successfully"
}

post_blog() {
    local title="$1"
    local file="$2"
    local filename sha base64 slug
    
    # Create slug from title
    slug=$(echo "$title" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -d '[:punct:]')
    filename="${slug}.md"
    
    # Update date in frontmatter
    local date_now
    date_now=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
    
    sed -i "s/^date:.*/date: $date_now/" "$file"
    
    sha=$(gh api "repos/$REPO/contents/$BLOG_DIR/$filename" --jq '.sha' 2>/dev/null || echo "")
    
    base64=$(base64 -w0 "$file")
    
    if [ -z "$sha" ]; then
        gh api -X PUT "repos/$REPO/contents/$BLOG_DIR/$filename" \
            -F "content=$base64" \
            -F "message=Add blog post: $title"
    else
        gh api -X PUT "repos/$REPO/contents/$BLOG_DIR/$filename" \
            -F "content=$base64" \
            -F "message=Update blog post: $title" \
            -F "sha=$sha"
    fi
    
    echo "Blog post '$title' posted successfully"
}

update_about() {
    local file="$1"
    local sha base64
    
    sha=$(gh api "repos/$REPO/contents/$ABOUT_FILE" --jq '.sha')
    base64=$(base64 -w0 "$file")
    
    gh api -X PUT "repos/$REPO/contents/$ABOUT_FILE" \
        -F "content=$base64" \
        -F "message=Update about page" \
        -F "sha=$sha"
    
    echo "About page updated successfully"
}

upload_image() {
    local image="$1"
    local date_f now img_url img_content
    
    date_f=$(date +%Y-%m-%d)
    now=$(date +%s%3N)
    
    img_content=$(base64 -w0 "$image")
    gh api -X PUT "repos/$REPO/contents/${IMAGES_DIR}/${date_f}/${now}.png" \
        -F "content=$img_content" \
        -F "message=Upload image ${now}" \
        -F "parents=$(gh api "repos/$REPO/git/main" --jq '.sha')" > /dev/null
    
    img_url="https://raw.githubusercontent.com/$REPO/main/${IMAGES_DIR}/${date_f}/${now}.png"
    echo "$img_url"
}

case "$1" in
    thought)
        post_thought "$2" "$3"
        ;;
    blog)
        post_blog "$2" "$3"
        ;;
    about)
        update_about "$2"
        ;;
    upload)
        upload_image "$2"
        ;;
    *)
        echo "Usage: $0 thought \"message\" [image]"
        echo "       $0 blog \"title\" /path/to/markdown.md"
        echo "       $0 about /path/to/about.md"
        echo "       $0 upload /path/to/image.png"
        exit 1
        ;;
esac