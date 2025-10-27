# 🚀 Quick Fix for Localhost Problem

## The Problem
Your APK tries to connect to `localhost` which doesn't work on real devices.

## The Solution (Choose ONE)

### Option 1: Quick Test with ngrok (5 minutes)
```bash
# Terminal 1: Start backend
cd server
uvicorn main:app --host 0.0.0.0 --port 8000

# Terminal 2: Expose with ngrok
ngrok http 8000
# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)

# Terminal 3: Configure and build
cd client
npm run setup-backend
# Choose option 2, paste ngrok URL
npm run build:dev
```

### Option 2: Deploy to Railway (20 minutes, RECOMMENDED)
```bash
# 1. Go to railway.app and sign up
# 2. Click "New Project" → "Deploy from GitHub"
# 3. Select AI.ttorney repository
# 4. Add environment variables from server/.env
# 5. Deploy and copy URL (e.g., https://aittorney.up.railway.app)

# 6. Configure and build
cd client
npm run setup-backend
# Choose option 1, paste Railway URL
npm run build:dev
```

### Option 3: Local Network (Same WiFi only)
```bash
# Find your IP
ipconfig getifaddr en0  # Mac
# or ipconfig (Windows)
# or ip addr show (Linux)

# Start backend
cd server
uvicorn main:app --host 0.0.0.0 --port 8000

# Configure and build
cd client
npm run setup-backend
# Choose option 3, enter your IP
npm run build:dev
```

## What Was Fixed

✅ Added `EXPO_PUBLIC_API_URL` to `eas.json`
✅ Created setup script for easy configuration
✅ Updated all build profiles (dev, preview, production)
✅ Added validation to prevent future import errors

## Files Changed

1. `/client/eas.json` - Added API URL to all build profiles
2. `/client/.env.development` - Added EXPO_PUBLIC_API_URL
3. `/client/scripts/setup-backend-url.sh` - Interactive setup script
4. `/client/package.json` - Added `setup-backend` command

## Verify It Works

After rebuilding and installing the APK:
1. Open the app
2. Try to login
3. Check if chatbot responds
4. No "Network Error" should appear

## Need Help?

Read the full guide: `/LOCALHOST_FIX_GUIDE.md`
