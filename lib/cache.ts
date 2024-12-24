interface CacheEntry<T> {
  data: T
  expiry: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache: Record<string, CacheEntry<any>> = {}

// Cache duration in milliseconds (e.g., 5 minutes)
const CACHE_DURATION = 5 * 60 * 1000

// Function to get data from cache or fetch if not available or expired
export async function getCachedOrFetch<T>(
  key: string,
  fetchFunction: () => Promise<T>
): Promise<T> {
  const currentTime = Date.now()
  const cachedData = cache[key]

  console.warn(`current keys are ${Object.keys(cache).join(':')}`)

  // Return cached data if valid
  if (cachedData && cachedData.expiry > currentTime) {
    console.warn(`Returning cached data for key: ${key}`)
    return cachedData.data
  }

  // Fetch new data and store it in the cache
  console.warn(`Fetching new data for key: ${key}`)
  const data = await fetchFunction()
  cache[key] = { data, expiry: currentTime + CACHE_DURATION }

  return data
}
