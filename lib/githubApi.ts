import { Octokit } from '@octokit/rest';
import path from 'path';
import { apiCache, BoundedCache } from './cache';
import { withRetry } from './retry';
import { validatePath } from './validation';

// Add this type definition at the top of the file
type UpdateFileParams = Parameters<Octokit['repos']['createOrUpdateFileContents']>[0];

// Check if we're in development mode
const isDev = process.env.NODE_ENV === 'development';

// Cache for default branch names to reduce API calls
const branchCache = new BoundedCache<string>(100, 10 * 60 * 1000); // 10 min TTL

/**
 * Get the default branch for a repo, with caching
 */
async function getDefaultBranch(octokit: Octokit, owner: string, repo: string): Promise<string> {
  const cacheKey = `${owner}/${repo}`;
  const cached = branchCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const { data: repoData } = await octokit.repos.get({ owner, repo });
  const branch = repoData.default_branch;
  branchCache.set(cacheKey, branch);
  return branch;
}

/**
 * Type guard to check if an error is a GitHub API error with status code
 */
export function isGitHubError(error: unknown): error is { status: number; message?: string } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'status' in error &&
    typeof (error as { status: unknown }).status === 'number'
  );
}

export interface BlogPost {
  id: string;
  title: string;
  content: string;
  date: string;
}

export type Thought = {
  id: string;
  content: string;
  timestamp: string;
  image?: string;
};

// Add interface for AboutPage
export interface AboutPage {
  content: string;
}

function getOctokit(accessToken: string | undefined) {
  if (!accessToken) {
    throw new Error('Access token is required');
  }
  return new Octokit({ auth: accessToken });
}

async function getRepoInfo(accessToken: string | undefined) {
  if (!accessToken) {
    throw new Error('Access token is required');
  }
  const octokit = getOctokit(accessToken);
  try {
    const { data: user } = await octokit.users.getAuthenticated();
    return {
      owner: user.login,
      repo: 'tinymind-blog', // You might want to make this configurable
    };
  } catch (error) {
    // Only log in development to avoid leaking sensitive info in production
    if (isDev) {
      console.error('Error getting authenticated user:', error);
    }
    throw new Error('Failed to get authenticated user');
  }
}

async function ensureRepoExists(octokit: Octokit, owner: string, repo: string) {
  try {
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    
    // Check if the repository description is empty.
    if (!repoData.description) {
      // Get the authenticated user's login
      const { data: userData } = await octokit.users.getAuthenticated();
      const userLogin = userData.login;
      
      // Update the repository with the new description
      await octokit.repos.update({
        owner,
        repo,
        description: `https://tinymind.me/${userLogin}`,
      });
    }
  } catch (error) {
    if (error instanceof Error && 'status' in error && error.status === 404) {
      await octokit.repos.createForAuthenticatedUser({
        name: repo,
        auto_init: true,
      });
    } else {
      throw error;
    }
  }

  // Check if README.md exists and needs updating
  try {
    const { data: readmeContent } = await octokit.repos.getContent({ owner, repo, path: 'README.md' });
    if ('content' in readmeContent) {
      const decodedContent = Buffer.from(readmeContent.content, 'base64').toString('utf-8');
      if (decodedContent.trim() === '' || decodedContent.trim() === '# tinymind-blog') {
        // README.md is empty or contains only the default repo name, update it
        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: 'README.md',
          message: 'Update README.md with default content',
          content: Buffer.from('# TinyMind Blog\n\nWrite blog posts and thoughts at https://tinymind.me with data stored on GitHub.').toString('base64'),
          sha: readmeContent.sha,
        });
      }
    }
  } catch (error) {
    if (error instanceof Error && 'status' in error && error.status === 404) {
      // Create README.md if it doesn't exist
      const content = Buffer.from('Write blog posts and thoughts at https://tinymind.me with data stored on GitHub.').toString('base64');
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: 'README.md',
        message: 'Initial commit: Add README.md',
        content,
      });
    } else {
      throw error;
    }
  }
}

