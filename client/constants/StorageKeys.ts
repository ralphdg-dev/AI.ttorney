// Centralized storage key definitions
export const STORAGE_KEYS = {
  AUTH: 'ai-ttorney-auth',
  USER_SESSION: 'userSession',
  USER_PROFILE: 'userProfile',
  SUPABASE_TOKEN: 'supabase.auth.token',
} as const;

export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
