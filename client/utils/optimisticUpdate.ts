// Optimistic UI utilities (Facebook/Twitter pattern)

export interface OptimisticUpdateOptions<T> {
  optimisticData: T;
  rollbackData: T;
  updateFn: () => Promise<void>;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

// Execute optimistic update with auto-rollback on failure
export async function optimisticUpdate<T>(
  setState: (data: T) => void,
  options: OptimisticUpdateOptions<T>
): Promise<boolean> {
  const { optimisticData, rollbackData, updateFn, onSuccess, onError } = options;
  setState(optimisticData);

  try {
    await updateFn();
    onSuccess?.();
    return true;
  } catch (error) {
    setState(rollbackData);
    onError?.(error);
    return false;
  }
}

// Array operations for instant UI feedback
export const optimisticArray = {
  add: <T extends { id: string }>(arr: T[], item: T): T[] => [item, ...arr],
  remove: <T extends { id: string }>(arr: T[], itemId: string): T[] => arr.filter(i => i.id !== itemId),
  update: <T extends { id: string }>(arr: T[], itemId: string, updates: Partial<T>): T[] => 
    arr.map(i => i.id === itemId ? { ...i, ...updates } : i),
  toggle: <T extends { id: string }>(arr: T[], itemId: string, key: keyof T): T[] => 
    arr.map(i => i.id === itemId ? { ...i, [key]: !i[key] } : i),
};

// Debounced updates for rapid changes
export function createDebouncedOptimistic(delay = 300) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let pendingUpdate: (() => Promise<void>) | null = null;

  return <T>(setState: (data: T) => void, options: OptimisticUpdateOptions<T>) => {
    setState(options.optimisticData);
    if (timeoutId) clearTimeout(timeoutId);
    pendingUpdate = options.updateFn;

    timeoutId = setTimeout(async () => {
      if (pendingUpdate) {
        try {
          await pendingUpdate();
          options.onSuccess?.();
        } catch (error) {
          setState(options.rollbackData);
          options.onError?.(error);
        }
        pendingUpdate = null;
      }
    }, delay);
  };
}

// Batch multiple updates
export class OptimisticBatch {
  private updates: (() => void)[] = [];
  private rollbacks: (() => void)[] = [];

  add(update: () => void, rollback: () => void): void {
    this.updates.push(update);
    this.rollbacks.push(rollback);
  }

  async execute(syncFn: () => Promise<void>): Promise<boolean> {
    this.updates.forEach(u => u());
    try {
      await syncFn();
      return true;
    } catch {
      this.rollbacks.forEach(r => r());
      return false;
    }
  }
}
