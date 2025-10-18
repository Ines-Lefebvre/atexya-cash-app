interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL = 60 * 60 * 1000;

function cleanupOldEntries(): void {
  const now = Date.now();
  
  for (const [key, entry] of rateLimitMap.entries()) {
    if (entry.timestamps.length === 0 || entry.timestamps[entry.timestamps.length - 1] < now - CLEANUP_INTERVAL) {
      rateLimitMap.delete(key);
    }
  }
}

setInterval(cleanupOldEntries, CLEANUP_INTERVAL);

export function checkRateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const cutoff = now - windowMs;
  
  let entry = rateLimitMap.get(key);
  
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitMap.set(key, entry);
  }
  
  entry.timestamps = entry.timestamps.filter(ts => ts > cutoff);
  
  entry.timestamps.push(now);
  
  return entry.timestamps.length > maxAttempts;
}

export function resetRateLimit(key: string): void {
  rateLimitMap.delete(key);
}
