import { test, expect } from "@playwright/test";
import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";

let catalog;
let pollSettings;
// Browser fixtures use the exact deploy migrations, isolated from the live database.
test.beforeAll(async () => {
  const db = new PGlite();
  try {
    for (const f of (await readdir("netlify/database/migrations"))
      .filter((f) => f.endsWith(".sql"))
      .sort())
      await db.exec(await readFile("netlify/database/migrations/" + f, "utf8"));
    const { rows: categories } = await db.query(
      "SELECT * FROM shop_categories ORDER BY sort_order",
    );
    const { rows: products } = await db.query(
      "SELECT * FROM shop_products ORDER BY sort_order,title",
    );
    const { rows: settings } = await db.query(
      "SELECT data FROM shop_settings WHERE id=1",
    );
    catalog = { categories, products, settings: settings[0].data };
    const {
      rows: [poll],
    } = await db.query("SELECT data FROM shop_poll_settings WHERE id=1");
    pollSettings = poll.data;
  } finally {
    await db.close();
  }
});
test("gallery tabs, magnets, cart, order receipt, and custom request work on desktop and mobile", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/shop/catalog", (route) =>
    route.fulfill({ json: catalog }),
  );
  const submitted = [];
  await page.route("**/api/shop/orders", async (route) => {
    const input = route.request().postDataJSON();
    submitted.push(input);
    await route.fulfill({
      status: 201,
      json: {
        reference: "EEV-BROWSER-CHECK",
        subtotal: input.kind === "standard" ? 1500 : 0,
      },
    });
  });
  await page.goto("http://localhost:8889/");
  await expect(
    page.getByRole("heading", { name: "Artwork Gallery" }),
  ).toBeVisible();
  const nav = page.getByRole("navigation", { name: "Product categories" });
  await nav.getByRole("button", { name: "Canvas", exact: true }).click();
  await expect(page.locator(".shop-product").first()).toContainText("$39.99");
  await nav.getByRole("button", { name: "Magnets", exact: true }).click();
  const card = page.locator(".shop-product").first();
  await expect(card).toHaveCSS("background-color", "rgb(255, 203, 5)");
  await card
    .getByLabel("Size / finish")
    .selectOption({ label: "4 x 6 — $7.50" });
  await card.getByRole("button", { name: "Add to order" }).click();
  await expect(page.locator("#order")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /My Orders/ })).toBeVisible();
  await page.getByRole("button", { name: /My Orders/ }).click();
  await page.getByRole("link", { name: "Review order & checkout" }).click();
  await expect(page).toHaveURL(/\/order/);
  const order = page.locator("#order");
  await order.getByRole("spinbutton").fill("2");
  await expect(order.locator(".shop-subtotal").last()).toContainText("$15.00");
  const form = order.locator(".shop-order-checkout form");
  await form.getByLabel("Your name").fill("Artwork Buyer");
  await form.getByLabel("Email address").fill("buyer@example.org");
  await form
    .getByLabel("Delivery address or pickup request")
    .fill("Pickup requested");
  await form.getByRole("button", { name: "Place order request" }).click();
  await expect(
    order.getByText("EEV-BROWSER-CHECK", { exact: true }),
  ).toBeVisible();
  await expect(order.getByText(/No payment has been taken/)).toBeVisible();
  expect(submitted[0].items[0].quantity).toBe(2);
  expect(submitted[0].items[0].variantId).toBe("size-1");
  expect(submitted[0].items[0].price).toBeUndefined();
  await page.goto("http://localhost:8889/");
  await page
    .locator(".shop-product")
    .first()
    .getByRole("button", { name: /View.*gallery/ })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("http://localhost:8889/custom-artwork");
  const custom = page.locator("#commission form");
  await custom.getByLabel("Name *", { exact: true }).fill("Custom Art Buyer");
  await custom
    .getByLabel("Email *", { exact: true })
    .fill("custom@example.org");
  await custom.getByLabel("Phone *", { exact: true }).fill("5551234567");
  await custom.getByLabel("Pokémon *", { exact: true }).fill("Eevee");
  await custom
    .getByLabel("Theme / scene *")
    .fill("Forest flowers and a moonlit stream");
  await expect(custom.getByLabel("Format and size *")).toHaveValue("digital");
  await expect(custom.getByLabel("Framed or not framed? *")).toHaveCount(0);
  await expect(custom.getByLabel("Delivery *").locator("option")).toHaveCount(
    1,
  );
  await custom.getByLabel("Color or black & white? *").selectOption("color");
  await expect(page.locator(".shop-custom-estimate")).toContainText("$60.00");
  await custom.getByLabel("Format and size *").selectOption("print-1");
  await custom.getByLabel("Framed or not framed? *").selectOption("yes");
  await expect(page.locator(".shop-custom-estimate")).toContainText("$65.00");
  await expect(
    custom.getByLabel("Delivery *").locator("option[value=email]"),
  ).toHaveCount(0);
  await custom.getByLabel("Delivery *").selectOption("pickup");
  await custom
    .getByRole("button", { name: "Send my custom artwork request" })
    .click();
  await expect(
    page.getByText("EEV-BROWSER-CHECK", { exact: true }),
  ).toBeVisible();
  expect(submitted[1].kind).toBe("custom");
  expect(submitted[1].custom).toMatchObject({
    color: true,
    framed: true,
    delivery: "pickup",
  });
  await page.goto("http://localhost:8889/");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "/tmp/poke-shop-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "/tmp/poke-shop-mobile.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const images = await page
    .locator(".shop-art")
    .evaluateAll((images) =>
      images.every((i) => i.complete && i.naturalWidth > 0),
    );
  expect(images).toBe(true);
  expect(errors).toEqual([]);
});
test("real admin APIs reject unauthenticated reads and writes and foreign origins", async ({
  page,
  request,
}) => {
  await page.goto("http://localhost:8889/admin");
  await expect(
    page.getByRole("heading", { name: "Trainer’s Desk" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sign in", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Admin access requires the admin role", { exact: false }),
  ).toBeVisible();
  for (const path of [
    "session",
    "poll/admin",
    "admin",
    "orders",
    "coupons",
    "messages",
    "subscribers",
  ])
    expect(
      (await request.get("http://localhost:8889/api/shop/" + path)).status(),
    ).toBe(401);
  for (const path of [
    "poll/settings",
    "poll/entry",
    "products",
    "categories",
    "settings",
    "orders",
    "coupons",
    "messages",
    "subscribers",
  ])
    expect(
      (
        await request.put("http://localhost:8889/api/shop/" + path, {
          headers: { Origin: "http://localhost:8889" },
          data: {},
        })
      ).status(),
    ).toBe(401);
  expect(
    (
      await request.post("http://localhost:8889/api/shop/poll/new-round", {
        headers: { Origin: "http://localhost:8889" },
        data: { round: 1 },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post("http://localhost:8889/api/shop/poll/vote", {
        headers: { Origin: "https://foreign.example" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("http://localhost:8889/api/shop/orders", {
        headers: { Origin: "https://foreign.example" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("http://localhost:8889/api/shop/orders", {
        headers: { Origin: "http://localhost:8889" },
        data: {},
      })
    ).status(),
  ).toBe(400);
});

test("bundle preview, coupon response, contact and newsletter forms work", async ({
  page,
}) => {
  await page.route("**/api/shop/catalog", (route) =>
    route.fulfill({ json: catalog }),
  );
  await page.route("**/api/shop/quote", (route) =>
    route.fulfill({
      json: { subtotal: 850, discount: 425, total: 425, label: "Coupon HALF" },
    }),
  );
  const saved = [];
  for (const path of ["contact", "subscribe"])
    await page.route("**/api/shop/" + path, async (route) => {
      saved.push({ path, ...route.request().postDataJSON() });
      await route.fulfill({ json: { saved: true } });
    });
  await page.goto("http://localhost:8889/");
  const cards = page.locator(".shop-product");
  await cards
    .nth(0)
    .getByLabel("Size / finish")
    .selectOption({ label: "4 x 4 — $3.50" });
  await cards.nth(0).getByRole("button", { name: "Add to order" }).click();
  await cards
    .nth(1)
    .getByLabel("Size / finish")
    .selectOption({ label: "4 x 6 — $5.00" });
  await cards.nth(1).getByRole("button", { name: "Add to order" }).click();
  await expect(page.locator("#order")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /My Orders/ })).toBeVisible();
  await page.getByRole("button", { name: /My Orders/ }).click();
  await page.getByRole("link", { name: "Review order & checkout" }).click();
  await expect(page).toHaveURL(/\/order/);
  const order = page.locator("#order");
  await expect(order.locator(".shop-subtotal").last()).toContainText("$7.00");
  await order.getByLabel("Discount code").fill("HALF");
  await order.getByRole("button", { name: "Apply code" }).click();
  await expect(order.locator(".shop-subtotal").last()).toContainText("$4.25");
  await order.getByLabel("Discount code").fill("NEW");
  await expect(order.locator(".shop-subtotal").last()).toContainText("$7.00");
  await page
    .getByRole("link", { name: "Continue shopping", exact: true })
    .click();
  const contact = page.locator("#contact form");
  await expect(page.locator("#contact")).toHaveCount(1);
  await expect(
    contact.locator("input:not([name=website]),textarea"),
  ).toHaveCount(4);
  await expect(contact.locator("select")).toHaveCount(0);
  await expect(
    contact.getByRole("button", { name: "Submit", exact: true }),
  ).toBeVisible();

  await contact.getByLabel("Name *", { exact: true }).fill("Artwork Buyer");
  await contact
    .getByLabel("Email *", { exact: true })
    .fill("buyer@example.org");
  await contact
    .getByLabel("Message *")
    .fill("Can I order a matching pair of prints?");
  await contact.getByRole("button", { name: "Submit" }).click();
  await expect(contact.getByRole("status")).toContainText("message is saved");
  const newsletter = page.locator("#newsletter form");
  await newsletter.getByLabel("Email address *").fill("buyer@example.org");
  await newsletter.getByRole("checkbox").check();
  await newsletter.getByRole("button", { name: "Keep me posted" }).click();
  await expect(newsletter.getByRole("status")).toContainText("on the list");
  expect(saved[1].consent).toBe(true);
  await expect(page.locator("#shipping,#faq,#reviews,#social")).toHaveCount(0);
  await page.goto("http://localhost:8889/custom-artwork");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole("heading", { name: "Make it yours" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const sizes = page.getByLabel("Format and size *");
  await expect(
    sizes.locator(
      "option[value=print-0],option[value=print-4],option[value=poster-0]",
    ),
  ).toHaveCount(0);
  await sizes.selectOption("print-3");
  await expect(
    page.locator(".shop-custom-estimate .shop-subtotal"),
  ).toContainText("$50.00");
  await page.getByRole("checkbox", { name: "Larger than 8 x 10" }).check();
  for (const [id, price] of [
    ["print-4", "$100.00"],
    ["print-5", "$125.00"],
    ["poster-0", "$225.00"],
    ["poster-1", "$350.00"],
  ]) {
    await sizes.selectOption(id);
    await expect(
      page.locator(".shop-custom-estimate .shop-subtotal"),
    ).toContainText(price);
  }
  await expect(sizes.locator("option[value=digital]")).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Larger than 8 x 10" }).uncheck();
  await expect(sizes).toHaveValue("digital");
  await expect(page.getByLabel("Delivery *")).toHaveValue("email");
  await page.screenshot({
    path: "/tmp/poke-custom-mobile.png",
    fullPage: true,
  });
});

test("digital checkout preserves picks across pages and handles mixed delivery", async ({
  page,
}) => {
  const submitted = [];
  await page.route("**/api/shop/catalog", (route) =>
    route.fulfill({ json: catalog }),
  );
  await page.route("**/api/shop/orders", async (route) => {
    submitted.push(route.request().postDataJSON());
    await route.fulfill({
      status: 201,
      json: { reference: "EEV-DIGITAL", subtotal: 500, total: 500 },
    });
  });
  await page.goto("http://localhost:8889/");
  await expect(page.locator('a[href="/admin"]')).toHaveCount(0);
  await expect(page.locator("#order")).toHaveCount(0);
  await page
    .locator(".shop-product")
    .first()
    .getByLabel("Size / finish")
    .selectOption("digital-print");
  await page
    .locator(".shop-product")
    .first()
    .getByRole("button", { name: "Add to order" })
    .click();
  await expect(page.getByRole("button", { name: /My Orders/ })).toBeVisible();
  await page.getByRole("button", { name: /My Orders/ }).click();
  await page.getByRole("link", { name: "Review order & checkout" }).click();
  await expect(page.locator(".shop-subtotal").last()).toContainText("$2.50");
  await expect(
    page.getByLabel("Delivery address or pickup request"),
  ).toHaveCount(0);
  await page.locator(".shop-cart").getByRole("spinbutton").fill("2");
  await page.reload();
  await expect(page.locator(".shop-cart").getByRole("spinbutton")).toHaveValue(
    "2",
  );
  await expect(page.locator(".shop-subtotal").last()).toContainText("$5.00");
  await page
    .getByRole("link", { name: "Continue shopping", exact: true })
    .click();
  await page
    .locator(".shop-product")
    .nth(1)
    .getByRole("button", { name: "Add to order" })
    .click();
  await expect(page.getByRole("button", { name: /My Orders/ })).toBeVisible();
  await page.getByRole("button", { name: /My Orders/ }).click();
  await page.getByRole("link", { name: "Review order & checkout" }).click();
  await expect(
    page.getByLabel("Delivery address or pickup request"),
  ).toBeVisible();
  await page
    .locator(".shop-cart li")
    .last()
    .getByRole("button", { name: "Remove", exact: true })
    .click();
  await expect(
    page.getByLabel("Delivery address or pickup request"),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/poke-digital-checkout.png",
    fullPage: true,
  });
  const form = page.locator(".shop-order-checkout form");
  await form.getByLabel("Your name").fill("Digital Buyer");
  await form.getByLabel("Email address").fill("digital@example.org");
  await form.getByRole("button", { name: "Place order request" }).click();
  await expect(page.getByText("EEV-DIGITAL", { exact: true })).toBeVisible();
  await expect(page.locator(".shop-order-checkout")).toContainText(
    "within 1 hour after payment is confirmed",
  );
  expect(submitted[0].address).toBe("");
  expect(submitted[0].items).toHaveLength(1);
  expect(submitted[0].items[0].variantId).toBe("digital-print");
  expect(submitted[0].items[0].quantity).toBe(2);
});

test("Pokémon poll votes, refreshes results, shows the winner banner and fits mobile", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let voted = false;
  let duplicate = false;
  let shown = true;
  const submissions = [];
  await page.route("**/api/shop/catalog", (route) =>
    route.fulfill({ json: catalog }),
  );
  await page.route("**/api/shop/poll", (route) =>
    route.fulfill({
      json: {
        round: 1,
        settings: {
          ...pollSettings,
          enabled: shown,
          bannerEnabled: shown,
          bannerWinner: "Dragonite",
          bannerImage: catalog.products[0].images[0],
        },
        total: voted ? 43 : 42,
        entries: [
          { pokemon: "eevee", votes: voted ? 15 : 14 },
          { pokemon: "pikachu", votes: 11 },
          { pokemon: "gengar", votes: 8 },
          { pokemon: "mew", votes: 5 },
          { pokemon: "dragonite", votes: 3 },
        ],
      },
    }),
  );
  await page.route("**/api/shop/poll/vote", async (route) => {
    submissions.push(route.request().postDataJSON());
    if (duplicate)
      return route.fulfill({
        status: 429,
        json: { error: "This email can vote again in seven days." },
      });
    voted = true;
    duplicate = true;
    await route.fulfill({
      status: 201,
      json: { saved: true, nextVoteAt: "2026-10-29T12:00:00.000Z" },
    });
  });
  await page.goto("http://localhost:8889/");
  const poll = page.locator("#poll");
  await expect(
    poll.getByRole("heading", { name: "Who should I draw next?" }),
  ).toBeVisible();
  await expect(page.locator(".poll-announcement")).toContainText("Dragonite!");
  expect(
    await page
      .locator(".poll-announcement")
      .evaluate((el) => el.previousElementSibling?.tagName),
  ).toBe("SECTION");
  await expect(poll.locator(".poll-leaderboard li")).toHaveCount(5);
  await expect(poll.locator(".poll-total")).toContainText("42 votes");
  await poll.getByLabel("Your name", { exact: true }).fill("Mira Chen");
  await poll
    .getByLabel("Email address", { exact: true })
    .fill("mira@example.com");
  await poll.getByLabel("Pokémon name", { exact: true }).fill("Eevee");
  await poll.getByRole("button", { name: "Cast my vote" }).click();
  await expect(poll.getByRole("status")).toContainText("Vote caught!");
  await expect(poll.locator(".poll-total")).toContainText("43 votes");
  expect(submissions[0]).toMatchObject({
    name: "Mira Chen",
    email: "mira@example.com",
    pokemon: "Eevee",
  });
  await poll.getByLabel("Your name", { exact: true }).fill("Mira Chen");
  await poll
    .getByLabel("Email address", { exact: true })
    .fill("mira@example.com");
  await poll.getByLabel("Pokémon name", { exact: true }).fill("Pikachu");
  await poll.getByRole("button", { name: "Cast my vote" }).click();
  await expect(poll.getByRole("alert")).toContainText("seven days");
  await page.setViewportSize({ width: 390, height: 844 });
  await poll.scrollIntoViewIfNeeded();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "/tmp/pokemon-poll-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await poll.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: "/tmp/pokemon-poll-desktop.png",
    fullPage: true,
  });
  // A changed server response appears on the next live refresh without navigation.
  shown = false;
  await expect(page.locator(".poll-console")).toHaveCount(0, {
    timeout: 15000,
  });
  await expect(page.locator(".poll-announcement")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("floating cart hides when empty and checkout shows USPS estimates with active payments", async ({
  page,
}) => {
  const settings = {
    ...catalog.settings,
    paymentMethods: [
      {
        id: "venmo-shop",
        name: "Shop Venmo",
        type: "venmo",
        value: "@shop",
        active: true,
      },
      {
        id: "zelle-shop",
        name: "Shop Zelle",
        type: "zelle",
        value: "shop@example.org",
        active: false,
      },
    ],
  };
  await page.route("**/api/shop/catalog", (route) =>
    route.fulfill({ json: { ...catalog, settings } }),
  );
  await page.route("**/api/shop/shipping", (route) =>
    route.fulfill({
      json: { amount: 437, service: "USPS Ground Advantage", weightOz: 2 },
    }),
  );
  await page.goto("http://localhost:8889/");
  await expect(page.getByRole("button", { name: /My Orders/ })).toHaveCount(0);
  await page
    .locator(".shop-product")
    .first()
    .getByRole("button", { name: "Add to order", exact: true })
    .click();
  await page.getByRole("button", { name: /My Orders/ }).hover();
  await expect(page.locator("#mini-cart-items")).toBeVisible();
  await page
    .locator("#mini-cart-items")
    .getByRole("button", { name: /Remove/ })
    .click();
  await expect(page.getByRole("button", { name: /My Orders/ })).toHaveCount(0);
  await page
    .locator(".shop-product")
    .first()
    .getByRole("button", { name: "Add to order", exact: true })
    .click();
  await page.getByRole("button", { name: /My Orders/ }).click();
  await page.getByRole("link", { name: "Review order & checkout" }).click();
  await expect(page.locator('select[name="payment_method"] option')).toHaveText(
    ["Decide after confirmation", "Shop Venmo"],
  );
  await page.getByLabel("Destination ZIP code").fill("10001");
  await page.getByRole("button", { name: "Estimate shipping" }).click();
  await expect(page.locator(".shop-shipping")).toContainText("$4.37");
  await page.getByRole("spinbutton").fill("2");
  await expect(page.locator(".shop-shipping")).not.toContainText("$4.37");
  await page.evaluate(() => window.scrollTo(0, 700));
  await expect(
    page.getByRole("button", { name: "Scroll to top" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Scroll to top" }).click();
  await expect(page.getByRole("button", { name: "Scroll to top" })).toHaveCount(
    0,
  );
});
