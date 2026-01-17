-- Update the Mobilise profile with broader keywords for better tender discovery
UPDATE tender_scout_interests 
SET keywords = '["software development","IT services","web application","mobile application","cloud services","digital transformation","ERP","enterprise software","government IT","smart city","e-governance","IT infrastructure","application development","software solution","technology services","IT consultancy","system integration","database management","network services","cybersecurity"]',
    categories = '["IT Services","Software Development","Cloud Computing","Digital Services","Technology Consulting"]',
    regions = '["India","Maharashtra","Delhi","Karnataka","Gujarat","Tamil Nadu"]'
WHERE name = 'Mobilise SaaS Opportunities' AND is_active = 1;
