"use client";
import { useRef, useState } from "react";
import { api, money } from "@/lib/commerce";
import { priceCustom } from "@/lib/site";
import { HeroImage, useCatalog } from "./catalog";
export default function CustomArtwork() {
  const { data, error, reload } = useCatalog(),
    [optionId, setOptionId] = useState("digital"),
    [larger, setLarger] = useState(false),
    [color, setColor] = useState(false),
    [framed, setFramed] = useState(false),
    [delivery, setDelivery] = useState<"email" | "ship" | "pickup">("email");
  const [busy, setBusy] = useState(false),
    [failure, setFailure] = useState(""),
    [receipt, setReceipt] = useState<{
      reference: string;
      subtotal: number;
    } | null>(null);
  const request = useRef<{ signature: string; id: string } | null>(null);
  const options = data?.settings.customOptions.filter((o) => o.active) || [],
    visibleOptions = options.filter((o) => Boolean(o.larger) === larger),
    option = visibleOptions.find((o) => o.id === optionId) || visibleOptions[0];
  const digital = option?.format === "digital",
    physical = !digital,
    chosenDelivery = digital
      ? "email"
      : delivery === "email"
        ? "ship"
        : delivery,
    chosenFramed = !digital && option?.framePrice !== null && framed;
  const pricing =
    data && option
      ? priceCustom(
          {
            pokemon: "Preview",
            theme: "Preview",
            color,
            framed: chosenFramed,
            optionId: option.id,
            delivery: chosenDelivery,
          },
          data.settings,
        )
      : null;
  function selectOption(id: string) {
    const o = options.find((o) => o.id === id)!;
    setOptionId(id);
    if (o.framePrice === null) setFramed(false);
    setDelivery(o.format === "digital" ? "email" : "ship");
  }
  return (
    <>
      <header className="shop-custom-header">
        <a href="/">← Poke Print Shop</a>
        <a href="#commission">Create your artwork</a>
      </header>
      <main>
        <section className="shop-commission-hero">
          <div className="shop-wrap shop-commission-hero-grid">
            <div>
              <span className="shop-eyebrow">
                An original encounter, drawn for you
              </span>
              <h1>
                Your favorite Pokémon.
                <br />
                <em>Your own world.</em>
              </h1>
              <p>
                Dream up a scene. Pick your Pokémon. Let’s turn your idea into a
                custom piece of artwork.
              </p>
              <div className="shop-row">
                <a href="#commission" className="shop-button">
                  Start creating →
                </a>
                <span className="shop-custom-badge">
                  From {money(data?.settings.customBase ?? 4000)} · Color +
                  {money(data?.settings.customColor ?? 2000)}
                </span>
              </div>
            </div>
            <div className="shop-commission-art">
              <HeroImage custom />
              <span>From the sketchbook to your story</span>
            </div>
          </div>
        </section>
        <section id="commission" className="shop-section">
          <div className="shop-wrap">
            {!data ? (
              <div className="shop-notice" role={error ? "alert" : "status"}>
                {error || "Loading custom artwork options…"}
                {error && (
                  <button className="shop-button" onClick={() => void reload()}>
                    Try again
                  </button>
                )}
              </div>
            ) : !option ? (
              <div className="shop-notice">
                Custom artwork options are being updated. Please{" "}
                <a href={`mailto:${data.settings.contactEmail}`}>
                  contact the studio
                </a>
                .
              </div>
            ) : receipt ? (
              <div className="shop-panel shop-custom-receipt" role="status">
                <span className="shop-eyebrow">Your story starts here</span>
                <h2>Your request is in!</h2>
                <p>
                  Reference: <strong>{receipt.reference}</strong>
                </p>
                <p>
                  Artwork estimate: <strong>{money(receipt.subtotal)}</strong>
                </p>
                <p>
                  We’ll follow up to confirm the artwork, delivery, timeline,
                  and final total including any shipping and tax. No payment has
                  been taken. Please wait for confirmation before sending money.
                </p>
                <a className="shop-button" href="/">
                  Back to the gallery
                </a>
              </div>
            ) : (
              <div className="shop-commission-layout">
                <div className="shop-panel">
                  <span className="shop-eyebrow">The creative brief</span>
                  <h2>Make it yours</h2>
                  <p>Fields marked * are required.</p>
                  <form
                    className="shop-form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const form = e.currentTarget,
                        values = new FormData(form);
                      setBusy(true);
                      setFailure("");
                      const payload = {
                        kind: "custom",
                        name: values.get("name"),
                        email: values.get("email"),
                        phone: values.get("phone"),
                        address:
                          chosenDelivery === "ship"
                            ? values.get("address") || ""
                            : chosenDelivery === "pickup"
                              ? "Local pickup requested"
                              : "Email delivery",
                        notes: [
                          values.get("notes"),
                          values.get("deadline")
                            ? "Requested date: " + values.get("deadline")
                            : "",
                        ]
                          .filter(Boolean)
                          .join("\n"),
                        website: values.get("website"),
                        payment_method: values.get("payment_method"),
                        items: [],
                        custom: {
                          pokemon: values.get("pokemon"),
                          theme: values.get("theme"),
                          color,
                          optionId: option.id,
                          framed: chosenFramed,
                          delivery: chosenDelivery,
                        },
                      };
                      const signature = JSON.stringify(payload);
                      if (request.current?.signature !== signature)
                        request.current = {
                          signature,
                          id: crypto.randomUUID(),
                        };
                      try {
                        setReceipt(
                          await api("orders", {
                            method: "POST",
                            body: JSON.stringify({
                              ...payload,
                              requestId: request.current.id,
                            }),
                          }),
                        );
                        document.getElementById("commission")?.scrollIntoView();
                      } catch (e) {
                        setFailure((e as Error).message);
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <div className="shop-fields">
                      <label>
                        Name *
                        <input
                          name="name"
                          required
                          minLength={2}
                          maxLength={100}
                          autoComplete="name"
                        />
                      </label>
                      <label>
                        Email *
                        <input
                          name="email"
                          required
                          type="email"
                          maxLength={254}
                          autoComplete="email"
                        />
                      </label>
                    </div>
                    <label>
                      Phone *
                      <input
                        name="phone"
                        required
                        type="tel"
                        minLength={7}
                        maxLength={40}
                        autoComplete="tel"
                      />
                    </label>
                    <label>
                      Pokémon *
                      <input
                        name="pokemon"
                        required
                        maxLength={200}
                        placeholder="Eevee, your dream team…"
                      />
                    </label>
                    <label>
                      Theme / scene *
                      <textarea
                        name="theme"
                        required
                        minLength={3}
                        maxLength={3000}
                        rows={4}
                        placeholder="A moonlit forest, a cozy room, a special memory…"
                      />
                    </label>
                    <fieldset className="shop-custom-fieldset">
                      <legend>Your artwork</legend>
                      <label>
                        Color or black &amp; white? *
                        <select
                          value={color ? "color" : "bw"}
                          onChange={(e) => setColor(e.target.value === "color")}
                        >
                          <option value="bw">
                            Black &amp; white — included
                          </option>
                          <option value="color">
                            Color — +{money(data.settings.customColor)}
                          </option>
                        </select>
                      </label>
                      {options.some((o) => o.larger) && (
                        <label className="shop-consent">
                          <input
                            type="checkbox"
                            checked={larger}
                            onChange={(e) => {
                              const next = e.target.checked;
                              setLarger(next);
                              const first = options.find(
                                (o) => Boolean(o.larger) === next,
                              );
                              if (first) selectOption(first.id);
                            }}
                          />
                          <span>Larger than 8 x 10</span>
                        </label>
                      )}
                      <label>
                        Format and size *
                        <select
                          value={option.id}
                          onChange={(e) => selectOption(e.target.value)}
                        >
                          {visibleOptions.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.label}
                              {o.format === "digital"
                                ? ""
                                : ` · ${o.size}`} —{" "}
                              {money(data.settings.customBase + o.surcharge)}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p className="shop-muted">
                        Size prices are for black &amp; white artwork. Color and
                        framing are extra.
                      </p>
                      {!digital && (
                        <label>
                          Framed or not framed? *
                          <select
                            value={chosenFramed ? "yes" : "no"}
                            onChange={(e) => {
                              const yes = e.target.value === "yes";
                              setFramed(yes);
                              if (yes && delivery === "email")
                                setDelivery("ship");
                            }}
                          >
                            <option value="no">Not framed</option>
                            <option
                              value="yes"
                              disabled={option.framePrice === null}
                            >
                              Framed
                              {option.framePrice === null
                                ? " — not available for this format"
                                : ""}
                            </option>
                          </select>
                        </label>
                      )}
                      {chosenFramed && (
                        <label>
                          Frame size and price *
                          <select
                            value={option.id}
                            onChange={(e) => setOptionId(e.target.value)}
                          >
                            {[option]
                              .filter((o) => o.framePrice !== null)
                              .map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.label} frame · {o.size} — +
                                  {money(o.framePrice!)}
                                </option>
                              ))}
                          </select>
                        </label>
                      )}
                    </fieldset>
                    <fieldset className="shop-custom-fieldset">
                      <legend>Getting it to you</legend>
                      <label>
                        Delivery *
                        <select
                          value={chosenDelivery}
                          onChange={(e) =>
                            setDelivery(e.target.value as typeof delivery)
                          }
                        >
                          {!physical && (
                            <option value="email">
                              Email delivery (digital artwork)
                            </option>
                          )}
                          {!digital && (
                            <>
                              <option value="ship">Ship to an address</option>
                              <option value="pickup">
                                Local pickup (subject to confirmation)
                              </option>
                            </>
                          )}
                        </select>
                      </label>
                      {physical && (
                        <p className="shop-muted">
                          Printed artwork must be shipped or picked up.
                        </p>
                      )}
                      {chosenDelivery === "ship" && (
                        <label>
                          Shipping address *
                          <textarea
                            name="address"
                            required
                            minLength={5}
                            maxLength={1500}
                            rows={3}
                            autoComplete="street-address"
                          />
                        </label>
                      )}
                      <p className="shop-muted">
                        {digital
                          ? "Digital artwork is sent to your email. No physical print or frame is included."
                          : data.settings.shippingNote}
                      </p>
                    </fieldset>
                    <label>
                      Needed by (optional)
                      <input type="date" name="deadline" />
                    </label>
                    <label>
                      Reference links and extra notes (optional)
                      <textarea
                        name="notes"
                        maxLength={4000}
                        rows={3}
                        placeholder="Share reference image links, special details, or questions."
                      />
                    </label>
                    <label>
                      Preferred payment method
                      <select name="payment_method">
                        <option value="undecided">
                          Decide after confirmation
                        </option>
                        {data.settings.paymentMethods
                          .filter((m) => m.active)
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                      </select>
                    </label>
                    <div className="shop-trap" aria-hidden="true">
                      <input name="website" tabIndex={-1} autoComplete="off" />
                    </div>
                    <p className="shop-muted">
                      Your details are used to discuss and fulfill your custom
                      artwork request. This is a request, not an immediate
                      payment.
                    </p>
                    {failure && (
                      <p className="shop-error shop-notice" role="alert">
                        {failure}
                      </p>
                    )}
                    <button className="shop-button" disabled={busy}>
                      {busy ? "Sending…" : "Send my custom artwork request"}
                    </button>
                  </form>
                </div>
                <aside className="shop-panel shop-custom-estimate">
                  <span className="shop-eyebrow">No hidden upgrades</span>
                  <h2>Your Estimate</h2>
                  <dl className="shop-price-list">
                    <div>
                      <dt>Custom artwork</dt>
                      <dd>{money(pricing!.base)}</dd>
                    </div>
                    <div>
                      <dt>{color ? "Color upgrade" : "Black & white"}</dt>
                      <dd>{money(pricing!.color)}</dd>
                    </div>
                    <div>
                      <dt>
                        {option.label} · {option.size}
                      </dt>
                      <dd>
                        {pricing!.format
                          ? `+${money(pricing!.format)}`
                          : "Included"}
                      </dd>
                    </div>
                    {chosenFramed && (
                      <div>
                        <dt>Frame · {option.size}</dt>
                        <dd>+{money(pricing!.frame)}</dd>
                      </div>
                    )}
                  </dl>
                  <p className="shop-subtotal">
                    Artwork estimate <strong>{money(pricing!.total)}</strong>
                  </p>
                  <p className="shop-muted">
                    Excludes shipping and any applicable tax. We confirm your
                    request and final total before payment. Coupons and standard
                    print bundles apply to gallery orders, not custom artwork.
                  </p>
                  <p className="shop-muted">{data.settings.paymentNote}</p>
                </aside>
              </div>
            )}
          </div>
        </section>
      </main>
      <footer className="shop-custom-footer">
        <a href="/">Poke Print Shop</a>
        <a href="/#contact">Questions? Contact the studio</a>
      </footer>
    </>
  );
}
