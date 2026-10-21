import { z } from "zod";
import type { OrderItem, Settings } from "./commerce";

export const localImage = z
  .string()
  .regex(
    /^\/(?:artworks\/[a-zA-Z0-9._-]+\.(?:webp|png|jpg|jpeg)|api\/shop\/images\/[a-f0-9-]+\.(?:webp|png|jpg))$/,
  );
const cents = z.number().int().min(0).max(10000000);
const safeLink = z
  .string()
  .max(500)
  .refine((s) => {
    if (!s) return true;
    try {
      const u = new URL(s);
      return u.protocol === "https:" && !u.username && !u.password;
    } catch {
      return false;
    }
  }, "Use a full https:// link");
const customOption = z.object({
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
  label: z.string().trim().min(1).max(120),
  format: z.enum(["digital", "print", "poster", "canvas", "magnet"]),
  size: z.string().trim().min(1).max(80),
  larger: z.boolean().default(false),
  surcharge: cents,
  framePrice: cents.nullable(),
  active: z.boolean(),
});
export const defaultCustomOptions = [
  {
    id: "digital",
    label: "Just Print - (Digital Version Only)",
    format: "digital" as const,
    size: "Digital file",
    surcharge: 0,
    framePrice: null,
    active: true,
    larger: false,
  },
  ...["4 x 4", "4 x 6", "5 x 7", "8 x 10", "11 x 14", "12 x 12"].map(
    (size, i) => ({
      id: "print-" + i,
      label: "Art print",
      format: "print" as const,
      size,
      surcharge: [0, 0, 0, 1000, 6000, 8500][i],
      larger: i >= 4,
      framePrice: i < 4 ? 500 : 1000,
      active: i !== 0,
    }),
  ),
  {
    id: "poster-0",
    label: "Poster",
    format: "poster" as const,
    size: "18 x 24",
    larger: true,
    surcharge: 18500,
    framePrice: 1500,
    active: true,
  },
  {
    id: "poster-1",
    label: "Poster",
    format: "poster" as const,
    size: "20 x 30",
    larger: true,
    surcharge: 31000,
    framePrice: 2500,
    active: true,
  },
  {
    id: "canvas-0",
    larger: false,
    label: "Canvas",
    format: "canvas" as const,
    size: "12 x 20",
    surcharge: 3999,
    framePrice: null,
    active: true,
  },
  ...[
    ["4 x 4", 650],
    ["4 x 6", 750],
    ["5 x 7", 850],
  ].map(([size, price], i) => ({
    id: "magnet-" + i,
    larger: false,
    label: "Magnet",
    format: "magnet" as const,
    size: String(size),
    surcharge: Number(price),
    framePrice: null,
    active: true,
  })),
];
export const bundleSchema = z.object({
  enabled: z.boolean(),
  categoryId: z.string().min(1).max(60),
  smallSize: z.string().min(1).max(80),
  largeSize: z.string().min(1).max(80),
  smallPair: cents,
  largePair: cents,
  mixedPair: cents,
});
export const defaultBundles = {
  enabled: true,
  categoryId: "prints",
  smallSize: "4 x 4",
  largeSize: "4 x 6",
  smallPair: 600,
  largePair: 875,
  mixedPair: 700,
};
export const siteFields = {
  heroImage: localImage.default(
    "/artworks/scyther-lWQ0foeiGwRy5hvTppqIaSfUmw6HqS.webp",
  ),
  heroAlt: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .default("Featured Pokémon artwork"),
  customHeroImage: localImage.default(
    "/artworks/dragonite-Sn7h0GV1MXBn84XEEQX3qfq5abhEFS.webp",
  ),
  customBase: cents.default(4000),
  customColor: cents.default(2000),
  customOptions: z
    .array(customOption)
    .min(1)
    .max(40)
    .refine(
      (v) => new Set(v.map((x) => x.id)).size === v.length,
      "Option IDs must be unique",
    )
    .default(defaultCustomOptions),
  bundles: bundleSchema.default(defaultBundles),
  policies: z
    .array(
      z
        .object({
          id: z.uuid(),
          title: z.string().max(120),
          body: z.string().max(5000),
          published: z.boolean(),
        })
        .refine(
          (v) =>
            !v.published ||
            (v.title.trim().length > 0 && v.body.trim().length > 0),
          "Add a title and policy text before publishing",
        ),
    )
    .max(15)
    .default([]),
  faqs: z
    .array(
      z
        .object({
          id: z.uuid(),
          question: z.string().max(200),
          answer: z.string().max(3000),
          published: z.boolean(),
        })
        .refine(
          (v) =>
            !v.published ||
            (v.question.trim().length > 0 && v.answer.trim().length > 0),
          "Add a question and answer before publishing",
        ),
    )
    .max(30)
    .default([]),
  socials: z
    .array(
      z
        .object({
          id: z.uuid(),
          label: z.string().max(80),
          url: safeLink,
          active: z.boolean(),
        })
        .refine(
          (v) => !v.active || (v.label.trim().length > 0 && v.url.length > 0),
          "Add a label and link before publishing",
        ),
    )
    .max(10)
    .default([]),
  reviews: z
    .array(
      z
        .object({
          id: z.uuid(),
          name: z.string().max(100),
          text: z.string().max(2000),
          image: localImage.or(z.literal("")),
          permission: z.boolean(),
          published: z.boolean(),
        })
        .refine(
          (v) =>
            !v.published ||
            (v.name.trim().length > 0 &&
              v.text.trim().length > 0 &&
              v.permission),
          "Publish only genuine reviews with permission",
        ),
    )
    .max(30)
    .default([]),
};
export const customSchema = z.object({
  pokemon: z.string().trim().min(1).max(200),
  theme: z.string().trim().min(3).max(3000),
  color: z.boolean(),
  optionId: z.string().max(64),
  framed: z.boolean(),
  delivery: z.enum(["email", "ship", "pickup"]),
});
export type CustomDetails = z.infer<typeof customSchema>;
export function priceCustom(details: CustomDetails, settings: Settings) {
  const option = settings.customOptions.find(
    (o) => o.id === details.optionId && o.active,
  );
  if (!option)
    throw new Error(
      "This custom artwork format is unavailable. Please choose another option.",
    );
  if (
    option.format === "digital" &&
    (details.framed || details.delivery !== "email")
  )
    throw new Error("Digital artwork is unframed and delivered by email only.");
  if (details.framed && option.framePrice === null)
    throw new Error("Framing is not available for that format.");
  if (details.delivery === "email" && option.format !== "digital")
    throw new Error(
      "Printed artwork, canvas, and magnets require shipping or local pickup. Choose Digital Version Only for email delivery.",
    );
  const base = settings.customBase,
    color = details.color ? settings.customColor : 0,
    format = option.surcharge,
    frame = details.framed ? option.framePrice || 0 : 0;
  return {
    base,
    color,
    format,
    frame,
    total: base + color + format + frame,
    label: option.label,
    size: option.size,
    delivery: details.delivery,
  };
}
export const couponSchema = z
  .object({
    id: z.uuid(),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z0-9_-]{2,40}$/),
    kind: z.enum(["percent", "fixed"]),
    amount: z.number().int().min(1).max(10000000),
    minimum: cents,
    expires_at: z.iso.datetime().nullable(),
    active: z.boolean(),
  })
  .refine(
    (v) => v.kind !== "percent" || v.amount <= 100,
    "Percent discounts cannot exceed 100%",
  );
