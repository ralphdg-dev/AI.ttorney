# Vercel Deployment Guide for AI.ttorney Admin

## Prerequisites
- Vercel account (sign up at https://vercel.com)
- Git repository (GitHub, GitLab, or Bitbucket)

## Deployment Steps

### 1. Push Your Code to Git
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. Deploy to Vercel

#### Option A: Using Vercel Dashboard (Recommended)
1. Go to https://vercel.com/dashboard
2. Click "Add New Project"
3. Import your Git repository
4. Configure project settings:
   - **Framework Preset:** Create React App
   - **Root Directory:** `admin` (if deploying from monorepo)
   - **Build Command:** `npm run build` (auto-detected)
   - **Output Directory:** `build` (auto-detected)

5. Add Environment Variables:
   ```
   REACT_APP_API_URL=https://ai-ttorney-admin-server.onrender.com/api
   ```

6. Click "Deploy"

#### Option B: Using Vercel CLI
```bash
# Install Vercel CLI globally
npm install -g vercel

# Navigate to admin directory
cd admin

# Login to Vercel
vercel login

# Deploy
vercel

# For production deployment
vercel --prod
```

### 3. Configure Custom Domain (Optional)
1. Go to your project settings in Vercel
2. Navigate to "Domains"
3. Add your custom domain
4. Update DNS records as instructed

### 4. Update Backend CORS
Make sure your backend server (Render) allows requests from your Vercel domain:
- Update `FRONTEND_URL` in your Render environment variables to:
  ```
  https://ai-ttorney-admin.vercel.app
  ```
  Or your custom domain if configured.

## Environment Variables

Set these in Vercel Dashboard → Project Settings → Environment Variables:

| Variable | Value |
|----------|-------|
| `REACT_APP_API_URL` | `https://ai-ttorney-admin-server.onrender.com/api` |

## Automatic Deployments

Vercel automatically deploys:
- **Production:** When you push to `main` branch
- **Preview:** When you create a pull request

## Deployment URLs

After deployment, you'll get:
- **Production URL:** `https://ai-ttorney-admin.vercel.app`
- **Preview URLs:** Unique URL for each PR/branch

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify Node.js version compatibility

### API Requests Fail
- Verify `REACT_APP_API_URL` is set correctly
- Check CORS configuration on backend
- Ensure backend server is running

### Routing Issues (404 on refresh)
- The `vercel.json` file handles this by redirecting all routes to `index.html`
- If issues persist, check the `routes` configuration in `vercel.json`

## Files Created for Vercel

1. **`vercel.json`** - Vercel configuration
2. **`.vercelignore`** - Files to exclude from deployment
3. **`package.json`** - Added `vercel-build` script

## Post-Deployment Checklist

- [ ] Test login functionality
- [ ] Verify API calls work correctly
- [ ] Check all routes/pages load properly
- [ ] Test file uploads (if applicable)
- [ ] Verify environment variables are set
- [ ] Update backend CORS settings
- [ ] Test on different browsers
- [ ] Check mobile responsiveness

## Monitoring

- View deployment logs in Vercel dashboard
- Set up error tracking (e.g., Sentry)
- Monitor API performance

## Rollback

If something goes wrong:
1. Go to Vercel Dashboard → Deployments
2. Find the last working deployment
3. Click "..." → "Promote to Production"

## Support

- Vercel Docs: https://vercel.com/docs
- Vercel Support: https://vercel.com/support
