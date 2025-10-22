#!/bin/bash

# Forum Moderation System Setup Script
# Run this script to set up the complete moderation system

echo "🚀 AI.ttorney Forum Moderation System Setup"
echo "==========================================="
echo ""

# Check if we're in the right directory
if [ ! -f "server/main.py" ]; then
    echo "❌ Error: Please run this script from the AI.ttorney root directory"
    exit 1
fi

echo "📋 Step 1: Checking database migrations..."
if [ ! -d "server/database/migrations" ]; then
    echo "❌ Error: Migrations directory not found"
    exit 1
fi

echo "✅ Found migration files:"
ls -1 server/database/migrations/*.sql
echo ""

echo "📋 Step 2: Checking trigger files..."
if [ ! -d "server/database/triggers" ]; then
    echo "❌ Error: Triggers directory not found"
    exit 1
fi

echo "✅ Found trigger files:"
ls -1 server/database/triggers/*.sql
echo ""

echo "📋 Step 3: Checking service files..."
if [ ! -f "server/services/violation_tracking_service.py" ]; then
    echo "❌ Error: ViolationTrackingService not found"
    exit 1
fi

if [ ! -f "server/services/content_moderation_service.py" ]; then
    echo "❌ Error: ContentModerationService not found"
    exit 1
fi

echo "✅ All service files present"
echo ""

echo "📋 Step 4: Checking route files..."
if [ ! -f "server/routes/admin_moderation.py" ]; then
    echo "❌ Error: Admin moderation routes not found"
    exit 1
fi

echo "✅ All route files present"
echo ""

echo "📋 Step 5: Checking middleware..."
if [ ! -f "server/middleware/account_status.py" ]; then
    echo "❌ Error: Account status middleware not found"
    exit 1
fi

echo "✅ Middleware present"
echo ""

echo "✅ All files are in place!"
echo ""
echo "📝 Next Steps (Manual):"
echo "======================="
echo ""
echo "1. Run database migrations in Supabase SQL Editor:"
echo "   - Open Supabase Dashboard → SQL Editor"
echo "   - Copy and run: server/database/migrations/001_add_user_moderation_fields.sql"
echo "   - Copy and run: server/database/migrations/002_create_user_violations_table.sql"
echo "   - Copy and run: server/database/migrations/003_create_user_suspensions_table.sql"
echo "   - Copy and run: server/database/triggers/auto_reset_strikes_after_suspension.sql"
echo ""
echo "2. Set up cron job for suspension expiry (choose one):"
echo "   a) If pg_cron is available in Supabase:"
echo "      SELECT cron.schedule('reset-suspensions', '*/5 * * * *', 'SELECT check_and_reset_expired_suspensions()');"
echo ""
echo "   b) Or use system cron (add to crontab):"
echo "      */5 * * * * psql -U postgres -d aittorney -c \"SELECT check_and_reset_expired_suspensions();\""
echo ""
echo "3. Restart the FastAPI server:"
echo "   cd server && uvicorn main:app --reload"
echo ""
echo "4. Test the system:"
echo "   - Try posting violating content (see FORUM_MODERATION_SYSTEM.md for test cases)"
echo "   - Check admin endpoints: GET /api/admin/moderation/stats"
echo ""
echo "5. Build admin dashboard UI (optional):"
echo "   - Use the admin endpoints documented in FORUM_MODERATION_SYSTEM.md"
echo "   - Create React components for suspended users, violations, and stats"
echo ""
echo "📚 Documentation:"
echo "   - Complete guide: FORUM_MODERATION_SYSTEM.md"
echo "   - API docs: http://localhost:8000/docs (after starting server)"
echo ""
echo "✅ Setup verification complete!"
