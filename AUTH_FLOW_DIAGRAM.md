# Authentication Flow Diagram

## 🔄 New Profile Fetch Flow with Retry Logic

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER LOGS IN                              │
│                   (Email + Password)                             │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  SUPABASE AUTHENTICATION                         │
│              ✅ Session Created Successfully                     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│              FETCH USER PROFILE - ATTEMPT 1                      │
│                    (5 second timeout)                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
                    ▼                 ▼
            ┌───────────┐     ┌──────────────┐
            │  SUCCESS  │     │   TIMEOUT    │
            └─────┬─────┘     └──────┬───────┘
                  │                  │
                  │                  │ Wait 1 second
                  │                  ▼
                  │          ┌─────────────────────────────┐
                  │          │ FETCH USER PROFILE - ATTEMPT 2│
                  │          │    (5 second timeout)        │
                  │          └──────┬──────────────────────┘
                  │                 │
                  │        ┌────────┴────────┐
                  │        │                 │
                  │        ▼                 ▼
                  │  ┌───────────┐   ┌──────────────┐
                  │  │  SUCCESS  │   │   TIMEOUT    │
                  │  └─────┬─────┘   └──────┬───────┘
                  │        │                │
                  │        │                │ Wait 2 seconds
                  │        │                ▼
                  │        │        ┌─────────────────────────────┐
                  │        │        │ FETCH USER PROFILE - ATTEMPT 3│
                  │        │        │    (5 second timeout)        │
                  │        │        └──────┬──────────────────────┘
                  │        │               │
                  │        │      ┌────────┴────────┐
                  │        │      │                 │
                  │        │      ▼                 ▼
                  │        │ ┌───────────┐   ┌──────────────┐
                  │        │ │  SUCCESS  │   │   TIMEOUT    │
                  │        │ └─────┬─────┘   └──────┬───────┘
                  │        │       │                │
                  ▼        ▼       ▼                ▼
         ┌────────────────────────────┐   ┌─────────────────────┐
         │   PROFILE LOADED ✅        │   │  ALL RETRIES FAILED │
         │                            │   │         ❌          │
         └────────┬───────────────────┘   └──────────┬──────────┘
                  │                                   │
                  ▼                                   ▼
    ┌──────────────────────────┐        ┌───────────────────────────┐
    │  CHECK ACCOUNT STATUS    │        │  SHOW ERROR SCREEN        │
    │  - Banned?               │        │                           │
    │  - Deactivated?          │        │  ⚠️ Connection Issue      │
    │  - Suspended?            │        │                           │
    └────────┬─────────────────┘        │  Possible causes:         │
             │                           │  • Slow network           │
    ┌────────┴────────┐                 │  • Database issue         │
    │                 │                 │  • Service disruption     │
    ▼                 ▼                 │                           │
┌─────────┐    ┌──────────────┐        │  [Try Again] [Logout]     │
│ BANNED  │    │  DEACTIVATED │        └───────────┬───────────────┘
│ SCREEN  │    │    SCREEN    │                    │
└─────────┘    └──────────────┘           ┌────────┴────────┐
                                           │                 │
                                           ▼                 ▼
                                    ┌─────────────┐  ┌──────────────┐
                                    │ RETRY FETCH │  │    LOGOUT    │
                                    │  (Go back   │  │  (Return to  │
                                    │   to top)   │  │    login)    │
                                    └─────────────┘  └──────────────┘
