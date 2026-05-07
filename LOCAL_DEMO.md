# AI.ttorney Local Demo

This setup runs the app servers on your machine while still using the existing managed services:

- Supabase cloud for auth, storage, and database
- OpenAI for chat responses
- Google APIs for maps and chatbot web search

That is the right demo target for now. A fully offline demo would require a local Supabase stack, seeded data, local object storage, and mock/stub replacements for paid APIs.

## Ports

| Service | Port | URL |
| --- | ---: | --- |
| Main FastAPI backend | 8000 | http://localhost:8000 |
| Admin Express API | 5001 | http://localhost:5001 |
| Admin React UI | 3000 | http://localhost:3000 |
| Expo client web | Expo-selected | shown by Expo |

## One-command Web Demo

From the repo root:

```bash
bash scripts/local-demo.sh
```

This starts:

- FastAPI backend on port 8000
- Admin API on port 5001
- Admin UI on port 3000
- Expo web client pointed at `http://localhost:8000`

Stop everything with `Ctrl+C`.

If the script reports missing dependencies, install them once:

```bash
npm --prefix client install
npm --prefix admin install
npm --prefix admin/server install
.venv/bin/pip install -r server/requirements.txt
```

## Separate Terminals

Use this when you want cleaner logs.

Terminal 1:

```bash
bash scripts/local-demo.sh api
```

Terminal 2:

```bash
bash scripts/local-demo.sh admin-api
```

Terminal 3:

```bash
bash scripts/local-demo.sh admin-ui
```

Terminal 4:

```bash
bash scripts/local-demo.sh client-web
```

## Android Studio Emulator

Start the API first:

```bash
bash scripts/local-demo.sh api
```

Then, with your Android Studio emulator already running:

```bash
bash scripts/local-demo.sh android
```

The Android emulator cannot reach your Mac at `localhost`, so the Android script points Expo at `http://10.0.2.2:8000`. You can also run this directly:

```bash
cd client
npm run android:local
```

## Mobile Device Demo

If you scan the Expo QR code on a physical phone, the phone cannot call `localhost` on your laptop. Use your laptop LAN IP.

Find your Mac IP:

```bash
ipconfig getifaddr en0
```

Then start the client with:

```bash
CLIENT_API_URL=http://YOUR_MAC_IP:8000 bash scripts/local-demo.sh client
```

For Android emulator, use:

```bash
CLIENT_API_URL=http://10.0.2.2:8000 bash scripts/local-demo.sh client
```

For iOS simulator or web browser, `http://localhost:8000` is fine.

## Health Checks

Main backend:

```bash
curl http://localhost:8000/health
```

Admin API:

```bash
curl http://localhost:5001/health
```

## Important Local Notes

- `client/.env` currently points `EXPO_PUBLIC_API_URL` at Railway. The script overrides it at process startup, so you do not need to edit secrets.
- If you run Expo manually for web or iOS simulator, set `EXPO_PUBLIC_API_URL=http://localhost:8000` before starting it, then restart Metro.
- If you run Expo manually for the Android Studio emulator, set `EXPO_PUBLIC_API_URL=http://10.0.2.2:8000`.
- `server/.env` currently has `NODE_ENV=production`; the script overrides it to `development` so docs and local diagnostics are available.
- Keep the demo machine online. Supabase, OpenAI, and Google APIs are still remote dependencies.
- The admin React build succeeds with warnings. The Expo TypeScript build currently has pre-existing table ref typing errors unrelated to local networking.