async function ensureContentStructure(octokit: Octokit, owner: string, repo: string) {
  async function createFileIfNotExists(octokit: Octokit, owner: string, repo: string, filePath: string, message: string, content: string) {
    try {
      await octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
      });
    } catch (error) {
      if (error instanceof Error && 'status' in error && error.status === 404) {
        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo,
          path: filePath,
          message,
          content: Buffer.from(content).toString('base64'),
        });
      } else {
        throw error;
      }
    }
  }

  await createFileIfNotExists(octokit, owner, repo, 'content/.gitkeep', 'Initialize content directory', '');
  await createFileIfNotExists(octokit, owner, repo, 'content/blog/.gitkeep', 'Initialize blog directory', '');
  await createFileIfNotExists(octokit, owner, repo, 'content/thoughts.json', 'Initialize thoughts.json', '[]');
}

async function initializeGitHubStructure(octokit: Octokit, owner: string, repo: string) {
  await ensureRepoExists(octokit, owner, repo);
  await ensureContentStructure(octokit, owner, repo);
}

// Function to generate safe file IDs from titles (handles multi-language content)
function generateSafeId(title: string): string {
  // Create a URL-safe ID that preserves meaning
  let id = title
    .toLowerCase()
    // Replace spaces and problematic characters with hyphens
    .replace(/\s+/g, '-')
    // Remove characters that are not safe for file names, including Chinese punctuation
    // Added Chinese punctuation: 《》？：。、，；''""（）【】〈〉「」『』！？
    .replace(/[<>:"/\\|?*.,;!@#$%^&*()+={}[\]`~《》？：。、，；''""（）【】〈〉「」『』！]/g, '')
    // Remove path traversal attempts
    .replace(/\.\./g, '')
    // Clean up multiple hyphens
    .replace(/-+/g, '-')
    // Remove leading/trailing hyphens
    .replace(/^-|-$/g, '')
    .trim();

  // If the result is empty or too short, generate a timestamp-based ID
  if (!id || id.length < 1) {
    id = `post-${Date.now()}`;
  }

  // Limit length to 200 characters to prevent filesystem issues
  if (id.length > 200) {
    id = id.substring(0, 200).replace(/-$/, '');
  }

  return id;
}

export async function getBlogPosts(accessToken: string): Promise<BlogPost[]> {
  const octokit = getOctokit(accessToken);
  const { owner, repo } = await getRepoInfo(accessToken);
  
  try {
    const response = await octokit.repos.getContent({
      owner,
      repo,
      path: 'content/blog',
    });

    if (!Array.isArray(response.data)) {
      return [];
    }

    const posts = await Promise.all(
      response.data
        .filter((file) => file.type === 'file' && file.name !== '.gitkeep' && file.name.endsWith('.md'))
        .map(async (file) => {
          try {
            const contentResponse = await octokit.repos.getContent({
              owner,
              repo,
              path: `content/blog/${file.name}`,
            });

            if ('content' in contentResponse.data) {
              const content = Buffer.from(contentResponse.data.content, 'base64').toString('utf-8');

              // Parse the date from the content
              const dateMatch = content.match(/date:\s*(.+)/);
              const date = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString();

              // Parse the title from the content (plain text, no URL decoding needed)
              const titleMatch = content.match(/title:\s*(.+)/);
              const title = titleMatch ? titleMatch[1].trim() : file.name.replace('.md', '');

              return {
                id: file.name.replace('.md', ''),
                title,
                content,
                date,
              };
            }
          } catch {
            // Silently skip files that fail to load
          }
        })
    );

    return posts.filter((post): post is BlogPost => post !== undefined);
  } catch (error) {
    // If the blog directory doesn't exist, return an empty array
    if (error instanceof Error && 'status' in error && error.status === 404) {
      return [];
    }
    throw error;
  }
}

export async function getBlogPost(id: string, accessToken: string): Promise<BlogPost | null> {
  if (!accessToken) {
    throw new Error('Access token is required');
  }

  // Validate path to prevent directory traversal
  const safeId = validatePath(id);

  const octokit = getOctokit(accessToken);
  const { owner, repo } = await getRepoInfo(accessToken);

  try {
    // Fetch the file content
    const contentResponse = await octokit.repos.getContent({
      owner,
      repo,
      path: `content/blog/${safeId}.md`,
    });

    if (Array.isArray(contentResponse.data) || !('content' in contentResponse.data)) {
      throw new Error('Unexpected response from GitHub API');
    }

    const content = Buffer.from(contentResponse.data.content, 'base64').toString('utf-8');

    // Parse the title from the content (plain text, no URL decoding needed)
    const titleMatch = content.match(/title:\s*(.+)/);
    const title = titleMatch ? titleMatch[1].trim() : id;

    // Parse the date from the content
    const dateMatch = content.match(/date:\s*(.+)/);
    const date = dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString();

    return {
      id,
      title,
      content,
      date,
    };
  } catch {
    return null;
  }
}

export async function getThoughts(accessToken: string | undefined): Promise<Thought[]> {
  if (!accessToken) {
    throw new Error('Access token is required');
  }
  const octokit = getOctokit(accessToken);
  const { owner, repo } = await getRepoInfo(accessToken);

  const response = await octokit.repos.getContent({
    owner,
    repo,
    path: 'content/thoughts.json',
  });

  if (Array.isArray(response.data) || !('content' in response.data)) {
    throw new Error('Unexpected response from GitHub API');
  }

  const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
  return JSON.parse(content) as Thought[];
}

export async function createBlogPost(
  title: string,
  content: string,
  accessToken: string
): Promise<{ newId: string }> {
  const octokit = getOctokit(accessToken);
  const { owner, repo } = await getRepoInfo(accessToken);
  await initializeGitHubStructure(octokit, owner, repo);

  const newId = generateSafeId(title);
  const path = `content/blog/${newId}.md`;
  const date = new Date().toISOString(); // Store full ISO string
  const fullContent = `---
title: ${title}
date: ${date}
---

${content}`;

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: `Add blog post: ${title}`,
    content: Buffer.from(fullContent).toString('base64'),
  });

  return { newId };
}