```

---

## ⏱️ Timing Breakdown

### Successful Login (Good Network):

```
0s  ────► Login credentials submitted
0.5s ───► Supabase session created
1s  ────► Profile fetched successfully
1.5s ───► User redirected to home screen
```

**Total Time: ~1.5 seconds** ✅

---

### Failed Login (Slow Network - Eventually Succeeds):

```
0s  ────► Login credentials submitted
0.5s ───► Supabase session created
1s  ────► Profile fetch attempt 1 starts
6s  ────► Attempt 1 times out (5s timeout)
7s  ────► Attempt 2 starts (after 1s wait)
12s ────► Attempt 2 times out (5s timeout)
14s ────► Attempt 3 starts (after 2s wait)
16s ────► Attempt 3 succeeds!
16.5s ──► User redirected to home screen
```

**Total Time: ~16.5 seconds** ⚠️ (but eventually succeeds)

---

### Failed Login (No Network - Shows Error):

```
0s  ────► Login credentials submitted
0.5s ───► Supabase session created
1s  ────► Profile fetch attempt 1 starts
6s  ────► Attempt 1 times out (5s timeout)
7s  ────► Attempt 2 starts (after 1s wait)
12s ────► Attempt 2 times out (5s timeout)
14s ────► Attempt 3 starts (after 2s wait)
19s ────► Attempt 3 times out (5s timeout)
19s ────► ⚠️ ERROR SCREEN SHOWN
```

**Total Time: ~19 seconds** ❌ (but user gets clear feedback)

---

## 🎯 State Management Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    AuthContext State                          │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  isLoading: boolean                                          │
│  ├─ true  → Show loading spinner                            │
│  └─ false → Show content or error                           │
│                                                               │
│  initialAuthCheck: boolean                                   │
│  ├─ false → Still checking initial auth state               │
│  └─ true  → Initial check complete                          │
│                                                               │
│  profileFetchError: boolean  ⭐ NEW                          │
│  ├─ false → Normal flow                                     │
│  └─ true  → Show ProfileFetchError screen                   │
│                                                               │
│  isAuthenticated: boolean                                    │
│  ├─ true  → User has valid session + profile               │
│  └─ false → No session or profile                          │
│                                                               │
│  user: User | null                                           │
│  ├─ null  → No profile loaded                              │
│  └─ User  → Profile loaded successfully                     │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 🔄 AuthGuard Rendering Logic

```
┌─────────────────────────────────────────────────────────────┐
│                    AuthGuard Component                       │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ isSigningOut?  │
                    └────────┬───────┘
                             │
                    ┌────────┴────────┐
                    │ YES             │ NO
                    ▼                 ▼
            ┌──────────────┐   ┌─────────────────────┐
            │ Return null  │   │ Continue checks     │
            │ (skip all)   │   └──────────┬──────────┘
            └──────────────┘              │
                                          ▼
                                ┌──────────────────────┐
                                │ profileFetchError?   │
                                │ && !isLoading?       │
                                └──────────┬───────────┘
                                           │
                                  ┌────────┴────────┐
                                  │ YES             │ NO
                                  ▼                 ▼
                        ┌───────────────────┐  ┌──────────────┐
                        │ Show Error Screen │  │ isLoading?   │
                        │                   │  └──────┬───────┘
                        │  ⚠️ Connection    │         │
                        │     Issue         │  ┌──────┴──────┐
                        │                   │  │ YES         │ NO
                        │ [Try Again]       │  ▼             ▼
                        │ [Logout]          │ ┌──────┐  ┌─────────┐
                        └───────────────────┘ │Show  │  │Continue │
                                              │Loader│  │checks   │
                                              └──────┘  └────┬────┘
                                                             │
                                                             ▼
                                                    ┌─────────────────┐
                                                    │ Check banned?   │
                                                    │ Check deactivated?│
                                                    │ Check auth?     │
                                                    │ Check roles?    │
                                                    └────────┬────────┘
                                                             │
                                                    ┌────────┴────────┐
                                                    │ All checks pass │
                                                    ▼                 ▼
                                              ┌──────────┐    ┌──────────┐
                                              │ Redirect │    │  Render  │
                                              │ if needed│    │ children │
                                              └──────────┘    └──────────┘
```

---

## 🎨 User Experience Comparison

### ❌ OLD FLOW (Before Fix):

```
User logs in
    ↓
Loading spinner appears
    ↓
10 seconds pass... (user waiting)
    ↓
20 seconds pass... (user confused)
    ↓
