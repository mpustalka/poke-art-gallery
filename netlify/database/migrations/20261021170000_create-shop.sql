CREATE TABLE shop_categories (
 id text PRIMARY KEY, name text NOT NULL, description text NOT NULL DEFAULT '',
 variants jsonb NOT NULL CHECK (jsonb_typeof(variants) = 'array'), active boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0
);
CREATE TABLE shop_products (
 id uuid PRIMARY KEY, category_id text NOT NULL REFERENCES shop_categories(id), title text NOT NULL, description text NOT NULL DEFAULT '',
 images jsonb NOT NULL CHECK (jsonb_typeof(images) = 'array'), variants jsonb NOT NULL CHECK (jsonb_typeof(variants) = 'array'),
 active boolean NOT NULL DEFAULT true, sort_order integer NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shop_products_category ON shop_products(category_id, sort_order);
CREATE TABLE shop_settings (id integer PRIMARY KEY CHECK (id=1), data jsonb NOT NULL);
CREATE TABLE shop_orders (
 id uuid PRIMARY KEY, reference text NOT NULL UNIQUE, request_id uuid NOT NULL UNIQUE, request_hash text NOT NULL,
 kind text NOT NULL CHECK (kind IN ('standard','custom')), name text NOT NULL, email text NOT NULL, address text NOT NULL DEFAULT '', notes text NOT NULL DEFAULT '',
 payment_method text NOT NULL CHECK (payment_method IN ('cashapp','paypal','undecided')), items jsonb NOT NULL,
 subtotal integer NOT NULL CHECK (subtotal>=0), final_total integer CHECK (final_total>0),
 status text NOT NULL DEFAULT 'new' CHECK (status IN ('new','quoted','awaiting_payment','paid','in_progress','fulfilled','cancelled')),
 admin_notes text NOT NULL DEFAULT '', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX shop_orders_created ON shop_orders(created_at DESC);
CREATE TABLE shop_request_limits (bucket text PRIMARY KEY, attempts integer NOT NULL, expires_at timestamptz NOT NULL);