export async function createThought(content: string, image: string | undefined, accessToken: string): Promise<void> {
  if (!accessToken) {
    throw new Error('Access token is required');
  }
  const octokit = getOctokit(accessToken);
  const { owner, repo } = await getRepoInfo(accessToken);
  await initializeGitHubStructure(octokit, owner, repo);

  // Use retry logic to handle race conditions
  await withRetry(async () => {
    let thoughts: Thought[] = [];
    let existingSha: string | undefined;

    // Try to fetch existing thoughts
    try {
      const response = await octokit.repos.getContent({
        owner,
        repo,
        path: 'content/thoughts.json',
      });

      if (!Array.isArray(response.data) && 'content' in response.data) {
        const existingContent = Buffer.from(response.data.content, 'base64').toString('utf-8');
        thoughts = JSON.parse(existingContent) as Thought[];
        existingSha = response.data.sha;
      }
    } catch (error) {
      if (!(error instanceof Error && 'status' in error && error.status === 404)) {
        throw error;
      }
      // thoughts.json does not exist, will create new
    }

    // Create new thought
    const newThought: Thought = {
      id: Date.now().toString(),
      content,
      timestamp: new Date().toISOString(),
      image,
    };

    // Add new thought to the beginning of the array
    thoughts.unshift(newThought);

    // Create or update the file with all thoughts
    const updateParams: UpdateFileParams = {
      owner,
      repo,
      path: 'content/thoughts.json',
      message: 'Add new thought',
      content: Buffer.from(JSON.stringify(thoughts, null, 2)).toString('base64'),
    };

    if (existingSha) {
      updateParams.sha = existingSha;
    }

    await octokit.repos.createOrUpdateFileContents(updateParams);
  }, { maxAttempts: 3 });
}

