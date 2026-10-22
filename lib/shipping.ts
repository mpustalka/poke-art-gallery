import { shippingSummary } from "./commerce.ts";
import type { OrderItem } from "./commerce.ts";

export type ShippingEstimate = {
  amount: number;
  service: string;
  weightOz: number;
};
export async function quoteShipping(
  items: OrderItem[],
  subtotal: number,
  zip: string,
  origin: string,
  token: string | undefined,
  request: typeof fetch = fetch,
): Promise<ShippingEstimate> {
  const { free, weightOz } = shippingSummary(items, subtotal);
  if (free)
    return {
      amount: 0,
      service: weightOz ? "Free USPS shipping" : "Email delivery",
      weightOz,
    };
  if (!token || !origin)
    throw new Error(
      "USPS estimates are unavailable. Shipping is confirmed by email before payment.",
    );
  const response = await request("https://api.goshippo.com/shipments/", {
    method: "POST",
    headers: {
      Authorization: `ShippoToken ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      address_from: { zip: origin, country: "US" },
      address_to: { zip, country: "US" },
      parcels: [
        {
          length: "12",
          width: "9",
          height: "2",
          distance_unit: "in",
          weight: String(weightOz),
          mass_unit: "oz",
        },
      ],
      async: false,
    }),
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok)
    throw new Error(
      "USPS could not provide an estimate. Try again or request confirmation by email.",
    );
  const shipment = (await response.json()) as {
    rates?: {
      provider: string;
      currency: string;
      amount: string;
      servicelevel?: { name?: string };
    }[];
  };
  const rates = (shipment.rates || [])
    .filter(
      (r) =>
        r.provider.toUpperCase() === "USPS" &&
        r.currency === "USD" &&
        Number.isFinite(Number(r.amount)) &&
        Number(r.amount) > 0,
    )
    .sort((a, b) => Number(a.amount) - Number(b.amount));
  if (!rates.length)
    throw new Error(
      "No USPS rate is available for this destination. Shipping is confirmed by email.",
    );
  return {
    amount: Math.round(Number(rates[0].amount) * 100),
    service: `USPS ${rates[0].servicelevel?.name || "shipping"}`,
    weightOz,
  };
}
