"use client";
import { useRef, useState } from "react";
import { api } from "@/lib/commerce";
import { useCatalog } from "./catalog";
export function ContactForm() {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const request = useRef<{ signature: string; id: string } | null>(null);
  return (
    <form
      className="shop-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        setMessage("");
        const form = e.currentTarget,
          values = Object.fromEntries(new FormData(form)),
          signature = JSON.stringify(values);
        if (request.current?.signature !== signature)
          request.current = { signature, id: crypto.randomUUID() };
        try {
          await api("contact", {
            method: "POST",
            body: JSON.stringify({ ...values, requestId: request.current.id }),
          });
          setMessage(
            "Thanks! Your message is saved. We’ll follow up using your contact details.",
          );
          form.reset();
          request.current = null;
        } catch (e) {
          setError((e as Error).message);
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
            type="email"
            required
            maxLength={254}
            autoComplete="email"
          />
        </label>
      </div>
      <label>
        Phone (optional)
        <input name="phone" type="tel" maxLength={40} autoComplete="tel" />
      </label>
      <label>
        Message *
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={4}
        />
      </label>
      <div className="shop-trap" aria-hidden="true">
        <input name="website" tabIndex={-1} autoComplete="off" />
      </div>
      {error && (
        <p role="alert" className="shop-notice shop-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="shop-notice shop-success">
          {message}
        </p>
      )}
      <button className="shop-button" disabled={busy}>
        {busy ? "Sending…" : "Submit"}
      </button>
    </form>
  );
}
export default function CommunitySections() {
  const { data } = useCatalog(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  if (!data) return null;
  const { settings: s } = data;
  return (
    <>
      {s.policies.some((p) => p.published) && (
        <section id="shipping" className="shop-section">
          <div className="shop-wrap">
            <div className="shop-heading">
              <span className="shop-eyebrow">From our studio to you</span>
              <h2>Shipping &amp; Returns</h2>
            </div>
            <div className="shop-price-groups">
              {s.policies
                .filter((p) => p.published)
                .map((p) => (
                  <article key={p.id} className="shop-panel">
                    <h3>{p.title}</h3>
                    <p className="shop-preserve">{p.body}</p>
                  </article>
                ))}
            </div>
          </div>
        </section>
      )}
      {s.reviews.some((r) => r.published && r.permission) && (
        <section id="reviews" className="shop-section">
          <div className="shop-wrap">
            <div className="shop-heading">
              <span className="shop-eyebrow">Out in the wild</span>
              <h2>Artwork at Home</h2>
            </div>
            <div className="shop-grid">
              {s.reviews
                .filter((r) => r.published && r.permission)
                .map((r) => (
                  <figure className="shop-panel" key={r.id}>
                    {r.image && (
                      <img
                        src={r.image}
                        alt={`Artwork shared by ${r.name}`}
                        className="shop-review-image"
                        loading="lazy"
                      />
                    )}
                    <blockquote className="shop-preserve">
                      “{r.text}”
                    </blockquote>
                    <figcaption>— {r.name}</figcaption>
                  </figure>
                ))}
            </div>
          </div>
        </section>
      )}
      {s.faqs.some((f) => f.published) && (
        <section id="faq" className="shop-section">
          <div className="shop-wrap shop-faq">
            <div className="shop-heading">
              <span className="shop-eyebrow">Good to know</span>
              <h2>Print FAQ</h2>
            </div>
            {s.faqs
              .filter((f) => f.published)
              .map((f) => (
                <details className="shop-panel" key={f.id}>
                  <summary>{f.question}</summary>
                  <p className="shop-preserve">{f.answer}</p>
                </details>
              ))}
          </div>
        </section>
      )}
      {s.socials.some((l) => l.active) && (
        <section id="social" className="shop-section">
          <div className="shop-wrap shop-heading">
            <span className="shop-eyebrow">Follow the sketchbook</span>
            <h2>Behind the Drawings</h2>
            <p>See what’s taking shape in the studio.</p>
            <div className="shop-row shop-social-links">
              {s.socials
                .filter((l) => l.active)
                .map((l) => (
                  <a
                    className="shop-button shop-secondary"
                    key={l.id}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {l.label} ↗
                  </a>
                ))}
            </div>
          </div>
        </section>
      )}
      <section id="newsletter" className="shop-section shop-newsletter">
        <div className="shop-wrap shop-custom-grid">
          <div>
            <span className="shop-eyebrow">A new encounter awaits</span>
            <h2>Fresh from the Sketchbook</h2>
            <p>Sign up to hear about new drawings and shop updates.</p>
          </div>
          <form
            className="shop-panel shop-form"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget,
                values = new FormData(form);
              setBusy(true);
              setError("");
              setMessage("");
              try {
                await api("subscribe", {
                  method: "POST",
                  body: JSON.stringify({
                    email: values.get("email"),
                    consent: values.get("consent") === "on",
                    website: values.get("website"),
                  }),
                });
                setMessage(
                  "You’re on the list! Thanks for following the artwork.",
                );
                form.reset();
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Email address *
              <input
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="email"
              />
            </label>
            <label className="shop-consent">
              <input type="checkbox" name="consent" required />I agree to
              receive emails about new artwork and shop updates.
            </label>
            <p className="shop-muted">
              Ask to leave the list anytime at{" "}
              <a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a>.
            </p>
            <div className="shop-trap" aria-hidden="true">
              <input name="website" tabIndex={-1} autoComplete="off" />
            </div>
            {error && (
              <p className="shop-notice shop-error" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className="shop-notice shop-success" role="status">
                {message}
              </p>
            )}
            <button className="shop-button" disabled={busy}>
              {busy ? "Joining…" : "Keep me posted"}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
