#!/bin/sh
set -e

echo "🚀 Starting Omnistream Fullstack Application..."

# Run database migrations or push schema
echo "📊 Setting up database schema..."
# Try migrate deploy first (production way)
if ! npx prisma migrate deploy 2>/dev/null; then
  echo "⚠️  Migrations not compatible, using db push..."
  # Fallback to db push (creates schema without migrations)
  npx prisma db push --accept-data-loss --skip-generate
fi

# Start backend API in background
echo "🔧 Starting Backend API on port 3000..."
node dist/index.js &
BACKEND_PID=$!

# Wait for backend to be ready
echo "⏳ Waiting for backend to be ready..."
timeout=30
while [ $timeout -gt 0 ]; do
  if wget --quiet --tries=1 --spider http://localhost:3000/health 2>/dev/null; then
    echo "✅ Backend is ready!"
    break
  fi
  sleep 1
  timeout=$((timeout - 1))
done

if [ $timeout -eq 0 ]; then
  echo "❌ Backend failed to start"
  exit 1
fi

# Start frontend dashboard
echo "🌐 Starting Web Dashboard on port 4000..."
cd web-dashboard
node server.js &
FRONTEND_PID=$!

# Wait for frontend to be ready
echo "⏳ Waiting for frontend to be ready..."
timeout=30
while [ $timeout -gt 0 ]; do
  if wget --quiet --tries=1 --spider http://localhost:4000 2>/dev/null; then
    echo "✅ Frontend is ready!"
    break
  fi
  sleep 1
  timeout=$((timeout - 1))
done

if [ $timeout -eq 0 ]; then
  echo "❌ Frontend failed to start"
  kill $BACKEND_PID 2>/dev/null || true
  exit 1
fi

echo "🎉 Omnistream is running!"
echo "   📡 Backend API: http://localhost:3000"
echo "   🌐 Web Dashboard: http://localhost:4000"

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