30 seconds pass... (user frustrated)
    ↓
∞ Loading spinner never stops
    ↓
User force-closes app
```

**Result: Terrible UX, no feedback, infinite loading** 😞

---

### ✅ NEW FLOW (After Fix):

```
User logs in
    ↓
Loading spinner appears
    ↓
5 seconds pass... (retry attempt 1)
    ↓
"Retrying..." message (optional)
    ↓
5 seconds pass... (retry attempt 2)
    ↓
"Retrying..." message (optional)
    ↓
5 seconds pass... (retry attempt 3)
    ↓
Error screen appears with:
  ⚠️ Connection Issue
  • Possible causes listed
  • [Try Again] button
  • [Logout] button
    ↓
User clicks "Try Again"
    ↓
Profile fetch retries
    ↓
Success! → Redirected to home
```

**Result: Clear feedback, recovery options, bounded wait time** 😊

---

## 🛡️ Error Handling Matrix

| Scenario         | Old Behavior                   | New Behavior              |
| ---------------- | ------------------------------ | ------------------------- |
| **Good network** | ✅ Works (1-2s)                | ✅ Works (1-2s)           |
| **Slow network** | ❌ Timeout after 10s, no retry | ✅ Retries 3x, succeeds   |
| **No network**   | ❌ Infinite loading            | ✅ Error screen after 19s |
| **Missing RLS**  | ❌ Infinite loading            | ✅ Error screen after 19s |
| **User action**  | ❌ Must restart app            | ✅ Can retry or logout    |

---

## 📊 Success Metrics

### Before Fix:

- **Timeout**: 10 seconds per attempt
- **Retries**: 0
- **Max wait**: ∞ (infinite)
- **User feedback**: None
- **Recovery**: App restart only

### After Fix:

- **Timeout**: 5 seconds per attempt ⚡
- **Retries**: 3 attempts 🔄
- **Max wait**: 19 seconds ⏱️
- **User feedback**: Error screen with details 📱
- **Recovery**: Retry button + Logout button 🔧

---

## 🎯 Key Improvements

1. **⚡ 50% Faster Timeout** - 5s instead of 10s per attempt
2. **🔄 Automatic Retries** - 3 attempts with exponential backoff
3. **⏱️ Bounded Wait Time** - Maximum 19 seconds instead of infinite
4. **📱 User Feedback** - Clear error screen with explanations
5. **🔧 Recovery Options** - Retry or logout buttons
6. **🎨 Professional UX** - Polished error screen design
7. **📊 Better Logging** - Detailed console logs for debugging
8. **🛡️ Graceful Degradation** - App doesn't freeze or crash

---

## 🚀 Next Steps for Users

If you see the error screen:

1. **Check your internet connection** 📶

   - Try opening a website in your browser
   - Check if other apps can connect

2. **Click "Try Again"** 🔄

   - The app will retry fetching your profile
   - May succeed if network improved

3. **Click "Logout"** 🚪

   - Returns you to login screen
   - Clears any stuck state
   - Try logging in again

4. **Contact Support** 📧
   - If problem persists after multiple attempts
   - Provide screenshot of error screen
   - Mention approximate time of occurrence

---

## 🔧 For Developers

### Debug Checklist:

- [ ] Check Supabase RLS policies on `users` table
- [ ] Verify network connectivity to Supabase
- [ ] Check console logs for specific error codes
- [ ] Run SQL migration if RLS policies missing
- [ ] Test with different network conditions
- [ ] Verify timeout values are appropriate

### Console Log Format:

```
🔐 Fetching user profile (attempt 1/3)...
⚠️ Profile fetch failed (timeout), retrying in 1000ms...
🔐 Fetching user profile (attempt 2/3)...
⚠️ Profile fetch failed (timeout), retrying in 2000ms...
🔐 Fetching user profile (attempt 3/3)...
❌ Profile fetch failed after retries
🚨 TIMEOUT: Check Supabase RLS policies
```

This makes debugging much easier! 🎉
