#!/bin/bash

echo "🔄 Restarting TenderTrack Servers..."
echo ""

# Kill existing processes
echo "Stopping existing servers..."
pkill -f "vite" 2>/dev/null
pkill -f "tsx.*src/app.ts" 2>/dev/null
sleep 2

echo "✓ Servers stopped"
echo ""

# Start backend in background
echo "Starting backend server..."
cd backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "✓ Backend started (PID: $BACKEND_PID)"

# Wait a bit for backend to initialize
sleep 3

# Start frontend in background
echo "Starting frontend server..."
cd ..
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✓ Frontend started (PID: $FRONTEND_PID)"

echo ""
echo "✅ Both servers restarted!"
echo ""
echo "📋 Server Status:"
echo "   Backend:  http://localhost:5000 (PID: $BACKEND_PID)"
echo "   Frontend: http://localhost:3000 (PID: $FRONTEND_PID)"
echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f backend.log"
echo "   Frontend: tail -f frontend.log"
echo ""
echo "🛑 To stop servers:"
echo "   kill $BACKEND_PID $FRONTEND_PID"
