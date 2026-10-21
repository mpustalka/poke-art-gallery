-- Digital versions are priced separately from physical formats. Existing prices and order snapshots remain unchanged.
UPDATE shop_categories SET variants = variants || '[{"id":"digital-print","label":"Digital print version (email delivery)","price":250,"delivery":"digital"}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(variants) v WHERE v->>'id'='digital-print');
UPDATE shop_products SET variants = variants || '[{"id":"digital-print","label":"Digital print version (email delivery)","price":250,"delivery":"digital"}]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(variants) v WHERE v->>'id'='digital-print');
