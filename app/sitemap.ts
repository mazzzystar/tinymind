import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://tinymind.me'
  
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
  ]

  // Get dynamic user pages
  const dynamicPages: MetadataRoute.Sitemap = []
  
  try {
    // This is a simplified approach - in production you might want to maintain a list of active users
    // For now, we'll include some known users or implement a discovery mechanism
    const knownUsers = ['mazzzystar'] // You can expand this list or implement user discovery
    
    for (const username of knownUsers) {
      try {
        // Add user homepage
        dynamicPages.push({
          url: `${baseUrl}/${username}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.8,
        })

        // Add user blog page
        dynamicPages.push({
          url: `${baseUrl}/${username}/blog`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
        })

        // Add user thoughts page
        dynamicPages.push({
          url: `${baseUrl}/${username}/thoughts`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.6,
        })

        // Add user about page
        dynamicPages.push({
          url: `${baseUrl}/${username}/about`,
          lastModified: new Date(),
          changeFrequency: 'monthly',
          priority: 0.5,
        })

        // Use the authenticated API endpoint instead of direct GitHub calls
        try {
          const response = await fetch(`${baseUrl}/api/public-blog/${username}`)
          if (response.ok) {
            const blogPosts = await response.json()
            
            for (const post of blogPosts) {
              dynamicPages.push({
                url: `${baseUrl}/${username}/blog/${encodeURIComponent(post.id)}`,
                lastModified: new Date(post.date),
                changeFrequency: 'monthly',
                priority: 0.6,
              })
            }
          }
        } catch (blogError) {
          console.error(`Error fetching blog posts for ${username}:`, blogError)
        }
      } catch (error) {
        console.error(`Error fetching data for user ${username}:`, error)
        // Continue with other users even if one fails
      }
    }
  } catch (error) {
    console.error('Error generating dynamic sitemap entries:', error)
  }

  return [...staticPages, ...dynamicPages]
} 