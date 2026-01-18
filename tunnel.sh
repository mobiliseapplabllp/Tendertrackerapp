#!/bin/bash

# SSH Tunnel Script for Tender Tracker Application
# This creates SSH tunnels to access the server application locally

echo "🔌 Creating SSH tunnels to production server..."
echo ""

# Server details
SERVER_USER="root"
SERVER_HOST="10.26.1.84"
SERVER_PASS="gC6wG3qZz0M4"

# Port mappings
# Local:Remote
# 5000:5000 - Backend API
# 3000:80   - Frontend (if served via Nginx)

echo "Port Mappings:"
echo "  Local Port 5000 → Server Port 5000 (Backend API)"
echo "  Local Port 3000 → Server Port 80 (Frontend)"
echo ""

# Create SSH tunnel
sshpass -p "$SERVER_PASS" ssh -o StrictHostKeyChecking=no \
  -L 5000:localhost:5000 \
  -L 3000:localhost:80 \
  -N "$SERVER_USER@$SERVER_HOST" &

TUNNEL_PID=$!

echo "✅ SSH tunnels created!"
echo ""
echo "📋 Access Information:"
echo "   Backend API:  http://localhost:5000"
echo "   Frontend:     http://localhost:3000"
echo ""
echo "🔍 Tunnel Process ID: $TUNNEL_PID"
echo ""
echo "🛑 To stop the tunnel:"
echo "   kill $TUNNEL_PID"
echo "   or run: pkill -f 'ssh.*10.26.1.84'"
echo ""
echo "✨ Tunnel is running in the background. You can now access the application locally!"
