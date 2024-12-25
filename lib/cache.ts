interface CacheEntry<T> {
  data: T;
  expiry: number;
}

// Universal in-memory cache (server-side only)
// eslint-disable-next-line
const serverCache: Record<string, CacheEntry<any>> = {};

// Cache duration in milliseconds (e.g., 5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Check if running on the server
const isServer = typeof window === "undefined";

/**
 * Get cache entry by key
 */
function getCache<T>(key: string): CacheEntry<T> | null {
  if (isServer) {
    return serverCache[key] || null;
  } else {
    const cachedItem = localStorage.getItem(key);
    return cachedItem ? (JSON.parse(cachedItem) as CacheEntry<T>) : null;
  }
}

/**
 * Set cache entry by key
 */
function setCache<T>(key: string, data: T): void {
  const cacheEntry: CacheEntry<T> = {
    data,
    expiry: Date.now() + CACHE_DURATION,
  };

  if (isServer) {
    serverCache[key] = cacheEntry;
  } else {
    localStorage.setItem(key, JSON.stringify(cacheEntry));
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function clearExpiredCache<T>(key: string): void {
  if (isServer) {
    delete serverCache[key];
  } else {
    localStorage.removeItem(key);
  }
}

/**
 * Universal function to get data from cache or fetch if not available or expired
 */
export async function getCachedOrFetch<T>(
  key: string,
  fetchFunction: () => Promise<T>
): Promise<T> {
  const cachedData = getCache<T>(key);

  // Return cached data if valid
  if (cachedData && cachedData.expiry > Date.now()) {
    console.warn(`Returning cached data for key: ${key}`);
    return cachedData.data;
  }

  try {
    console.warn(`Fetching new data for key: ${key}`);
    const data = await fetchFunction();
    setCache(key, data);
    return data;
  } catch (error) {
    console.error(`Error fetching data for key: ${key}`, error);
    if (cachedData) {
      // Fallback to expired cached data if fetch fails
      return cachedData.data;
    }
    throw error;
  }
}
