// In-memory cache for API responses with LRU eviction
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

// Track cache keys by user for granular invalidation
const keysByUser = new Map<string, Set<string>>();

/**
 * Extract username from cache key if present
 */
function extractUserFromKey(key: string): string | null {
  // Keys are typically formatted as: "type:username:repo" or "type:username"
  const parts = key.split(':');
  if (parts.length >= 2) {
    return parts[1];
  }
  return null;
}

/**
 * Track a cache key for a specific user
 */
function trackKeyForUser(key: string): void {
  const user = extractUserFromKey(key);
  if (user) {
    if (!keysByUser.has(user)) {
      keysByUser.set(user, new Set());
    }
    keysByUser.get(user)!.add(key);
  }
}

/**
 * Remove key from user tracking
 */
function untrackKey(key: string): void {
  const user = extractUserFromKey(key);
  if (user && keysByUser.has(user)) {
    keysByUser.get(user)!.delete(key);
    if (keysByUser.get(user)!.size === 0) {
      keysByUser.delete(user);
    }
  }
}

class MemoryCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5 minutes
  private readonly maxSize: number;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const timeToLive = ttl || this.defaultTTL;

    // If updating existing key, just update in place
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else {
      // Evict oldest entries if at max size (LRU eviction)
      while (this.cache.size >= this.maxSize) {
        const oldestKey = this.cache.keys().next().value;
        if (oldestKey) {
          this.delete(oldestKey);
        } else {
          break;
        }
      }
    }

    // Add to end to maintain insertion order (for LRU)
    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt: now + timeToLive
    });

    // Track key for granular invalidation
    trackKeyForUser(key);
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return null;
    }

    // Move to end for LRU (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    untrackKey(key);
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    keysByUser.clear();
  }

  // Get stale data even if expired (useful for fallback)
  getStale<T>(key: string): T | null {
    const entry = this.cache.get(key);
    return entry ? entry.data as T : null;
  }

  // Clean up expired entries
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach(key => this.delete(key));
  }

  // Get current cache size (for monitoring)
  get size(): number {
    return this.cache.size;
  }

  // Invalidate all cache entries for a specific user
  invalidateUser(username: string): void {
    const userKeys = keysByUser.get(username);
    if (userKeys) {
      userKeys.forEach(key => {
        this.cache.delete(key);
      });
      keysByUser.delete(username);
    }
  }

  // Get all keys (for debugging)
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

/**
 * Bounded cache with TTL for route-level caching.
 * Simpler than MemoryCache, used for replacing unbounded Map caches.
 */
export class BoundedCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>();
  private readonly maxSize: number;
  private readonly ttlMs: number;

  constructor(maxSize: number = 100, ttlMs: number = 5 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) {
      return undefined;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end for LRU
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data;
  }

  /**
   * Get stale data even if expired (useful for fallback)
   */
  getStale(key: string): T | undefined {
    const entry = this.cache.get(key);
    return entry?.data;
  }

  set(key: string, data: T): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    // Delete and re-add for LRU ordering
    this.cache.delete(key);
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// Global cache instance with max size limit
export const apiCache = new MemoryCache(1000);

// Track cleanup interval for proper cleanup (prevents HMR issues)
let cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * Initialize cleanup interval (call once on server startup)
 */
function initializeCleanupInterval(): void {
  // Only run on server side and if not already initialized
  if (typeof window === 'undefined' && !cleanupIntervalId) {
    cleanupIntervalId = setInterval(() => {
      apiCache.cleanup();
    }, 10 * 60 * 1000); // Every 10 minutes

    // Prevent interval from keeping Node.js process alive
    if (cleanupIntervalId.unref) {
      cleanupIntervalId.unref();
    }
  }
}

/**
 * Stop cleanup interval (for testing or cleanup)
 */
export function stopCleanupInterval(): void {
  if (cleanupIntervalId) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
}

// Initialize on module load
initializeCleanupInterval();

/**
 * Invalidate all cache entries.
 * Use sparingly - prefer invalidateUserCache for targeted invalidation.
 */
export function invalidateCache(): void {
  apiCache.clear();
}

/**
 * Invalidate cache for a specific user's data.
 * More efficient than clearing all cache.
 * @param username - GitHub username whose cache should be invalidated
 */
export function invalidateUserCache(username: string): void {
  apiCache.invalidateUser(username);
}

/**
 * Get cache statistics for monitoring
 */
export function getCacheStats(): { size: number; trackedUsers: number } {
  return {
    size: apiCache.size,
    trackedUsers: keysByUser.size,
  };
}
