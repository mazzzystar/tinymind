#!/bin/bash

# Languages we've already manually updated
UPDATED_LANGS=(en zh es ja fr de it)

# Array of languages to update
LANGS=($(find messages -name "*.json" | sed 's/messages\///g' | sed 's/\.json//g' | sort))

# Fields to add
FIELDS=(
  '"about": "About"'
  '"editAboutPage": "Edit About Page"'
  '"writeAboutPageContent": "Write about yourself in Markdown..."'
  '"aboutPageSuccessMessage": "About page published successfully! It may take up to 30 seconds to appear."'
  '"aboutPageUpdated": "About page updated successfully"'
)

for lang in "${LANGS[@]}"; do
  # Skip already updated languages
  if [[ " ${UPDATED_LANGS[@]} " =~ " ${lang} " ]]; then
    echo "Skipping $lang (already updated manually)"
    continue
  fi
  
  echo "Updating $lang..."
  
  # File path
  file="messages/$lang.json"
  
  # Add 'about' after 'thoughts'
  sed -i '' 's/"thoughts": \("[^"]*"\),/"thoughts": \1,\n    "about": "About",/' "$file"
  
  # Add 'editAboutPage' after 'createBlogPost'
  sed -i '' 's/"createBlogPost": \("[^"]*"\),/"createBlogPost": \1,\n    "editAboutPage": "Edit About Page",/' "$file"
  
  # Add 'writeAboutPageContent' after 'writeContent'
  sed -i '' 's/"writeContent": \("[^"]*"\),/"writeContent": \1,\n    "writeAboutPageContent": "Write about yourself in Markdown...",/' "$file"
  
  # Add 'aboutPageSuccessMessage' after 'successPublished'
  sed -i '' 's/"successPublished": \("[^"]*"\),/"successPublished": \1,\n    "aboutPageSuccessMessage": "About page published successfully! It may take up to 30 seconds to appear.",/' "$file"
  
  # Add 'aboutPageUpdated' after 'blogPostUpdated'
  sed -i '' 's/"blogPostUpdated": \("[^"]*"\),/"blogPostUpdated": \1,\n    "aboutPageUpdated": "About page updated successfully",/' "$file"
done

echo "All language files updated!" 