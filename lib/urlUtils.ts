export function transformGithubImageUrl(src: string | undefined): string | undefined {
  if (!src) {
    return undefined;
  }
  const githubBlobPattern = /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/(main|master|[^\/]+)\/(.+)\?raw=true$/;
  const match = src.match(githubBlobPattern);

  if (match) {
    const owner = match[1];
    const repo = match[2];
    const branch = match[3]; // Will capture 'main', 'master', or any other branch name
    const path = match[4];
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
  }
  return src;
} 