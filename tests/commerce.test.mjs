import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import {
  orderSchema,
  productSchema,
  settingsSchema,
  orderUpdateSchema,
  priceOrder,
  validateDelivery,
  requiresShipping,
} from "../lib/commerce.ts";

test("Postgres migrations preserve original artwork and seed all requested sizes and prices", async () => {
  const db = new PGlite();
  try {
    for (const file of (await readdir("netlify/database/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.exec(
        await readFile("netlify/database/migrations/" + file, "utf8"),
      );
    const { rows: products } = await db.query("SELECT * FROM shop_products");
    const { rows: categories } = await db.query(
      "SELECT * FROM shop_categories",
    );
    assert.equal(products.length, 25);
    assert.equal(categories.length, 5);
    for (const p of products) {
      const digital = p.variants.find((v) => v.id === "digital-print");
      assert.equal(digital.price, 250);
      assert.equal(digital.delivery, "digital");
    }
    const digitalItem = priceOrder(
      {
        items: [
          {
            productId: products[0].id,
            variantId: "digital-print",
            quantity: 1,
          },
        ],
      },
      products,
      categories,
    );
    assert.equal(digitalItem[0].price, 250);
    assert.equal(requiresShipping(digitalItem), false);
    assert.doesNotThrow(() => validateDelivery(digitalItem, ""));
    const physical = { ...digitalItem[0], delivery: "physical" };
    assert.throws(() => validateDelivery([physical], ""), /address/);
    assert.throws(
      () => validateDelivery([...digitalItem, physical], ""),
      /address/,
    );
    assert.doesNotThrow(() =>
      validateDelivery([...digitalItem, physical], "Local pickup"),
    );

    const { rows: storedSettings } = await db.query(
      "SELECT data FROM shop_settings WHERE id=1",
    );
    const commissionSettings = settingsSchema.parse(storedSettings[0].data);
    for (const [optionId, total] of [
      ["digital", 4000],
      ["print-1", 4000],
      ["print-2", 4000],
      ["print-3", 5000],
      ["print-4", 10000],
      ["print-5", 12500],
      ["poster-0", 22500],
      ["poster-1", 35000],
    ])
      assert.equal(
        priceCustom(
          {
            pokemon: "Eevee",
            theme: "Forest",
            color: false,
            framed: false,
            optionId,
            delivery: optionId === "digital" ? "email" : "ship",
          },
          commissionSettings,
        ).total,
        total,
      );

    for (const product of products)
      assert.ok(productSchema.safeParse(product).success);
    assert.deepEqual(
      categories
        .find((c) => c.id === "magnets")
        .variants.filter((v) => v.delivery !== "digital")
        .map((v) => [v.label, v.price]),
      [
        ["4 x 4", 650],
        ["4 x 6", 750],
        ["5 x 7", 850],
      ],
    );
    assert.deepEqual(
      categories
        .find((c) => c.id === "canvas")
        .variants.filter((v) => v.delivery !== "digital")
        .map((v) => [v.label, v.price]),
      [["12 x 20", 3999]],
    );
    const product = products.find((p) => p.category_id === "magnets");
    const order = orderSchema.parse({
      requestId: randomUUID(),
      kind: "standard",
      name: "Artwork buyer",
      email: "buyer@example.org",
      address: "Pickup requested",
      notes: "",
      payment_method: "paypal",
      website: "",
      items: [
        {
          productId: product.id,
          variantId: product.variants[1].id,
          quantity: 2,
          price: 1,
        },
      ],
    });
    const priced = priceOrder(order, products, categories);
    assert.equal(
      priced[0].price * priced[0].quantity,
      1500,
      "Client-supplied prices are ignored",
    );
    const originalVariants = structuredClone(product.variants);
    product.variants[1].price = 825;
    assert.equal(
      priceOrder(order, products, categories)[0].price,
      825,
      "Orders use the edited price",
    );
    product.variants.push({ id: "new-size", label: "8 x 10", price: 1250 });
    assert.ok(productSchema.safeParse(product).success);
    assert.equal(
      priceOrder(
        { ...order, items: [{ ...order.items[0], variantId: "new-size" }] },
        products,
        categories,
      )[0].price,
      1250,
    );
    product.variants = product.variants.filter(
      (v) => v.id !== order.items[0].variantId,
    );
    assert.throws(
      () => priceOrder(order, products, categories),
      /no longer available/,
      "Removed sizes can no longer be ordered",
    );
    product.variants = originalVariants;
    product.active = false;
    assert.throws(
      () => priceOrder(order, products, categories),
      /no longer available/,
    );
    product.active = true;
    categories.find((c) => c.id === "magnets").active = false;
    assert.throws(
      () => priceOrder(order, products, categories),
      /no longer available/,
    );
    const id = randomUUID(),
      request = randomUUID();
    await db.query(
      "INSERT INTO shop_orders (id,reference,request_id,request_hash,kind,name,email,payment_method,items,subtotal) VALUES ($1,'EEV-EXAMPLE',$2,'hash','standard','Buyer','buyer@example.org','paypal','[]',1500)",
      [id, request],
    );
    await assert.rejects(
      db.query("UPDATE shop_orders SET status='fake' WHERE id=$1", [id]),
    );
    await assert.rejects(
      db.query(
        "INSERT INTO shop_orders (id,reference,request_id,request_hash,kind,name,email,payment_method,items,subtotal) VALUES ($1,'EEV-OTHER',$2,'hash','standard','Buyer','buyer@example.org','paypal','[]',1500)",
        [randomUUID(), request],
      ),
      "Request IDs must prevent duplicate orders",
    );
  } finally {
    await db.close();
  }
});
const input = () => ({
  requestId: randomUUID(),
  kind: "standard",
  name: "Buyer Name",
  email: "buyer@example.org",
  address: "Pickup",
  notes: "",
  payment_method: "cashapp",
  website: "",
  items: [{ productId: randomUUID(), variantId: "size-1", quantity: 1 }],
});
test("order validation blocks spam, invalid quantities, duplicates, and incomplete custom requests", () => {
  const order = input();
  assert.equal(orderSchema.safeParse(order).success, true);
  assert.equal(
    orderSchema.safeParse({ ...order, website: "spam" }).success,
    false,
  );
  assert.equal(
    orderSchema.safeParse({
      ...order,
      items: [{ ...order.items[0], quantity: -1 }],
    }).success,
    false,
  );
  assert.equal(
    orderSchema.safeParse({
      ...order,
      items: [{ ...order.items[0], quantity: 1.5 }],
    }).success,
    false,
  );
  assert.equal(
    orderSchema.safeParse({ ...order, items: [order.items[0], order.items[0]] })
      .success,
    false,
  );
  assert.equal(orderSchema.safeParse({ ...order, items: [] }).success, false);
  assert.equal(
    orderSchema.safeParse({
      ...order,
      kind: "custom",
      items: [],
      notes: "short",
    }).success,
    false,
  );
  assert.equal(
    orderSchema.safeParse({
      ...order,
      kind: "custom",
      items: [],
      notes: "A watercolor Eevee surrounded by forest flowers.",
      phone: "5551234567",
      custom: {
        pokemon: "Eevee",
        theme: "Forest flowers",
        color: false,
        optionId: "digital",
        framed: false,
        delivery: "email",
      },
    }).success,
    true,
  );
});
test("payment confirmation requires an explicit final total", () => {
  assert.equal(
    orderUpdateSchema.safeParse({
      id: randomUUID(),
      status: "paid",
      admin_notes: "",
      final_total: null,
    }).success,
    false,
  );
  assert.equal(
    orderUpdateSchema.safeParse({
      id: randomUUID(),
      status: "paid",
      admin_notes: "Verified in PayPal",
      final_total: 2000,
    }).success,
    true,
  );
});
test("product image and payment links reject executable or offsite destinations", () => {
  const settings = {
    contactEmail: "admin@evileevee.com",
    cashapp: "$ArtShop",
    paypal: "https://paypal.me/artshop",
    paymentNote: "Wait for confirmation.",
    shippingNote: "Shipping confirmed by email.",
  };
  assert.equal(settingsSchema.safeParse(settings).success, true);
  for (const paypal of [
    "javascript:alert(1)",
    "https://paypal.me.evil.example/pay",
    "https://evil.example",
    "https://user@paypal.me/",
  ])
    assert.equal(
      settingsSchema.safeParse({ ...settings, paypal }).success,
      false,
    );
  const product = {
    id: randomUUID(),
    category_id: "prints",
    title: "Eevee",
    description: "",
    images: ["javascript:alert(1)"],
    variants: [{ id: "small", label: "4 x 4", price: 350 }],
    active: true,
    sort_order: 0,
  };
  assert.equal(productSchema.safeParse(product).success, false);
  assert.equal(
    productSchema.safeParse({ ...product, images: ["/artworks/eevee.webp"] })
      .success,
    true,
  );
});

import {
  defaultBundles,
  quoteOrder,
  priceCustom,
  couponSchema,
  subscriberSchema,
} from "../lib/site.ts";
const line = (
  size,
  quantity,
  price = size === "4 x 4" ? 350 : 500,
  categoryId = "prints",
) => ({
  title: "Artwork",
  category: "Prints",
  categoryId,
  size,
  quantity,
  price,
});
test("bundles mix artworks and use the best non-overlapping pairs without increasing edited prices", () => {
  for (const [items, total] of [
    [[line("4 x 4", 2)], 600],
    [[line("4 x 6", 2)], 875],
    [[line("4 x 4", 1), line("4 x 6", 1)], 700],
    [[line("4 x 4", 2), line("4 x 6", 2)], 1400],
    [[line("4 x 4", 3), line("4 x 6", 1)], 1300],
    [[line("4 x 4", 2, 200)], 400],
    [[line("4 x 4", 2, 650, "magnets")], 1300],
  ])
    assert.equal(quoteOrder(items, defaultBundles).total, total);
});
test("coupons choose the better discount, enforce expiry/minimum, and cap at subtotal", () => {
  const coupon = couponSchema.parse({
    id: randomUUID(),
    code: "welcome",
    kind: "percent",
    amount: 10,
    minimum: 0,
    expires_at: null,
    active: true,
  });
  const items = [line("4 x 4", 1), line("4 x 6", 1)];
  assert.equal(quoteOrder(items, defaultBundles, coupon).total, 700);
  assert.equal(
    quoteOrder(items, defaultBundles, { ...coupon, amount: 50 }).total,
    425,
  );
  assert.equal(
    quoteOrder(items, defaultBundles, {
      ...coupon,
      kind: "fixed",
      amount: 10000,
    }).total,
    0,
  );
  assert.throws(
    () => quoteOrder(items, defaultBundles, { ...coupon, minimum: 1000 }),
    /minimum/,
  );
  assert.throws(
    () =>
      quoteOrder(items, defaultBundles, {
        ...coupon,
        expires_at: "2020-01-01T00:00:00Z",
      }),
    /expired/,
  );
  assert.throws(
    () => quoteOrder(items, defaultBundles, { ...coupon, active: false }),
    /unavailable/,
  );
  assert.equal(
    couponSchema.safeParse({ ...coupon, amount: 101 }).success,
    false,
  );
});
test("custom estimates charge base, color, frame and physical format and enforce delivery", () => {
  const settings = settingsSchema.parse({
    contactEmail: "admin@evileevee.com",
    cashapp: "",
    paypal: "",
    paymentNote: "Confirm before paying",
    shippingNote: "Confirmed by email",
  });
  const details = {
    pokemon: "Eevee",
    theme: "Forest flowers",
    color: false,
    optionId: "digital",
    framed: false,
    delivery: "email",
  };
  assert.equal(priceCustom(details, settings).total, 4000);
  assert.equal(priceCustom({ ...details, color: true }, settings).total, 6000);
  for (const [optionId, total] of [
    ["print-1", 4000],
    ["print-2", 4000],
    ["print-3", 5000],
    ["print-4", 10000],
    ["print-5", 12500],
    ["poster-0", 22500],
    ["poster-1", 35000],
  ])
    assert.equal(
      priceCustom({ ...details, optionId, delivery: "ship" }, settings).total,
      total,
    );
  assert.throws(
    () =>
      priceCustom(
        { ...details, optionId: "print-0", delivery: "ship" },
        settings,
      ),
    /unavailable/,
  );
  assert.throws(
    () => priceCustom({ ...details, optionId: "print-3" }, settings),
    /shipping/,
  );
  assert.throws(
    () => priceCustom({ ...details, delivery: "ship" }, settings),
    /email only/,
  );

  assert.equal(
    priceCustom(
      {
        ...details,
        optionId: "print-1",
        color: true,
        framed: true,
        delivery: "ship",
      },
      settings,
    ).total,
    6500,
  );
  for (const [optionId, total] of [
    ["print-4", 11000],
    ["print-5", 13500],
    ["poster-0", 24000],
    ["poster-1", 37500],
  ])
    assert.equal(
      priceCustom(
        { ...details, optionId, framed: true, delivery: "pickup" },
        settings,
      ).total,
      total,
    );
  assert.equal(
    priceCustom(
      { ...details, optionId: "canvas-0", delivery: "ship" },
      settings,
    ).total,
    7999,
  );
  assert.equal(
    priceCustom(
      { ...details, optionId: "magnet-0", delivery: "pickup" },
      settings,
    ).total,
    4650,
  );
  assert.throws(
    () => priceCustom({ ...details, framed: true }, settings),
    /Digital artwork/,
  );
  assert.throws(
    () => priceCustom({ ...details, optionId: "canvas-0" }, settings),
    /shipping/,
  );
  assert.throws(
    () =>
      priceCustom(
        { ...details, optionId: "canvas-0", framed: true, delivery: "ship" },
        settings,
      ),
    /Framing/,
  );
  assert.equal(
    subscriberSchema.safeParse({
      email: "buyer@example.org",
      consent: false,
      website: "",
    }).success,
    false,
  );
  assert.equal(
    settingsSchema.safeParse({
      ...settings,
      reviews: [
        {
          id: randomUUID(),
          name: "Customer",
          text: "Actual review",
          image: "",
          permission: false,
          published: true,
        },
      ],
    }).success,
    false,
  );
});
