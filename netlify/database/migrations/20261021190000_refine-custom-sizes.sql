-- Update custom commission options only; standard gallery prices and past orders are unchanged.
UPDATE shop_settings SET data = jsonb_set(data, '{customOptions}', (
 SELECT jsonb_agg(updated ORDER BY position) FROM (
  SELECT position, option || CASE option->>'id'
   WHEN 'print-0' THEN '{"active":false}'::jsonb
   WHEN 'print-1' THEN '{"surcharge":0,"larger":false}'::jsonb
   WHEN 'print-2' THEN '{"surcharge":0,"larger":false}'::jsonb
   WHEN 'print-3' THEN '{"surcharge":1000,"larger":false}'::jsonb
   WHEN 'print-4' THEN '{"surcharge":6000,"larger":true}'::jsonb
   WHEN 'print-5' THEN '{"surcharge":8500,"larger":true}'::jsonb
   WHEN 'poster-0' THEN '{"surcharge":18500,"larger":true}'::jsonb
   WHEN 'poster-1' THEN '{"surcharge":31000,"larger":true}'::jsonb
   ELSE '{}'::jsonb END AS updated
  FROM jsonb_array_elements(data->'customOptions') WITH ORDINALITY AS options(option, position)
  UNION ALL
  SELECT 0, '{"id":"digital","label":"Just Print - (Digital Version Only)","format":"digital","size":"Digital file","surcharge":0,"framePrice":null,"active":true,"larger":false}'::jsonb
  WHERE NOT EXISTS (SELECT 1 FROM jsonb_array_elements(data->'customOptions') o WHERE o->>'id'='digital')
 ) options
)) || '{"customBase":4000,"customColor":2000}'::jsonb WHERE id=1;
