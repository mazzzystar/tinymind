// TinyMind Extension - Popup Logic

// i18n helper function
function getMessage(key, fallback = '') {
  return chrome.i18n.getMessage(key) || fallback;
}

// Localize all elements with data-i18n attributes
function localizeUI() {
  // Localize text content
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const message = getMessage(key);
    if (message) {
      el.textContent = message;
    }
  });

  // Localize placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const message = getMessage(key);
    if (message) {
      el.placeholder = message;
    }
  });
}

// State management
const state = {
  isAuthenticated: false,
  content: '',
  imageUrl: null,
  isLoading: false,
  isUploading: false,
  cursorPosition: 0,
  currentTab: 'write',
  // Operation locks to prevent race conditions
  uploadLock: false,
  publishLock: false,
};

// DOM Elements (initialized after DOMContentLoaded)
let elements = {};

// Initialize DOM element references
function initElements() {
  elements = {
    states: {
      notLoggedIn: document.getElementById('not-logged-in'),
      loading: document.getElementById('loading'),
      editor: document.getElementById('editor'),
      success: document.getElementById('success'),
    },
    tabs: document.querySelectorAll('.tab[data-tab]'),
    writePanel: document.getElementById('write-panel'),
    previewPanel: document.getElementById('preview-panel'),
    previewContent: document.getElementById('preview-content'),
    textarea: document.getElementById('content'),
    imageInput: document.getElementById('image-input'),
    publishBtn: document.getElementById('publish-btn'),
    newThoughtBtn: document.getElementById('new-thought-btn'),
    dropzone: document.getElementById('dropzone'),
    dragOverlay: document.getElementById('drag-overlay'),
    uploadOverlay: document.getElementById('upload-overlay'),
    toastContainer: document.getElementById('toast-container'),
  };
}

// Show a specific state
function showState(stateName) {
  Object.keys(elements.states).forEach(key => {
    elements.states[key].classList.add('hidden');
  });
  elements.states[stateName]?.classList.remove('hidden');
}

// Toast notification
function showToast(message, type = 'default') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  elements.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Escape HTML special characters to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Sanitize URL to prevent XSS (javascript:, data:, vbscript:, etc.)
function sanitizeUrl(url) {
  if (!url) return '';

  // Decode URL to catch encoded attacks
  let decoded;
  try {
    decoded = decodeURIComponent(url).toLowerCase();
  } catch {
    decoded = url.toLowerCase();
  }

  // Normalize whitespace and control characters
  const normalized = decoded.replace(/[\s\x00-\x1f]/g, '');

  // Block dangerous protocols
  const dangerousProtocols = [
    'javascript:',
    'vbscript:',
    'data:text/html',
    'data:text/javascript',
    'data:application/javascript',
    'data:application/x-javascript',
    'file:',
  ];

  for (const protocol of dangerousProtocols) {
    if (normalized.startsWith(protocol)) {
      return '';
    }
  }

  return url;
}

// Simple Markdown to HTML conversion (with XSS protection)
function renderMarkdown(text) {
  if (!text.trim()) return '';

  let html = text
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Images (with URL and alt text sanitization)
    .replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, url) => {
      const safeUrl = sanitizeUrl(url);
      const safeAlt = escapeHtml(alt);
      return safeUrl ? `<img src="${safeUrl}" alt="${safeAlt}">` : '';
    })
    // Links (with URL and text sanitization)
    .replace(/\[(.*?)\]\((.*?)\)/g, (match, text, url) => {
      const safeUrl = sanitizeUrl(url);
      const safeText = escapeHtml(text);
      return safeUrl ? `<a href="${safeUrl}" target="_blank" rel="noopener">${safeText}</a>` : safeText;
    })
    // Blockquotes
    .replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>')
    // Unordered lists
    .replace(/^\- (.*$)/gm, '<li>$1</li>')
    .replace(/^\* (.*$)/gm, '<li>$1</li>')
    // Line breaks
    .replace(/\n/g, '<br>');

  // Wrap consecutive list items
  html = html.replace(/(<li>.*<\/li>(<br>)?)+/g, (match) => {
    return '<ul>' + match.replace(/<br>/g, '') + '</ul>';
  });

  // Clean up consecutive blockquotes
  html = html.replace(/<\/blockquote><br><blockquote>/g, '<br>');

  return html;
}

// Tab switching
function switchTab(tabName) {
  state.currentTab = tabName;

  elements.tabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  if (tabName === 'write') {
    elements.writePanel.classList.add('active');
    elements.previewPanel.classList.remove('active');
  } else {
    elements.writePanel.classList.remove('active');
    elements.previewPanel.classList.add('active');
    elements.previewContent.innerHTML = renderMarkdown(elements.textarea.value);
  }
}

// Set loading state on publish button
function setPublishLoading(loading) {
  state.isLoading = loading;
  elements.publishBtn.disabled = loading;
  const text = loading ? getMessage('publishing', 'Publishing...') : getMessage('publish', 'Publish');
  elements.publishBtn.querySelector('.btn-text').textContent = text;
  elements.publishBtn.querySelector('.spinner').classList.toggle('hidden', !loading);
}

// Set uploading state
function setUploading(uploading) {
  state.isUploading = uploading;
  elements.uploadOverlay.classList.toggle('hidden', !uploading);
  elements.textarea.disabled = uploading;
  elements.imageInput.disabled = uploading;
}

