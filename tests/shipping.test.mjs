import assert from "node:assert/strict";
import { test } from "node:test";
import { shippingSummary, estimatedWeight } from "../lib/commerce.ts";
import { quoteShipping } from "../lib/shipping.ts";

const physical = {
  productId: "id",
  variantId: "size",
  title: "Eevee",
  size: "4 x 6",
  category: "Prints",
  categoryId: "prints",
  quantity: 2,
  price: 500,
  delivery: "physical",
};
test("shipping excludes digital weight and applies the strict over-$25 threshold", () => {
  assert.deepEqual(shippingSummary([physical], 2500), {
    weightOz: 4,
    free: false,
  });
  assert.equal(shippingSummary([physical], 2501).free, true);
  const digital = { ...physical, delivery: "digital", quantity: 10 };
  assert.deepEqual(shippingSummary([digital], 100), {
    weightOz: 0,
    free: true,
  });
  assert.equal(shippingSummary([physical, digital], 1000).weightOz, 4);
  assert.equal(
    shippingSummary([{ ...physical, weightOz: 8 }], 1000).weightOz,
    16,
  );
  assert.ok(
    estimatedWeight("12 x 20", "frames") > estimatedWeight("4 x 6", "frames"),
  );
});
test("Shippo quote filters carriers and currency and selects cheapest USPS rate", async () => {
  let payload;
  const result = await quoteShipping(
    [physical],
    1000,
    "10001",
    "90210",
    "test-fixture",
    async (url, options) => {
      assert.equal(url, "https://api.goshippo.com/shipments/");
      payload = JSON.parse(options.body);
      return Response.json({
        rates: [
          { provider: "UPS", currency: "USD", amount: "1.00" },
          { provider: "USPS", currency: "CAD", amount: "2.00" },
          { provider: "USPS", currency: "USD", amount: "9.15" },
          {
            provider: "USPS",
            currency: "USD",
            amount: "4.37",
            servicelevel: { name: "Ground Advantage" },
          },
        ],
      });
    },
  );
  assert.equal(result.amount, 437);
  assert.equal(result.service, "USPS Ground Advantage");
  assert.equal(payload.parcels[0].weight, "4");
  assert.equal(payload.address_to.zip, "10001");
});
test("free shipping skips Shippo and failed or unconfigured quotes never become free", async () => {
  const unexpected = async () => {
    throw new Error("Must not call Shippo");
  };
  assert.equal(
    (await quoteShipping([physical], 2600, "", "", undefined, unexpected))
      .amount,
    0,
  );
  await assert.rejects(
    quoteShipping([physical], 2500, "10001", "", undefined),
    /unavailable/,
  );
  await assert.rejects(
    quoteShipping([physical], 2500, "10001", "90210", "fixture", async () =>
      Response.json({ rates: [] }),
    ),
    /No USPS/,
  );
  await assert.rejects(
    quoteShipping(
      [physical],
      2500,
      "10001",
      "90210",
      "fixture",
      async () => new Response(null, { status: 500 }),
    ),
    /could not/,
  );
});
