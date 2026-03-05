/**
 * Swap Execution Lock
 * Prevents double-click and concurrent execution
 */

export class SwapExecutionLock {
  private locks: Map<string, boolean> = new Map();
  
  /**
   * Acquire lock for a specific user+pair
   */
  acquire(userId: string, pair: string): boolean {
    const key = `${userId}:${pair}`;
    
    if (this.locks.get(key)) {
      return false; // Already locked
    }
    
    this.locks.set(key, true);
    return true;
  }
  
  /**
   * Release lock
   */
  release(userId: string, pair: string): void {
    const key = `${userId}:${pair}`;
    this.locks.delete(key);
  }
  
  /**
   * Execute with automatic lock/unlock
   */
  async execute<T>(
    userId: string,
    pair: string,
    fn: () => Promise<T>
  ): Promise<T> {
    if (!this.acquire(userId, pair)) {
      throw new Error('DOUBLE_EXECUTION');
    }
    
    try {
      return await fn();
    } finally {
      this.release(userId, pair);
    }
  }
  
  /**
   * Check if locked
   */
  isLocked(userId: string, pair: string): boolean {
    const key = `${userId}:${pair}`;
    return this.locks.get(key) || false;
  }
}

export const swapLock = new SwapExecutionLock();