// Insert text at cursor position
function insertAtCursor(text) {
  const textarea = elements.textarea;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const before = textarea.value.substring(0, start);
  const after = textarea.value.substring(end);

  // Add newlines if needed
  const needsNewlineBefore = before.length > 0 && !before.endsWith('\n');
  const prefix = needsNewlineBefore ? '\n\n' : '';

  textarea.value = before + prefix + text + after;

  // Update cursor position
  const newPosition = start + prefix.length + text.length;
  textarea.selectionStart = newPosition;
  textarea.selectionEnd = newPosition;
  textarea.focus();
}

// Handle image upload
async function handleImageUpload(file) {
  // Prevent concurrent uploads
  if (state.uploadLock) {
    showToast(getMessage('uploadInProgress', 'Upload already in progress'), 'error');
    return;
  }

  if (!file || !file.type.startsWith('image/')) {
    showToast(getMessage('onlyImagesAllowed', 'Only image files are allowed'), 'error');
    return;
  }

  // Validate file size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    showToast(getMessage('imageTooLarge', 'Image must be smaller than 10MB'), 'error');
    return;
  }

  state.uploadLock = true;
  setUploading(true);

  try {
    // Convert file to data URL for transfer
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Send to background script
    const result = await chrome.runtime.sendMessage({
      type: 'UPLOAD_IMAGE',
      dataUrl,
      fileName: file.name || 'image.png',
      mimeType: file.type,
    });

    if (result.success) {
      const imageMarkdown = `![${file.name || 'image'}](${result.url})`;
      insertAtCursor(imageMarkdown);
      state.imageUrl = result.url;
      showToast(getMessage('imageUploaded', 'Image uploaded'), 'success');
    } else {
      showToast(result.error || getMessage('uploadFailed', 'Failed to upload image'), 'error');
    }
  } catch (error) {
    console.error('Upload error:', error);
    showToast(getMessage('uploadFailed', 'Failed to upload image'), 'error');
  } finally {
    state.uploadLock = false;
    setUploading(false);
  }
}

// Handle publish
async function handlePublish() {
  // Prevent concurrent publish attempts
  if (state.publishLock) {
    return;
  }

  const content = elements.textarea.value.trim();

  if (!content) {
    showToast(getMessage('writeFirst', 'Please write something first'), 'error');
    return;
  }

  // Check content length
  if (content.length > 50000) {
    showToast(getMessage('contentTooLong', 'Content is too long (max 50,000 characters)'), 'error');
    return;
  }

  state.publishLock = true;
  setPublishLoading(true);

  try {
    const result = await chrome.runtime.sendMessage({
      type: 'CREATE_THOUGHT',
      content,
      image: state.imageUrl,
    });

    if (result.success) {
      showState('success');
    } else {
      showToast(result.error || getMessage('publishFailed', 'Failed to publish thought'), 'error');
    }
  } catch (error) {
    console.error('Publish error:', error);
    showToast(getMessage('publishFailed', 'Failed to publish thought'), 'error');
  } finally {
    state.publishLock = false;
    setPublishLoading(false);
  }
}

// Reset editor for new thought
function resetEditor() {
  elements.textarea.value = '';
  state.content = '';
  state.imageUrl = null;
  switchTab('write');
  showState('editor');
  elements.textarea.focus();
}

// Initialize
async function init() {
  initElements();
  localizeUI();
  showState('loading');

  try {
    const authStatus = await chrome.runtime.sendMessage({ type: 'CHECK_AUTH' });

    if (authStatus.isAuthenticated) {
      state.isAuthenticated = true;
      showState('editor');
      elements.textarea.focus();
    } else {
      showState('notLoggedIn');
    }
  } catch (error) {
    console.error('Auth check error:', error);
    showState('notLoggedIn');
  }
}

// Setup event listeners
function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.tab[data-tab]').forEach(tab => {
    tab.addEventListener('click', () => {
      if (tab.dataset.tab) {
        switchTab(tab.dataset.tab);
      }
    });
  });

  // Track cursor position
  const textarea = document.getElementById('content');
  textarea.addEventListener('select', (e) => {
    state.cursorPosition = e.target.selectionStart;
  });

  textarea.addEventListener('click', (e) => {
    state.cursorPosition = e.target.selectionStart;
  });

  // Image upload via button
  document.getElementById('image-input').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
      e.target.value = ''; // Reset input
    }
  });

  // Drag and drop
  const dropzone = document.getElementById('dropzone');
  const dragOverlay = document.getElementById('drag-overlay');

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dragOverlay.classList.remove('hidden');
  });

  dropzone.addEventListener('dragleave', (e) => {
    e.preventDefault();
    // Only hide if leaving the dropzone entirely
    if (!dropzone.contains(e.relatedTarget)) {
      dragOverlay.classList.add('hidden');
    }
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dragOverlay.classList.add('hidden');

    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      handleImageUpload(file);
    }
  });

  // Paste image
  textarea.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          handleImageUpload(file);
        }
        break;
      }
    }
  });

  // Publish button
  document.getElementById('publish-btn').addEventListener('click', handlePublish);

  // New thought button
  document.getElementById('new-thought-btn').addEventListener('click', resetEditor);

  // Keyboard shortcut: Cmd/Ctrl + Enter to publish
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      if (state.isAuthenticated && !state.isLoading && !state.isUploading) {
        e.preventDefault();
        handlePublish();
      }
    }
  });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  init();
});
