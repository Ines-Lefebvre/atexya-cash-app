interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL_MS = 60000;
const MAX_ENTRY_AGE_MS = 3600000;

let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanupTimer() {
  if (cleanupTimer) return;
  
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of rateLimitStore.entries()) {
      entry.timestamps = entry.timestamps.filter(ts => now - ts < MAX_ENTRY_AGE_MS);
      
      if (entry.timestamps.length === 0) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => rateLimitStore.delete(key));
  }, CLEANUP_INTERVAL_MS);
  
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

startCleanupTimer();

export function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  let entry = rateLimitStore.get(key);
  
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitStore.set(key, entry);
  }
  
  entry.timestamps = entry.timestamps.filter(ts => ts > windowStart);
  
  if (entry.timestamps.length >= maxAttempts) {
    return true;
  }
  
  entry.timestamps.push(now);
  
  return false;
}

export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

export function getRemainingAttempts(
  key: string,
  maxAttempts: number,
  windowMs: number
): number {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  const entry = rateLimitStore.get(key);
  
  if (!entry) {
    return maxAttempts;
  }
  
  const recentAttempts = entry.timestamps.filter(ts => ts > windowStart);
  
  return Math.max(0, maxAttempts - recentAttempts.length);
}

export function getResetTime(
  key: string,
  windowMs: number
): number | null {
  const entry = rateLimitStore.get(key);
  
  if (!entry || entry.timestamps.length === 0) {
    return null;
  }
  
  const oldestTimestamp = Math.min(...entry.timestamps);
  
  return oldestTimestamp + windowMs;
}
