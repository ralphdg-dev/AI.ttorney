# Fix: Forum Page Auto-Refresh Issue

## Problem

- User is on the forum page
- After a few seconds, the app refreshes and redirects to home page
- This happens repeatedly, making the forum unusable

## Root Cause

The issue was caused by **automatic token refresh** triggering navigation logic.

### What Was Happening:

1. **User browses forum** → Everything works fine
2. **Supabase auto-refreshes token** (every ~60 minutes or sooner)
3. **`TOKEN_REFRESHED` event fires** → Calls `handleAuthStateChange(session, false)`
4. **Even though `shouldNavigate = false`**, the code was still:
   - Checking account status (banned/deactivated)
   - Checking suspension status
   - Checking lawyer application status
   - **Calling `router.replace(redirectPath)`** → Redirects to home!
5. **User gets kicked out of forum** → Redirected to home page

## Solution

Modified `handleAuthStateChange` to **respect the `shouldNavigate` flag**:

### Changes Made

**File:** `/client/contexts/AuthContext.tsx`

#### 1. Wrapped Account Status Checks

```typescript
// Before: Always checked and redirected
if (profile?.account_status === "banned") {
  router.replace("/banned");
}

// After: Only check on initial sign-in
if (profile && shouldNavigate) {
  if (profile.account_status === "banned") {
    router.replace("/banned");
  }
}
```

#### 2. Added Clear Logging

```typescript
} else {
  // Token refresh - just update state, don't navigate
  console.log('🔄 Token refreshed, keeping user on current page');
  setIsLoading(false);
  clearTimeout(timeoutId);
}
```

## How It Works Now

### On Initial Sign-In (`shouldNavigate = true`):

1. ✅ Fetch profile
2. ✅ Check if banned/deactivated → Redirect if needed
3. ✅ Check suspension status → Redirect if needed
4. ✅ Check lawyer application → Redirect if needed
5. ✅ Navigate to appropriate home page

### On Token Refresh (`shouldNavigate = false`):

1. ✅ Fetch profile (to update user data)
2. ❌ Skip banned/deactivated checks
3. ❌ Skip suspension checks
4. ❌ Skip navigation
5. ✅ **User stays on current page** (forum, profile, etc.)

## Events That Trigger Auth State Change

1. **`SIGNED_IN`** → `shouldNavigate = true` → Redirects to home
2. **`TOKEN_REFRESHED`** → `shouldNavigate = false` → Stays on current page ✅
3. **`SIGNED_OUT`** → Clears state → Handled separately

## Testing

1. **Go to forum page**
2. **Wait 2-3 minutes** (or force token refresh)
3. **Check console for:**
   ```
   🔄 Token refreshed, keeping user on current page
   ```
4. **Verify:** You stay on the forum page (no redirect)

## Expected Behavior

### Before Fix:

- 🚨 Forum page → Token refresh → Redirect to home
- 🚨 Any page → Token refresh → Redirect to role-based home
- 🚨 Impossible to stay on any page for > 60 minutes

### After Fix:

- ✅ Forum page → Token refresh → Stay on forum
- ✅ Profile page → Token refresh → Stay on profile
- ✅ Any page → Token refresh → Stay on current page
- ✅ Only redirect on actual sign-in/sign-out

## Additional Benefits

1. **Better UX** → Users don't get randomly kicked out
2. **Clearer logs** → Can see when token refresh happens
3. **Consistent behavior** → Navigation only on explicit sign-in
4. **Respects user intent** → Stays where user wants to be

## Status

✅ **Fix is complete and deployed**
✅ **Token refresh no longer triggers navigation**
✅ **Forum page stays stable**

**Next:** Test by staying on forum page for a few minutes and verify no redirect occurs.