export async function deleteThought(id: string, accessToken: string): Promise<void> {
  if (!accessToken) {
    throw new Error('Access token is required');
  }
  const octokit = getOctokit(accessToken);
  const { owner, repo } = await getRepoInfo(accessToken);
  await initializeGitHubStructure(octokit, owner, repo);

  // Use retry logic to handle race conditions
  await withRetry(async () => {
    let thoughts: Thought[] = [];
    let existingSha: string | undefined;

    // Fetch existing thoughts
    try {
      const response = await octokit.repos.getContent({
        owner,
        repo,
        path: 'content/thoughts.json',
      });

      if (!Array.isArray(response.data) && 'content' in response.data) {
        const existingContent = Buffer.from(response.data.content, 'base64').toString('utf-8');
        thoughts = JSON.parse(existingContent) as Thought[];
        existingSha = response.data.sha;
      }
    } catch (error) {
      if (!(error instanceof Error && 'status' in error && error.status === 404)) {
        throw error;
      }
    }

    const newThoughts = thoughts.filter((t) => t.id !== id);

    // Update the file with remaining thoughts
    const updateParams: UpdateFileParams = {
      owner,
      repo,
      path: 'content/thoughts.json',
      message: 'Delete a thought',
      content: Buffer.from(JSON.stringify(newThoughts, null, 2)).toString('base64'),
    };

    if (existingSha) {
      updateParams.sha = existingSha;
    }

    await octokit.repos.createOrUpdateFileContents(updateParams);
  }, { maxAttempts: 3 });
}

export async function getUserLogin(accessToken: string): Promise<string> {
  const octokit = getOctokit(accessToken);
  const { data: user } = await octokit.users.getAuthenticated();
  return user.login;
}

export async function updateThought(id: string, content: string, accessToken: string): Promise<void> {
  if (!accessToken) {
    throw new Error('Access token is required');
  }
  const octokit = getOctokit(accessToken);
  const { owner, repo } = await getRepoInfo(accessToken);
  await initializeGitHubStructure(octokit, owner, repo);

  // Use retry logic to handle race conditions
  await withRetry(async () => {
    let thoughts: Thought[] = [];
    let existingSha: string | undefined;

    // Fetch existing thoughts
    const response = await octokit.repos.getContent({
      owner,
      repo,
      path: 'content/thoughts.json',
    });

    if (!Array.isArray(response.data) && 'content' in response.data) {
      const existingContent = Buffer.from(response.data.content, 'base64').toString('utf-8');
      thoughts = JSON.parse(existingContent) as Thought[];
      existingSha = response.data.sha;
    }

    // Find and update the thought
    const thoughtIndex = thoughts.findIndex((t) => t.id === id);
    if (thoughtIndex === -1) {
      throw new Error('Thought not found');
    }

    thoughts[thoughtIndex] = {
      ...thoughts[thoughtIndex],
      content,
    };

    // Update the file with all thoughts
    const updateParams: UpdateFileParams = {
      owner,
      repo,
      path: 'content/thoughts.json',
      message: 'Update thought',
      content: Buffer.from(JSON.stringify(thoughts, null, 2)).toString('base64'),
      sha: existingSha,
    };

    await octokit.repos.createOrUpdateFileContents(updateParams);
  }, { maxAttempts: 3 });
}

export async function deleteBlogPost(id: string, accessToken: string): Promise<void> {
  if (!accessToken) {
    throw new Error('Access token is required');
  }

  // Validate path to prevent directory traversal
  const safeId = validatePath(id);

  const octokit = getOctokit(accessToken);
  const { owner, repo } = await getRepoInfo(accessToken);
  const filePath = `content/blog/${safeId}.md`;

  // Get the current file to retrieve its SHA
  const currentFile = await octokit.repos.getContent({
    owner,
    repo,
    path: filePath,
  });

  if (Array.isArray(currentFile.data) || !('sha' in currentFile.data)) {
    throw new Error('Unexpected response when fetching current blog post');
  }

  // Delete the blog post file
  await octokit.repos.deleteFile({
    owner,
    repo,
    path: filePath,
    message: 'Delete blog post',
    sha: currentFile.data.sha,
  });
}

