# 🎯 CURSOR AI - START HERE

## Quick Navigation

**You are building a comprehensive Tender Tracking System with MySQL backend.**

### 📖 Read These Files in Order:

1. **THIS FILE** (you are here) - Quick orientation
2. **`/README.md`** - Project overview and structure
3. **`/DEVELOPMENT_GUIDE.md`** - **MOST IMPORTANT** - Complete development instructions
4. **`/SECURITY.md`** - Security quick reference
5. **`/ACCESSIBILITY_CHECKLIST.md`** - Accessibility quick reference

---

## 🎓 What You Need to Know

### Current State
- ✅ Frontend UI components are **fully scaffolded**
- ✅ Security utilities implemented (`/lib/security.ts`)
- ✅ TypeScript types defined (`/lib/types.ts`)
- ✅ API client ready (`/lib/api.ts`)
- ❌ **Backend does NOT exist yet** - you need to build it
- ❌ **Database is NOT connected** - you need to set it up
- ❌ **No real data** - currently showing empty states

### Your Mission
Build the backend from the ground up, following the **bottom-up approach**:

```
Database → Backend APIs → Frontend Integration → Testing → Deployment
```

---

## 🚀 Step-by-Step Quick Start

### Phase 1: Set Up MySQL Database (Week 1)

**Location:** `/DEVELOPMENT_GUIDE.md` Phase 1

```bash
# 1. Create database
mysql -u root -p
CREATE DATABASE tendertrack_db;

# 2. Copy schema from DEVELOPMENT_GUIDE.md Phase 1.1
# 3. Run the schema
mysql -u root -p tendertrack_db < schema.sql

# 4. Insert seed data from Phase 1.2
```

**Tables to Create:**
- users
- companies
- contacts
- tenders
- documents
- tender_activities
- system_config
- audit_logs
- (and more - see full schema in DEVELOPMENT_GUIDE.md)

---

### Phase 2: Build Backend API (Week 2-5)

**Location:** `/DEVELOPMENT_GUIDE.md` Phase 2

**Technology Stack:**
- Node.js + Express
- MySQL2 (with connection pooling)
- JWT for authentication
- bcrypt for password hashing
- Nodemailer for emails
- Twilio for SMS

**Create Backend Project:**

```bash
# 1. Create backend directory
mkdir backend
cd backend

# 2. Initialize Node.js project
npm init -y

# 3. Install dependencies (see DEVELOPMENT_GUIDE.md Phase 2.2)
npm install express mysql2 bcrypt jsonwebtoken dotenv ...

# 4. Create folder structure (see DEVELOPMENT_GUIDE.md Phase 2.1)
```

**Key Files to Create:**

1. **Database Connection** (`config/database.ts`)
   - MySQL connection pool
   - See Phase 2.4 in DEVELOPMENT_GUIDE.md

2. **Authentication** (`middleware/auth.ts`)
   - JWT verification
   - Role-based authorization
   - See Phase 2.5 in DEVELOPMENT_GUIDE.md

3. **API Routes** (`routes/*.ts`)
   - Auth routes (login, OTP, logout)
   - Tender routes (CRUD operations)
   - User routes (user management)
   - Company routes
   - Document routes
   - Admin routes
   - See Phase 2.6 in DEVELOPMENT_GUIDE.md

4. **Controllers** (`controllers/*.ts`)
   - Business logic for each entity
   - Input validation
   - Error handling

5. **Services** (`services/*.ts`)
   - Email service (Nodemailer)
   - SMS service (Twilio)
   - OTP generation and verification
   - File upload handling

---

### Phase 3: Connect Frontend to Backend (Week 6-7)

**The frontend is ready!** You just need to:

1. **Set environment variable:**
   ```bash
   # Create .env file in frontend root
   VITE_API_URL=http://localhost:5000/api/v1
   ```

2. **Backend is running on port 5000**
   - Frontend will automatically use `/lib/api.ts` to connect

3. **Components will fetch real data:**
   ```typescript
   // Example: Dashboard component will call
   import { dashboardApi } from './lib/api';
   const stats = await dashboardApi.getStats();
   ```

**All API calls are already defined in `/lib/api.ts`:**
- `authApi` - Authentication
- `tenderApi` - Tender management
- `companyApi` - Company management
- `userApi` - User management
- `documentApi` - Document management
- `adminApi` - Admin functions

---

### Phase 4: Security Implementation

**Location:** `/SECURITY.md` and `/DEVELOPMENT_GUIDE.md` Phase 4

**Critical Security Requirements:**

1. **Password Hashing:**
   ```typescript
   import bcrypt from 'bcrypt';
   const hash = await bcrypt.hash(password, 10);
   ```

2. **JWT Authentication:**
   ```typescript
   import jwt from 'jsonwebtoken';
   const token = jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '8h' });
   ```

3. **OTP Verification:**
   - Generate 6-digit OTP
   - Store in database with expiry (10 minutes)
   - Send via email/SMS
   - Verify on login

4. **Input Validation:**
   - Use `/lib/security.ts` utilities
   - Sanitize all inputs
   - Validate email, password, etc.

5. **SQL Injection Prevention:**
   ```typescript
   // ❌ NEVER DO THIS
   db.query(`SELECT * FROM users WHERE email = '${email}'`);
   
   // ✅ ALWAYS USE PARAMETERIZED QUERIES
   db.query('SELECT * FROM users WHERE email = ?', [email]);
   ```

---

### Phase 5: Testing (Week 8-9)

**Run Tests:**
```bash
# Backend
npm test
npm run test:integration
npm run test:security

# Frontend
npm run test:a11y
```

