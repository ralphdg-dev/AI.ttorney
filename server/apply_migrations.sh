#!/bin/bash

echo "🔧 Applying Database Migrations"
echo "================================"

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL not found. Please set it first."
    exit 1
fi

echo "📋 Step 1: Applying Production RLS Fix..."
psql "$DATABASE_URL" -f database/migrations/production_rls_fix.sql

if [ $? -eq 0 ]; then
    echo "✅ Production RLS Fix applied successfully"
else
    echo "❌ Production RLS Fix failed"
    exit 1
fi

echo ""
echo "📋 Step 2: Fixing Glossary Terms RLS..."
psql "$DATABASE_URL" -f database/migrations/fix_glossary_rls.sql

if [ $? -eq 0 ]; then
    echo "✅ Glossary Terms RLS Fix applied successfully"
else
    echo "❌ Glossary Terms RLS Fix failed"
    exit 1
fi

echo ""
echo "🎉 All migrations applied successfully!"
echo "📊 Database is now ready for production use"
