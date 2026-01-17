# LeadTrack Pro - Lead Management System (CRM)

Enterprise-ready lead and tender tracking platform that pairs a full-stack React + TypeScript UI with a secure Node/Express + MySQL backend. It combines comprehensive CRM features (lead management, sales pipeline, activity tracking, deal management) with AI-generated summaries, chat assistance, and a `Tender Scout` discovery pipeline.

## Overview

- **Lead & Tender Management** – create, assign, track, and audit leads/tenders with activity/work-log timelines. Support for multiple lead types (Tender, Lead, Opportunity, etc.).  
- **Sales Pipeline** – visual Kanban-style pipeline with customizable stages, probability tracking, and weighted value calculations.  
- **Activity Tracking** – comprehensive activity logging including calls, meetings, emails, and tasks with full history.  
- **Deal Management** – convert leads to deals, track deal values, probabilities, expected close dates, and sales forecasting.  
- **Document collaboration** – upload, categorize, and surface technical/legal documents tied to each opportunity.  
- **AI-assisted insights** – generate polished executive summaries that include lead/tender data and uploaded document context, store them in the database, download them, send via email, and ask follow-up questions through the embedded chatbot.  
- **Tender Scout** – continuously scrape configured sources (Google, RSS, websites), score opportunities against interest profiles, surface high-relevance discoveries, and import them into the lead tracker.  
- **Sales Analytics** – pipeline metrics, win rate tracking, sales forecasting, and conversion funnel analysis.  
- **Security & observability** – OTP login, role-based access, structured logging, audit trails, and configurable system settings.

## Getting Started

1. **Install dependencies**
   ```bash
   npm install          # installs frontend dependencies
   cd backend && npm install
   ```
2. **Copy environment variables**
   ```bash
   cp .env.example .env
   cd backend && cp .env.example .env
   ```
   Update both files with your local database, JWT, and AI provider credentials.
3. **Apply database schema & migrations**
   ```bash
   # Apply core schema
   # (use backend/scripts or your own migration tool; schema is in backend/database/schema.sql)

   # Ensure the AI summary columns exist
   cd backend
   npm run migrate:ai-summary

   # Run CRM migrations (safe migrations - no data loss)
   npx ts-node scripts/run-crm-migrations.ts safe

   # Optional: Run table rename migrations (test in dev first!)
   # npx ts-node scripts/run-crm-migrations.ts rename
   ```
4. **Start development servers**
   - Backend: `cd backend && npm run dev`
   - Frontend: `npm run dev`

   Both servers watch files and reload automatically.

## Feature Highlights

### CRM Features
- **Lead Management** – Full CRUD APIs for leads with support for multiple lead types (Tender, Lead, Opportunity, etc.)
- **Sales Pipeline** – Visual Kanban board with customizable stages, probability tracking, and weighted value calculations
- **Activity Tracking** – Comprehensive logging for calls, meetings, emails, and tasks with full history
- **Deal Management** – Convert leads to deals, track values, probabilities, close dates, and sales forecasting
- **Sales Analytics** – Pipeline metrics, win rates, forecasting by period (month/quarter/year), and conversion funnels

### Core Features
- **Tender & company management** – CRUD APIs for tenders/leads, companies, users, categories, documents, tags, and reminders.  
- **AI Summary & Chat**  
  - `LeadController.generateSummary` (or `TenderController`) extracts document text (PDF, DOCX), calls `AIService`, persists `ai_summary`, and returns the response.  
  - An AI chatbot reads lead/tender data and documents (`AIService.chatAboutTender`), keeps chat history in the session, and renders inside the Lead/Tender Details page.  
  - Download and email actions are available once a summary exists; the backend includes a rich HTML template plus SendGrid wiring.  
