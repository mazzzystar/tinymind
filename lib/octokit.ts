import { Octokit } from '@octokit/rest';

// @octokit/rest bundles a request-log plugin that sends one line per failed
// request to `log.error`, formatted as "GET /path - 404 with id <id> in 12ms".
const REQUEST_LOG_404 = / - 404 with id \S+ in \d+ms$/;

/**
 * A 404 is how we find out that an optional file (content/about.md, an icon,
 * a repo that has not been created yet) does not exist, and every caller
 * already handles it. Left alone, each of those lookups is reported as an
 * error in production logs. Anything else (403, 5xx, ...) is still logged.
 */
function logError(message: unknown, ...rest: unknown[]) {
  if (typeof message === 'string' && REQUEST_LOG_404.test(message)) return;
  console.error(message, ...rest);
}

export function createOctokit(auth?: string): Octokit {
  return new Octokit({
    ...(auth ? { auth } : {}),
    log: {
      debug: () => {},
      info: () => {},
      warn: console.warn.bind(console),
      error: logError,
    },
  });
}