export async function updateBlogPost(
  id: string,
  title: string,
  content: string,
  accessToken: string
): Promise<{ newId?: string }> {
  if (!accessToken) {
    throw new Error('Access token is required');
  }

  // Validate path to prevent directory traversal
  const safeId = validatePath(id);

  const octokit = getOctokit(accessToken);
  const { owner, repo } = await getRepoInfo(accessToken);

  // Use retry logic to handle race conditions
  return await withRetry(async () => {
    // Get the current file to retrieve its SHA and content
    const currentFile = await octokit.repos.getContent({
      owner,
      repo,
      path: `content/blog/${safeId}.md`,
    });

    if (Array.isArray(currentFile.data) || !('sha' in currentFile.data)) {
      throw new Error('Unexpected response when fetching current blog post');
    }

    if (!('content' in currentFile.data)) {
      throw new Error('Unexpected response when fetching current blog post');
    }

    const existingContent = Buffer.from(currentFile.data.content, 'base64').toString('utf-8');

    // Extract the original date from the existing content
    const dateMatch = existingContent.match(/date:\s*(.+)/);
    const date = dateMatch ? dateMatch[1] : new Date().toISOString();

    // Extract the original title from the existing content
    const titleMatch = existingContent.match(/title:\s*(.+)/);
    const originalTitle = titleMatch ? titleMatch[1] : safeId;

    const updatedContent = `---
title: ${title}
date: ${date}
---

${content}`;

    // Check if the title has changed
    const newId = generateSafeId(title);
    if (originalTitle !== title && safeId !== newId) {
      // Title has changed, create a new file with the new title first
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: `content/blog/${newId}.md`,
        message: 'Update blog post with new title',
        content: Buffer.from(updatedContent).toString('base64'),
      });

      // Then delete the old file
      await octokit.repos.deleteFile({
        owner,
        repo,
        path: `content/blog/${safeId}.md`,
        message: 'Delete blog post with old title',
        sha: currentFile.data.sha,
      });

      return { newId };
    } else {
      // Title hasn't changed, just update the existing file
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: `content/blog/${safeId}.md`,
        message: 'Update blog post',
        content: Buffer.from(updatedContent).toString('base64'),
        sha: currentFile.data.sha,
      });

      return {};
    }
  }, { maxAttempts: 3 });
}

export async function uploadImage(
  file: File,
  accessToken: string
): Promise<string> {
  if (!accessToken) {
    throw new Error('Access token is required');
  }
  const octokit = getOctokit(accessToken);

  const { owner, repo } = await getRepoInfo(accessToken);

  // Get the default branch with caching
  const defaultBranch = await getDefaultBranch(octokit, owner, repo);

  await initializeGitHubStructure(octokit, owner, repo);

  // Generate a unique filename
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const id = Date.now().toString();
  const ext = path.extname(file.name);
  const filename = `${id}${ext}`;
  const filePath = `assets/images/${date}/${filename}`;

  // Ensure the directory exists
  await ensureDirectoryExists(octokit, owner, repo, `assets/images/${date}`);

  // Convert file to base64
  const content = await fileToBase64(file);

  // Upload the file
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message: `Upload image: ${filename}`,
    content,
  });

  // Construct the direct raw.githubusercontent.com URL
  return `https://raw.githubusercontent.com/${owner}/${repo}/${defaultBranch}/${filePath}`;
}

