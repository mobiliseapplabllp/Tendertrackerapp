-- Add missing columns for AI search diagnostics
ALTER TABLE tender_scout_interests
  ADD COLUMN IF NOT EXISTS min_relevance INT DEFAULT 25 AFTER auto_import_threshold;

ALTER TABLE tender_scout_results
  ADD COLUMN IF NOT EXISTS matched_keywords JSON AFTER raw_data;

