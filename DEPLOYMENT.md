# LeadTrack Pro - Deployment Guide

## Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Security scan clean
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Environment variables configured
- [ ] SSL certificates valid
- [ ] Database migrations run
- [ ] Backup system tested

## Production Environment Setup

### 1. Database Configuration

1. **Azure MySQL Setup:**
   - Ensure database is accessible from production server
   - Configure firewall rules
   - Enable SSL connections
   - Set up connection pooling

2. **Environment Variables:**
   ```bash
   DB_HOST=172.16.17.68
   DB_PORT=3306
   DB_NAME=tendertrack_db
   DB_USER=sdx_ind_uat_dbadmin
   DB_PASSWORD=<secure_password>
   ```

### 2. Backend Deployment

#### Option A: Docker Deployment

```bash
# Build and run with Docker Compose
cd backend
docker-compose up -d

# Check logs
docker-compose logs -f backend
```

#### Option B: Direct Node.js Deployment

```bash
# Build the application
cd backend
npm run build

# Start with PM2 (recommended)
npm install -g pm2
pm2 start dist/app.js --name tendertrack-backend
pm2 save
pm2 startup
```

### 3. Frontend Deployment

```bash
# Build for production
npm run build

# Deploy dist/ folder to your web server
# (Nginx, Apache, or static hosting service)
```

### 4. Nginx Configuration (Example)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /var/www/tendertrack/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5. SSL Certificate Setup

```bash
# Using Let's Encrypt
sudo certbot --nginx -d your-domain.com
```

### 6. Monitoring Setup

1. **Application Monitoring:**
   - Set up Winston logging
   - Configure log rotation
   - Set up error tracking (Sentry optional)

2. **Database Monitoring:**
   - Monitor connection pool usage
   - Track slow queries
   - Set up alerts for failures

3. **Server Monitoring:**
   - CPU and memory usage
   - Disk space
   - Network traffic

### 7. Backup Strategy

1. **Database Backups:**
   ```bash
   # Daily backup script
   mysqldump -h 172.16.17.68 -u sdx_ind_uat_dbadmin -p tendertrack_db > backup_$(date +%Y%m%d).sql
   ```

2. **File Backups:**
   - Backup `uploads/` directory daily
   - Store backups in separate location

3. **Configuration Backups:**
   - Backup `.env` files securely
   - Version control for configuration

## Post-Deployment Verification

1. **Health Check:**
   ```bash
   curl http://your-domain.com/api/v1/health
   ```

2. **Authentication Test:**
   - Test login flow
   - Verify OTP delivery
   - Check session management

3. **API Tests:**
   - Test all major endpoints
   - Verify file uploads
   - Check error handling

4. **Performance Tests:**
   - Response times
   - Concurrent user load
   - Database query performance

## Rollback Procedure

1. **Database Rollback:**
   ```bash
   mysql -h 172.16.17.68 -u sdx_ind_uat_dbadmin -p tendertrack_db < backup_previous.sql
   ```

2. **Application Rollback:**
   ```bash
   # Docker
   docker-compose down
   docker-compose up -d -f docker-compose.previous.yml

   # PM2
   pm2 restart tendertrack-backend --update-env
   ```

## Maintenance

1. **Regular Updates:**
   - Update dependencies monthly
   - Security patches immediately
   - Review logs weekly

2. **Database Maintenance:**
   - Optimize tables monthly
   - Clean up old audit logs
   - Review indexes quarterly

3. **Backup Verification:**
   - Test restore procedures monthly
   - Verify backup integrity weekly

