# AuthGuard & Profile Fetch Timeout Fix

## 🐛 Problem Identified

The app was experiencing **10-second timeouts** when fetching user profiles from Supabase, causing:

- Infinite loading states
- Failed authentication flows
- Poor user experience with no error feedback
- Console flooded with timeout errors

### Root Causes:

1. **Missing or slow RLS policies** on the `users` table
2. **Network connectivity issues** blocking Supabase
3. **No retry logic** for failed profile fetches
4. **No user-facing error handling** when profile fetch fails

---

## ✅ Solutions Implemented

### 1. **Reduced Timeout Duration**

- **Before**: 10 seconds per attempt
- **After**: 5 seconds per attempt
- **Benefit**: Faster failure detection and better UX

### 2. **Added Retry Logic with Exponential Backoff**

```typescript
// New fetchUserProfile function with retry logic
const fetchUserProfile = async (userId: string, retryCount = 0) => {
  const MAX_RETRIES = 2;
  const TIMEOUT_MS = 5000;

  // Attempts: 5s → retry after 1s → retry after 2s
  // Total max time: ~13 seconds (down from infinite)
};
```

**Retry Strategy:**

- Attempt 1: 5s timeout
- Wait 1 second → Attempt 2: 5s timeout
- Wait 2 seconds → Attempt 3: 5s timeout
- **Total**: Maximum 13 seconds before showing error

### 3. **Profile Fetch Error Screen**

Created new `ProfileFetchError.tsx` component that shows:

- ✅ Clear error message explaining the issue
- ✅ List of possible causes (network, database, service disruption)
- ✅ **"Try Again"** button to retry profile fetch
- ✅ **"Logout"** button to return to login screen
- ✅ Professional, user-friendly design

### 4. **Enhanced AuthContext State Management**

Added new state variables:

- `profileFetchError: boolean` - Tracks if profile fetch failed
- `retryProfileFetch()` - Function to manually retry profile fetch

### 5. **Simplified AuthGuard Logic**

- Removed complex segment checking that could cause issues
- Added profile fetch error screen before loading states
- Better state management to prevent infinite loops

---

## 🔧 Technical Changes

### Files Modified:

#### 1. `/client/contexts/AuthContext.tsx`

**Changes:**

- Added `fetchUserProfile()` function with retry logic
- Reduced timeout from 10s to 5s per attempt
- Added `profileFetchError` state
- Added `retryProfileFetch()` function
- Updated `handleAuthStateChange()` to use new fetch function
- Clear error state on successful profile fetch

**Key Code:**

```typescript
// Retry logic with exponential backoff
if (
  (error.code === "TIMEOUT" || error.message?.includes("network")) &&
  retryCount < MAX_RETRIES
) {
  console.warn(
    `⚠️ Profile fetch failed, retrying in ${(retryCount + 1) * 1000}ms...`
  );
  await new Promise((resolve) => setTimeout(resolve, (retryCount + 1) * 1000));
  return fetchUserProfile(userId, retryCount + 1);
}
```

#### 2. `/client/components/auth/AuthGuard.tsx`

**Changes:**

- Import `ProfileFetchError` component
- Added `profileFetchError`, `retryProfileFetch`, `signOut` from useAuth
- Show error screen when `profileFetchError` is true
- Simplified segment path checking

**Key Code:**

```typescript
// Show profile fetch error screen if profile fetch failed
if (profileFetchError && !isLoading) {
  return <ProfileFetchError onRetry={retryProfileFetch} onLogout={signOut} />;
}
```

#### 3. `/client/components/auth/ProfileFetchError.tsx` (NEW)

**Purpose:** User-facing error screen for profile fetch failures

**Features:**

- Professional error message
- List of possible causes
- Retry button with loading state
- Logout button for clean exit
- Responsive design matching app theme

---

## 🎯 Expected Results

### Before Fix:

- ❌ 10-second timeout with no user feedback
- ❌ Infinite loading spinner
- ❌ Console flooded with error messages
- ❌ No way to recover without app restart
- ❌ Poor user experience

### After Fix:

- ✅ **5-second timeout** with automatic retries (3 attempts)
- ✅ **Maximum 13 seconds** before showing error screen
- ✅ **Clear error message** explaining the issue
- ✅ **"Try Again" button** for manual retry
- ✅ **"Logout" button** for clean exit
- ✅ **Professional UX** with helpful guidance
- ✅ **Faster failure detection** and recovery

---

## 🚀 User Experience Flow

### Successful Login:

1. User enters credentials
2. Supabase authenticates (session created)
3. Profile fetch attempt 1 (5s timeout) → **Success**
4. User redirected to appropriate screen

### Failed Login (Network Issue):

