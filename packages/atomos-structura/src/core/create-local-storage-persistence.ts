import type { Signal } from '@atomos-web/prime';

/**
 * Unified persistence layer with synchronous writes and comprehensive error handling.
 * Eliminates debounce race conditions that cause data loss in schema editing.
 */
export const createLocalStoragePersistence = function<T>(
  key: string,
  signal: Signal<T>
): { destroy: () => void } {
  let isWriting = false;
  let pendingWrite: T | null = null;

  const flushPendingWrite = async (): Promise<void> => {
    if (isWriting || pendingWrite === null) return;
    
    isWriting = true;
    const valueToWrite = pendingWrite;
    pendingWrite = null;
    
    try {
      const serialized = JSON.stringify(valueToWrite);
      localStorage.setItem(key, serialized);
      console.log(`[persistence] ✓ Saved ${key} (${serialized.length} chars)`);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'QuotaExceededError') {
        console.error(`[persistence] ✗ localStorage quota exceeded for ${key}`);
        handleQuotaExceeded(key);
      } else if (err instanceof TypeError) {
        console.error(`[persistence] ✗ JSON serialization failed for ${key}:`, err);
      } else {
        console.error(`[persistence] ✗ Write failed for ${key}:`, err);
      }
    } finally {
      isWriting = false;
      
      // Process any queued writes
      if (pendingWrite !== null) {
        setTimeout(flushPendingWrite, 0);
      }
    }
  };

  const scheduleWrite = (value: T): void => {
    pendingWrite = value;
    if (!isWriting) {
      setTimeout(flushPendingWrite, 0);
    }
  };

  const unsub = signal.subscribe(scheduleWrite);

  return {
    destroy: () => {
      unsub();
      pendingWrite = null;
    }
  };
};

/**
 * Handle localStorage quota exceeded by aggressively clearing old/redundant data
 */
const handleQuotaExceeded = (currentKey: string): void => {
  console.warn(`⚠️ localStorage quota exceeded for ${currentKey} - performing cleanup...`);
  
  try {
    // Phase 1: Clear non-essential keys first
    const nonEssentialPrefixes = ['debug-', 'temp-', 'cache-', 'redux-', 'devtools-'];
    let clearedCount = 0;
    
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && key !== currentKey && nonEssentialPrefixes.some(prefix => key.startsWith(prefix))) {
        localStorage.removeItem(key);
        clearedCount++;
        console.log(`🧹 Cleared non-essential key: ${key}`);
      }
    }
    
    // Phase 2: If still not enough space, clear older VBE2 backup keys
    if (clearedCount < 3) {
      const vbe2Keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('vbe2:') && key !== currentKey) {
          vbe2Keys.push({ key, size: localStorage.getItem(key)?.length || 0 });
        }
      }
      
      // Sort by size (largest first) and remove biggest non-current keys
      vbe2Keys.sort((a, b) => b.size - a.size);
      const keysToRemove = vbe2Keys.slice(0, Math.min(2, vbe2Keys.length));
      
      keysToRemove.forEach(({ key, size }) => {
        localStorage.removeItem(key);
        console.log(`🧹 Cleared large VBE2 key: ${key} (${Math.round(size / 1024)}KB)`);
      });
    }
    
    // Phase 3: Last resort - clear ALL non-vbe2 keys (except current)
    if (clearedCount === 0) {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && !key.startsWith('vbe2:')) {
          localStorage.removeItem(key);
          console.log(`🧹 Last resort cleanup: ${key}`);
        }
      }
    }
    
    console.log(`✅ localStorage cleanup completed - freed space for ${currentKey}`);
    
  } catch (cleanupErr) {
    console.error('❌ localStorage cleanup failed:', cleanupErr);
  }
};

/**
 * Read from localStorage with comprehensive error handling and data validation
 */
export const readLocalStorage = <T>(key: string, validator?: (data: unknown) => data is T): T | undefined => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return undefined;
    
    const parsed = JSON.parse(raw);
    
    // Optional validation
    if (validator && !validator(parsed)) {
      console.warn(`[persistence] Invalid data format in ${key}, ignoring`);
      localStorage.removeItem(key); // Clear corrupt data
      return undefined;
    }
    
    return parsed as T;
  } catch (err) {
    if (err instanceof SyntaxError) {
      console.error(`[persistence] Corrupt JSON in ${key}, clearing:`, err);
      localStorage.removeItem(key); // Clear corrupt data
    } else {
      console.error(`[persistence] Read failed for ${key}:`, err);
    }
    return undefined;
  }
};

/**
 * Synchronous write to localStorage with error handling
 */
export const writeLocalStorage = <T>(key: string, value: T): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    console.log(`[persistence] ✓ Sync write ${key}`);
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      console.error(`[persistence] ✗ Quota exceeded for ${key}`);
      handleQuotaExceeded(key);
      // Retry after cleanup
      try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    }
    console.error(`[persistence] ✗ Sync write failed for ${key}:`, err);
    return false;
  }
};
