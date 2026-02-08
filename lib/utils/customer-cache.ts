'use client';

type CacheEnvelope<T> = {
  ts: number;
  data: T;
};

const DEFAULT_TTL_MS = 2 * 60 * 1000;
const CUSTOMER_CACHE_VERSION = '2026-02-08-v1';
const CUSTOMER_CACHE_VERSION_KEY = 'customer:cache:version';

function ensureCustomerCacheVersion() {
  if (typeof window === 'undefined') return;
  try {
    const storedVersion = sessionStorage.getItem(CUSTOMER_CACHE_VERSION_KEY);
    if (storedVersion === CUSTOMER_CACHE_VERSION) return;

    for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('customer:') && key !== CUSTOMER_CACHE_VERSION_KEY) {
        sessionStorage.removeItem(key);
      }
    }
    sessionStorage.setItem(CUSTOMER_CACHE_VERSION_KEY, CUSTOMER_CACHE_VERSION);
  } catch {
    // ignore storage errors
  }
}

export function readCustomerCache<T>(key: string, ttlMs: number = DEFAULT_TTL_MS): T | null {
  if (typeof window === 'undefined') return null;
  ensureCustomerCacheVersion();
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed?.ts) return null;
    if (Date.now() - parsed.ts > ttlMs) return null;
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

export function writeCustomerCache<T>(key: string, data: T) {
  if (typeof window === 'undefined') return;
  ensureCustomerCacheVersion();
  try {
    const payload: CacheEnvelope<T> = { ts: Date.now(), data };
    sessionStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // ignore storage errors
  }
}

export function clearCustomerCache(key: string) {
  if (typeof window === 'undefined') return;
  ensureCustomerCacheVersion();
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore
  }
}