async function ensureDirectoryExists(octokit: Octokit, owner: string, repo: string, path: string) {
  try {
    await octokit.repos.getContent({ owner, repo, path });
  } catch (error) {
    if (error instanceof Error && 'status' in error && error.status === 404) {
      // Directory doesn't exist, create it
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: `${path}/.gitkeep`,
        message: `Create directory: ${path}`,
        content: '',
      });
    } else {
      throw error;
    }
  }
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix (e.g., "data:image/png;base64,")
        resolve(reader.result.split(',')[1]);
      } else {
        reject(new Error('Failed to convert file to base64'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
}

// **ULTRA-FAST VERSION**: Uses GitHub Tree API to get all files in one call
export async function getBlogPostsPublicFast(octokit: Octokit, owner: string, repo: string): Promise<BlogPost[]> {
  const cacheKey = `blog-posts-fast:${owner}:${repo}`;

  // Check cache first
  const cachedData = apiCache.get<BlogPost[]>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    // Get the repo's default branch with caching
    const defaultBranch = await getDefaultBranch(octokit, owner, repo);

    // First get the tree to find all blog files in one API call
    const treeResponse = await octokit.git.getTree({
      owner,
      repo,
      tree_sha: defaultBranch,
      recursive: 'true'
    });

    const blogFiles = treeResponse.data.tree.filter(
      (item) => item.path?.startsWith('content/blog/') && item.path.endsWith('.md') && item.type === 'blob'
    );

    if (blogFiles.length === 0) {
      return [];
    }

    // Get all file contents in parallel using blob API (faster than content API)
    const fetchPromises = blogFiles.map(async (file) => {
      try {
        if (!file.sha || !file.path) return null;

        const blobResponse = await octokit.git.getBlob({
          owner,
          repo,
          file_sha: file.sha
        });

        const content = Buffer.from(blobResponse.data.content, 'base64').toString('utf-8');
        const titleMatch = content.match(/title:\s*(.+)/);
        const dateMatch = content.match(/date:\s*(.+)/);
        const fileName = file.path.split('/').pop() || '';

        return {
          id: fileName.replace('.md', ''),
          title: titleMatch ? titleMatch[1].trim() : fileName.replace('.md', ''),
          content,
          date: dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString(),
        };
      } catch (error) {
        if (isDev) {
          console.warn(`Failed to load blog post ${file.path}:`, error);
        }
        return null;
      }
    });

    const posts = (await Promise.all(fetchPromises))
      .filter((post): post is BlogPost => post !== null)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Cache the result
    apiCache.set(cacheKey, posts, 5 * 60 * 1000); // 5 minutes
    return posts;
  } catch {
    // Fallback to regular method
    return getBlogPostsPublic(octokit, owner, repo);
  }
}

export async function getBlogPostsPublic(octokit: Octokit, owner: string, repo: string): Promise<BlogPost[]> {
  const cacheKey = `blog-posts:${owner}:${repo}`;
  
  // Check cache first
  const cachedData = apiCache.get<BlogPost[]>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await octokit.repos.getContent({
      owner,
      repo,
      path: 'content/blog',
    });

    if (!Array.isArray(response.data)) {
      return [];
    }

    const mdFiles = response.data.filter((file) => file.type === 'file' && file.name.endsWith('.md'));
    
    // **PERFORMANCE OPTIMIZATION**: Fetch all files in parallel instead of sequentially
    const fetchPromises = mdFiles.map(async (file) => {
      try {
        const contentResponse = await octokit.repos.getContent({
          owner,
          repo,
          path: `content/blog/${file.name}`,
        });

        if ('content' in contentResponse.data) {
          const content = Buffer.from(contentResponse.data.content, 'base64').toString('utf-8');
          const titleMatch = content.match(/title:\s*(.+)/);
          const dateMatch = content.match(/date:\s*(.+)/);

          return {
            id: file.name.replace('.md', ''),
            title: titleMatch ? titleMatch[1].trim() : file.name.replace('.md', ''),
            content,
            date: dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString(),
          };
        }
        return null;
      } catch (error) {
        if (isDev) {
          console.warn(`Failed to load blog post ${file.name}:`, error);
        }
        return null;
      }
    });

    // Wait for all promises to resolve
    const posts = (await Promise.all(fetchPromises))
      .filter((post): post is BlogPost => post !== null)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by date desc

    // Cache the successful result
    apiCache.set(cacheKey, posts, 5 * 60 * 1000); // 5 minutes
    return posts;
  } catch (error: unknown) {
    // Try to return stale cached data as fallback
    const staleData = apiCache.getStale<BlogPost[]>(cacheKey);
    if (staleData) {
      return staleData;
    }

    // Re-throw rate limiting errors so they can be handled by the UI
    if (isGitHubError(error) && error.status === 403) {
      throw error;
    }

    return [];
  }
}

export async function getThoughtsPublic(octokit: Octokit, owner: string, repo: string): Promise<Thought[]> {
  try {
    const response = await octokit.repos.getContent({
      owner,
      repo,
      path: 'content/thoughts.json',
    });

    if (Array.isArray(response.data) || !('content' in response.data)) {
      return [];
    }

    const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
    return JSON.parse(content) as Thought[];
  } catch {
    return [];
  }
}

