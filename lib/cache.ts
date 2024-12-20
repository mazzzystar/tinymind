const cache: Record<string, { data: any; expiry: number }> = {}

// Cache duration in milliseconds (e.g., 5 minutes)
const CACHE_DURATION = 5 * 60 * 1000

// Function to get data from cache or fetch if not available or expired
export async function getCachedOrFetch(
  key: string,
  fetchFunction: () => Promise<any>
): Promise<any> {
  const currentTime = Date.now()
  const cachedData = cache[key]

  if (cachedData && cachedData.expiry > currentTime) {
    console.log(`Serving from cache: ${key}`)
    return cachedData.data
  }

  console.log(`Fetching new data: ${key}`)
  const data = await fetchFunction()
  cache[key] = { data, expiry: currentTime + CACHE_DURATION }
  return data
}
