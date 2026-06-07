// Dependency-free Upstash Redis REST API client with in-memory fallback

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// In-memory fallback for local development if Upstash is not configured
const localFallbackMap = new Map<string, { count: number; expiresAt: number }>();

// Clean up local map periodically to avoid memory leaks
if (typeof window === 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of localFallbackMap.entries()) {
      if (now > value.expiresAt) {
        localFallbackMap.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<{ allowed: boolean; currentCount: number }> {
  // 1. Fallback to local map if Upstash variables are missing
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    const now = Date.now();
    const entry = localFallbackMap.get(key);

    if (!entry || now > entry.expiresAt) {
      localFallbackMap.set(key, {
        count: 1,
        expiresAt: now + windowSeconds * 1000,
      });
      return { allowed: true, currentCount: 1 };
    }

    entry.count += 1;
    return {
      allowed: entry.count <= limit,
      currentCount: entry.count,
    };
  }

  // 2. Query Upstash Redis REST API using a pipeline for atomic execute
  try {
    const cleanUrl = UPSTASH_URL.endsWith('/') ? UPSTASH_URL.slice(0, -1) : UPSTASH_URL;
    
    // Increment the key and fetch the TTL in a single pipeline request (saves roundtrips)
    const response = await fetch(`${cleanUrl}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['TTL', key],
      ]),
      // Low timeout to prevent slowing down requests if Redis has issues
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      throw new Error(`Upstash response code ${response.status}`);
    }

    // Upstash pipeline returns responses in order: [[null, count], [null, ttl]]
    const data = await response.json();
    const count = data[0]?.[1] || 0;
    let ttl = data[1]?.[1] || -1;

    // If key has no TTL (-1), set the expiration
    if (ttl === -1) {
      await fetch(`${cleanUrl}/expire/${key}/${windowSeconds}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${UPSTASH_TOKEN}`,
        },
      });
      ttl = windowSeconds;
    }

    return {
      allowed: count <= limit,
      currentCount: count,
    };
  } catch (err) {
    console.error('Rate limiter Upstash error, falling back to in-memory:', err);
    
    // In case of network errors to Upstash, gracefully fail-open using the local map
    const now = Date.now();
    const entry = localFallbackMap.get(key);

    if (!entry || now > entry.expiresAt) {
      localFallbackMap.set(key, {
        count: 1,
        expiresAt: now + windowSeconds * 1000,
      });
      return { allowed: true, currentCount: 1 };
    }

    entry.count += 1;
    return {
      allowed: entry.count <= limit,
      currentCount: entry.count,
    };
  }
}
