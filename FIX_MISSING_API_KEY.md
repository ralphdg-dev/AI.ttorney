# Fix: Missing API Key in Supabase Requests

## Problem Identified ✅

The **real issue** causing 406 errors:

```
"No API key found in request"
"No `apikey` request header or url param was found."
```

The Supabase client was **not sending the API key** in request headers!

## Root Cause

The Supabase JS client sometimes doesn't automatically include the `apikey` and `Authorization` headers in all requests, especially:

- After client resets
- On initial page load
- When using singleton pattern
- In certain query types (like `.single()`)

## Solution Applied

Modified `/client/config/supabase.ts` to **explicitly set headers**:

```typescript
global: {
  headers: {
    'X-Client-Info': 'ai-ttorney-app',
    'apikey': supabaseAnonKey,              // ✅ Explicitly set
    'Authorization': `Bearer ${supabaseAnonKey}`, // ✅ Explicitly set
  },
}
```

### What Changed:

**Before:**

```typescript
global: {
  headers: {
    'X-Client-Info': 'ai-ttorney-app',
  },
}
```

❌ Missing `apikey` and `Authorization` headers

**After:**

```typescript
global: {
  headers: {
    'X-Client-Info': 'ai-ttorney-app',
    'apikey': supabaseAnonKey,
    'Authorization': `Bearer ${supabaseAnonKey}`,
  },
}
```

✅ All required headers present

## Additional Improvements

1. **Added validation** - Checks if credentials exist before creating client
2. **Added logging** - Shows when client is created and if credentials are missing
3. **Better error handling** - Throws clear error if credentials are missing

## What to Do Now

### Step 1: Restart the Development Server

The Supabase client is created once on app start, so you need to restart:

```bash
# Stop the current dev server (Ctrl+C)
# Then restart:
npm start
# or
expo start
```

### Step 2: Clear Browser Cache

```javascript
// In browser console (F12):
localStorage.clear();
sessionStorage.clear();

// Then hard refresh:
// Mac: Cmd + Shift + R
// Windows: Ctrl + Shift + R
```

### Step 3: Test

1. Sign in as lawyer
2. Go to profile page or forum
3. Check console for:
   ```
   🔧 Creating Supabase client with URL: https://...
   ✅ Supabase client created successfully
   ```
4. Verify no 406 errors

## Expected Results

### Before Fix:

```
❌ GET /lawyer_info → 406 (Not Acceptable)
❌ Error: "No API key found in request"
❌ Profile fails to load
❌ Forum redirects to home
```

### After Fix:

```
✅ GET /lawyer_info → 200 OK
✅ Headers include apikey and Authorization
✅ Profile loads successfully
✅ Forum stays stable
```

## Why This Happened

The Supabase JS client **should** automatically include these headers, but:

1. **Singleton pattern** - Creating client once might miss header injection
2. **Client reset** - After `resetSupabaseClient()`, headers might not be re-added
3. **Supabase JS version** - Some versions have bugs with header management
4. **Configuration timing** - Headers might not be set if client is created too early

## Verification

After restarting, check the Network tab in browser DevTools:

**Look for requests to:**

```
GET https://vmlbrckrlgwlobhnpstx.supabase.co/rest/v1/lawyer_info
```

**Headers should include:**

```
apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

If these headers are present → ✅ Fix worked!

## Related Issues Fixed

This should also fix:

- ✅ Lawyer profile not loading
- ✅ Forum page redirecting to home
- ✅ Lawyer directory showing empty
- ✅ Consultation requests failing
- ✅ Any other 406 errors from Supabase

## Status

✅ **Fix applied to code**
⏳ **Waiting for dev server restart**
⏳ **Waiting for browser cache clear**
⏳ **Waiting for test results**

**Next:** Restart dev server, clear cache, and test!
