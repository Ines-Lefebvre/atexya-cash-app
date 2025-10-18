interface RateLimitEntry {
  attempts: number;
  windowStart: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_ATTEMPTS = 5;
const CLEANUP_INTERVAL = 60 * 60 * 1000;

function cleanupOldEntries(): void {
  const now = Date.now();
  const cutoff = now - RATE_LIMIT_WINDOW;
  
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (entry.windowStart < cutoff) {
      rateLimitMap.delete(ip);
    }
  }
}

setInterval(cleanupOldEntries, CLEANUP_INTERVAL);

export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  
  if (!entry) {
    rateLimitMap.set(ip, { attempts: 1, windowStart: now });
    return false;
  }
  
  if (now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { attempts: 1, windowStart: now });
    return false;
  }
  
  entry.attempts++;
  
  return entry.attempts > MAX_ATTEMPTS;
}

export function resetRateLimit(ip: string): void {
  rateLimitMap.delete(ip);
}