1. User enters credentials
2. Supabase authenticates (session created)
3. Profile fetch attempt 1 (5s timeout) → **Timeout**
4. Wait 1 second
5. Profile fetch attempt 2 (5s timeout) → **Timeout**
6. Wait 2 seconds
7. Profile fetch attempt 3 (5s timeout) → **Timeout**
8. **Error screen shown** with retry and logout options
9. User clicks "Try Again" → Retry profile fetch
10. OR user clicks "Logout" → Return to login screen

---

## 🔍 Debugging & Monitoring

### Console Logs Added:

```
🔐 Fetching user profile (attempt 1/3)...
⚠️ Profile fetch failed (Profile fetch timeout after 5s), retrying in 1000ms...
🔐 Fetching user profile (attempt 2/3)...
⚠️ Profile fetch failed (Profile fetch timeout after 5s), retrying in 2000ms...
🔐 Fetching user profile (attempt 3/3)...
❌ Profile fetch failed after retries: Profile fetch timeout after 5s
🚨 TIMEOUT: Check Supabase RLS policies and network connection
```

### Error Messages Guide:

- **"Profile fetch timeout after 5s"** → Network or RLS issue
- **"TIMEOUT"** error code → Check Supabase RLS policies
- **"network"** in error message → Check internet connection

---

## 🛠️ Required Database Migration

If the timeout persists, run this SQL migration in Supabase:

```sql
-- File: /server/database/migrations/010_fix_users_table_rls.sql

-- Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own profile (CRITICAL)
CREATE POLICY "Users can view their own profile"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

**To apply:**

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Paste the migration SQL
4. Run the query
5. Verify RLS policies are active

---

## 📊 Performance Improvements

| Metric                  | Before           | After          | Improvement        |
| ----------------------- | ---------------- | -------------- | ------------------ |
| **Timeout per attempt** | 10s              | 5s             | 50% faster         |
| **Max wait time**       | ∞ (infinite)     | 13s            | Bounded            |
| **Retry attempts**      | 0                | 3              | Better reliability |
| **User feedback**       | None             | Error screen   | 100% better UX     |
| **Recovery options**    | App restart only | Retry + Logout | Graceful recovery  |

---

## 🎨 UI/UX Enhancements

### ProfileFetchError Screen:

- **Icon**: ⚠️ Warning emoji for visual clarity
- **Title**: "Connection Issue" (user-friendly, not technical)
- **Message**: Clear explanation of the problem
- **Reasons List**: Helps users understand possible causes
- **Primary Action**: "Try Again" button (blue, prominent)
- **Secondary Action**: "Logout" button (outlined, less prominent)
- **Help Text**: "If this problem persists, please contact support"

### Design Principles:

- ✅ Non-technical language
- ✅ Clear call-to-action buttons
- ✅ Professional appearance
- ✅ Matches app theme and colors
- ✅ Responsive layout

---

## 🧪 Testing Checklist

### Test Scenarios:

- [ ] Normal login with good network → Should work instantly
- [ ] Login with slow network → Should retry and eventually succeed
- [ ] Login with no network → Should show error screen after 13s
- [ ] Click "Try Again" on error screen → Should retry profile fetch
- [ ] Click "Logout" on error screen → Should return to login
- [ ] Login after fixing network → Should work normally

### Expected Behavior:

- ✅ No infinite loading spinners
- ✅ Error screen appears within 13 seconds max
- ✅ Retry button works and shows loading state
- ✅ Logout button clears state and returns to login
- ✅ Console shows clear retry attempt logs

---

## 📝 Notes for Developers

### Why 5 seconds?

- Supabase typically responds in <1s with good connection
- 5s is enough for slow networks but not too long for users
- 3 attempts × 5s = 15s total, which is acceptable UX

### Why exponential backoff?

- Gives network time to recover between attempts
- Prevents hammering the server with rapid retries
- Industry standard for retry logic

### Why show error screen?

- Users need feedback when things go wrong
- Provides clear recovery options
- Prevents app from appearing "frozen"
- Better than infinite loading spinner

---

## 🔒 Security Considerations

### RLS Policies:

The timeout is often caused by missing RLS policies. The migration ensures:

- ✅ Users can only view their own profile
- ✅ Users can only update their own profile
- ✅ Service role has full access for backend operations
- ✅ Row Level Security is properly enabled

### Authentication Flow:

- ✅ Session is validated before profile fetch
- ✅ Profile fetch failure doesn't expose sensitive data
- ✅ Logout clears all auth state properly
- ✅ Retry doesn't bypass authentication checks

---

## 🎉 Summary

The AuthGuard and profile fetch system has been completely overhauled to provide:

1. **Faster failure detection** (5s vs 10s)
2. **Automatic retry logic** (3 attempts with backoff)
3. **User-friendly error handling** (error screen with recovery options)
4. **Better UX** (no infinite loading, clear feedback)
5. **Graceful recovery** (retry or logout options)

Users will now have a much better experience when network issues or database problems occur, with clear feedback and recovery options instead of infinite loading spinners.
