import { Octokit } from '@octokit/rest'

// Rate limiter to manage GitHub API requests
export async function rateLimiter(octokit: Octokit) {
    try {
      const response = await octokit.request('/rate_limit')
      const rateLimit = response.data.resources.core
      const remaining = rateLimit.remaining
      const resetTime = new Date(rateLimit.reset * 1000)
      const currentTime = new Date()
  
      console.log(`Rate limit: ${rateLimit.limit}, Remaining: ${remaining}, Reset at: ${resetTime}`)
  
      // If remaining requests are low, wait until reset time
      if (remaining < 10) {
        const waitTime = resetTime.getTime() - currentTime.getTime()
        console.log(
          `Approaching rate limit. Waiting for ${waitTime / 1000 / 60} minutes until reset.`
        )
        await new Promise((resolve) => setTimeout(resolve, waitTime))
      }
    } catch (error) {
      console.error('Error fetching rate limit:', error)
    }
  }