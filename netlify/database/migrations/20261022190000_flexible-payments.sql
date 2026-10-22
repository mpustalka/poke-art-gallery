-- Preserve the existing Cash App handle while replacing standalone payment fields.
UPDATE shop_settings SET data = (data - 'cashapp' - 'paypal') || jsonb_build_object(
  'paymentMethods', CASE WHEN COALESCE(data->>'cashapp','') <> '' THEN
    jsonb_build_array(jsonb_build_object('id','cashapp','name','Cash App','type','cashapp','value',data->>'cashapp','active',true))
    ELSE '[]'::jsonb END
) WHERE id=1 AND NOT data ? 'paymentMethods';
UPDATE shop_settings SET data = jsonb_set(data, '{paymentNote}', to_jsonb('Choose an available payment method after your order and final total are confirmed. Please wait for confirmation before sending payment.'::text)) WHERE data->>'paymentNote' ILIKE '%paypal%';
ALTER TABLE shop_orders DROP CONSTRAINT shop_orders_payment_method_check;
-- Existing orders retain their historical choice; new choices are checked against active settings by the API.
ALTER TABLE shop_orders ADD CONSTRAINT shop_orders_payment_method_check CHECK (length(payment_method) BETWEEN 1 AND 64);
