## 6. Run logging query
   - Use `backend/src/services/tenderScoutService.ts` to log each candidate's score breakdown to `tender_scout_logs`.
## Plan to analyze and improve Tender Scout accuracy

1. **Understand current filtering/scoring**  
   - Inspect logs (`backend/src/services/tenderScoutService.ts`) to see what data sources were crawled, which keywords matched, and whether interest thresholds blocked everything. Capture score breakdowns (keywords, value, region, deadline) in logs.
   - Use the matching metadata saved per record (`matched_keywords`/`relevance_score` in `tender_scout_results`) via `tenderScoutController.getResults` to see why existing items were accepted or rejected.

2. **Adjust the scoring function**  
   - Update `calculateRelevance` in `backend/src/services/tenderScoutService.ts` to weight phrase matches higher, factor in the presence of a value/location, and log a lightweight “debug” payload that shows which buckets contributed.
   - Potentially allow `interest` to supply keyword weights or synonyms (stored in JSON) so high-priority terms push scores above the `min_relevance`.

3. **Tune thresholds per profile**  
   - Respect each interest’s `min_relevance` when deciding to store a result, and optionally offer a new “score multiplier” field so admins can tune sensitivity per profile.
   - Extend the `ScoutConfig` form (`src/components/ScoutConfig.tsx`) to edit the new metadata (weights or multipliers) and show what the calculated relevance would be for a sample keyword set.

4. **Surface diagnostics in the UI**  
   - In `src/components/TenderScout.tsx`, display the score breakdown (keywords matched, value/region/deadline contributions) inside the result cards or via an expandable section.
   - Add console/debug logging for the `Run Scout` action to show how many candidates passed each threshold before being saved, so we can tune profiles before repeating a run.

5. **Document the tuning workflow**  
   - Update `README.md`/`src/DEVELOPMENT_GUIDE.md` with the new scoring info (how `min_relevance` and keyword weights interact) so admins can set profiles for high accuracy.

Next steps after plan approval: implement the scoring logging, UI scaffolding, and documentation updates. 

