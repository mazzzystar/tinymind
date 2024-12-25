import { Note } from './types'
import { Octokit } from '@octokit/rest'
import { getCachedOrFetch } from './cache'

class GitHubAPIClient {
  private accessToken: string

  constructor(token: string) {
    this.accessToken = token
  }

  async getNotes(owner?: string, repo?: string): Promise<Note[]> {
    return getCachedOrFetch(`${owner}/${repo}/content/thoughts.json`, async () => {
      const octokit = this.accessToken ? new Octokit({ auth: this.accessToken }) : new Octokit()

      if (!owner || !repo) {
        const { data: user } = await octokit.users.getAuthenticated()
        owner = user.login
        repo = 'tinymind-blog'
      }

      try {
        const response = await octokit.repos.getContent({
          owner,
          repo,
          path: 'content/thoughts.json',
        })

        if (Array.isArray(response.data) || !('content' in response.data)) {
          return []
        }

        const content = Buffer.from(response.data.content, 'base64').toString('utf-8')
        return JSON.parse(content) as Note[]
      } catch (error) {
        console.error('Error fetching public thoughts:', error)
        return []
      }
    })
  }
}

export const createGitHubAPIClient = (token: string) => new GitHubAPIClient(token)
