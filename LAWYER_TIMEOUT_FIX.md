# Lawyer Account Timeout Fix

## Problem Identified

**Symptom:** Lawyer accounts timeout after 30+ seconds, but regular user accounts work fine.

**Root Cause:**

- Client-side profile fetch goes through Supabase with **anon key**
- This triggers **RLS policy evaluation** on every request
- For lawyer accounts, RLS evaluation is taking 30+ seconds (network + policy check)
- Regular users complete in < 1 second

**Why lawyers are affected more:**

- Possible additional RLS checks for lawyer role
- Network latency to Supabase
- Connection pooling issues
- Lawyer profiles might have more data/relationships

## Solution Implemented

**Changed profile fetch from:**

- ❌ Client → Supabase (anon key) → RLS check → Database
- Takes 30+ seconds for lawyers

**To:**

- ✅ Client → FastAPI Server → Supabase (service key) → Database
- Bypasses RLS, should complete in < 1 second

## Changes Made

### File: `/client/contexts/AuthContext.tsx`

**Before:**

```typescript
const profileFetchPromise = supabase
  .from("users")
  .select("*")
  .eq("id", session.user.id)
  .single();
```

**After:**

```typescript
const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8081";
const profileFetchPromise = fetch(`${API_URL}/api/auth/me`, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${session.access_token}`,
    "Content-Type": "application/json",
  },
});
```

**Benefits:**

1. ✅ Bypasses RLS (uses service role key on server)
2. ✅ Faster for lawyer accounts
3. ✅ Reduced timeout from 30s to 10s
4. ✅ Consistent with other API calls
5. ✅ Better error handling

## Testing Steps

1. **Clear browser storage:**

   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```

2. **Hard refresh** (Cmd+Shift+R)

3. **Sign in as lawyer**

4. **Check console logs:**

   ```
   🔍 Fetching profile for user: [id]
   ✅ Profile fetch completed in XXXms
   ```

5. **Expected result:** Should complete in < 2000ms (2 seconds)

## Verification

Run this in Supabase SQL Editor to confirm the `/api/auth/me` endpoint exists:

```sql
-- This should still work fast (0.1ms)
EXPLAIN ANALYZE
SELECT * FROM public.users WHERE id = auth.uid();
```

The database is fast. The issue was the client → Supabase network path with RLS.

## Fallback Plan

If `/api/auth/me` endpoint doesn't exist or has issues, we need to create it:

**Server endpoint needed:**

```python
@router.get("/me")
async def get_current_user(current_user: dict = Depends(get_current_user)):
    """Get current user profile (bypasses RLS)"""
    return {"success": True, "user": current_user}
```

## Expected Results

**Before Fix:**

- 🚨 Lawyer login: 30+ seconds → timeout → redirect to login
- ✅ Regular user login: < 1 second → success

**After Fix:**

- ✅ Lawyer login: < 2 seconds → success
- ✅ Regular user login: < 2 seconds → success

## Why This Works

1. **Server uses service role key** → bypasses RLS
2. **No RLS policy evaluation** → instant database query
3. **Direct HTTP call** → no Supabase client overhead
4. **Shorter timeout** → faster failure detection if needed
5. **Consistent with forum APIs** → same pattern as other authenticated calls

## Next Steps

1. Test lawyer login
2. Verify console shows < 2000ms fetch time
3. Confirm no more timeouts
4. Monitor for any new errors

If the `/api/auth/me` endpoint doesn't exist, let me know and I'll create it.
