import type { Octokit } from '@octokit/rest';
import path from 'path';
import { createOctokit } from './octokit';
import { apiCache, BoundedCache, invalidateOwner } from './cache';
import { withRetry } from './retry';
import { usernameSchema, validatePath } from './validation';
import type { AboutPage, BlogPost, Thought } from './contentTypes';
import { ApiError } from './apiErrors';

export type { AboutPage, BlogPost, Thought } from './contentTypes';

// Add this type definition at the top of the file
type UpdateFileParams = Parameters<Octokit['repos']['createOrUpdateFileContents']>[0];

// Check if we're in development mode

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
 * Read a post's title and date out of its YAML frontmatter.
 *
 * Anchored to the frontmatter block on purpose: an unanchored /date:\s*(.+)/
 * matches the first such line anywhere in the file, so a body line like
 * "date: TBD" was captured and fed to new Date(...).toISOString(), which throws
 * RangeError. Callers wrap this in catch blocks that drop the post, so the
 * post vanished from every listing with no error and no log.
 */
function parseFrontmatter(
  content: string,
  fallbackTitle: string,
  fallbackDate: string
): { title: string; date: string } {
  const block = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const frontmatter = block ? block[1] : '';

  const titleMatch = frontmatter.match(/^title:\s*(.+)$/m);
  const dateMatch = frontmatter.match(/^date:\s*(.+)$/m);

  return {
    title: titleMatch ? unquoteYamlScalar(titleMatch[1].trim()) : fallbackTitle,
    date: toIsoDate(dateMatch?.[1], fallbackDate),
  };
}

/** Titles are written as JSON strings; older posts stored them raw. Accept both. */
function unquoteYamlScalar(value: string): string {
  if (!value.startsWith('"')) {
    return value;
  }
  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'string' ? parsed : value;
  } catch {
    return value;
  }
}

/**
 * Render a post's frontmatter block.
 *
 * The title goes through JSON.stringify because interpolating it raw produced
 * YAML that either broke or lied: "C++: The Good Parts" is invalid YAML, a
 * leading '#' reads as a comment, and an embedded newline could inject a second
 * date: key that the reader would then prefer. JSON strings are valid YAML.
 */
function serializeFrontmatter(title: string, date: string): string {
  return `---\ntitle: ${JSON.stringify(title)}\ndate: ${date}\n---\n`;
}

