# LeadTrack Pro - Backend API

Enterprise-grade REST API for Lead Management System (CRM) built with Node.js, Express, TypeScript, and MySQL.

## Quick Start

### Prerequisites

- Node.js 18+ 
- MySQL 8.0+ (Azure MySQL in production)
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your Azure MySQL credentials
# DB_HOST=172.16.17.68
# DB_USER=sdx_ind_uat_dbadmin
# DB_PASSWORD=your_password
```

### Database Setup

```bash
# Run database setup script
npx ts-node scripts/setup-database.ts
```

This will:
- Connect to Azure MySQL server
- Create database if it doesn't exist
- Create all tables from schema.sql
- Insert seed data (admin user, categories, config)

### Running the Server

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

Server runs on `http://localhost:5000` by default.

## API Endpoints

Base URL: `http://localhost:5000/api/v1`

### Authentication
- `POST /auth/login` - Login (returns OTP requirement)
- `POST /auth/verify-otp` - Verify OTP and get JWT token
- `POST /auth/resend-otp` - Resend OTP
- `POST /auth/logout` - Logout
- `GET /auth/me` - Get current user

### Users
- `GET /users` - List users (Admin/Manager)
- `POST /users` - Create user (Admin)
- `GET /users/:id` - Get user
- `PUT /users/:id` - Update user (Admin)
- `DELETE /users/:id` - Delete user (Admin)
- `GET /users/me` - Get current user profile

### Tenders
- `GET /tenders` - List tenders (with filters)
- `POST /tenders` - Create tender
- `GET /tenders/:id` - Get tender details
- `PUT /tenders/:id` - Update tender
- `DELETE /tenders/:id` - Delete tender (Admin)
- `GET /tenders/:id/activities` - Get activity log
- `POST /tenders/:id/activities` - Add activity

### Companies
- `GET /companies` - List companies
- `POST /companies` - Create company
- `GET /companies/:id` - Get company with contacts
- `PUT /companies/:id` - Update company
- `DELETE /companies/:id` - Delete company
- `GET /companies/:id/contacts` - Get contacts
- `POST /companies/:id/contacts` - Add contact

### Documents
- `GET /documents` - List documents
- `POST /documents` - Upload document (multipart/form-data)
- `GET /documents/:id` - Get document info
- `GET /documents/:id/download` - Download document
- `DELETE /documents/:id` - Delete document
- `PUT /documents/:id/favorite` - Toggle favorite
- `GET /documents/categories` - List categories

### Reports
- `GET /reports/dashboard` - Dashboard statistics
- `GET /reports/tenders` - Tender reports
- `GET /reports/performance` - Performance metrics
- `GET /reports/export` - Export data (CSV/JSON)

### Admin
- `GET /admin/config` - Get system config
- `PUT /admin/config` - Update config
- `POST /admin/email/test` - Test email
- `POST /admin/sms/test` - Test SMS
- `GET /admin/audit-logs` - Get audit logs

## Security Features

- ✅ JWT authentication with session management
- ✅ OTP-based two-factor authentication
- ✅ Password hashing with bcrypt (10 rounds)
- ✅ Role-based access control (RBAC)
- ✅ Rate limiting (5 login attempts/min, 100 API requests/min)
- ✅ Input validation with Joi
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS prevention (input sanitization)
- ✅ Security headers (Helmet.js)
- ✅ CORS configuration
- ✅ Audit logging

## Environment Variables

See `.env.example` for all required environment variables.

**Required:**
- `DB_HOST` - Azure MySQL server IP (172.16.17.68)
- `DB_USER` - Database username (sdx_ind_uat_dbadmin)
- `DB_PASSWORD` - Database password
- `JWT_SECRET` - Secret for JWT tokens (min 32 characters)

## Project Structure

```
backend/
├── src/
│   ├── config/          # Database, environment config
│   ├── middleware/      # Auth, validation, rate limiting, error handling
│   ├── controllers/     # Business logic
│   ├── services/        # Email, SMS, OTP, file upload
│   ├── routes/          # API route definitions
│   ├── utils/           # Logger, helpers
│   └── app.ts           # Express app setup
├── database/
│   ├── schema.sql       # Database schema
│   └── seed.sql         # Seed data
├── scripts/
│   ├── setup-database.ts # Database setup script
│   └── generate-password-hash.ts
├── uploads/             # File uploads directory
├── logs/                # Application logs
└── package.json
```

## Default Admin Credentials

- **Email:** admin@leadtrack.com
- **Password:** Admin@123

**⚠️ Change these credentials in production!**

## Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Security tests
npm run test:security
```

## Health Check

```bash
curl http://localhost:5000/health
```

Returns server and database health status.

## Logging

Logs are written to:
- `logs/error.log` - Error logs
- `logs/combined.log` - All logs

Log levels: error, warn, info, debug

## Azure MySQL Configuration

The backend is configured to connect to Azure MySQL:
- **Server:** 172.16.17.68
- **SSL:** Required (configured automatically)
- **Connection Pooling:** 10 connections (configurable)

Ensure Azure firewall allows connections from your backend server IP.

## License

Proprietary - All rights reserved