export async function getIconUrls(usernameOrAccessToken: string): Promise<{ iconPath: string; appleTouchIconPath: string }> {
  let owner: string | null = null; // Initialize owner as null
  let repo: string = 'tinymind-blog'; // Default repo name
  let octokit: Octokit | null = null;

  const genericDefaultIconPath = "/icon.jpg"; // Truly generic icon
  const genericDefaultAppleTouchIconPath = "/icon-144.jpg"; // Truly generic apple touch icon

  // Validate input
  if (!usernameOrAccessToken || typeof usernameOrAccessToken !== 'string' || usernameOrAccessToken.trim() === '') {
    return { 
      iconPath: genericDefaultIconPath, 
      appleTouchIconPath: genericDefaultAppleTouchIconPath 
    };
  }

  // Check if the input is likely an access token or a username
  if (usernameOrAccessToken.length > 40 && usernameOrAccessToken.startsWith("gh")) { // More specific check for PATs
    try {
      octokit = getOctokit(usernameOrAccessToken);
      const repoInfo = await getRepoInfo(usernameOrAccessToken); // This uses the token to get actual user login
      owner = repoInfo.owner; // Correct owner (username)
      repo = repoInfo.repo;
    } catch {
      // If fetching user info with token fails, return generic defaults
      return {
        iconPath: genericDefaultIconPath,
        appleTouchIconPath: genericDefaultAppleTouchIconPath
      };
    }
  } else {
    // Validate username format (basic check)
    if (!/^[a-zA-Z0-9_-]+$/.test(usernameOrAccessToken)) {
      return {
        iconPath: genericDefaultIconPath,
        appleTouchIconPath: genericDefaultAppleTouchIconPath
      };
    }
    owner = usernameOrAccessToken; // Assumed to be a username
  }

  let iconPathToUse: string;
  let appleTouchIconPathToUse: string;

  if (owner) {
    // If we have an owner (either from token or direct username), construct potential GitHub avatar URL
    iconPathToUse = `https://github.com/${owner}.png`;
    appleTouchIconPathToUse = `https://github.com/${owner}.png`; // Often the same for GitHub avatars

    if (octokit) { // If octokit was initialized (meaning a token was likely provided and valid for repo access)
      try {
        // Get default branch once for both icon lookups (uses cache)
        const defaultBranch = await getDefaultBranch(octokit, owner, repo);

        // Try to fetch custom icons from the repo, fall back to the GitHub avatar if not found
        iconPathToUse = await getIconUrl(octokit, owner, repo, defaultBranch, 'assets/icon.jpg', iconPathToUse);
        appleTouchIconPathToUse = await getIconUrl(octokit, owner, repo, defaultBranch, 'assets/icon-144.jpg', appleTouchIconPathToUse);
      } catch {
        // Keep using GitHub avatar URLs as fallback
      }
    }
  } else {
    // If owner is still null, use generic defaults
    iconPathToUse = genericDefaultIconPath;
    appleTouchIconPathToUse = genericDefaultAppleTouchIconPath;
  }

  return { iconPath: iconPathToUse, appleTouchIconPath: appleTouchIconPathToUse };
}