---

### Phase 6: Deployment (Week 10)

**Location:** `/DEVELOPMENT_GUIDE.md` Phase 6

**Production Checklist:**
- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Database migrations complete
- [ ] Security scan passed
- [ ] Accessibility audit passed
- [ ] Load testing completed
- [ ] Monitoring configured

---

## 📋 File Structure Reference

```
/
├── 📄 CURSOR_AI_START_HERE.md    ← YOU ARE HERE
├── 📘 README.md                  ← Project overview
├── 📗 DEVELOPMENT_GUIDE.md       ← MAIN REFERENCE - Read this!
├── 🔒 SECURITY.md                ← Security quick ref
├── ♿ ACCESSIBILITY_CHECKLIST.md ← Accessibility quick ref
│
├── App.tsx                       ← Main app (already done)
├── components/                   ← UI components (already done)
│   ├── Dashboard.tsx
│   ├── TenderDashboard.tsx
│   ├── LoginPage.tsx
│   ├── Administration.tsx
│   └── ...
│
├── lib/
│   ├── api.ts                   ← API client (use this!)
│   ├── types.ts                 ← TypeScript types
│   └── security.ts              ← Security utilities
│
└── backend/                      ← YOU NEED TO CREATE THIS
    ├── src/
    │   ├── config/
    │   │   └── database.ts
    │   ├── middleware/
    │   │   └── auth.ts
    │   ├── routes/
    │   │   ├── auth.ts
    │   │   ├── tenders.ts
    │   │   └── ...
    │   ├── controllers/
    │   ├── services/
    │   └── app.ts
    └── package.json
```

---

## 🎯 Critical API Endpoints to Implement

See `/DEVELOPMENT_GUIDE.md` Phase 2.6 for complete list.

**Must-have endpoints:**

```typescript
// Authentication
POST   /api/v1/auth/login           # Email/password
POST   /api/v1/auth/verify-otp      # OTP verification
POST   /api/v1/auth/logout          # Logout

// Tenders
GET    /api/v1/tenders              # List all
POST   /api/v1/tenders              # Create
GET    /api/v1/tenders/:id          # Get one
PUT    /api/v1/tenders/:id          # Update
DELETE /api/v1/tenders/:id          # Delete

// Users
GET    /api/v1/users                # List all
POST   /api/v1/users                # Create
PUT    /api/v1/users/:id            # Update
DELETE /api/v1/users/:id            # Delete

// Dashboard
GET    /api/v1/reports/dashboard    # Stats

// Admin
GET    /api/v1/admin/config         # Get config
PUT    /api/v1/admin/config         # Update config
```

---

## 🔑 Environment Variables You Need

**Backend `.env`:**
```bash
NODE_ENV=development
PORT=5000

# Database
DB_HOST=localhost
DB_NAME=tendertrack_db
DB_USER=your_user
DB_PASSWORD=your_password

# Security
JWT_SECRET=your_secret_min_32_chars
BCRYPT_ROUNDS=10

# Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_USER=your_email
SMTP_PASSWORD=your_password

# SMS (optional)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
```

**Frontend `.env`:**
```bash
VITE_API_URL=http://localhost:5000/api/v1
```

---

## ⚠️ Common Pitfalls to Avoid

1. ❌ **Don't concatenate SQL queries** - Use parameterized queries
2. ❌ **Don't store passwords in plain text** - Use bcrypt
3. ❌ **Don't skip input validation** - Always sanitize
4. ❌ **Don't expose sensitive data** - Use environment variables
5. ❌ **Don't forget error handling** - Wrap in try-catch
6. ❌ **Don't skip CORS configuration** - Frontend won't connect
7. ❌ **Don't commit `.env` files** - Add to .gitignore

---

## 📞 Where to Get Help

1. **Database schema:** `/DEVELOPMENT_GUIDE.md` Phase 1.1
2. **Backend structure:** `/DEVELOPMENT_GUIDE.md` Phase 2.1
3. **API endpoints:** `/DEVELOPMENT_GUIDE.md` Phase 2.6
4. **Security:** `/SECURITY.md`
5. **Frontend integration:** `/lib/api.ts`

---

## ✅ Development Checklist

Use this to track progress:

### Week 1: Database
- [ ] MySQL installed and running
- [ ] Database created
- [ ] Schema executed
- [ ] Seed data inserted
- [ ] Test queries working

### Week 2-3: Backend Core
- [ ] Node.js project initialized
- [ ] Dependencies installed
- [ ] Database connection working
- [ ] Authentication implemented
- [ ] OTP system working

### Week 4-5: Backend APIs
- [ ] Tender CRUD endpoints
- [ ] User management endpoints
- [ ] Company endpoints
- [ ] Document upload endpoint
- [ ] Admin endpoints

### Week 6: Services
- [ ] Email service configured
- [ ] SMS service configured
- [ ] File upload handling
- [ ] Notification system

### Week 7: Frontend Integration
- [ ] Environment variables set
- [ ] API client connected
- [ ] Login working
- [ ] Dashboard showing data
- [ ] All CRUD operations working

### Week 8-9: Testing
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Security scan clean
- [ ] Accessibility audit passed

### Week 10: Deployment
- [ ] Production environment ready
- [ ] SSL configured
- [ ] Monitoring active
- [ ] Backups configured

---

## 🚀 Ready to Start?

**Your next action:** Open `/DEVELOPMENT_GUIDE.md` and start with **Phase 1: Database Design**

Good luck! You've got this! 💪

---

**Questions?** Everything you need is in `/DEVELOPMENT_GUIDE.md`

**Last Updated:** November 22, 2025
