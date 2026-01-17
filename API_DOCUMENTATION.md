# LeadTrack Pro - API Documentation

## Base URL
```
http://localhost:5000/api/v1
```

## Authentication
All API endpoints (except `/auth/*`) require authentication via JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## API Endpoints

### Authentication
- `POST /auth/login` - Login with email and OTP
- `POST /auth/send-otp` - Send OTP to email
- `POST /auth/verify-otp` - Verify OTP and get token
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with token
- `GET /auth/me` - Get current user

### Leads (CRM)
- `GET /leads` - Get all leads (with filters, pagination)
- `GET /leads/:id` - Get lead by ID
- `POST /leads` - Create new lead
- `PUT /leads/:id` - Update lead
- `DELETE /leads/:id` - Soft delete lead
- `POST /leads/:id/restore` - Restore deleted lead
- `DELETE /leads/:id/permanent` - Permanently delete lead
- `GET /leads/:id/activities` - Get lead activities
- `POST /leads/:id/activities` - Add activity to lead
- `PUT /leads/:id/activities/:activityId` - Update activity
- `DELETE /leads/:id/activities/:activityId` - Delete activity
- `POST /leads/:id/summary` - Generate AI summary
- `POST /leads/:id/summary/email` - Send summary via email
- `POST /leads/:id/chat` - Chat with AI about lead
- `POST /leads/:id/convert` - Convert lead to deal
- `PUT /leads/:id/stage` - Update sales stage
- `GET /leads/pipeline` - Get pipeline view

### Lead Types
- `GET /lead-types` - Get all lead types
- `GET /lead-types/:id` - Get lead type by ID
- `POST /lead-types` - Create lead type (Admin only)
- `PUT /lead-types/:id` - Update lead type (Admin only)
- `DELETE /lead-types/:id` - Delete lead type (Admin only)

### Sales Stages
- `GET /sales-stages` - Get all sales stages
- `GET /sales-stages/:id` - Get sales stage by ID
- `POST /sales-stages` - Create sales stage (Admin only)
- `PUT /sales-stages/:id` - Update sales stage (Admin only)
- `DELETE /sales-stages/:id` - Delete sales stage (Admin only)

### Pipeline
- `GET /pipeline` - Get pipeline view with all stages and leads
- `GET /pipeline/analytics` - Get pipeline analytics and metrics
- `PUT /pipeline/stages/order` - Update stage order (Admin only)

### Activities
- `GET /activities/leads/:leadId` - Get all activities for a lead
- `POST /activities/leads/:leadId/calls` - Create call log
- `PUT /activities/leads/:leadId/calls/:callId` - Update call
- `DELETE /activities/leads/:leadId/calls/:callId` - Delete call
- `POST /activities/leads/:leadId/meetings` - Create meeting
- `PUT /activities/leads/:leadId/meetings/:meetingId` - Update meeting
- `DELETE /activities/leads/:leadId/meetings/:meetingId` - Delete meeting
- `POST /activities/leads/:leadId/emails` - Log email
- `POST /activities/leads/:leadId/tasks` - Create task
- `PUT /activities/leads/:leadId/tasks/:taskId` - Update task
- `DELETE /activities/leads/:leadId/tasks/:taskId` - Delete task

### Deals
- `GET /deals` - Get all deals (with filters, pagination)
- `GET /deals/:id` - Get deal by ID
- `POST /deals` - Create deal
- `PUT /deals/:id` - Update deal
- `DELETE /deals/:id` - Delete deal
- `GET /deals/forecast` - Get sales forecast

### Tenders (Legacy - Still Supported)
- `GET /tenders` - Get all tenders
- `GET /tenders/:id` - Get tender by ID
- `POST /tenders` - Create tender
- `PUT /tenders/:id` - Update tender
- `DELETE /tenders/:id` - Delete tender
- All other tender endpoints remain functional

### Companies
- `GET /companies` - Get all companies
- `GET /companies/:id` - Get company by ID
- `POST /companies` - Create company
- `PUT /companies/:id` - Update company
- `DELETE /companies/:id` - Delete company

### Documents
- `GET /documents` - Get all documents
- `GET /documents/:id` - Get document by ID
- `POST /documents/upload` - Upload document
- `DELETE /documents/:id` - Delete document
- `GET /documents/:id/view` - View document

### Users
- `GET /users` - Get all users
- `GET /users/:id` - Get user by ID
- `POST /users` - Create user (Admin only)
- `PUT /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Reports
- `GET /reports/tenders` - Get tender reports
- `GET /reports/leads` - Get lead reports
- `GET /reports/sales` - Get sales reports

## Request/Response Examples

### Create Lead
```json
POST /api/v1/leads
{
  "leadNumber": "LD-2025-001",
  "title": "New Business Opportunity",
  "description": "Potential client inquiry",
  "leadTypeId": 1,
  "salesStageId": 1,
  "companyId": 5,
  "dealValue": 50000,
  "probability": 25,
  "source": "Web",
  "status": "Draft",
  "currency": "INR"
}
```

### Create Call Activity
```json
POST /api/v1/activities/leads/1/calls
{
  "subject": "Initial client call",
  "callType": "Outbound",
  "durationMinutes": 15,
  "callDate": "2025-01-27T10:00:00Z",
  "notes": "Discussed requirements"
}
```

### Get Pipeline
```json
GET /api/v1/pipeline?leadTypeId=1

Response:
{
  "success": true,
  "data": {
    "New": {
      "stage": { "id": 1, "name": "New", "probability": 10 },
      "leads": [...],
      "totalValue": 100000,
      "weightedValue": 10000
    },
    ...
  }
}
```

### Get Sales Forecast
```json
GET /api/v1/deals/forecast?period=month

Response:
{
  "success": true,
  "data": {
    "period": "month",
    "metrics": {
      "totalDeals": 10,
      "totalValue": 500000,
      "weightedValue": 250000,
      "wonValue": 100000
    },
    "byStage": [...]
  }
}
```

## Error Responses

All errors follow this format:
```json
{
  "success": false,
  "error": "Error message",
  "errorType": "ValidationError" | "NotFoundError" | "UnauthorizedError" | "ServerError"
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

## Pagination

List endpoints support pagination:
```
GET /api/v1/leads?page=1&pageSize=10
```

Response includes:
```json
{
  "success": true,
  "data": {
    "data": [...],
    "total": 100,
    "page": 1,
    "pageSize": 10,
    "totalPages": 10
  }
}
```

## Filtering

Most list endpoints support filtering:
```
GET /api/v1/leads?search=keyword&status=Draft&leadTypeId=1&assignedTo=5
```

## Sorting

Sorting is supported via query parameters:
```
GET /api/v1/leads?sortBy=createdAt&sortOrder=desc
```

