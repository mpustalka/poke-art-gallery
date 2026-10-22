"use client";

import { useEffect, useState } from "react";
import { api, money, shippingSummary } from "@/lib/commerce";
import type { OrderItem } from "@/lib/commerce";
import type { ShippingEstimate } from "@/lib/shipping";

export function Pokeball() {
  return (
    <svg viewBox="0 0 40 40" width="28" height="28" aria-hidden="true">
      <path d="M3 20a17 17 0 0 1 34 0" fill="#e3350d" />
      <path d="M3 20a17 17 0 0 0 34 0" fill="#fff8df" />
      <circle
        cx="20"
        cy="20"
        r="17"
        fill="none"
        stroke="#252538"
        strokeWidth="3"
      />
      <path d="M3 20h34" stroke="#252538" strokeWidth="3" />
      <circle
        cx="20"
        cy="20"
        r="6"
        fill="#fff8df"
        stroke="#252538"
        strokeWidth="3"
      />
    </svg>
  );
}
export function ScrollTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const update = () => setVisible(window.scrollY > 350);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return visible ? (
    <button
      type="button"
      className="shop-scroll-top"
      aria-label="Scroll to top"
      onClick={() =>
        window.scrollTo({
          top: 0,
          behavior: window.matchMedia("(prefers-reduced-motion: reduce)")
            .matches
            ? "instant"
            : "smooth",
        })
      }
    >
      <Pokeball />
      <span>↑</span>
    </button>
  ) : null;
}
export function ShippingEstimator({
  items,
  subtotal,
  total,
}: {
  items: OrderItem[];
  subtotal: number;
  total: number;
}) {
  const [zip, setZip] = useState("");
  const [estimate, setEstimate] = useState<ShippingEstimate | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const summary = shippingSummary(items, subtotal);
  if (!items.length) return null;
  if (summary.free)
    return (
      <div className="shop-notice">
        <strong>
          {summary.weightOz
            ? "Free USPS shipping"
            : "Email delivery — no shipping charge"}
        </strong>
        <p>Estimated total before tax: {money(total)}</p>
      </div>
    );
  return (
    <div className="shop-shipping">
      <h4>USPS shipping estimate</h4>
      <p className="shop-muted">
        Estimated package weight: {summary.weightOz} oz. Free shipping on
        artwork subtotals over $25, before discounts. US destinations only.
      </p>
      <form
        className="shop-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          setEstimate(null);
          try {
            setEstimate(
              await api<ShippingEstimate>("shipping", {
                method: "POST",
                body: JSON.stringify({
                  items: items.map((i) => ({
                    productId: i.productId,
                    variantId: i.variantId,
                    quantity: i.quantity,
                  })),
                  zip,
                }),
              }),
            );
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Destination ZIP code
          <input
            required
            pattern="[0-9]{5}"
            maxLength={5}
            inputMode="numeric"
            autoComplete="postal-code"
            value={zip}
            disabled={busy}
            onChange={(e) => {
              setZip(e.target.value);
              setEstimate(null);
              setError("");
            }}
          />
        </label>
        <button className="shop-button shop-secondary" disabled={busy}>
          {busy ? "Checking USPS…" : "Estimate shipping"}
        </button>
      </form>
      {error && (
        <p role="alert" className="shop-notice">
          {error}
        </p>
      )}
      {estimate && (
        <div role="status" className="shop-notice">
          <p>
            {estimate.service}: <strong>{money(estimate.amount)}</strong>
          </p>
          <p>
            Estimated total before tax:{" "}
            <strong>{money(total + estimate.amount)}</strong>
          </p>
          <small>
            Approximate package dimensions and weight; final shipping is
            confirmed before payment.
          </small>
        </div>
      )}
    </div>
  );
}