export type Coupon = z.infer<typeof couponSchema>;
export type Bundles = z.infer<typeof bundleSchema>;
function normalized(size: string) {
  return size.toLowerCase().replace(/\s/g, "").replace("×", "x");
}
// Dynamic programming finds the best non-overlapping pairing, including mixed-size deals.
export function bundleDiscount(items: OrderItem[], bundles: Bundles) {
  if (!bundles.enabled) return 0;
  const small: number[] = [],
    large: number[] = [];
  for (const i of items) {
    if (i.categoryId !== bundles.categoryId || i.delivery === "digital")
      continue;
    const list =
      normalized(i.size) === normalized(bundles.smallSize)
        ? small
        : normalized(i.size) === normalized(bundles.largeSize)
          ? large
          : null;
    if (list) for (let n = 0; n < i.quantity; n++) list.push(i.price);
  }
  small.sort((a, b) => b - a);
  large.sort((a, b) => b - a);
  const dp = Array.from({ length: small.length + 1 }, () =>
    Array(large.length + 1).fill(Infinity),
  );
  dp[0][0] = 0;
  for (let a = 0; a <= small.length; a++)
    for (let b = 0; b <= large.length; b++) {
      if (a) dp[a][b] = Math.min(dp[a][b], dp[a - 1][b] + small[a - 1]);
      if (b) dp[a][b] = Math.min(dp[a][b], dp[a][b - 1] + large[b - 1]);
      if (a >= 2)
        dp[a][b] = Math.min(dp[a][b], dp[a - 2][b] + bundles.smallPair);
      if (b >= 2)
        dp[a][b] = Math.min(dp[a][b], dp[a][b - 2] + bundles.largePair);
      if (a && b)
        dp[a][b] = Math.min(dp[a][b], dp[a - 1][b - 1] + bundles.mixedPair);
    }
  return (
    small.reduce((n, p) => n + p, 0) +
    large.reduce((n, p) => n + p, 0) -
    dp[small.length][large.length]
  );
}
export function quoteOrder(
  items: OrderItem[],
  bundles: Bundles,
  coupon: Coupon | null = null,
  now = new Date(),
) {
  const subtotal = items.reduce((n, i) => n + i.price * i.quantity, 0),
    bundle = bundleDiscount(items, bundles);
  if (
    coupon &&
    (!coupon.active ||
      (coupon.expires_at && new Date(coupon.expires_at) <= now) ||
      subtotal < coupon.minimum)
  )
    throw new Error(
      "This coupon is unavailable, expired, or its minimum order has not been reached.",
    );
  const code = coupon
    ? Math.min(
        subtotal,
        coupon.kind === "percent"
          ? Math.floor((subtotal * coupon.amount) / 100)
          : coupon.amount,
      )
    : 0;
  const discount = Math.max(bundle, code);
  return {
    subtotal,
    discount,
    total: subtotal - discount,
    label: discount
      ? code > bundle
        ? `Coupon ${coupon!.code}`
        : "Print bundle deals"
      : "",
    coupon_code: code > bundle ? coupon!.code : "",
  };
}
export const contactSchema = z.object({
  requestId: z.uuid(),
  name: z.string().trim().min(2).max(100),
  email: z.email().max(254),
  phone: z.string().trim().max(40).default(""),
  message: z.string().trim().min(10).max(5000),
  website: z.string().max(0),
});
export const subscriberSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  consent: z.literal(true),
  website: z.string().max(0),
});