function toIsoDate(raw: string | undefined, fallback: string): string {
  if (!raw) {
    return fallback;
  }
  const parsed = Date.parse(raw.trim());
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
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

function getOctokit(accessToken: string | undefined) {
  if (!accessToken) {
    throw new Error('Access token is required');
  }
  return createOctokit(accessToken);
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
    // Worker logs are not user-visible, and @octokit/request-error already
    // redacts the authorization header. Gating this on isDev meant production
    // emitted no diagnostics at all.
    console.error('Error getting authenticated user:', error);
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
      throw new Error(`Unexpected response for ${owner}/${repo}/content/blog`);
    }

    const posts = await Promise.all(
      response.data
        .filter((file) => file.type === 'file' && file.name !== '.gitkeep' && file.name.endsWith('.md'))
        .map(async (file) => {
          const contentResponse = await octokit.repos.getContent({
            owner,
            repo,
            path: `content/blog/${file.name}`,
          });

          if (Array.isArray(contentResponse.data) || !('content' in contentResponse.data)) {
            throw new Error(`Unexpected response for content/blog/${file.name}`);
          }

          const content = Buffer.from(contentResponse.data.content, 'base64').toString('utf-8');
          const id = file.name.replace(/\.md$/, '');
          const { title, date } = parseFrontmatter(content, id, new Date().toISOString());
          return { id, title, content, date };
        })
    );

    return posts;
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

    const { title, date } = parseFrontmatter(content, id, new Date().toISOString());

    return { id, title, content, date };
  } catch (error) {
    if (isGitHubError(error) && error.status === 404) {
      return null;
    }
    throw error;
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
  const fullContent = `${serializeFrontmatter(title, date)}\n${content}`;

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: `Add blog post: ${title}`,
    content: Buffer.from(fullContent).toString('base64'),
  });

  invalidateOwner(owner);
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

  invalidateOwner(owner);
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

  invalidateOwner(owner);
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

  invalidateOwner(owner);
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

  invalidateOwner(owner);
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
  const result = await withRetry(async () => {
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

    // Carry over the original publication date, normalized. The old code wrote
    // the raw captured string straight back, so editing a post whose body
    // contained an unparseable "date:" line persisted that value and made the
    // post vanish from every listing.
    const { title: originalTitle, date } = parseFrontmatter(
      existingContent,
      safeId,
      new Date().toISOString()
    );

    const updatedContent = `${serializeFrontmatter(title, date)}\n${content}`;

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

  invalidateOwner(owner);
  return result;
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

  await initializeGitHubStructure(octokit, owner, repo);

  // Generate a unique filename
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const id = Date.now().toString();
  const ext = imageExtension(file);
  const filename = `${id}${ext}`;
  const filePath = `assets/images/${date}/${filename}`;

  const content = await fileToBase64(file);

  // Git has no empty directories, so createOrUpdateFileContents creates the
  // parent path itself — no need to pre-create the folder.
  const { data } = await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: filePath,
    message: `Upload image: ${filename}`,
    content,
  });

  // Pin the URL to the commit SHA: branch-based raw URLs are CDN-cached for
  // minutes, which makes a freshly uploaded image render as broken.
  const ref = data.commit?.sha ?? (await getDefaultBranch(octokit, owner, repo));
  return `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${filePath}`;
}

const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/svg+xml': '.svg',
  'image/bmp': '.bmp',
  'image/heic': '.heic',
};

/**
 * Derive the extension from the MIME type rather than trusting file.name,
 * which is client-supplied and ends up in a repository path.
 */
function imageExtension(file: File): string {
  const fromMime = IMAGE_EXTENSIONS[file.type.toLowerCase()];
  if (fromMime) {
    return fromMime;
  }
  const fromName = path.extname(file.name).toLowerCase();
  return /^\.[a-z0-9]{1,8}$/.test(fromName) ? fromName : '.png';
}

/**
 * Runs on the server (Node and the Cloudflare Workers runtime), where
 * FileReader does not exist — read the bytes directly instead.
 */
async function fileToBase64(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  return Buffer.from(bytes).toString('base64');
}

interface BlogTreeQuery {
  repository: {
    object: {
      entries?: Array<{
        name: string;
        type: string;
        object: { text?: string; isTruncated?: boolean } | null;
      }>;
    } | null;
  } | null;
}

interface GraphqlRequestError {
  errors?: Array<{ type?: string; path?: Array<string | number> }>;
}

function isMissingRepositoryGraphqlError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  return (error as GraphqlRequestError).errors?.some(
    (item) => item.type === 'NOT_FOUND' && item.path?.[0] === 'repository'
  ) ?? false;
}

const BLOG_TREE_QUERY = `
  query($owner: String!, $repo: String!) {
    repository(owner: $owner, name: $repo) {
      object(expression: "HEAD:content/blog") {
        ... on Tree {
          entries {
            name
            type
            object { ... on Blob { text isTruncated } }
          }
        }
      }
    }
  }
`;

/**
 * Fetch every published post in a single request.
 *
 * The REST equivalent was one getTree plus one getBlob per post, which for a
 * 100-post blog meant 102 calls per page view and enough concurrency to trip
 * GitHub's secondary rate limit. One GraphQL query costs 1 point of a separate
 * 5000/hour budget and needs no default-branch lookup, since `HEAD:` resolves
 * it server-side.
 */
