#!/bin/bash

# Deployment script for Tender Tracker Application
# This script should be run on the production server

set -e  # Exit on error

echo "🚀 Starting deployment..."

# Configuration
APP_DIR="${DEPLOY_PATH:-/var/www/tendertracker}"
BRANCH="${DEPLOY_BRANCH:-main}"
BACKUP_DIR="${APP_DIR}/backups"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Navigate to application directory
cd "$APP_DIR" || exit 1

# Create backup
print_status "Creating backup..."
mkdir -p "$BACKUP_DIR"
BACKUP_NAME="backup_$(date +%Y%m%d_%H%M%S).tar.gz"
tar -czf "$BACKUP_DIR/$BACKUP_NAME" \
    --exclude=node_modules \
    --exclude=backend/node_modules \
    --exclude=.git \
    --exclude=uploads \
    . || print_warning "Backup creation failed"

# Keep only last 5 backups
ls -t "$BACKUP_DIR"/backup_*.tar.gz | tail -n +6 | xargs -r rm

# Pull latest code
print_status "Pulling latest code from $BRANCH..."
git fetch origin
git reset --hard origin/$BRANCH

# Install dependencies
print_status "Installing frontend dependencies..."
npm ci --production

print_status "Installing backend dependencies..."
cd backend
npm ci --production
cd ..

# Build application
print_status "Building frontend..."
npm run build

print_status "Building backend..."
cd backend
npm run build
cd ..

# Run database migrations
print_status "Running database migrations..."
cd backend

# Run migrations with error handling
npm run migrate:ai-summary 2>/dev/null || print_warning "AI summary migration skipped"
npm run migrate:crm 2>/dev/null || print_warning "CRM migration skipped"
npm run migrate:tender-scout 2>/dev/null || print_warning "Tender Scout migration skipped"

cd ..

# Restart services
print_status "Restarting services..."

if command -v pm2 &> /dev/null; then
    print_status "Using PM2..."
    pm2 restart tendertrack-backend || pm2 start backend/dist/app.js --name tendertrack-backend
    pm2 save
    pm2 list
elif systemctl is-active --quiet tendertrack; then
    print_status "Using systemd..."
    sudo systemctl restart tendertrack
    sudo systemctl status tendertrack --no-pager
else
    print_warning "No process manager found. Please restart services manually."
fi

# Reload nginx if available
if command -v nginx &> /dev/null; then
    print_status "Reloading Nginx..."
    sudo nginx -t && sudo systemctl reload nginx || print_warning "Nginx reload failed"
fi

print_status "Deployment completed successfully! 🎉"
print_status "Application should be available at: https://tendertracker.mobilisepro.com"

# Show recent logs
if command -v pm2 &> /dev/null; then
    echo ""
    echo "Recent logs:"
    pm2 logs tendertrack-backend --lines 20 --nostream
fi
