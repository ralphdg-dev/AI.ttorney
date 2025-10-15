interface CachedArticle {
  data: any;
  timestamp: number;
  expiresAt: number;
}

class ArticleCacheService {
  private cache = new Map<string, CachedArticle>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  set(articleId: string, data: any): void {
    const now = Date.now();
    this.cache.set(articleId, {
      data,
      timestamp: now,
      expiresAt: now + this.CACHE_DURATION,
    });
  }

  get(articleId: string): any | null {
    const cached = this.cache.get(articleId);
    
    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(articleId);
      return null;
    }

    return cached.data;
  }

  clear(): void {
    this.cache.clear();
  }

  has(articleId: string): boolean {
    const cached = this.cache.get(articleId);
    return cached ? Date.now() <= cached.expiresAt : false;
  }

  size(): number {
    // Clean expired entries
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiresAt) {
        this.cache.delete(key);
      }
    }
    return this.cache.size;
  }
}

// Export singleton instance
export const articleCache = new ArticleCacheService();