- **Document extraction** – `DocumentExtractor` supports PDFs and DOCX via `pdf-parse` and `mammoth` and adds fallbacks for unsupported formats.  
- **Tender Scout** –  
  - Sources, interests, results, and logs live in dedicated tables added via `backend/database/migrations/add_tender_scout.sql`.  
  - `TenderScoutService.runScout` fetches Google/RSS/website sources, scores relevance, optionally auto-generates AI summaries, and stores discoveries in `tender_scout_results`.  
  - Import flow creates a `leads` (or `tenders`) record from a scout result.  
  - `ScoutConfig` (framed inside the sidebar) lets admins manage interest profiles and scout sources via `tenderScoutApi`.

## Architecture & Stack

- **Frontend:** React 18 + Vite, TypeScript, Tailwind CSS, Shadcn UI components, Lucide icons, centralized API client (`src/lib/api.ts`).  
- **Backend:** Node.js + Express + TypeScript, structured controllers/services, JWT auth, Joi validation, Winston logging, and AI/email utilities.  
- **Database:** MySQL (Azure-compatible) with schema defined in `backend/database/schema.sql` and supplemental migrations (AI summary, scout tables, etc.).  
- **AI Layer:** `AIService` handles provider routing (OpenAI/Gemini/Ollama/HuggingFace), encryption of API keys, prompt tuning for summaries and chat, and accepts context from document extraction.

## Database & Migrations

- Primary schema: `backend/database/schema.sql` (users, tenders/leads, documents, activities, notifications, settings, audit logs).  
- AI summary columns added via `backend/database/migrations/add_ai_summary.sql` (and runnable by `npm run migrate:ai-summary`).  
- Tender Scout tables declared in `backend/database/migrations/add_tender_scout.sql` (sources, interests, results, logs).  
- **CRM Migrations** (new):
  - `004_add_lead_types.sql` - Lead types table
  - `005_add_sales_stages.sql` - Sales stages and pipeline config
  - `006_add_activity_types.sql` - Calls, meetings, emails, tasks tables
  - `007_rename_tenders_to_leads.sql` - Rename tenders table to leads (run after testing)
  - `008_rename_tender_tables.sql` - Rename related tables (run after testing)
  - `009_add_deals_table.sql` - Deals table
  - Use `npx ts-node backend/scripts/run-crm-migrations.ts safe` for safe migrations
  - Use `npx ts-node backend/scripts/run-crm-migrations.ts rename` for table renames (test first!)

## Testing

- Backend tests: `cd backend && npm test` (plus `npm run test:integration`, `npm run test:security` if needed).  
- Frontend tests: `npm test` (or `npm run test:a11y` for accessibility).  
- Linting/formatting: rely on configured IDE tools; run `npm run build` to vet Vite compilation.

## Documentation

Key reference documents:

| Document | Purpose |
| --- | --- |
| `src/DEVELOPMENT_GUIDE.md` | Primary development roadmap, architecture, and schema walkthrough |
| `IMPLEMENTATION_SUMMARY.md` | Feature summary and project context |
| `SECURITY.md` | Security controls overview |
| `ACCESSIBILITY_CHECKLIST.md` | Accessibility obligations and checklist |
| `backend/database/schema.sql` | Canonical database schema |
| `backend/database/migrations/` | Incremental schema changes (AI summary, Tender Scout, etc.) |
| `backend/scripts/` | Utility scripts for migrations, backups, and configuration |

## Support & Contact

- Backend API server: `http://localhost:5000/api/v1`  
- Frontend UI: `http://localhost:5173`  
- When you need help:
  - Security questions → `security@leadtrack.com`
  - Technical issues → `tech-support@leadtrack.com`
  - Accessibility questions → `accessibility@leadtrack.com`

## Next Steps

1. Validate that AI configuration is set (`Administration > AI Settings`) and run `npm run migrate:ai-summary`.  
2. Open a tender to generate an AI summary; use the chat icon to explore context.  
3. Configure Scout sources and interests via `Scout Configuration`, then execute `Tender Scout` to import candidates.  
4. Run `npm run dev` (both backend and frontend) and verify the UI updates reflect server-side changes.

---

**Version:** 1.0.0  
**Last Updated:** November 26, 2025

