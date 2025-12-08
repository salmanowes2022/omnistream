#!/bin/sh
set -e

echo "🚀 Starting Omnistream Backend..."

# Run database migrations or push schema
echo "📊 Setting up database schema..."
# Try migrate deploy first (production way)
if ! npx prisma migrate deploy 2>/dev/null; then
  echo "⚠️  Migrations not compatible, using db push..."
  # Fallback to db push (creates schema without migrations)
  npx prisma db push --accept-data-loss --skip-generate
fi

# Start backend
echo "✅ Starting Backend API..."
exec node dist/index.js