async function getIconUrl(octokit: Octokit, owner: string, repo: string, branch: string, iconPath: string, defaultPath: string): Promise<string> {
  try {
    const response = await octokit.repos.getContent({ owner, repo, path: iconPath });

    // Validate the response
    if (Array.isArray(response.data) || !('content' in response.data)) {
      return defaultPath;
    }

    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${iconPath}`;
  } catch {
    return defaultPath;
  }
}

export async function getAboutPage(accessToken: string): Promise<AboutPage | null> {
  if (!accessToken) {
    throw new Error('Access token is required');
  }
  const octokit = getOctokit(accessToken);
  const { owner, repo } = await getRepoInfo(accessToken);

  try {
    // Fetch the file content
    const contentResponse = await octokit.repos.getContent({
      owner,
      repo,
      path: 'content/about.md',
    });

    if (Array.isArray(contentResponse.data) || !('content' in contentResponse.data)) {
      throw new Error('Unexpected response from GitHub API');
    }

    const content = Buffer.from(contentResponse.data.content, 'base64').toString('utf-8');

    return {
      content,
    };
  } catch (error) {
    if (isGitHubError(error) && error.status === 404) {
      // About page doesn't exist yet
      return null;
    }
    throw error;
  }
}

export async function createAboutPage(content: string, accessToken: string): Promise<void> {
  const octokit = getOctokit(accessToken);
  const { owner, repo } = await getRepoInfo(accessToken);
  await initializeGitHubStructure(octokit, owner, repo);

  const path = 'content/about.md';
  
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: 'Create about page',
    content: Buffer.from(content).toString('base64'),
  });
}

export async function updateAboutPage(content: string, accessToken: string): Promise<void> {
  if (!accessToken) {
    throw new Error('Access token is required');
  }
  const octokit = getOctokit(accessToken);
  const { owner, repo } = await getRepoInfo(accessToken);

  // Get the current file to retrieve its SHA
  const currentFile = await octokit.repos.getContent({
    owner,
    repo,
    path: 'content/about.md',
  });

  if (Array.isArray(currentFile.data) || !('sha' in currentFile.data)) {
    throw new Error('Unexpected response when fetching current about page');
  }

  // Update the about page file
  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: 'content/about.md',
    message: 'Update about page',
    content: Buffer.from(content).toString('base64'),
    sha: currentFile.data.sha,
  });
}

export async function getAboutPagePublic(octokit: Octokit, owner: string, repo: string): Promise<AboutPage | null> {
  try {
    const contentResponse = await octokit.repos.getContent({
      owner,
      repo,
      path: 'content/about.md',
    });

    if (Array.isArray(contentResponse.data) || !('content' in contentResponse.data)) {
      return null;
    }

    const content = Buffer.from(contentResponse.data.content, 'base64').toString('utf-8');

    return {
      content,
    };
  } catch {
    return null;
  }
}

export async function getBlogPostsPublicLight(octokit: Octokit, owner: string, repo: string): Promise<BlogPost[]> {
  const cacheKey = `blog-posts-light:${owner}:${repo}`;
  
  // Check cache first
  const cachedData = apiCache.get<BlogPost[]>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await octokit.repos.getContent({
      owner,
      repo,
      path: 'content/blog',
    });

    if (!Array.isArray(response.data)) {
      return [];
    }

    const mdFiles = response.data.filter((file) => file.type === 'file' && file.name.endsWith('.md'));
    const posts: BlogPost[] = [];

    // Only fetch first few files to get some content, rest just metadata
    const MAX_FULL_CONTENT = 10; // Only fetch full content for first 10 posts
    
    for (let i = 0; i < mdFiles.length; i++) {
      const file = mdFiles[i];
      
      try {
        // Add small delay between requests
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (i < MAX_FULL_CONTENT) {
          // Fetch full content for first few posts
          const contentResponse = await octokit.repos.getContent({
            owner,
            repo,
            path: `content/blog/${file.name}`,
          });

          if ('content' in contentResponse.data) {
            const content = Buffer.from(contentResponse.data.content, 'base64').toString('utf-8');
            const titleMatch = content.match(/title:\s*(.+)/);
            const dateMatch = content.match(/date:\s*(.+)/);

            posts.push({
              id: file.name.replace('.md', ''),
              title: titleMatch ? titleMatch[1].trim() : file.name.replace('.md', ''),
              content,
              date: dateMatch ? new Date(dateMatch[1]).toISOString() : new Date().toISOString(),
            });
          }
        } else {
          // For remaining posts, just create basic metadata
          posts.push({
            id: file.name.replace('.md', ''),
            title: file.name.replace('.md', '').replace(/-/g, ' '),
            content: '', // Empty content for list view
            date: new Date().toISOString(), // Default date
          });
        }
      } catch (error: unknown) {
        // If we hit rate limit, stop and return what we have
        if (isGitHubError(error) && error.status === 403) {
          break;
        }
      }
    }

    // Cache the result
    apiCache.set(cacheKey, posts, 10 * 60 * 1000); // 10 minutes for light data
    return posts;
  } catch (error: unknown) {
    // Try to return stale cached data as fallback
    const staleData = apiCache.getStale<BlogPost[]>(cacheKey);
    if (staleData) {
      return staleData;
    }

    // Re-throw rate limiting errors
    if (isGitHubError(error) && error.status === 403) {
      throw error;
    }

    return [];
  }
}