# Quick Start Guide - Suspension Appeal System

## 🚀 Get Started in 5 Minutes

### Step 1: Run Database Migrations (2 minutes)

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste each file content and execute in order:

**File 1:** `server/database/migrations/001_create_user_suspension_appeals.sql`
```sql
-- Copy entire file content and execute
```

**File 2:** `server/database/migrations/002_add_appeal_tracking_fields.sql`
```sql
-- Copy entire file content and execute
```

**File 3:** `server/database/migrations/003_create_appeals_evidence_bucket.sql`
```sql
-- Copy entire file content and execute
```

### Step 2: Verify Storage Bucket (1 minute)

1. Go to Supabase Dashboard → Storage
2. Check that `appeals_evidence` bucket exists
3. If not, create it manually:
   - Name: `appeals_evidence`
   - Public: **No**
   - File size limit: **5MB**

### Step 3: Start Backend (30 seconds)

```bash
cd server
python main.py
```

Verify at: http://localhost:8000/docs

### Step 4: Start Client (30 seconds)

```bash
cd client
npm start
```

### Step 5: Test the System (1 minute)

1. **Create a test suspended user:**
   - Go to Supabase Dashboard → Table Editor → `users`
   - Find a test user
   - Set `account_status` = `'suspended'`
   - Set `suspension_end` = a future date

2. **Login as suspended user in the app**
   - You'll be auto-redirected to `/suspended` screen
   - Click "Submit Appeal"
   - Fill out the form
   - Submit!

3. **View your appeal:**
   - Click "View Appeal Status" or navigate to `/my-appeals`
   - See your submitted appeal

---

## ✅ What You Can Do Now

### As a User:
- ✅ See suspension details when suspended
- ✅ Submit an appeal with reason and explanation
- ✅ Upload evidence files (images, PDFs)
- ✅ View appeal history
- ✅ See admin responses (when reviewed)

### As an Admin (via API):
- ✅ View all pending appeals: `GET /api/admin/moderation/appeals`
- ✅ Review appeals: `POST /api/admin/moderation/appeals/{id}/review`
- ✅ Get statistics: `GET /api/admin/moderation/appeals/stats`

---

## 📁 Files Created

### Backend
```
server/
├── database/migrations/
│   ├── 001_create_user_suspension_appeals.sql
│   ├── 002_add_appeal_tracking_fields.sql
│   └── 003_create_appeals_evidence_bucket.sql
├── models/
│   └── appeal_models.py
├── services/
│   └── appeal_service.py
└── routes/
    ├── user_appeals.py
    └── admin_appeals.py
```

### Frontend
```
client/
├── app/
│   ├── suspended.tsx
│   ├── appeal-submission.tsx
│   └── my-appeals.tsx
├── services/
│   └── appealService.ts
└── contexts/
    └── AuthContext.tsx (modified)
```

---

## 🎯 Key Features

### Suspended Screen
- Shows suspension type, reason, timeline
- Days remaining counter
- "Submit Appeal" button (if eligible)
- Appeal status indicator

### Appeal Submission
- 5 pre-defined reasons + custom option
- Detailed message (50-2000 chars with counter)
- Evidence upload (up to 5 files, 5MB each)
- Real-time validation
- File preview and removal

### My Appeals
- List of all appeals
- Status badges (Pending, Under Review, Approved, Rejected)
- Admin responses
- Decision details
- Pull-to-refresh

---

## 🔧 API Endpoints

### User Endpoints
```
POST   /api/user/suspensions/appeal          - Submit appeal
GET    /api/user/suspensions/appeals         - Get my appeals
GET    /api/user/suspensions/current         - Get current suspension
POST   /api/user/suspensions/upload-evidence - Upload evidence
DELETE /api/user/suspensions/evidence/{file} - Delete evidence
```

### Admin Endpoints
```
GET    /api/admin/moderation/appeals              - List appeals
POST   /api/admin/moderation/appeals/{id}/review  - Review appeal
PATCH  /api/admin/moderation/appeals/{id}/status  - Update status
GET    /api/admin/moderation/appeals/stats        - Get statistics
GET    /api/admin/moderation/appeals/{id}         - Get details
```

---

## 🧪 Testing with Postman/cURL

### Submit an Appeal
```bash
curl -X POST http://localhost:8000/api/user/suspensions/appeal \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "suspension_id": "uuid-here",
    "appeal_reason": "Content was misclassified",
    "appeal_message": "I believe my post was wrongly flagged because it was discussing legal precedents, not promoting illegal activity. I have been a responsible member of this community.",
    "evidence_urls": []
  }'
```

### Review an Appeal (Admin)
```bash
curl -X POST http://localhost:8000/api/admin/moderation/appeals/{appeal_id}/review \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "lift_suspension",
    "admin_response": "Upon review, we agree the content was misclassified. Your suspension has been lifted.",
    "admin_notes": "AI flagged legal discussion incorrectly"
  }'
```

---

## 🐛 Common Issues

### TypeScript Route Errors
**Error:** `Type '"/appeal-submission"' is not assignable...`

**Solution:** These are expected! The route types are auto-generated by Expo Router. Just restart your dev server:
```bash
# Stop the server (Ctrl+C)
npm start
```

### Storage Upload Fails
**Error:** `Failed to upload evidence`

**Solutions:**
1. Check bucket exists: Supabase → Storage → `appeals_evidence`
2. Verify policies are set (migration should have created them)
3. Check file size < 5MB
4. Verify file type is allowed (jpg, png, gif, pdf, webp)

### "You are not currently suspended"
**Error:** When trying to submit appeal

**Solutions:**
1. Check user's `account_status` in database = `'suspended'`
2. Verify there's an active suspension in `user_suspensions` table
3. Make sure suspension `status` = `'active'`

---

## 📊 Database Quick Check

Run this in Supabase SQL Editor to verify everything:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN ('user_suspension_appeals', 'user_suspensions', 'users');

-- Check if storage bucket exists
SELECT * FROM storage.buckets WHERE name = 'appeals_evidence';

-- Check storage policies
SELECT * FROM storage.policies WHERE bucket_id = 'appeals_evidence';

-- View sample appeal (if any)
SELECT * FROM user_suspension_appeals LIMIT 1;
```

---

## 🎉 You're All Set!

The suspension appeal system is now fully functional. Users can:
1. See they're suspended
2. Submit appeals with evidence
3. Track appeal status
4. Receive admin responses

Admins can review appeals via API (admin panel UI can be added later).

**Need help?** Check `APPEAL_SYSTEM_IMPLEMENTATION_GUIDE.md` for detailed documentation.
