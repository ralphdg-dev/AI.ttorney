# Server Deployment Checklist for Render

## ✅ Environment Variables to Set in Render

When deploying to Render, make sure to set these environment variables in your Render dashboard:

### Required Variables

```env
# Supabase Configuration
SUPABASE_URL=https://vmlbrckrlgwlobhnpstx.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# SMTP Configuration (for emails)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=aittorney.otp@gmail.com
SMTP_PASSWORD=your_smtp_password
FROM_EMAIL=aittorney.otp@gmail.com
FROM_NAME=AI.ttorney

# JWT Configuration
JWT_SECRET=ai_ttorney_admin_jwt_secret_2024_very_secure_key_32_chars
JWT_EXPIRES_IN=24h

# Server Configuration
PORT=5001
NODE_ENV=production
API_BASE_URL=https://ai-ttorney-admin-server.onrender.com

# CORS Configuration
FRONTEND_URL=https://ai-ttorney-admin.vercel.app

# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key
```

## 🔒 Security Notes

### 1. **NODE_ENV**
- **MUST** be set to `production` for deployment
- This enables:
  - ✅ Rate limiting (prevents abuse)
  - ✅ Proper CORS restrictions
  - ✅ Production logging
  - ✅ Secure error messages (no stack traces)

### 2. **CORS Configuration**
- Server now properly restricts origins in production
- Only allows requests from `FRONTEND_URL`
- Supports multiple origins (comma-separated): `https://domain1.com,https://domain2.com`

### 3. **Rate Limiting**
- **General API**: 1000 requests per 15 minutes per IP
- **Auth endpoints**: 1000 login attempts per 15 minutes per IP
- Automatically disabled in development mode

### 4. **JWT Secret**
- Use a strong, unique secret for production
- Minimum 32 characters recommended
- Never commit to version control

## 📋 Pre-Deployment Checklist

- [ ] All environment variables set in Render dashboard
- [ ] `NODE_ENV` set to `production`
- [ ] `FRONTEND_URL` matches your Vercel deployment URL
- [ ] `API_BASE_URL` matches your Render service URL
- [ ] SMTP credentials are correct and working
- [ ] Supabase credentials are correct
- [ ] JWT_SECRET is strong and unique
- [ ] OpenAI API key is valid (if using translation features)

## 🚀 Deployment Steps

1. **Push your code to Git:**
   ```bash
   git add .
   git commit -m "Configure for production deployment"
   git push origin main
   ```

2. **Create Web Service in Render:**
   - Go to https://dashboard.render.com
   - Click "New +" → "Web Service"
   - Connect your Git repository
   - Configure:
     - **Name**: `ai-ttorney-admin-server`
     - **Environment**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `node server.js`
     - **Root Directory**: `admin/server` (if deploying from monorepo)

3. **Set Environment Variables:**
   - In Render dashboard, go to "Environment"
   - Add all variables from the list above
   - **Important**: Set `NODE_ENV=production`

4. **Deploy:**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Check logs for any errors

5. **Verify Deployment:**
   - Visit: `https://ai-ttorney-admin-server.onrender.com/health`
   - Should return: `{"status":"OK","timestamp":"...","service":"Admin API Server",...}`

## 🔍 Post-Deployment Verification

### Test Health Endpoint
```bash
curl https://ai-ttorney-admin-server.onrender.com/health
```

### Test CORS
```bash
curl -H "Origin: https://ai-ttorney-admin.vercel.app" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Authorization" \
     -X OPTIONS \
     https://ai-ttorney-admin-server.onrender.com/api/auth/status
```

### Test Authentication
1. Try logging in from your Vercel frontend
2. Check Render logs for any errors
3. Verify JWT tokens are being issued correctly

## 🐛 Troubleshooting

### CORS Errors
- Verify `FRONTEND_URL` is set correctly in Render
- Check that the URL matches exactly (including https://)
- No trailing slash in `FRONTEND_URL`

### Authentication Fails
- Check `JWT_SECRET` is set in Render
- Verify Supabase credentials are correct
- Check Render logs for detailed error messages

### Email Not Sending
- Verify SMTP credentials are correct
- Check if Gmail is blocking the app (enable "Less secure app access")
- Consider using App Passwords for Gmail

### Rate Limiting Too Strict
- Adjust limits in `server.js` if needed
- Current limits are very high (1000 per 15 min)

## 📊 Monitoring

- **Render Dashboard**: Monitor logs, metrics, and deployments
- **Health Check**: Set up monitoring for `/health` endpoint
- **Error Tracking**: Consider integrating Sentry or similar service

## 🔄 Continuous Deployment

Render automatically deploys when you push to your main branch:
1. Make changes locally
2. Commit and push to Git
3. Render automatically builds and deploys
4. Check logs to verify successful deployment

## 🔐 Security Best Practices

1. **Never commit `.env` files** to version control
2. **Rotate JWT_SECRET** periodically
3. **Use strong passwords** for SMTP and database
4. **Enable 2FA** on all service accounts (Render, Supabase, etc.)
5. **Monitor logs** for suspicious activity
6. **Keep dependencies updated** (`npm audit fix`)
7. **Use HTTPS only** (Render provides this automatically)

## 📞 Support

- **Render Docs**: https://render.com/docs
- **Render Support**: https://render.com/support
- **Server Logs**: Available in Render dashboard
