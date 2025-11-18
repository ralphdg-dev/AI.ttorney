# Debug: Forum Page Refresh Issue

## What I've Added

Added detailed logging to track what's causing the redirect:

### 1. When Auth State Changes

```
🔄 handleAuthStateChange called - shouldNavigate: true/false, current path: /lawyer/forum
```

### 2. When Navigation Happens

```
🚀 Navigating to: /lawyer (role: verified_lawyer)
```

### 3. When Token Refreshes (No Navigation)

```
🔄 Token refreshed, keeping user on current page
```

## What to Check

1. **Open browser console** (F12)
2. **Go to forum page** (`/lawyer/forum`)
3. **Wait for the redirect to happen**
4. **Look for these logs:**

### If you see:

```
🔄 handleAuthStateChange called - shouldNavigate: true, current path: /lawyer/forum
🚀 Navigating to: /lawyer (role: verified_lawyer)
```

**Problem:** Something is calling `handleAuthStateChange` with `shouldNavigate = true`

### If you see:

```
🔄 handleAuthStateChange called - shouldNavigate: false, current path: /lawyer/forum
🔄 Token refreshed, keeping user on current page
```

**Good:** Token refresh is working correctly, no navigation

### If you see multiple rapid calls:

```
🔄 handleAuthStateChange called - shouldNavigate: true, current path: /lawyer/forum
🔄 handleAuthStateChange called - shouldNavigate: true, current path: /lawyer/forum
🔄 handleAuthStateChange called - shouldNavigate: true, current path: /lawyer/forum
```

**Problem:** Auth state is being triggered repeatedly

## Possible Causes

### 1. SIGNED_IN Event Firing Repeatedly

If you see `shouldNavigate: true`, it means the `SIGNED_IN` event is firing when it shouldn't.

**Why this happens:**

- Supabase session is being re-established
- Something is calling `supabase.auth.signIn()` again
- Session storage is being cleared and restored

### 2. Profile Fetch Failing

If profile fetch fails, it might trigger sign-out and re-sign-in loop.

**Look for:**

```
❌ Profile fetch exception after XXX ms
```

### 3. AuthGuard Triggering Navigation

The AuthGuard might be detecting something wrong and redirecting.

**Look for:**

- No auth logs but still redirecting
- Means AuthGuard is doing it

## What to Share

Please share the **exact console output** when the redirect happens. Specifically:

1. All lines starting with 🔄
2. All lines starting with 🚀
3. Any error messages
4. The timing (how many seconds after loading the forum)

This will tell us exactly what's triggering the redirect.

## Quick Test

Try this in the browser console while on the forum page:

```javascript
// Monitor auth state changes
let authChangeCount = 0;
const originalLog = console.log;
console.log = function (...args) {
  if (args[0]?.includes("handleAuthStateChange")) {
    authChangeCount++;
    originalLog(`[${authChangeCount}]`, ...args);
  } else {
    originalLog(...args);
  }
};
```

This will number each auth state change so we can see if it's happening multiple times.
