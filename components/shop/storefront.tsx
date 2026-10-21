"use client";

import { useEffect, useRef, useState } from "react";
import { useCatalog } from "./catalog";
import ProductDialog from "./product-dialog";
import { ContactForm } from "./community";
import { quoteOrder } from "@/lib/site";
import {
  api,
  money,
  priceOrder,
  cartSchema,
  requiresShipping,
  digitalDeliveryNote,
} from "@/lib/commerce";
import type { Catalog, Product, Settings, OrderInput } from "@/lib/commerce";

type CartItem = { productId: string; variantId: string; quantity: number };
function ProductCard({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (item: CartItem) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [size, setSize] = useState(product.variants[0].id);
  const [image, setImage] = useState(product.images[0]);
  const variant =
    product.variants.find((v) => v.id === size) || product.variants[0];
  return (
    <article className="shop-product">
      <h3>{product.title}</h3>
      <button
        type="button"
        className="shop-image-trigger"
        aria-label={`View ${product.title} gallery and details`}
        onClick={() => setExpanded(true)}
      >
        <img
          className="shop-art"
          src={image}
          alt={product.title}
          loading="lazy"
        />
        <span>View artwork & details ↗</span>
      </button>
      {expanded && (
        <ProductDialog
          product={product}
          initialImage={image}
          onClose={() => setExpanded(false)}
          onAdd={(variantId) =>
            onAdd({ productId: product.id, variantId, quantity: 1 })
          }
        />
      )}
      {product.images.length > 1 && (
        <div className="shop-thumbs" aria-label={`Images of ${product.title}`}>
          {product.images.map((src, i) => (
            <button
              key={src + i}
              type="button"
              aria-label={`Show image ${i + 1} of ${product.title}`}
              aria-pressed={src === image}
              onClick={() => setImage(src)}
            >
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
      <p>{product.description}</p>
      <label>
        Size / finish
        <select value={variant.id} onChange={(e) => setSize(e.target.value)}>
          {product.variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.label} — {money(v.price)}
            </option>
          ))}
        </select>
      </label>
      <div className="shop-row shop-between">
        <strong className="shop-price">{money(variant.price)}</strong>
        <button
          className="shop-button"
          onClick={() =>
            onAdd({ productId: product.id, variantId: variant.id, quantity: 1 })
          }
        >
          Add to order
        </button>
      </div>
    </article>
  );
}
function RequestForm({
  kind,
  items,
  settings,
  onDone,
  couponCode,
  digitalOnly,
  hasDigital,
}: {
  kind: "standard";
  items: CartItem[];
  settings: Settings;
  onDone: () => void;
  couponCode: string;
  digitalOnly: boolean;
  hasDigital: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{
    reference: string;
    subtotal: number;
    discount?: number;
    total?: number;
    discount_label?: string;
    hasDigital?: boolean;
  } | null>(null);
  const lastRequest = useRef<{ signature: string; id: string } | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = e.currentTarget;
    const values = new FormData(form);
    const payload = {
      kind,
      items,
      coupon_code: couponCode,
      ...Object.fromEntries(values),
      address: digitalOnly ? "" : values.get("address") || "",
    };
    const signature = JSON.stringify(payload);
    if (lastRequest.current?.signature !== signature)
      lastRequest.current = { signature, id: crypto.randomUUID() };
    try {
      const result = await api<{ reference: string; subtotal: number }>(
        "orders",
        {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            requestId: lastRequest.current.id,
          }),
        },
      );
      setReceipt({ ...result, hasDigital });
      form.reset();
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (receipt)
    return (
      <div className="shop-notice shop-success" role="status" tabIndex={-1}>
        <h3>Order request received!</h3>
        <p>
          Your reference: <strong>{receipt.reference}</strong>
        </p>
        {
          <p>
            Artwork subtotal:{" "}
            <strong>{money(receipt.total ?? receipt.subtotal)}</strong>
          </p>
        }
        <p>
          Keep this reference. We’ll contact you by email to confirm{" "}
          availability and the final total, including any applicable tax and
          shipping for physical items. No payment has been taken. Please wait
          for confirmation before sending money.
        </p>
        {receipt.hasDigital && <p>{digitalDeliveryNote}</p>}
        <p>
          Questions?{" "}
          <a
            href={`mailto:${settings.contactEmail}?subject=${encodeURIComponent(receipt.reference)}`}
          >
            {settings.contactEmail}
          </a>
        </p>
        <button
          type="button"
          className="shop-button"
          onClick={() => {
            setReceipt(null);
            lastRequest.current = null;
          }}
        >
          Start another request
        </button>
      </div>
    );
  return (
    <form className="shop-form" onSubmit={submit}>
      <div className="shop-fields">
        <label>
          Your name
          <input
            name="name"
            required
            minLength={2}
            maxLength={100}
            autoComplete="name"
          />
        </label>
        <label>
          Email address
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            autoComplete="email"
          />
        </label>
      </div>
      {!digitalOnly && (
        <label>
          Delivery address or pickup request
          <textarea
            name="address"
            required
            maxLength={1500}
            autoComplete="street-address"
            rows={3}
          />
        </label>
      )}
      {hasDigital && <p className="shop-notice">{digitalDeliveryNote}</p>}
      <label>
        Order notes (optional)
        <textarea
          name="notes"
          maxLength={5000}
          rows={4}
          placeholder="Anything I should know about your prints?"
        />
      </label>
      <label>
        Preferred payment method
        <select name="payment_method" defaultValue="undecided">
          <option value="undecided">Decide after confirmation</option>
          <option value="cashapp">Cash App</option>
          <option value="paypal">PayPal</option>
        </select>
      </label>
      <div className="shop-trap" aria-hidden="true">
        <label>
          Leave this blank
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {!digitalOnly && <p className="shop-muted">{settings.shippingNote}</p>}
      <p className="shop-muted">{settings.paymentNote}</p>
      <p className="shop-muted">
        Your contact and delivery details are used to fulfill your order.
      </p>
      {error && (
        <p className="shop-notice shop-error" role="alert">
          {error}
        </p>
      )}
      <button
        disabled={busy || (kind === "standard" && !items.length)}
        className="shop-button"
        type="submit"
      >
        {busy ? "Sending…" : "Place order request"}
      </button>
    </form>
  );
}
export default function Storefront({
  checkoutOnly = false,
}: {
  checkoutOnly?: boolean;
}) {
  const { data, error, reload: load } = useCatalog();
  const [category, setCategory] = useState("prints"),
    [cart, setCart] = useState<CartItem[]>([]),
    [notice, setNotice] = useState("");
  const [couponText, setCouponText] = useState(""),
    [appliedCode, setAppliedCode] = useState(""),
    [couponQuote, setCouponQuote] = useState<{
      discount: number;
      total: number;
      label: string;
    } | null>(null),
    [couponError, setCouponError] = useState(""),
    [checkingCoupon, setCheckingCoupon] = useState(false);
  const [cartReady, setCartReady] = useState(false);
  useEffect(() => {
    try {
      const raw = new URLSearchParams(window.location.search).get("cart");
      if (raw) {
        const parsed = cartSchema.safeParse(JSON.parse(raw));
        if (parsed.success) setCart(parsed.data);
        else setNotice("Your order link is invalid. Please add artwork again.");
      }
    } catch {
      setNotice("Your order link is invalid. Please add artwork again.");
    }
    setCartReady(true);
  }, []);
  useEffect(() => {
    if (!cartReady) return;
    const url = new URL(window.location.href);
    if (cart.length) url.searchParams.set("cart", JSON.stringify(cart));
    else url.searchParams.delete("cart");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  }, [cart, cartReady]);
  useEffect(() => {
    if (!data || !cartReady) return;
    setCart((current) => {
      const valid = current.filter((i) =>
        data.products.some(
          (p) =>
            p.id === i.productId &&
            p.active &&
            p.variants.some((v) => v.id === i.variantId),
        ),
      );
      if (valid.length !== current.length) {
        setNotice("Unavailable items were removed from your order.");
        return valid;
      }
      return current;
    });
  }, [data, cartReady]);
  const quoteVersion = useRef(0);
  useEffect(() => {
    quoteVersion.current++;
    setAppliedCode("");
    setCouponQuote(null);
    setCouponError("");
  }, [cart]);
  function add(item: CartItem) {
    setCart((current) => {
      const old = current.find(
        (i) => i.productId === item.productId && i.variantId === item.variantId,
      );
      return old
        ? current.map((i) =>
            i === old ? { ...i, quantity: Math.min(20, i.quantity + 1) } : i,
          )
        : [...current, item];
    });
    setNotice("Added to your order. Open Your order to review and checkout.");
  }
  if (!data)
    return (
      <section id="gallery" className="shop-section">
        <div className="shop-wrap">
          <h2>{checkoutOnly ? "Your Order" : "Artwork Gallery"}</h2>
          {error ? (
            <div className="shop-notice shop-error" role="alert">
              <p>{error}</p>
              <button onClick={() => void load()} className="shop-button">
                Try again
              </button>
            </div>
          ) : (
            <div
              className="shop-grid"
              aria-label="Loading artwork"
              aria-busy="true"
            >
              {[0, 1, 2].map((i) => (
                <div className="shop-skeleton" key={i} />
              ))}
            </div>
          )}
        </div>
      </section>
    );
  const selected =
    data.categories.find((c) => c.id === category) || data.categories[0];
  const products = data.products.filter((p) => p.category_id === selected?.id);
  const availableCart = cart.filter((i) =>
    data.products.some(
      (p) =>
        p.id === i.productId &&
        p.active &&
        p.variants.some((v) => v.id === i.variantId),
    ),
  );
  const priced = priceOrder(
    { items: availableCart } as OrderInput,
    data.products,
    data.categories,
  );
  const deal = quoteOrder(priced, data.settings.bundles),
    subtotal = deal.subtotal;
  const quote = couponQuote || deal;
  const cartQuery = cart.length
    ? "?cart=" + encodeURIComponent(JSON.stringify(cart))
    : "";
  const orderHref = "/order" + cartQuery;
  const digitalOnly = priced.length > 0 && !requiresShipping(priced);
  const hasDigital = priced.some((i) => i.delivery === "digital");
  return (
    <>
      {!checkoutOnly && (
        <>
          <section id="gallery" className="shop-section">
            <div className="shop-wrap">
              <div className="shop-heading">
                <span className="shop-eyebrow">The Collection</span>
                <h2>Artwork Gallery</h2>
                <p>
                  Find your favorite Pokémon. Choose a format, pick a size, and
                  make it yours.
                </p>
              </div>
              {data.settings.bundles.enabled && (
                <div className="shop-deal-banner">
                  <strong>Mix, match & save</strong>
                  <span>
                    Two {data.settings.bundles.smallSize} prints{" "}
                    {money(data.settings.bundles.smallPair)} · Two{" "}
                    {data.settings.bundles.largeSize} prints{" "}
                    {money(data.settings.bundles.largePair)} · One of each{" "}
                    {money(data.settings.bundles.mixedPair)}
                  </span>
                  <small>
                    Automatic deals on eligible art prints. Best discount wins;
                    coupons do not stack.
                  </small>
                </div>
              )}
              <nav className="shop-tabs" aria-label="Product categories">
                {data.categories.map((c) => (
                  <button
                    key={c.id}
                    aria-pressed={c.id === selected?.id}
                    onClick={() => setCategory(c.id)}
                  >
                    {c.name}
                  </button>
                ))}
              </nav>
              {selected && (
                <p className="shop-category-note">
                  {selected.description} Sizes are in inches. Prices in USD.
                  Images show artwork previews; see additional images for
                  product photos.
                </p>
              )}
              <div className="shop-row shop-between shop-gallery-tools">
                <p role="status">{notice}</p>
                <a className="shop-button shop-secondary" href={orderHref}>
                  Your order ({cart.reduce((n, i) => n + i.quantity, 0)})
                </a>
              </div>
              {products.length ? (
                <div className="shop-grid">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} onAdd={add} />
                  ))}
                </div>
              ) : (
                <div className="shop-notice">
                  New {selected?.name.toLowerCase() || "artwork"} is on the way.
                  Check another tab or request a custom piece below.
                </div>
              )}
            </div>
          </section>
          <section id="sizes" className="shop-section">
            <div className="shop-wrap">
              <div className="shop-heading">
                <span className="shop-eyebrow">Choose your size</span>
                <h2>Sizes &amp; Prices</h2>
                <p>
                  Starting prices by format. Each listing shows its available
                  sizes and current price.
                </p>
              </div>
              <div className="shop-price-groups">
                {data.categories.map((c) => (
                  <article key={c.id} className="shop-panel">
                    <h3>{c.name}</h3>
                    <dl className="shop-price-list">
                      {c.variants.map((v) => (
                        <div key={v.id}>
                          <dt>
                            {v.label}
                            {v.delivery === "digital" ? "" : " in."}
                          </dt>
                          <dd>{money(v.price)}</dd>
                        </div>
                      ))}
                    </dl>
                  </article>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
      {checkoutOnly && (
        <section id="order" className="shop-section">
          <div className="shop-wrap">
            <div className="shop-heading">
              <span className="shop-eyebrow">Ready to catch one?</span>
              <h2>Your Order</h2>
              <p>
                Pay with Cash App or PayPal after your order and final total are
                confirmed.
              </p>
            </div>
            <div className="shop-checkout">
              <div className="shop-panel">
                <h3>Your picks</h3>
                {!cart.length ? (
                  <p>
                    Your order is empty.{" "}
                    <a href={"/" + cartQuery + "#gallery"}>
                      Explore the gallery
                    </a>{" "}
                    to add artwork.
                  </p>
                ) : (
                  <ul className="shop-cart">
                    {cart.map((i, index) => {
                      const p = data.products.find((p) => p.id === i.productId);
                      const v = p?.variants.find((v) => v.id === i.variantId);
                      return (
                        <li key={i.productId + i.variantId}>
                          <img src={p?.images[0]} alt="" />
                          <div>
                            <strong>{p?.title}</strong>
                            <p>
                              {
                                data.categories.find(
                                  (c) => c.id === p?.category_id,
                                )?.name
                              }{" "}
                              · {v?.label}
                            </p>
                            <p>{money((v?.price || 0) * i.quantity)}</p>
                            <label>
                              Quantity
                              <input
                                aria-label={`Quantity for ${p?.title}, ${v?.label}`}
                                type="number"
                                min={1}
                                max={20}
                                value={i.quantity}
                                onChange={(e) =>
                                  setCart(
                                    cart.map((item, n) =>
                                      n === index
                                        ? {
                                            ...item,
                                            quantity: Math.max(
                                              1,
                                              Math.min(
                                                20,
                                                Number(e.target.value) || 1,
                                              ),
                                            ),
                                          }
                                        : item,
                                    ),
                                  )
                                }
                              />
                            </label>
                            <button
                              className="shop-link-button"
                              onClick={() =>
                                setCart(cart.filter((_, n) => n !== index))
                              }
                            >
                              Remove
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <p className="shop-subtotal">
                  Artwork subtotal <strong>{money(subtotal)}</strong>
                </p>
                <form
                  className="shop-form shop-coupon-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setCheckingCoupon(true);
                    setCouponError("");
                    const version = ++quoteVersion.current;
                    try {
                      const result = await api<{
                        discount: number;
                        total: number;
                        label: string;
                      }>("quote", {
                        method: "POST",
                        body: JSON.stringify({
                          items: cart,
                          coupon_code: couponText,
                        }),
                      });
                      if (version !== quoteVersion.current) return;
                      setCouponQuote(result);
                      setAppliedCode(couponText.trim().toUpperCase());
                    } catch (e) {
                      setCouponError((e as Error).message);
                      setAppliedCode("");
                      setCouponQuote(null);
                    } finally {
                      setCheckingCoupon(false);
                    }
                  }}
                >
                  <label>
                    Discount code
                    <input
                      value={couponText}
                      onChange={(e) => {
                        quoteVersion.current++;
                        setCouponText(e.target.value);
                        setAppliedCode("");
                        setCouponQuote(null);
                      }}
                      maxLength={40}
                      autoComplete="off"
                      placeholder="Enter a code"
                    />
                  </label>
                  <div className="shop-row">
                    <button
                      disabled={
                        !cart.length || !couponText.trim() || checkingCoupon
                      }
                      className="shop-button shop-secondary"
                    >
                      {checkingCoupon ? "Checking…" : "Apply code"}
                    </button>
                    {appliedCode && (
                      <button
                        type="button"
                        className="shop-link-button"
                        onClick={() => {
                          setAppliedCode("");
                          setCouponQuote(null);
                          setCouponText("");
                        }}
                      >
                        Remove code
                      </button>
                    )}
                  </div>
                  {couponError && (
                    <p role="alert" className="shop-error shop-notice">
                      {couponError}
                    </p>
                  )}
                </form>
                {quote.discount > 0 && (
                  <p className="shop-subtotal shop-savings">
                    {quote.label}
                    <strong>−{money(quote.discount)}</strong>
                  </p>
                )}
                <p className="shop-subtotal">
                  After discounts <strong>{money(quote.total)}</strong>
                </p>
                <p className="shop-muted">
                  {digitalOnly
                    ? "Email delivery only. No shipping charge. Any applicable tax is confirmed before payment."
                    : "Shipping and any applicable tax are confirmed separately before payment."}
                </p>
                {notice && <p role="status">{notice}</p>}
                <a
                  className="shop-button shop-secondary"
                  href={"/" + cartQuery + "#gallery"}
                >
                  Continue shopping
                </a>
              </div>
              <div className="shop-panel shop-order-checkout">
                <h3>Order details</h3>
                <RequestForm
                  couponCode={appliedCode}
                  kind="standard"
                  items={availableCart}
                  settings={data.settings}
                  digitalOnly={digitalOnly}
                  hasDigital={hasDigital}
                  onDone={() => setCart([])}
                />
              </div>
            </div>
          </div>
        </section>
      )}
      {!checkoutOnly && (
        <section id="contact" className="shop-section">
          <div className="shop-wrap shop-custom-grid">
            <div>
              <span className="shop-eyebrow">Get in touch</span>
              <h2>Contact Us</h2>
              <p>Send a message and we’ll follow up by email.</p>
            </div>
            <div className="shop-panel">
              <ContactForm />
            </div>
          </div>
        </section>
      )}
      {!checkoutOnly && (
        <section id="custom" className="shop-section shop-custom">
          <div className="shop-wrap shop-custom-grid">
            <div>
              <span className="shop-eyebrow">Your Pokémon. Your story.</span>
              <h2>Made Just for You</h2>
              <p>
                A custom drawing starts at {money(data.settings.customBase)}.
                Choose black & white or color, a print or another format, and a
                frame if you like.
              </p>
            </div>
            <div className="shop-panel">
              <h3>Build your custom artwork</h3>
              <p>
                Choose your Pokémon, theme, size, and delivery on our dedicated
                custom artwork page. Every upgrade has a clear price before you
                submit.
              </p>
              <a className="shop-button" href="/custom-artwork">
                Design my custom artwork →
              </a>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