export async function getBlogPostsPublicFast(octokit: Octokit, owner: string, repo: string): Promise<BlogPost[]> {
  const cacheKey = `blog-posts-fast:${owner}:${repo}`;
  // Read stale data before get(): get() intentionally evicts expired entries.
  const staleData = apiCache.getStale<BlogPost[]>(cacheKey);

  const cachedData = apiCache.get<BlogPost[]>(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  let entries: NonNullable<NonNullable<BlogTreeQuery['repository']>['object']>['entries'];
  try {
    const data = await octokit.graphql<BlogTreeQuery>(BLOG_TREE_QUERY, { owner, repo });
    // A missing repository or a repository with no content/blog directory.
    if (!data.repository?.object) {
      apiCache.set(cacheKey, [], 5 * 60 * 1000);
      return [];
    }
    entries = data.repository.object.entries;
  } catch (error) {
    if (isMissingRepositoryGraphqlError(error)) {
      throw ApiError.notFound('TinyMind profile not found');
    }
    // Never fall back to the per-file REST path on a rate-limit error: doing so
    // issues N+1 more requests at exactly the moment the budget is exhausted.
    if (isGitHubError(error) && (error.status === 403 || error.status === 429)) {
      if (staleData) return staleData;
      throw error;
    }
    console.error(`GraphQL blog fetch failed for ${owner}/${repo}, falling back to REST:`, error);
    try {
      return await getBlogPostsPublic(octokit, owner, repo);
    } catch (fallbackError) {
      if (staleData) return staleData;
      throw fallbackError;
    }
  }

  const now = new Date().toISOString();
  let posts: BlogPost[];
  try {
    posts = (await Promise.all(
      (entries ?? [])
        .filter((entry) => entry.type === 'blob' && entry.name.endsWith('.md') && entry.name !== '.gitkeep')
        .map(async (entry) => {
          let content = entry.object?.text;
          if (typeof content !== 'string' || entry.object?.isTruncated) {
            const response = await octokit.repos.getContent({
              owner,
              repo,
              path: `content/blog/${entry.name}`,
            });
            if (Array.isArray(response.data) || !('content' in response.data)) {
              throw new Error(`Unexpected response for content/blog/${entry.name}`);
            }
            content = Buffer.from(response.data.content, 'base64').toString('utf-8');
          }
          const id = entry.name.replace(/\.md$/, '');
          const { title, date } = parseFrontmatter(content, id, now);
          return { id, title, content, date };
        })
    )).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  } catch (error) {
    if (staleData) return staleData;
    throw error;
  }

  apiCache.set(cacheKey, posts, 5 * 60 * 1000);
  return posts;
}

export async function getBlogPostsPublic(octokit: Octokit, owner: string, repo: string): Promise<BlogPost[]> {
  const cacheKey = `blog-posts:${owner}:${repo}`;
  // Preserve stale data before get() evicts an expired entry.
  const staleData = apiCache.getStale<BlogPost[]>(cacheKey);
  
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
      throw new Error(`Unexpected response for ${owner}/${repo}/content/blog`);
    }

    const mdFiles = response.data.filter((file) => file.type === 'file' && file.name.endsWith('.md'));
    
    // **PERFORMANCE OPTIMIZATION**: Fetch all files in parallel instead of sequentially
    const fetchPromises = mdFiles.map(async (file) => {
      const contentResponse = await octokit.repos.getContent({
        owner,
        repo,
        path: `content/blog/${file.name}`,
      });

      if (Array.isArray(contentResponse.data) || !('content' in contentResponse.data)) {
        throw new Error(`Unexpected response for content/blog/${file.name}`);
      }
      const content = Buffer.from(contentResponse.data.content, 'base64').toString('utf-8');
      const id = file.name.replace(/\.md$/, '');
      const { title, date } = parseFrontmatter(content, id, new Date().toISOString());

      return { id, title, content, date };
    });

    // Wait for all promises to resolve
    const posts = (await Promise.all(fetchPromises))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Sort by date desc

    // Cache the successful result
    apiCache.set(cacheKey, posts, 5 * 60 * 1000); // 5 minutes
    return posts;
  } catch (error: unknown) {
    if (staleData) {
      return staleData;
    }

    // A missing blog directory is a valid empty blog. Other failures are
    // transient or malformed responses and must never be cached as emptiness.
    if (isGitHubError(error) && error.status === 404) {
      apiCache.set(cacheKey, [], 5 * 60 * 1000);
      return [];
    }
    throw error;
  }
}

