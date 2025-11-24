# Admin Deployment Checklist

## ✅ Completed Changes

All localhost URLs have been replaced with environment variables. The following files were updated:

### Frontend Files (src/)
1. **services/forumManagementService.js** - Updated API calls and server connection tests
2. **services/glossaryTermsService.js** - Updated all API endpoints
3. **services/legalSeekerService.js** - Already using env var
4. **services/auditLogsService.js** - Already using env var
5. **services/usersService.js** - Already using env var
6. **services/lawyerApplicationsService.js** - Already using env var
7. **services/adminManagementService.js** - Already using env var
8. **services/lawyersService.js** - Already using env var
9. **services/adminModerationService.js** - Already using env var
10. **services/appealAdminService.js** - Already using env var (port 8000)
11. **pages/auth/Login.js** - Updated contact superadmin endpoint
12. **pages/auth/ForgotPassword.js** - Already using env var
13. **pages/auth/VerifyOTP.js** - Already using env var
14. **pages/Settings.js** - Already using env var
15. **pages/appeals/ManageAppeals.js** - Updated all API endpoints
16. **pages/legal-resources/ManageLegalArticles.js** - Updated all API endpoints

### Backend Files (server/)
1. **server.js** - Updated console logs to use HOST env var

## 🔧 Required Setup Steps

### 1. Create Frontend .env File

Create `.env` file in `/admin` directory:

```env
REACT_APP_API_URL=https://ai-ttorney-admin-server.onrender.com/api
```

### 2. Create Backend .env File (if needed)

Create `.env` file in `/admin/server` directory:

```env
PORT=5001
NODE_ENV=production
HOST=ai-ttorney-admin-server.onrender.com
CORS_ORIGIN=https://your-admin-frontend-url.com

# Add other required variables:
# DATABASE_URL=your_database_url
# JWT_SECRET=your_jwt_secret
# etc.
```

### 3. Build and Deploy

```bash
# Build frontend
cd admin
npm run build

# Deploy backend
cd admin/server
npm start
```

## 📝 Environment Variable Reference

### Frontend Variables (REACT_APP_*)
- `REACT_APP_API_URL` - Admin backend API URL (default: http://localhost:5001/api)

### Backend Variables
- `PORT` - Server port (default: 5001)
- `NODE_ENV` - Environment mode (development/production)
- `HOST` - Server hostname for logs (default: localhost)
- `CORS_ORIGIN` - Allowed CORS origins

## ⚠️ Important Notes

1. **Never commit .env files** - They are already gitignored
2. **Update CORS_ORIGIN** - Set to your actual frontend URL in production
3. **appealAdminService.js uses port 8000** - Verify if this is intentional
4. **All services now use environment variables** - No hardcoded URLs remain

## 🚀 Deployment URLs

- **Admin Backend**: https://ai-ttorney-admin-server.onrender.com
- **Admin Frontend**: [Your deployment URL]

## 🔍 Verification

After deployment, verify:
1. Frontend can connect to backend API
2. All API endpoints respond correctly
3. CORS is configured properly
4. Authentication works across environments
