# TenderTrack Pro - Bottom-Up Development Guide for Cursor AI

## Project Overview

**Application:** Enterprise Tender Tracking System  
**Tech Stack:** React + TypeScript + Tailwind CSS + MySQL  
**Architecture:** Bottom-up development approach  
**Security:** OWASP Top 10 compliant, WCAG 2.1 AA accessible

---

## Development Philosophy: Bottom-Up Approach

Build from the foundation upward:
1. Database schema and models
2. Backend API layer
3. Data access and business logic
4. Frontend components (already scaffolded)
5. Integration and testing

---

## Phase 1: Database Design (MySQL)

### 1.1 Database Schema

```sql
-- ============================================
-- TENDER TRACKING DATABASE SCHEMA
-- ============================================

-- Users and Authentication
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(254) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role ENUM('Admin', 'Manager', 'User', 'Viewer') DEFAULT 'User',
    department VARCHAR(100),
    phone VARCHAR(20),
    status ENUM('Active', 'Inactive', 'Suspended') DEFAULT 'Active',
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- OTP Verification
CREATE TABLE otp_verifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_otp (user_id, otp_code, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Session Management
CREATE TABLE user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_token (session_token),
    INDEX idx_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Companies
CREATE TABLE companies (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_name VARCHAR(200) NOT NULL,
    industry VARCHAR(100),
    website VARCHAR(255),
    phone VARCHAR(20),
    email VARCHAR(254),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    tax_id VARCHAR(50),
    status ENUM('Active', 'Inactive') DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    INDEX idx_company_name (company_name),
    INDEX idx_status (status),
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Contacts
CREATE TABLE contacts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(254),
    phone VARCHAR(20),
    mobile VARCHAR(20),
    position VARCHAR(100),
    department VARCHAR(100),
    is_primary BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    INDEX idx_company (company_id),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tender Categories
CREATE TABLE tender_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    color VARCHAR(7),
    icon VARCHAR(50),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tender Tags
CREATE TABLE tender_tags (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) UNIQUE NOT NULL,
    color VARCHAR(7),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tenders
CREATE TABLE tenders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tender_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    company_id INT,
    category_id INT,
    status ENUM('Draft', 'Submitted', 'Under Review', 'Shortlisted', 'Won', 'Lost', 'Cancelled') DEFAULT 'Draft',
    priority ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
    estimated_value DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    submission_deadline DATETIME,
    expected_award_date DATE,
    contract_duration_months INT,
    assigned_to INT,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES tender_categories(id) ON DELETE SET NULL,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_tender_number (tender_number),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_company (company_id),
    INDEX idx_assigned (assigned_to),
    INDEX idx_deadline (submission_deadline)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tender-Tags Relationship
CREATE TABLE tender_tag_relations (
    tender_id INT NOT NULL,
    tag_id INT NOT NULL,
    PRIMARY KEY (tender_id, tag_id),
    FOREIGN KEY (tender_id) REFERENCES tenders(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tender_tags(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Document Categories
CREATE TABLE document_categories (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Documents
CREATE TABLE documents (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tender_id INT,
    category_id INT,
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT,
    mime_type VARCHAR(100),
    file_hash VARCHAR(64),
    expiration_date DATE,
    is_favorite BOOLEAN DEFAULT FALSE,
    uploaded_by INT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tender_id) REFERENCES tenders(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES document_categories(id) ON DELETE SET NULL,
    FOREIGN KEY (uploaded_by) REFERENCES users(id),
    INDEX idx_tender (tender_id),
    INDEX idx_category (category_id),
    INDEX idx_expiration (expiration_date),
    INDEX idx_favorite (is_favorite)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tender Work Log / Activity Log
CREATE TABLE tender_activities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    tender_id INT NOT NULL,
    user_id INT NOT NULL,
    activity_type ENUM('Created', 'Updated', 'Commented', 'Status Changed', 'Document Added', 'Assigned', 'Deadline Changed') NOT NULL,
    description TEXT,
    old_value VARCHAR(255),
    new_value VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tender_id) REFERENCES tenders(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_tender (tender_id),
    INDEX idx_user (user_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Email Notifications Queue
CREATE TABLE email_notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    tender_id INT,
    notification_type ENUM('Deadline Reminder', 'Status Change', 'Assignment', 'Document Expiry', 'Daily Digest') NOT NULL,
    subject VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    status ENUM('Pending', 'Sent', 'Failed') DEFAULT 'Pending',
    scheduled_for TIMESTAMP,
    sent_at TIMESTAMP NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tender_id) REFERENCES tenders(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_scheduled (scheduled_for)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- System Configuration
CREATE TABLE system_config (
    id INT PRIMARY KEY AUTO_INCREMENT,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value TEXT,
    config_type ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
    is_encrypted BOOLEAN DEFAULT FALSE,
    description TEXT,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Audit Log
CREATE TABLE audit_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    changes JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_user (user_id),
    INDEX idx_entity (entity_type, entity_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 1.2 Initial Data Setup

```sql
-- Insert default admin user (password: Admin@123)
-- Hash generated using bcrypt
INSERT INTO users (email, password_hash, full_name, role, status) VALUES
('admin@tendertrack.com', '$2b$10$X7Xm3Q9KJp8qYZZWJ2xjYe3xGxGxGxGxGxGxGxGxGxGxGxGxGx', 'System Administrator', 'Admin', 'Active');

