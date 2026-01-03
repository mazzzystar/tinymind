// TinyMind Extension - Background Service Worker
// Handles API communication with tinymind.me

const API_BASE = 'https://tinymind.me/api/github';
const REQUEST_TIMEOUT_MS = 30000; // 30 second timeout

// Track badge timers by tab ID to prevent memory leaks
const badgeTimers = new Map();

/**
 * Escape special markdown characters in text to prevent injection
 */
function escapeMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Fetch with timeout support
 */
async function fetchWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Set badge with automatic cleanup (prevents timer accumulation)
 */
function setBadgeWithTimeout(tabId, text, color, timeoutMs) {
  // Clear any existing timer for this tab
  if (badgeTimers.has(tabId)) {
    clearTimeout(badgeTimers.get(tabId));
    badgeTimers.delete(tabId);
  }

  // Set the badge
  chrome.action.setBadgeText({ text, tabId });
  chrome.action.setBadgeBackgroundColor({ color, tabId });

  // Schedule cleanup
  if (text) {
    const timerId = setTimeout(() => {
      chrome.action.setBadgeText({ text: '', tabId });
      badgeTimers.delete(tabId);
    }, timeoutMs);
    badgeTimers.set(tabId, timerId);
  }
}

// Create context menu on install (clean up first on updates)
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'update') {
    chrome.contextMenus.removeAll();
  }
  chrome.contextMenus.create({
    id: 'add-to-thoughts',
    title: chrome.i18n.getMessage('contextMenuTitle') || 'Add to TinyMind thoughts',
    contexts: ['selection'],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'add-to-thoughts') {
    const selectedText = info.selectionText;
    const pageUrl = tab?.url || '';
    const pageTitle = tab?.title || 'Untitled';
    const tabId = tab?.id;

    if (!selectedText) {
      return;
    }

    // Escape special characters to prevent markdown injection
    const safeTitle = escapeMarkdown(pageTitle);
    const safeText = selectedText; // Keep original for blockquote

    // Format the thought with source attribution
    // "[Title](URL)\n\n> selected text"
    const content = `[${safeTitle}](${pageUrl})\n\n> ${safeText}`;

    try {
      const result = await createThought(content, null);

      if (result.success) {
        setBadgeWithTimeout(tabId, '✓', '#22c55e', 2000);
      } else {
        setBadgeWithTimeout(tabId, '!', '#ef4444', 3000);
      }
    } catch (error) {
      console.error('Context menu action error:', error);
      setBadgeWithTimeout(tabId, '!', '#ef4444', 3000);
    }
  }
});

/**
 * Check if user is authenticated by looking for next-auth session cookie
 */
async function checkAuthStatus() {
  try {
    const cookies = await chrome.cookies.getAll({ domain: 'tinymind.me' });

    // next-auth uses different cookie names based on environment
    // Production (HTTPS): __Secure-next-auth.session-token
    // Development (HTTP): next-auth.session-token
    const sessionCookie = cookies.find(c =>
      c.name === 'next-auth.session-token' ||
      c.name === '__Secure-next-auth.session-token'
    );

    return { isAuthenticated: !!sessionCookie };
  } catch (error) {
    console.error('Error checking auth status:', error);
    return { isAuthenticated: false, error: error.message };
  }
}

/**
 * Create a new thought via TinyMind API
 */
async function createThought(content, imageUrl) {
  try {
    const response = await fetchWithTimeout(API_BASE, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'createThought',
        content: content,
        image: imageUrl || undefined,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));

      if (response.status === 401) {
        return { success: false, error: 'Not authenticated. Please log in to tinymind.me first.' };
      }

      return {
        success: false,
        error: errorData.error || `Request failed with status ${response.status}`
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error('Error creating thought:', error);
    if (error.name === 'AbortError') {
      return { success: false, error: 'Request timed out. Please try again.' };
    }
    return { success: false, error: error.message };
  }
}

/**
 * Upload an image via TinyMind API
 */
async function uploadImage(dataUrl, fileName, mimeType) {
  try {
    // Convert data URL to Blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    // Create FormData
    const formData = new FormData();
    formData.append('action', 'uploadImage');
    formData.append('file', blob, fileName);

    const uploadResponse = await fetchWithTimeout(API_BASE, {
      method: 'POST',
      credentials: 'include',
      body: formData,
      // Note: Don't set Content-Type header - browser sets it with boundary
    });

    if (!uploadResponse.ok) {
      const errorData = await uploadResponse.json().catch(() => ({}));

      if (uploadResponse.status === 401) {
        return { success: false, error: 'Not authenticated. Please log in to tinymind.me first.' };
      }

      return {
        success: false,
        error: errorData.error || `Upload failed with status ${uploadResponse.status}`
      };
    }

    const data = await uploadResponse.json();

    // Validate returned URL is HTTPS
    if (data.url && !data.url.startsWith('https://')) {
      return { success: false, error: 'Server returned insecure image URL' };
    }

    return { success: true, url: data.url };
  } catch (error) {
    console.error('Error uploading image:', error);
    if (error.name === 'AbortError') {
      return { success: false, error: 'Upload timed out. Please try again.' };
    }
    return { success: false, error: error.message };
  }
}

/**
 * Message handler for communication with popup
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle async operations
  (async () => {
    try {
      switch (message.type) {
        case 'CHECK_AUTH': {
          const authStatus = await checkAuthStatus();
          sendResponse(authStatus);
          break;
        }

        case 'CREATE_THOUGHT': {
          const createResult = await createThought(message.content, message.image);
          sendResponse(createResult);
          break;
        }

        case 'UPLOAD_IMAGE': {
          const uploadResult = await uploadImage(
            message.dataUrl,
            message.fileName,
            message.mimeType
          );
          sendResponse(uploadResult);
          break;
        }

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      console.error('Message handler error:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();

  // Return true to indicate async response
  return true;
});
