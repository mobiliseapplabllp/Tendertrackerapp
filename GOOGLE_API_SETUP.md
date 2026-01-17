# 🎯 Google Custom Search API Setup Guide

## Quick Setup (5 minutes)

### Step 1: Get API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Custom Search API**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Custom Search API"
   - Click "Enable"
4. Create credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the API key

### Step 2: Create Custom Search Engine

1. Go to [Programmable Search Engine](https://programmable searchengine.google.com/create)
2. Click "Add" to create new search engine
3. Configure:
   - **Sites to search**: `*.gov.in/*`
   - **Name**: "India Government Tenders"
   - **Search the entire web**: No (search only included sites)
4. Click "Create"
5. Copy the **Search engine ID** (cx parameter)

### Step 3: Add to Environment Variables

Add to `backend/.env`:

```bash
# Google Custom Search API
GOOGLE_CUSTOM_SEARCH_API_KEY=YOUR_API_KEY_HERE
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=YOUR_ENGINE_ID_HERE
```

### Step 4: Test It!

```bash
cd backend
npm run dev
```

Then in your app, click "Tender Scout" > "Run Scout Now"

## Free Tier Limits

- **100 queries/day** - FREE
- **10,000 queries/day** - $5/1000 queries

For daily scouting, you'll stay within the free tier! 🎉

## Alternative: Skip Google API

The system works without Google API using:
- RSS feeds from GeM/eProcurement
- Direct website scraping

Just leave the environment variables empty and it will skip Google Search.

---

**Next**: Click "Tender Scout" in the sidebar to start discovering tenders!