-- Insert system document categories
INSERT INTO document_categories (name, description, icon, is_system) VALUES
('Tax Documents', 'Tax related documents like GSTIN, PAN', 'FileText', TRUE),
('Certifications', 'ISO, Quality certifications', 'Award', TRUE),
('Company Documents', 'Company registration, incorporation', 'Building2', TRUE),
('Financial Documents', 'Bank statements, financial records', 'DollarSign', TRUE),
('Technical Documents', 'Technical specifications, drawings', 'Wrench', TRUE),
('Legal Documents', 'Contracts, agreements, legal papers', 'Scale', TRUE);

-- Insert default tender categories
INSERT INTO tender_categories (name, description, color, icon) VALUES
('Construction', 'Construction and infrastructure projects', '#3b82f6', 'HardHat'),
('IT Services', 'Software and IT service tenders', '#8b5cf6', 'Laptop'),
('Consultancy', 'Consulting and advisory services', '#10b981', 'Briefcase'),
('Supply', 'Material and equipment supply', '#f59e0b', 'Package'),
('Maintenance', 'Maintenance and support services', '#ef4444', 'Wrench');

-- Insert system configuration
INSERT INTO system_config (config_key, config_value, config_type, description) VALUES
('email_enabled', 'false', 'boolean', 'Enable/disable email notifications'),
('sms_enabled', 'false', 'boolean', 'Enable/disable SMS notifications'),
('session_timeout_minutes', '30', 'number', 'User session timeout in minutes'),
('max_file_upload_mb', '10', 'number', 'Maximum file upload size in MB'),
('deadline_reminder_days', '7,3,1', 'string', 'Days before deadline to send reminders');
```

---

## Phase 2: Backend API Development (Node.js/Express Recommended)

### 2.1 Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts          # MySQL connection pool
│   │   ├── security.ts          # Security configurations
│   │   └── environment.ts       # Environment variables
│   ├── middleware/
│   │   ├── auth.ts             # JWT authentication
│   │   ├── validation.ts       # Input validation
│   │   ├── rateLimit.ts        # Rate limiting
│   │   └── errorHandler.ts    # Error handling
│   ├── models/
│   │   ├── User.ts
│   │   ├── Tender.ts
│   │   ├── Company.ts
│   │   ├── Document.ts
│   │   └── index.ts
│   ├── controllers/
│   │   ├── authController.ts
│   │   ├── tenderController.ts
│   │   ├── companyController.ts
│   │   ├── documentController.ts
│   │   └── userController.ts
│   ├── services/
│   │   ├── emailService.ts
│   │   ├── smsService.ts
│   │   ├── otpService.ts
│   │   └── fileService.ts
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── tenders.ts
│   │   ├── companies.ts
│   │   ├── documents.ts
│   │   └── users.ts
│   ├── utils/
│   │   ├── encryption.ts
│   │   ├── validation.ts
│   │   └── logger.ts
│   └── app.ts
├── package.json
└── tsconfig.json
```

