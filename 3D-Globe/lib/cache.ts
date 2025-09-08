type Entry<T> = { value: T; expiresAt: number };

export function inMemoryLRU<T>({ max = 200, ttlMs = 1000 * 60 * 60 } = {}) {
  const store = new Map<string, Entry<T>>();

  function set(key: string, value: T) {
    const expiresAt = Date.now() + ttlMs;
    if (store.size >= max) {
      // evict oldest
      const first = store.keys().next().value;
      if (first) store.delete(first);
    }
    store.set(key, { value, expiresAt });
  }

  function get(key: string) {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }
    // refresh LRU order
    store.delete(key);
    store.set(key, entry);
    return entry.value;
  }

  return {
    async get(k: string) {
      return get(k);
    },
    async set(k: string, v: T) {
      return set(k, v);
    },
    size() {
      return store.size;
    },
    clear() {
      store.clear();
    }
  };
}
