# Production Environment Variables for Railway Deployment

## Required Environment Variables

```bash
# Environment
NODE_ENV=production
HOST=0.0.0.0
PORT=8000
WORKERS=1
LOG_LEVEL=INFO

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key

# Security & CORS
ALLOWED_ORIGINS=https://yourapp.com,https://www.yourapp.com,https://your-railway-app.railway.app
ALLOWED_HOSTS=yourapp.com,*.railway.app,localhost,127.0.0.1
```

## Optional Environment Variables

```bash
# Email Configuration (for OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com

# Google OAuth (if enabling Google Sign-In)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Additional Services
REDIS_URL=redis://default:password@host:port
SENTRY_DSN=https://your-sentry-dsn
```

## Railway Deployment Steps

1. **Set Environment Variables** in Railway dashboard
2. **Add ALLOWED_ORIGINS** with your frontend domain
3. **Add ALLOWED_HOSTS** with your Railway domain
4. **Deploy** - Server will fail-fast if required vars are missing

## Security Features Applied

✅ **CORS Protection** - No wildcard origins in production
✅ **Rate Limiting** - Auth endpoints: 5-10 requests/minute
✅ **Environment Validation** - Fails at startup if vars missing
✅ **Security Headers** - HSTS, XSS protection, CSP
✅ **Trusted Host** - Prevents host header attacks
✅ **Production Logging** - No sensitive headers logged