export async function getThoughtsPublic(octokit: Octokit, owner: string, repo: string): Promise<Thought[]> {
  let raw: string;
  try {
    const response = await octokit.repos.getContent({
      owner,
      repo,
      path: 'content/thoughts.json',
    });

    if (Array.isArray(response.data) || !('content' in response.data)) {
      return [];
    }

    raw = Buffer.from(response.data.content, 'base64').toString('utf-8');
  } catch (error) {
    // Only a missing file means "this user has no thoughts". An unconditional
    // catch turned rate limits and 5xx into the same empty array, which callers
    // then cached for five minutes — so one GitHub hiccup could serve a crawler
    // a 200 with an empty profile.
    if (isGitHubError(error) && error.status === 404) {
      return [];
    }
    console.error(`Failed to read thoughts for ${owner}/${repo}:`, error);
    throw error;
  }

  try {
    return JSON.parse(raw) as Thought[];
  } catch (error) {
    // The file exists but is unusable. Not transient, so don't throw on it.
    console.error(`content/thoughts.json in ${owner}/${repo} is not valid JSON:`, error);
    return [];
  }
}

export interface IconUrls {
  iconPath: string;
  appleTouchIconPath: string;
}

const GENERIC_ICON_URLS: IconUrls = {
  iconPath: '/icon.jpg',
  appleTouchIconPath: '/icon-144.jpg',
};

/**
 * Icons for a public profile, resolved from the GitHub avatar.
 *
 * Only ever pass a username. This value ends up in page metadata and in an
 * <img src>, so usernameSchema is what keeps a credential — which is never a
 * valid GitHub username — from being rendered into the page.
 */
export async function getIconUrlsForUsername(username: string): Promise<IconUrls> {
  if (!usernameSchema.safeParse(username).success) {
    return GENERIC_ICON_URLS;
  }

  const avatar = `https://github.com/${username}.png`;
  return { iconPath: avatar, appleTouchIconPath: avatar };
}

/**
 * Icons for the signed-in user, preferring the custom icons committed to their
 * repo and falling back to their GitHub avatar.
 */
export async function getIconUrlsForToken(accessToken: string): Promise<IconUrls> {
  if (!accessToken) {
    return GENERIC_ICON_URLS;
  }

  let octokit: Octokit;
  let owner: string;
  let repo: string;
  try {
    octokit = getOctokit(accessToken);
    ({ owner, repo } = await getRepoInfo(accessToken));
  } catch {
    return GENERIC_ICON_URLS;
  }

  const avatar = `https://github.com/${owner}.png`;
  try {
    const defaultBranch = await getDefaultBranch(octokit, owner, repo);
    const [iconPath, appleTouchIconPath] = await Promise.all([
      getIconUrl(octokit, owner, repo, defaultBranch, 'assets/icon.jpg', avatar),
      getIconUrl(octokit, owner, repo, defaultBranch, 'assets/icon-144.jpg', avatar),
    ]);
    return { iconPath, appleTouchIconPath };
  } catch {
    return { iconPath: avatar, appleTouchIconPath: avatar };
  }
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

  invalidateOwner(owner);
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

  invalidateOwner(owner);
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
  } catch (error) {
    if (isGitHubError(error) && error.status === 404) {
      return null;
    }
    console.error(`Failed to read the about page for ${owner}/${repo}:`, error);
    throw error;
  }
}
