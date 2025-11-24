# Admin Environment Variables Setup

## Required Environment Variables

### Admin Frontend (.env in /admin root)

Create a `.env` file in the `/admin` directory with:

```env
# Admin Backend API URL
REACT_APP_API_URL=https://ai-ttorney-admin-server.onrender.com/api
```

### Admin Backend (.env in /admin/server)

Create a `.env` file in the `/admin/server` directory with:

```env
# Server Configuration
PORT=5001
NODE_ENV=production

# Database (if needed)
# Add your database connection string here

# JWT Secret (if needed)
# Add your JWT secret here

# CORS Origins
CORS_ORIGIN=https://your-admin-frontend-url.com
```

## Development vs Production

### Development
For local development, use:
```env
REACT_APP_API_URL=http://localhost:5001/api
```

### Production
For production deployment, use:
```env
REACT_APP_API_URL=https://ai-ttorney-admin-server.onrender.com/api
```

## Notes

- All `.env` files are gitignored for security
- Never commit `.env` files to version control
- Update `REACT_APP_API_URL` based on your deployment environment
- The frontend uses `REACT_APP_` prefix for Create React App environment variables