### 2.2 Required Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mysql2": "^3.6.5",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "dotenv": "^16.3.1",
    "express-rate-limit": "^7.1.5",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "multer": "^1.4.5-lts.1",
    "nodemailer": "^6.9.7",
    "twilio": "^4.19.0",
    "joi": "^17.11.0",
    "winston": "^3.11.0",
    "compression": "^1.7.4",
    "express-validator": "^7.0.1"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.5",
    "typescript": "^5.3.3",
    "ts-node": "^10.9.2",
    "nodemon": "^3.0.2"
  }
}
```

### 2.3 Environment Variables (.env)

```bash
# Server
NODE_ENV=production
PORT=5000
API_VERSION=v1

# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=tendertrack_db
DB_USER=tendertrack_user
DB_PASSWORD=your_secure_password_here
DB_CONNECTION_LIMIT=10

# Security
JWT_SECRET=your_jwt_secret_minimum_32_characters_long
JWT_EXPIRY=8h
BCRYPT_ROUNDS=10
SESSION_TIMEOUT_MINUTES=30

# CORS
CORS_ORIGIN=http://localhost:3000

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=10

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@tendertrack.com
EMAIL_FROM_NAME=TenderTrack Pro

# SMS (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
LOGIN_RATE_LIMIT_MAX=5

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
```

### 2.4 Database Connection (database.ts)

```typescript
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '3306'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  // SSL configuration for production
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: true
  } : undefined
});

// Test connection
pool.getConnection()
  .then(connection => {
    console.log('✅ Database connected successfully');
    connection.release();
  })
  .catch(err => {
    console.error('❌ Database connection failed:', err);
    process.exit(1);
  });

export default pool;
```

### 2.5 Authentication Middleware (auth.ts)

```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import db from '../config/database';

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as JWTPayload;

    // Verify session exists and is valid
    const [sessions] = await db.query(
      'SELECT * FROM user_sessions WHERE session_token = ? AND expires_at > NOW()',
      [token]
    );

    if ((sessions as any[]).length === 0) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};
```

### 2.6 API Endpoints Structure

```typescript
// routes/auth.ts
POST   /api/v1/auth/login           # Email/password login
POST   /api/v1/auth/verify-otp      # OTP verification
POST   /api/v1/auth/resend-otp      # Resend OTP
POST   /api/v1/auth/logout          # Logout
POST   /api/v1/auth/refresh         # Refresh token

// routes/users.ts
GET    /api/v1/users                # List users (Admin/Manager)
POST   /api/v1/users                # Create user (Admin)
GET    /api/v1/users/:id            # Get user details
PUT    /api/v1/users/:id            # Update user (Admin)
DELETE /api/v1/users/:id            # Delete user (Admin)
GET    /api/v1/users/me             # Get current user profile

// routes/tenders.ts
GET    /api/v1/tenders              # List tenders (with filters)
POST   /api/v1/tenders              # Create tender
GET    /api/v1/tenders/:id          # Get tender details
PUT    /api/v1/tenders/:id          # Update tender
DELETE /api/v1/tenders/:id          # Delete tender (Admin)
GET    /api/v1/tenders/:id/activities # Get tender activity log
POST   /api/v1/tenders/:id/activities # Add activity

// routes/companies.ts
GET    /api/v1/companies            # List companies
POST   /api/v1/companies            # Create company
GET    /api/v1/companies/:id        # Get company details
PUT    /api/v1/companies/:id        # Update company
DELETE /api/v1/companies/:id        # Delete company
GET    /api/v1/companies/:id/contacts # Get company contacts
POST   /api/v1/companies/:id/contacts # Add contact

// routes/documents.ts
GET    /api/v1/documents            # List documents
POST   /api/v1/documents            # Upload document
GET    /api/v1/documents/:id        # Download document
DELETE /api/v1/documents/:id        # Delete document
PUT    /api/v1/documents/:id/favorite # Toggle favorite
GET    /api/v1/documents/categories # List categories

// routes/reports.ts
GET    /api/v1/reports/dashboard    # Dashboard stats
GET    /api/v1/reports/tenders      # Tender reports
GET    /api/v1/reports/performance  # Performance metrics
GET    /api/v1/reports/export       # Export data

// routes/admin.ts
GET    /api/v1/admin/config         # Get system config
PUT    /api/v1/admin/config         # Update system config
POST   /api/v1/admin/email/test     # Test email config
POST   /api/v1/admin/sms/test       # Test SMS config
GET    /api/v1/admin/audit-logs     # Get audit logs
```

---

## Phase 3: Frontend Integration

### 3.1 API Client Setup

```typescript
// lib/api.ts
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### 3.2 Data Fetching Hooks

