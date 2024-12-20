// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache: Record<string, { data: any; expiry: number }> = {}

// Cache duration in milliseconds (e.g., 5 minutes)
const CACHE_DURATION = 5 * 60 * 1000

// Function to get data from cache or fetch if not available or expired
export async function getCachedOrFetch(
  key: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetchFunction: () => Promise<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const currentTime = Date.now()
  const cachedData = cache[key]

  if (cachedData && cachedData.expiry > currentTime) {
    return cachedData.data
  }

  const data = await fetchFunction()
  cache[key] = { data, expiry: currentTime + CACHE_DURATION }
  return data
}
