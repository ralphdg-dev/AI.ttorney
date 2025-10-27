# Localhost Problem Fix Guide

## Problem
When you run the EAS-built APK on a real device, it tries to connect to `localhost` or `127.0.0.1`, which doesn't work because:
- `localhost` refers to the device itself, not your development machine
- The APK is a standalone build that doesn't have access to your local development server

## Root Cause
The `EXPO_PUBLIC_API_URL` environment variable was not configured in:
1. `.env.development` file
2. `eas.json` build profiles

## Solution Options

### Option 1: Deploy Backend to Cloud (RECOMMENDED for Production)
Deploy your FastAPI backend to a cloud service:

**Recommended Services:**
- **Railway.app** (Easiest, free tier available)
- **Render.com** (Free tier, auto-deploy from GitHub)
- **Fly.io** (Free tier, good for Python apps)
- **Google Cloud Run** (Pay-as-you-go)
- **AWS EC2** (More complex, full control)

**Steps:**
1. Deploy backend to chosen service
2. Get the public URL (e.g., `https://your-app.railway.app`)
3. Update `eas.json` with the URL:
   ```json
   "env": {
     "EXPO_PUBLIC_API_URL": "https://your-app.railway.app"
   }
   ```
4. Rebuild with `npm run build:dev`

### Option 2: Use ngrok for Testing (Quick Testing Only)
For temporary testing with your local backend:

**Steps:**
1. Install ngrok: `brew install ngrok` (Mac) or download from ngrok.com
2. Start your backend server: `cd server && uvicorn main:app --host 0.0.0.0 --port 8000`
3. In another terminal: `ngrok http 8000`
4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
5. Update `eas.json`:
   ```json
   "env": {
     "EXPO_PUBLIC_API_URL": "https://abc123.ngrok.io"
   }
   ```
6. Rebuild with `npm run build:dev`

**⚠️ Limitations:**
- ngrok URLs change every time you restart (free tier)
- Not suitable for production
- Requires your computer to be running

### Option 3: Use Local Network IP (Development Only)
For testing on devices connected to the same WiFi:

**Steps:**
1. Find your computer's local IP:
   - Mac: `ipconfig getifaddr en0`
   - Windows: `ipconfig` (look for IPv4)
   - Linux: `ip addr show`

2. Start backend with: `uvicorn main:app --host 0.0.0.0 --port 8000`

3. Update `eas.json`:
   ```json
   "env": {
     "EXPO_PUBLIC_API_URL": "http://192.168.1.XXX:8000"
   }
   ```
   (Replace XXX with your actual IP)

4. Rebuild with `npm run build:dev`

**⚠️ Limitations:**
- Only works on same WiFi network
- IP may change when you reconnect to WiFi
- Not accessible outside your network
- HTTP (not HTTPS) - some features may not work

## What I've Already Fixed

### 1. Added EXPO_PUBLIC_API_URL to .env.development
```bash
# Added to /client/.env.development
EXPO_PUBLIC_API_URL=https://your-backend-url.com
```

### 2. Updated eas.json with Environment Variables
All build profiles now include `EXPO_PUBLIC_API_URL`:
- `development` profile: Line 13
- `preview` profile: Line 24
- `production` profile: Line 35

### 3. How the App Uses This
The app checks for `EXPO_PUBLIC_API_URL` in this order:
1. If `EXPO_PUBLIC_API_URL` is set → use it (production/APK builds)
2. If in development mode → auto-detect from Expo manifest
3. Fallback → localhost (only works in Expo Go)

See `/client/utils/networkConfig.ts` lines 27-36

## Next Steps

**You MUST do ONE of the following:**

1. **For Production Testing:**
   - Deploy backend to Railway/Render/Fly.io
   - Update `eas.json` with the public URL
   - Rebuild APK

2. **For Quick Testing:**
   - Use ngrok to expose local backend
   - Update `eas.json` with ngrok URL
   - Rebuild APK

3. **For Local Network Testing:**
   - Find your local IP address
   - Update `eas.json` with `http://YOUR_IP:8000`
   - Rebuild APK

## Rebuild Command
After updating the URL in `eas.json`:
```bash
cd client
npm run build:dev
```

## Verify the Fix
After rebuilding, check the build logs for:
```
Environment variables loaded from the "development" build profile "env" configuration: 
APP_ENV, EXPO_PUBLIC_API_URL
```

The `EXPO_PUBLIC_API_URL` should be listed there.

## Common Mistakes to Avoid
❌ Using `localhost` or `127.0.0.1` in APK builds
❌ Using `http://` for production (use `https://`)
❌ Forgetting to rebuild after changing `eas.json`
❌ Using ngrok URLs in production builds
❌ Not starting backend server when using ngrok/local IP

## Backend Deployment Guide (Railway - Recommended)

### Why Railway?
- ✅ Free tier available
- ✅ Auto-deploy from GitHub
- ✅ Built-in PostgreSQL/Redis
- ✅ Automatic HTTPS
- ✅ Easy environment variables
- ✅ Python/FastAPI support

### Steps:
1. Create account at railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your AI.ttorney repository
4. Railway auto-detects FastAPI
5. Add environment variables from `/server/.env`
6. Deploy!
7. Copy the public URL (e.g., `https://aittorney-production.up.railway.app`)
8. Update `eas.json` with this URL
9. Rebuild APK

## Testing Checklist
After fixing and rebuilding:
- [ ] APK installs successfully
- [ ] App opens without crashing
- [ ] Login works
- [ ] Can fetch data from backend
- [ ] Chatbot responds
- [ ] No "Network Error" or "Connection Failed" messages

## Need Help?
Check the logs:
```bash
# EAS build logs
eas build:list

# App runtime logs (when connected via USB)
npx react-native log-android
```
