import {
  readPoll,
  submitVote,
  savePollSettings,
  adjustPollEntry,
  startPollRound,
  PollError,
} from "../../lib/poll-server.ts";
import type { Config, Context } from "@netlify/functions";
import { getDatabase } from "@netlify/database";
import { getStore } from "@netlify/blobs";
import { getUser } from "@netlify/identity";
import { createHash, randomUUID } from "node:crypto";
import { z } from "zod";
import {
  couponSchema,
  contactSchema,
  subscriberSchema,
  quoteOrder,
  priceCustom,
} from "../../lib/site.ts";
import { ZodError } from "zod";
import {
  categorySchema,
  productSchema,
  settingsSchema,
  orderSchema,
  orderUpdateSchema,
  priceOrder,
  validateDelivery,
  requiresShipping,
} from "../../lib/commerce.js";
import type {
  Product,
  Category,
  Catalog,
  OrderInput,
} from "../../lib/commerce.js";

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
async function requireAdmin() {
  const user = await getUser();
  if (!user) throw new HttpError(401, "Please sign in to continue.");
  if (!user.roles?.includes("admin"))
    throw new HttpError(
      403,
      "Your account needs the admin role. Ask the site owner to assign it in Netlify Identity.",
    );
  return user;
}
function checkOrigin(req: Request) {
  if (req.headers.get("origin") !== new URL(req.url).origin)
    throw new HttpError(
      403,
      "Please submit this request from the shop website.",
    );
}
async function body(req: Request) {
  if (!req.headers.get("content-type")?.includes("application/json"))
    throw new HttpError(415, "Send JSON data.");
  const text = await req.text();
  if (text.length > 250000) throw new HttpError(413, "Request is too large.");
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, "Invalid request data.");
  }
}
async function catalog(admin = false): Promise<Catalog> {
  const db = getDatabase();
  const [categories, products, settings] = await Promise.all([
    admin
      ? db.sql`SELECT * FROM shop_categories ORDER BY sort_order, name`
      : db.sql`SELECT * FROM shop_categories WHERE active=true ORDER BY sort_order, name`,
    admin
      ? db.sql`SELECT id, category_id, title, description, images, variants, active, sort_order FROM shop_products ORDER BY sort_order, title`
      : db.sql`SELECT p.id, p.category_id, p.title, p.description, p.images, p.variants, p.active, p.sort_order FROM shop_products p JOIN shop_categories c ON c.id=p.category_id WHERE p.active=true AND c.active=true ORDER BY p.sort_order, p.title`,
    db.sql`SELECT data FROM shop_settings WHERE id=1`,
  ]);
  if (!settings[0])
    throw new HttpError(
      503,
      "The shop is being set up. Please try again shortly.",
    );
  const config = settingsSchema.parse(settings[0].data);
  if (!admin) {
    config.policies = config.policies.filter((p) => p.published);
    config.faqs = config.faqs.filter((f) => f.published);
    config.socials = config.socials.filter((s) => s.active);
    config.reviews = config.reviews.filter((r) => r.published && r.permission);
    config.customOptions = config.customOptions.filter((o) => o.active);
  }
  return {
    categories: categories as Category[],
    products: products as Product[],
    settings: config,
  };
}
function images(context: Context) {
  return getStore({
    name:
      context.deploy.context === "production"
        ? "shop-images"
        : "shop-images-preview",
    consistency: "strong",
  });
}
async function limit(context: Context, namespace = "orders", maximum = 10) {
  const db = getDatabase();
  const key =
    createHash("sha256")
      .update(namespace + ":" + (context.ip || "unknown"))
      .digest("hex") +
    ":" +
    Math.floor(Date.now() / 3600000);
  await db.sql`DELETE FROM shop_request_limits WHERE expires_at < now()`;
  const [row] =
    await db.sql`INSERT INTO shop_request_limits (bucket,attempts,expires_at) VALUES (${key},1,now()+interval '1 hour') ON CONFLICT (bucket) DO UPDATE SET attempts=shop_request_limits.attempts+1 RETURNING attempts`;
  if (row.attempts > maximum)
    throw new HttpError(
      429,
      "Too many requests. Please try again in an hour or contact the shop.",
    );
}
function validatedPrice<T>(calculate: () => T): T {
  try {
    return calculate();
  } catch (e) {
    throw new HttpError(400, (e as Error).message);
  }
}
async function calculate(input: OrderInput) {
  const data = await catalog();
  const items = validatedPrice(() =>
    priceOrder(input, data.products, data.categories),
  );
  if (input.kind === "custom") {
    const pricing = validatedPrice(() =>
      priceCustom(input.custom!, data.settings),
    );
    return {
      items,
      subtotal: pricing.total,
      discount: 0,
      total: pricing.total,
      label: "",
      coupon_code: "",
      custom: {
        ...input.custom,
        label: pricing.label,
        size: pricing.size,
        base: pricing.base,
        colorCharge: pricing.color,
        formatCharge: pricing.format,
        frameCharge: pricing.frame,
        total: pricing.total,
      },
    };
  }
  let coupon = null;
  if (input.coupon_code) {
    const [row] = await getDatabase()
      .sql`SELECT * FROM shop_coupons WHERE code=${input.coupon_code}`;
    if (!row) throw new HttpError(400, "This coupon is unavailable.");
    coupon = couponSchema.parse({
      ...row,
      expires_at: row.expires_at
        ? new Date(row.expires_at).toISOString()
        : null,
    });
  }
  return {
    items,
    ...validatedPrice(() => quoteOrder(items, data.settings.bundles, coupon)),
    custom: null,
  };
}
async function placeOrder(input: OrderInput, context: Context) {
  const db = getDatabase(),
    hash = createHash("sha256").update(JSON.stringify(input)).digest("hex");
  const [existing] =
    await db.sql`SELECT reference,subtotal,discount,discount_label,request_hash FROM shop_orders WHERE request_id=${input.requestId}`;
  if (existing) {
    if (existing.request_hash !== hash)
      throw new HttpError(
        409,
        "This request was already submitted with different details.",
      );
    return json({
      ...existing,
      request_hash: undefined,
      total: existing.subtotal - existing.discount,
    });
  }
  await limit(context);
  const pricing = await calculate(input);
  if (input.kind === "standard")
    validatedPrice(() => validateDelivery(pricing.items, input.address));
  if (pricing.subtotal > 10000000)
    throw new HttpError(400, "Please contact the shop for large orders.");
  const reference =
    "EEV-" + randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
  await db.sql`INSERT INTO shop_orders (id,reference,request_id,request_hash,kind,name,email,address,notes,payment_method,items,subtotal,phone,discount,discount_label,coupon_code,custom_details) VALUES (${randomUUID()},${reference},${input.requestId},${hash},${input.kind},${input.name},${input.email},${input.kind === "standard" && !requiresShipping(pricing.items) ? "Email delivery" : input.address},${input.notes},${input.payment_method},${JSON.stringify(pricing.items)}::jsonb,${pricing.subtotal},${input.phone},${pricing.discount},${pricing.label},${pricing.coupon_code},${pricing.custom ? JSON.stringify(pricing.custom) : null}::jsonb) ON CONFLICT (request_id) DO NOTHING`;
  const [saved] =
    await db.sql`SELECT reference,subtotal,discount,discount_label,request_hash FROM shop_orders WHERE request_id=${input.requestId}`;
  if (saved.request_hash !== hash)
    throw new HttpError(
      409,
      "This request was already submitted with different details.",
    );
  return json(
    {
      ...saved,
      request_hash: undefined,
      total: saved.subtotal - saved.discount,
    },
    201,
  );
}
export default async (req: Request, context: Context) => {
  const path = new URL(req.url).pathname
    .replace(/^\/api\/shop\/?/, "")
    .replace(/\/$/, "");
  try {
    if (!["GET", "POST", "PUT"].includes(req.method))
      return json({ error: "Method not allowed" }, 405);
    if (req.method !== "GET") checkOrigin(req);
    if (path.startsWith("images/") && req.method === "GET") {
      const key = path.slice(7);
      if (!/^[a-f0-9-]{36}\.(png|jpg|webp)$/.test(key))
        return new Response(null, { status: 404 });
      const data = await images(context).get(key, { type: "arrayBuffer" });
      if (!data) return new Response(null, { status: 404 });
      const ext = key.split(".").pop();
      return new Response(data, {
        headers: {
          "Content-Type": ext === "jpg" ? "image/jpeg" : `image/${ext}`,
          "Cache-Control": "public, max-age=31536000, immutable",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": "default-src 'none'",
        },
      });
    }
    if (path === "poll" && req.method === "GET") return json(await readPoll());
    if (path === "poll/vote" && req.method === "POST") {
      await limit(context, "poll", 30);
      return json(await submitVote(await body(req)), 201);
    }
    if (path === "catalog" && req.method === "GET")
      return json(await catalog());
    if (path === "orders" && req.method === "POST")
      return await placeOrder(orderSchema.parse(await body(req)), context);
    if (path === "quote" && req.method === "POST") {
      const raw = await body(req);
      const input = orderSchema.parse({
        requestId: randomUUID(),
        kind: "standard",
        name: "Quote request",
        email: "quote@example.org",
        address: "Quote only",
        notes: "",
        website: "",
        payment_method: "undecided",
        items: raw.items,
        coupon_code: raw.coupon_code || "",
      });
      await limit(context, "quotes", 120);
      return json(await calculate(input));
    }
    if (path === "contact" && req.method === "POST") {
      const c = contactSchema.parse(await body(req));
      await limit(context, "contact");
      await getDatabase()
        .sql`INSERT INTO shop_messages (id,request_id,name,email,phone,message) VALUES (${randomUUID()},${c.requestId},${c.name},${c.email},${c.phone},${c.message}) ON CONFLICT (request_id) DO NOTHING`;
      return json({ saved: true });
    }
    if (path === "subscribe" && req.method === "POST") {
      const v = subscriberSchema.parse(await body(req));
      await limit(context, "subscribe");
      await getDatabase()
        .sql`INSERT INTO shop_subscribers (id,email,consent_text) VALUES (${randomUUID()},${v.email},${"I agree to receive emails about new artwork and shop updates."}) ON CONFLICT (email) DO UPDATE SET active=true,consent_at=now()`;
      return json({ saved: true });
    }
    const adminUser = await requireAdmin();
    if (path === "poll/admin" && req.method === "GET")
      return json(await readPoll(true));
    if (path === "poll/settings" && req.method === "PUT")
      return json(await savePollSettings(await body(req)));
    if (path === "poll/entry" && req.method === "PUT")
      return json(await adjustPollEntry(await body(req), adminUser.id));
    if (path === "poll/new-round" && req.method === "POST")
      return json(await startPollRound(await body(req)));
    if (path === "session" && req.method === "GET")
      return json({ admin: true });
    if (path === "admin" && req.method === "GET")
      return json(await catalog(true));
    const db = getDatabase();
    if (path === "coupons" && req.method === "GET")
      return json({
        coupons: await db.sql`SELECT * FROM shop_coupons ORDER BY code`,
      });
    if (path === "coupons" && req.method === "PUT") {
      const c = couponSchema.parse(await body(req));
      const [duplicate] =
        await db.sql`SELECT id FROM shop_coupons WHERE code=${c.code} AND id!=${c.id}`;
      if (duplicate)
        throw new HttpError(400, "That coupon code already exists.");
      await db.sql`INSERT INTO shop_coupons (id,code,kind,amount,minimum,expires_at,active) VALUES (${c.id},${c.code},${c.kind},${c.amount},${c.minimum},${c.expires_at},${c.active}) ON CONFLICT (id) DO UPDATE SET code=EXCLUDED.code,kind=EXCLUDED.kind,amount=EXCLUDED.amount,minimum=EXCLUDED.minimum,expires_at=EXCLUDED.expires_at,active=EXCLUDED.active`;
      return json({ saved: true });
    }
    if (path === "messages" && req.method === "GET")
      return json({
        messages:
          await db.sql`SELECT * FROM shop_messages ORDER BY created_at DESC LIMIT 200`,
      });
    if (path === "messages" && req.method === "PUT") {
      const v = z
        .object({ id: z.uuid(), resolved: z.boolean() })
        .parse(await body(req));
      await db.sql`UPDATE shop_messages SET resolved=${v.resolved} WHERE id=${v.id}`;
      return json({ saved: true });
    }
    if (path === "subscribers" && req.method === "GET")
      return json({
        subscribers:
          await db.sql`SELECT id,email,active,created_at,consent_at FROM shop_subscribers ORDER BY created_at DESC LIMIT 5000`,
      });
    if (path === "subscribers" && req.method === "PUT") {
      const v = z
        .object({ id: z.uuid(), active: z.boolean() })
        .parse(await body(req));
      await db.sql`UPDATE shop_subscribers SET active=${v.active} WHERE id=${v.id}`;
      return json({ saved: true });
    }
    if (path === "products" && req.method === "PUT") {
      const p = productSchema.parse(await body(req));
      const [category] =
        await db.sql`SELECT id FROM shop_categories WHERE id=${p.category_id}`;
      if (!category) throw new HttpError(400, "Choose an existing category.");
      await db.sql`INSERT INTO shop_products (id,category_id,title,description,images,variants,active,sort_order) VALUES (${p.id},${p.category_id},${p.title},${p.description},${JSON.stringify(p.images)}::jsonb,${JSON.stringify(p.variants)}::jsonb,${p.active},${p.sort_order}) ON CONFLICT (id) DO UPDATE SET category_id=EXCLUDED.category_id,title=EXCLUDED.title,description=EXCLUDED.description,images=EXCLUDED.images,variants=EXCLUDED.variants,active=EXCLUDED.active,sort_order=EXCLUDED.sort_order,updated_at=now()`;
      return json({ saved: true });
    }
    if (path === "categories" && req.method === "PUT") {
      const c = categorySchema.parse(await body(req));
      await db.sql`INSERT INTO shop_categories (id,name,description,variants,active,sort_order) VALUES (${c.id},${c.name},${c.description},${JSON.stringify(c.variants)}::jsonb,${c.active},${c.sort_order}) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,variants=EXCLUDED.variants,active=EXCLUDED.active,sort_order=EXCLUDED.sort_order`;
      return json({ saved: true });
    }
    if (path === "settings" && req.method === "PUT") {
      const settings = settingsSchema.parse(await body(req));
      await db.sql`UPDATE shop_settings SET data=${JSON.stringify(settings)}::jsonb WHERE id=1`;
      return json({ saved: true });
    }
    if (path === "orders" && req.method === "GET") {
      const page = Math.max(
        0,
        Math.min(10000, Number(new URL(req.url).searchParams.get("page")) || 0),
      );
      const rows =
        await db.sql`SELECT id,reference,kind,name,email,address,notes,payment_method,items,subtotal,final_total,status,admin_notes,created_at,phone,discount,discount_label,coupon_code,custom_details FROM shop_orders ORDER BY created_at DESC LIMIT 50 OFFSET ${Math.floor(page) * 50}`;
      return json({ orders: rows });
    }
    if (path === "orders" && req.method === "PUT") {
      const o = orderUpdateSchema.parse(await body(req));
      const rows =
        await db.sql`UPDATE shop_orders SET status=${o.status},admin_notes=${o.admin_notes},final_total=${o.final_total},updated_at=now() WHERE id=${o.id} RETURNING id`;
      if (!rows.length) throw new HttpError(404, "Order not found.");
      return json({ saved: true });
    }
    if (path === "upload" && req.method === "POST") {
      if (Number(req.headers.get("content-length")) > 4500000)
        throw new HttpError(413, "Images must be 4 MB or smaller.");
      const form = await req.formData();
      const file = form.get("file");
      if (
        !(file instanceof File) ||
        file.size < 12 ||
        file.size > 4 * 1024 * 1024
      )
        throw new HttpError(
          400,
          "Choose a PNG, JPEG, or WebP image up to 4 MB.",
        );
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const head = Buffer.from(bytes.subarray(0, 12));
      const ext = head
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        ? "png"
        : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
          ? "jpg"
          : head.toString("ascii", 0, 4) === "RIFF" &&
              head.toString("ascii", 8, 12) === "WEBP"
            ? "webp"
            : null;
      if (!ext)
        throw new HttpError(
          400,
          "Only PNG, JPEG, and WebP images are supported.",
        );
      const key = randomUUID() + "." + ext;
      await images(context).set(key, buffer);
      return json({ url: "/api/shop/images/" + key }, 201);
    }
    return json({ error: "Not found" }, 404);
  } catch (e) {
    if (e instanceof HttpError || e instanceof PollError)
      return json({ error: e.message }, e.status);
    if (e instanceof ZodError)
      return json(
        {
          error: e.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; "),
        },
        400,
      );
    return json(
      {
        error: "The shop is temporarily unavailable. Please try again shortly.",
      },
      503,
    );
  }
};
export const config: Config = { path: "/api/shop/*" };
