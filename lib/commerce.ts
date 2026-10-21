import { z } from "zod";
import { siteFields, customSchema } from "./site.ts";

const label = z.string().trim().min(1).max(120);
export const variantSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
  label,
  delivery: z.enum(["physical", "digital"]).default("physical"),
  price: z.number().int().min(1).max(10000000),
});
export const variantsSchema = z
  .array(variantSchema)
  .min(1)
  .max(40)
  .refine(
    (v) => new Set(v.map((x) => x.id)).size === v.length,
    "Size IDs must be unique",
  );
export const categorySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,60}$/),
  name: label,
  description: z.string().trim().max(1000),
  variants: variantsSchema,
  active: z.boolean(),
  sort_order: z.number().int().min(0).max(1000),
});
export const imageSchema = z
  .string()
  .regex(
    /^\/(?:artworks\/[a-zA-Z0-9._-]+\.(?:webp|png|jpg|jpeg)|api\/shop\/images\/[a-f0-9-]+\.(?:webp|png|jpg))$/,
  );
export const productSchema = z.object({
  id: z.uuid(),
  category_id: categorySchema.shape.id,
  title: label,
  description: z.string().trim().max(3000),
  images: z.array(imageSchema).min(1).max(12),
  variants: variantsSchema,
  active: z.boolean(),
  sort_order: z.number().int().min(0).max(1000),
});
export const settingsSchema = z.object({
  ...siteFields,
  contactEmail: z.email().max(254),
  cashapp: z
    .string()
    .trim()
    .regex(/^(?:\$?[a-zA-Z0-9_]{1,30})?$/),
  paypal: z
    .string()
    .trim()
    .max(300)
    .refine((s) => {
      if (!s) return true;
      try {
        const u = new URL(s);
        return (
          u.protocol === "https:" &&
          [
            "paypal.me",
            "www.paypal.me",
            "paypal.com",
            "www.paypal.com",
          ].includes(u.hostname) &&
          !u.username &&
          !u.password
        );
      } catch {
        return false;
      }
    }, "Use an https://paypal.me or https://paypal.com link"),
  paymentNote: z.string().trim().max(2000),
  shippingNote: z.string().trim().min(1).max(2000),
});
export const cartSchema = z
  .array(
    z.object({
      productId: z.uuid(),
      variantId: variantSchema.shape.id,
      quantity: z.number().int().min(1).max(20),
    }),
  )
  .max(30)
  .refine(
    (items) =>
      items.reduce((n, i) => n + i.quantity, 0) <= 100 &&
      new Set(items.map((i) => i.productId + ":" + i.variantId)).size ===
        items.length,
    "Invalid cart",
  );
export const orderSchema = z
  .object({
    requestId: z.uuid(),
    kind: z.enum(["standard", "custom"]),
    name: z.string().trim().min(2).max(100),
    email: z.email().max(254),
    address: z.string().trim().max(1500),
    notes: z.string().trim().max(5000),
    phone: z.string().trim().max(40).default(""),
    coupon_code: z.string().trim().toUpperCase().max(40).default(""),
    custom: customSchema.nullable().default(null),
    payment_method: z.enum(["cashapp", "paypal", "undecided"]),
    website: z.string().max(0),
    items: cartSchema,
  })
  .superRefine((v, ctx) => {
    if (v.kind === "standard" && !v.items.length)
      ctx.addIssue({
        code: "custom",
        message: "Add at least one product",
        path: ["items"],
      });
    if (
      v.kind === "custom" &&
      (!v.custom || v.items.length || v.phone.replace(/\D/g, "").length < 7)
    )
      ctx.addIssue({
        code: "custom",
        message: "Complete the custom artwork fields and a valid phone number",
        path: ["custom"],
      });
    if (
      v.kind === "custom" &&
      v.custom?.delivery === "ship" &&
      v.address.length < 5
    )
      ctx.addIssue({
        code: "custom",
        message: "Enter a shipping address",
        path: ["address"],
      });
    if (v.kind === "custom" && v.coupon_code)
      ctx.addIssue({
        code: "custom",
        message: "Coupons apply to gallery products only",
        path: ["coupon_code"],
      });
    if (v.items.reduce((n, i) => n + i.quantity, 0) > 100)
      ctx.addIssue({
        code: "custom",
        message: "Limit orders to 100 items",
        path: ["items"],
      });
    const ids = v.items.map((i) => `${i.productId}:${i.variantId}`);
    if (new Set(ids).size !== ids.length)
      ctx.addIssue({
        code: "custom",
        message: "Combine duplicate items",
        path: ["items"],
      });
  });
export const statuses = [
  "new",
  "quoted",
  "awaiting_payment",
  "paid",
  "in_progress",
  "fulfilled",
  "cancelled",
] as const;
export const orderUpdateSchema = z
  .object({
    id: z.uuid(),
    status: z.enum(statuses),
    admin_notes: z.string().max(5000),
    final_total: z.number().int().min(0).max(10000000).nullable(),
  })
  .refine(
    (v) =>
      ![
        "quoted",
        "awaiting_payment",
        "paid",
        "in_progress",
        "fulfilled",
      ].includes(v.status) || v.final_total !== null,
    "Set a final total including shipping and tax before quoting or confirming an order",
  );
export type Variant = z.infer<typeof variantSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Product = z.infer<typeof productSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type OrderInput = z.infer<typeof orderSchema>;
export type OrderItem = {
  productId: string;
  variantId: string;
  title: string;
  category: string;
  categoryId?: string;
  size: string;
  price: number;
  quantity: number;
  image: string;
  delivery?: "physical" | "digital";
};
export type Order = {
  id: string;
  reference: string;
  kind: "standard" | "custom";
  name: string;
  email: string;
  address: string;
  notes: string;
  payment_method: string;
  items: OrderItem[];
  subtotal: number;
  final_total: number | null;
  status: (typeof statuses)[number];
  admin_notes: string;
  created_at: string;
  phone?: string;
  discount?: number;
  discount_label?: string;
  coupon_code?: string;
  custom_details?: Record<string, unknown> | null;
};
export type Catalog = {
  categories: Category[];
  products: Product[];
  settings: Settings;
};
export function priceOrder(
  input: OrderInput,
  products: Product[],
  categories: Category[],
): OrderItem[] {
  return input.items.map((i) => {
    const p = products.find((p) => p.id === i.productId && p.active);
    const v = p?.variants.find((v) => v.id === i.variantId);
    const c = categories.find((c) => c.id === p?.category_id && c.active);
    if (!p || !v || !c)
      throw new Error(
        "A selected product or size is no longer available. Refresh the gallery and try again.",
      );
    return {
      productId: p.id,
      variantId: v.id,
      title: p.title,
      category: c.name,
      categoryId: c.id,
      size: v.label,
      delivery: v.delivery || "physical",
      price: v.price,
      quantity: i.quantity,
      image: p.images[0],
    };
  });
}
export function requiresShipping(items: OrderItem[]) {
  return items.some((i) => i.delivery !== "digital");
}
export function validateDelivery(items: OrderItem[], address: string) {
  if (requiresShipping(items) && address.trim().length < 3)
    throw new Error(
      "Enter a delivery address or pickup request for physical artwork.",
    );
}
export const digitalDeliveryNote =
  "Digital orders are emailed within 1 hour after payment is confirmed. No physical print is included.";
export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch("/api/shop/" + path, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...options?.headers,
    },
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({
    error: "The server could not complete the request. Please try again.",
  }));
  if (!response.ok) throw new Error(data.error || "Request failed");
  return data as T;
}