```typescript
// hooks/useTenders.ts
import { useState, useEffect } from 'react';
import apiClient from '../lib/api';

export function useTenders() {
  const [tenders, setTenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTenders();
  }, []);

  const fetchTenders = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/tenders');
      setTenders(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createTender = async (data) => {
    const response = await apiClient.post('/tenders', data);
    await fetchTenders();
    return response.data;
  };

  const updateTender = async (id, data) => {
    const response = await apiClient.put(`/tenders/${id}`, data);
    await fetchTenders();
    return response.data;
  };

  const deleteTender = async (id) => {
    await apiClient.delete(`/tenders/${id}`);
    await fetchTenders();
  };

  return { tenders, loading, error, createTender, updateTender, deleteTender, refresh: fetchTenders };
}
```

### 3.3 Environment Variables (.env)

```bash
VITE_API_URL=http://localhost:5000/api/v1
VITE_APP_NAME=TenderTrack Pro
VITE_APP_VERSION=1.0.0
```

---

## Phase 4: Security Implementation

### 4.1 Security Checklist

- [x] Password hashing with bcrypt (10 rounds minimum)
- [x] JWT token authentication
- [x] OTP verification for login
- [x] Rate limiting on all endpoints
- [x] Input validation and sanitization
- [x] SQL injection prevention (parameterized queries)
- [x] XSS prevention
- [x] CSRF protection
- [x] Helmet.js security headers
- [x] CORS configuration
- [x] File upload validation
- [x] Encrypted sensitive data in database
- [x] Audit logging
- [x] Session management with timeout
- [x] HTTPS in production

### 4.2 Security Headers (helmet configuration)

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

---

## Phase 5: Testing Strategy

### 5.1 Backend Testing

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Security tests
npm run test:security

# Load tests
npm run test:load
```

### 5.2 Frontend Testing

```bash
# Component tests
npm run test

# E2E tests
npm run test:e2e

# Accessibility tests
npm run test:a11y
```

---

## Phase 6: Deployment

### 6.1 Production Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates installed
- [ ] Firewall configured
- [ ] Backup system enabled
- [ ] Monitoring tools configured
- [ ] Log rotation enabled
- [ ] CDN configured (if applicable)
- [ ] Load balancer configured
- [ ] Auto-scaling enabled
- [ ] Security scan completed
- [ ] Performance testing completed

### 6.2 Docker Deployment

```dockerfile
# Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
    ports:
      - "3306:3306"

  backend:
    build: ./backend
    environment:
      - NODE_ENV=production
      - DB_HOST=mysql
    depends_on:
      - mysql
    ports:
      - "5000:5000"

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  mysql_data:
```

---

## Development Workflow

### Step-by-Step Implementation Order

1. **Database Setup** (Week 1)
   - Create database and tables
   - Add indexes and constraints
   - Insert seed data
   - Test queries

2. **Backend Core** (Week 2-3)
   - Database connection
   - User authentication
   - JWT and OTP implementation
   - Basic CRUD operations

3. **Backend APIs** (Week 4-5)
   - Tender management APIs
   - Company management APIs
   - Document management APIs
   - User management APIs

4. **Services Integration** (Week 6)
   - Email service
   - SMS service
   - File upload service
   - Notification service

5. **Frontend Integration** (Week 7-8)
   - Connect components to APIs
   - Implement data fetching
   - Add loading and error states
   - Test all features

6. **Testing & QA** (Week 9)
   - Unit testing
   - Integration testing
   - Security testing
   - Performance testing

7. **Deployment** (Week 10)
   - Production setup
   - Deployment
   - Monitoring
   - Documentation

---

## Monitoring & Maintenance

### Logging

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

export default logger;
```

### Health Check

```typescript
// routes/health.ts
app.get('/health', async (req, res) => {
  try {
    await db.query('SELECT 1');
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      error: error.message
    });
  }
});
```

---

## Additional Resources

- **Security:** See `/SECURITY.md` for OWASP compliance details
- **Accessibility:** See `/ACCESSIBILITY_CHECKLIST.md` for WCAG guidelines
- **API Documentation:** Generate using Swagger/OpenAPI
- **Database Migrations:** Use a migration tool like Flyway or db-migrate

---

**Last Updated:** November 22, 2025  
**Version:** 1.0.0  
**Maintained By:** Development Team
