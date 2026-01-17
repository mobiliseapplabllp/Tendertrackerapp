# CI/CD Deployment Guide

This repository is configured with automated deployment using GitHub Actions.

## How It Works

Every push to the `main` branch automatically triggers a deployment to the production server at https://tendertracker.mobilisepro.com

## GitHub Secrets Required

Add these secrets in your GitHub repository settings (Settings → Secrets and variables → Actions):

### Required Secrets

| Secret Name | Description | Example |
|------------|-------------|---------|
| `SSH_HOST` | Production server hostname or IP | `tendertracker.mobilisepro.com` or `192.168.1.100` |
| `SSH_USERNAME` | SSH username for server access | `ubuntu` or `root` |
| `SSH_PRIVATE_KEY` | SSH private key for authentication | Contents of `~/.ssh/id_rsa` |
| `SSH_PORT` | SSH port (optional, defaults to 22) | `22` |
| `DEPLOY_PATH` | Application directory on server | `/var/www/tendertracker` |

### How to Add Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with the name and value

## Server Setup

### Prerequisites

Your production server needs:

1. **Git installed**
   ```bash
   sudo apt-get install git
   ```

2. **Node.js 20+ installed**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **PM2 for process management** (recommended)
   ```bash
   sudo npm install -g pm2
   ```

4. **Application directory with git repository**
   ```bash
   sudo mkdir -p /var/www/tendertracker
   sudo chown $USER:$USER /var/www/tendertracker
   cd /var/www/tendertracker
   git clone https://github.com/mobiliseapplabllp/Tendertrackerapp.git .
   ```

5. **Environment variables configured**
   ```bash
   cp .env.production.example backend/.env
   # Edit backend/.env with your production values
   nano backend/.env
   ```

6. **SSH key authentication set up**
   - Add the GitHub Actions SSH public key to `~/.ssh/authorized_keys`

### Initial Setup

1. **Clone the repository on the server:**
   ```bash
   cd /var/www/tendertracker
   git clone https://github.com/mobiliseapplabllp/Tendertrackerapp.git .
   ```

2. **Install dependencies:**
   ```bash
   npm install
   cd backend && npm install
   ```

3. **Configure environment:**
   ```bash
   cp .env.production.example backend/.env
   # Edit with your values
   nano backend/.env
   ```

4. **Build the application:**
   ```bash
   npm run build
   cd backend && npm run build
   ```

5. **Run database migrations:**
   ```bash
   cd backend
   npm run migrate:ai-summary
   npm run migrate:crm
   npm run migrate:tender-scout
   ```

6. **Start with PM2:**
   ```bash
   pm2 start backend/dist/app.js --name tendertrack-backend
   pm2 save
   pm2 startup
   ```

## Manual Deployment

If you need to deploy manually, you can:

1. **SSH to the server and run the deployment script:**
   ```bash
   ssh user@tendertracker.mobilisepro.com
   cd /var/www/tendertracker
   ./deploy.sh
   ```

2. **Or trigger the GitHub Action manually:**
   - Go to **Actions** tab in GitHub
   - Select **Deploy to Production**
   - Click **Run workflow**

## Deployment Process

The automated deployment performs these steps:

1. ✅ Checkout latest code
2. ✅ Install dependencies
3. ✅ Build frontend and backend
4. ✅ SSH to production server
5. ✅ Pull latest code
6. ✅ Install production dependencies
7. ✅ Build application
8. ✅ Run database migrations
9. ✅ Restart services (PM2/systemd)
10. ✅ Verify deployment

## Monitoring Deployment

- **GitHub Actions**: Check the Actions tab in your repository
- **Server logs**: `pm2 logs tendertrack-backend`
- **Application**: https://tendertracker.mobilisepro.com

## Rollback

If deployment fails, rollback to previous version:

```bash
ssh user@tendertracker.mobilisepro.com
cd /var/www/tendertracker
git log --oneline -5  # Find previous commit
git reset --hard <previous-commit-hash>
./deploy.sh
```

## Troubleshooting

### Deployment fails with SSH error
- Verify SSH_PRIVATE_KEY secret is correct
- Check SSH_HOST and SSH_USERNAME are correct
- Ensure server allows SSH key authentication

### Build fails
- Check Node.js version on server (should be 20+)
- Verify all dependencies are installed
- Check for syntax errors in code

### Services don't restart
- Verify PM2 is installed: `pm2 --version`
- Check PM2 process list: `pm2 list`
- Manually restart: `pm2 restart tendertrack-backend`

### Database migrations fail
- Check database connection in `.env`
- Verify database credentials are correct
- Run migrations manually: `cd backend && npm run migrate:crm`

## Support

For deployment issues, check:
- GitHub Actions logs
- Server logs: `pm2 logs tendertrack-backend`
- Application logs: `tail -f backend/logs/app.log`
