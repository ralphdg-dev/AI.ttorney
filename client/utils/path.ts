export function normalizePath(path: string | undefined | null): string {
  if (!path) return '/';
  try {
    // Remove protocol and domain if accidentally passed
    const stripped = path.replace(/^https?:\/\/[^/]+/, '');
    // Remove any base path prefix if set via PUBLIC_URL or BASENAME (common in web hosting)
    const base = (process.env.PUBLIC_URL || process.env.BASENAME || '').replace(/\/*$/, '');
    const withoutBase = base && stripped.startsWith(base) ? stripped.slice(base.length) || '/' : stripped;
    // Ensure leading slash, remove repeated slashes, drop trailing slash (except root)
    let normalized = withoutBase.replace(/\/+/, '/');
    if (!normalized.startsWith('/')) normalized = '/' + normalized;
    if (normalized.length > 1 && normalized.endsWith('/')) normalized = normalized.slice(0, -1);
    return normalized;
  } catch {
    return '/';
  }
}
