"use client";
import { useEffect, useState } from "react";
import { api, money } from "@/lib/commerce";
import type { Catalog, Settings } from "@/lib/commerce";
import type { Coupon } from "@/lib/site";

export function ImagePicker({
  value,
  onChange,
  images,
  onUploading,
  optional = false,
}: {
  value: string;
  onChange: (v: string) => void;
  images: string[];
  onUploading: (v: boolean) => void;
  optional?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <div className="shop-image-picker">
      {value && <img src={value} alt="Selected image preview" />}
      <label>
        Choose an existing image
        <select value={value} onChange={(e) => onChange(e.target.value)}>
          {optional && <option value="">No photo</option>}
          {[...new Set([value, ...images])].filter(Boolean).map((src) => (
            <option key={src} value={src}>
              {src.split("/").pop()}
            </option>
          ))}
        </select>
      </label>
      <label>
        Or upload an image
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={async (e) => {
            const input = e.currentTarget,
              file = input.files?.[0];
            if (!file) return;
            if (file.size > 4 * 1024 * 1024) {
              setError("Choose an image up to 4 MB.");
              return;
            }
            setBusy(true);
            onUploading(true);
            setError("");
            try {
              const form = new FormData();
              form.set("file", file);
              const result = await api<{ url: string }>("upload", {
                method: "POST",
                body: form,
              });
              onChange(result.url);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
              onUploading(false);
              input.value = "";
            }
          }}
        />
      </label>
      {busy && <p role="status">Uploading…</p>}
      {error && (
        <p role="alert" className="shop-error shop-notice">
          {error}
        </p>
      )}
    </div>
  );
}
export function WebsiteEditor({
  catalog,
  onSave,
  busy,
}: {
  catalog: Catalog;
  onSave: (s: Settings) => Promise<void>;
  busy: boolean;
}) {
  const [draft, setDraft] = useState(catalog.settings),
    [uploading, setUploading] = useState(0);
  const images = catalog.products.flatMap((p) => p.images),
    upload = (v: boolean) => setUploading((n) => n + (v ? 1 : -1));
  function field<K extends keyof Settings>(key: K, value: Settings[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }
  return (
    <form
      className="shop-panel shop-form"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave(draft);
      }}
    >
      <h3>Website content &amp; custom artwork</h3>
      <p>
        Draft content stays unpublished until you enable it and save. Add your
        actual policies and genuine customer reviews when ready.
      </p>
      <details open className="shop-admin-section">
        <summary>Hero images</summary>
        <fieldset>
          <legend>Homepage hero</legend>
          <ImagePicker
            value={draft.heroImage}
            onChange={(v) => field("heroImage", v)}
            images={images}
            onUploading={upload}
          />
          <label>
            Image description
            <input
              value={draft.heroAlt}
              maxLength={200}
              required
              onChange={(e) => field("heroAlt", e.target.value)}
            />
          </label>
        </fieldset>
        <fieldset>
          <legend>Custom artwork page banner</legend>
          <ImagePicker
            value={draft.customHeroImage}
            onChange={(v) => field("customHeroImage", v)}
            images={images}
            onUploading={upload}
          />
        </fieldset>
      </details>
      <details className="shop-admin-section">
        <summary>Custom artwork pricing and formats</summary>
        <div className="shop-fields">
          <label>
            Base custom artwork price ($)
            <input
              type="number"
              min={0}
              max={100000}
              step="0.01"
              defaultValue={(draft.customBase / 100).toFixed(2)}
              onChange={(e) =>
                field("customBase", Math.round(Number(e.target.value) * 100))
              }
            />
          </label>
          <label>
            Color upgrade ($)
            <input
              type="number"
              min={0}
              max={100000}
              step="0.01"
              defaultValue={(draft.customColor / 100).toFixed(2)}
              onChange={(e) =>
                field("customColor", Math.round(Number(e.target.value) * 100))
              }
            />
          </label>
        </div>
        <p className="shop-muted">
          Base includes digital artwork or a standard unframed print.
          Size/format charges and frames are extra. A blank frame price means
          framing is unavailable.
        </p>
        {draft.customOptions.map((o, i) => (
          <fieldset key={o.id}>
            <legend>
              {o.label} · {o.size}
            </legend>
            <div className="shop-fields">
              <label>
                Format
                <select
                  value={o.format}
                  onChange={(e) =>
                    field(
                      "customOptions",
                      draft.customOptions.map((v, n) =>
                        n === i
                          ? { ...v, format: e.target.value as typeof o.format }
                          : v,
                      ),
                    )
                  }
                >
                  {["digital", "print", "poster", "canvas", "magnet"].map(
                    (v) => (
                      <option key={v}>{v}</option>
                    ),
                  )}
                </select>
              </label>
              <label>
                Label
                <input
                  value={o.label}
                  required
                  maxLength={120}
                  onChange={(e) =>
                    field(
                      "customOptions",
                      draft.customOptions.map((v, n) =>
                        n === i ? { ...v, label: e.target.value } : v,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Size
                <input
                  value={o.size}
                  required
                  maxLength={80}
                  onChange={(e) =>
                    field(
                      "customOptions",
                      draft.customOptions.map((v, n) =>
                        n === i ? { ...v, size: e.target.value } : v,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Format surcharge ($)
                <input
                  type="number"
                  min={0}
                  max={100000}
                  step="0.01"
                  defaultValue={(o.surcharge / 100).toFixed(2)}
                  onChange={(e) =>
                    field(
                      "customOptions",
                      draft.customOptions.map((v, n) =>
                        n === i
                          ? {
                              ...v,
                              surcharge: Math.round(
                                Number(e.target.value) * 100,
                              ),
                            }
                          : v,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Frame charge ($, blank for none)
                <input
                  type="number"
                  min={0}
                  max={100000}
                  step="0.01"
                  defaultValue={
                    o.framePrice === null ? "" : (o.framePrice / 100).toFixed(2)
                  }
                  onChange={(e) =>
                    field(
                      "customOptions",
                      draft.customOptions.map((v, n) =>
                        n === i
                          ? {
                              ...v,
                              framePrice:
                                e.target.value === ""
                                  ? null
                                  : Math.round(Number(e.target.value) * 100),
                            }
                          : v,
                      ),
                    )
                  }
                />
              </label>
            </div>
            <label className="shop-admin-check">
              <input
                type="checkbox"
                checked={o.larger}
                onChange={(e) =>
                  field(
                    "customOptions",
                    draft.customOptions.map((v, n) =>
                      n === i ? { ...v, larger: e.target.checked } : v,
                    ),
                  )
                }
              />
              Show under “Larger than 8 x 10”
            </label>
            <label className="shop-admin-check">
              <input
                type="checkbox"
                checked={o.active}
                onChange={(e) =>
                  field(
                    "customOptions",
                    draft.customOptions.map((v, n) =>
                      n === i ? { ...v, active: e.target.checked } : v,
                    ),
                  )
                }
              />
              Available for custom orders
            </label>
            <button
              type="button"
              disabled={draft.customOptions.length === 1}
              className="shop-link-button"
              onClick={() =>
                field(
                  "customOptions",
                  draft.customOptions.filter((_, n) => n !== i),
                )
              }
            >
              Remove option
            </button>
          </fieldset>
        ))}
        <button
          type="button"
          className="shop-button shop-secondary"
          disabled={draft.customOptions.length >= 40}
          onClick={() =>
            field("customOptions", [
              ...draft.customOptions,
              {
                id: crypto.randomUUID(),
                label: "Art print",
                format: "print",
                size: "4 x 6",
                surcharge: 0,
                larger: false,
                framePrice: null,
                active: false,
              },
            ])
          }
        >
          Add custom format / size
        </button>
      </details>
      <details className="shop-admin-section">
        <summary>Shipping, returns, and studio policies</summary>
        {draft.policies.map((p, i) => (
          <fieldset key={p.id}>
            <label>
              Policy title
              <input
                value={p.title}
                maxLength={120}
                onChange={(e) =>
                  field(
                    "policies",
                    draft.policies.map((v, n) =>
                      n === i ? { ...v, title: e.target.value } : v,
                    ),
                  )
                }
              />
            </label>
            <label>
              Details
              <textarea
                value={p.body}
                rows={4}
                maxLength={5000}
                placeholder="Your real turnaround, packaging, destinations, or return policy…"
                onChange={(e) =>
                  field(
                    "policies",
                    draft.policies.map((v, n) =>
                      n === i ? { ...v, body: e.target.value } : v,
                    ),
                  )
                }
              />
            </label>
            <label className="shop-admin-check">
              <input
                type="checkbox"
                checked={p.published}
                onChange={(e) =>
                  field(
                    "policies",
                    draft.policies.map((v, n) =>
                      n === i ? { ...v, published: e.target.checked } : v,
                    ),
                  )
                }
              />
              Publish policy
            </label>
            <button
              className="shop-link-button"
              type="button"
              onClick={() =>
                field(
                  "policies",
                  draft.policies.filter((_, n) => n !== i),
                )
              }
            >
              Remove policy
            </button>
          </fieldset>
        ))}
        <button
          type="button"
          className="shop-button shop-secondary"
          disabled={draft.policies.length >= 15}
          onClick={() =>
            field("policies", [
              ...draft.policies,
              {
                id: crypto.randomUUID(),
                title: "",
                body: "",
                published: false,
              },
            ])
          }
        >
          Add policy
        </button>
      </details>
      <details className="shop-admin-section">
        <summary>Frequently asked questions</summary>
        {draft.faqs.map((f, i) => (
          <fieldset key={f.id}>
            <label>
              Question
              <input
                value={f.question}
                maxLength={200}
                onChange={(e) =>
                  field(
                    "faqs",
                    draft.faqs.map((v, n) =>
                      n === i ? { ...v, question: e.target.value } : v,
                    ),
                  )
                }
              />
            </label>
            <label>
              Answer
              <textarea
                value={f.answer}
                rows={3}
                maxLength={3000}
                onChange={(e) =>
                  field(
                    "faqs",
                    draft.faqs.map((v, n) =>
                      n === i ? { ...v, answer: e.target.value } : v,
                    ),
                  )
                }
              />
            </label>
            <label className="shop-admin-check">
              <input
                type="checkbox"
                checked={f.published}
                onChange={(e) =>
                  field(
                    "faqs",
                    draft.faqs.map((v, n) =>
                      n === i ? { ...v, published: e.target.checked } : v,
                    ),
                  )
                }
              />
              Publish answer
            </label>
            <button
              type="button"
              className="shop-link-button"
              onClick={() =>
                field(
                  "faqs",
                  draft.faqs.filter((_, n) => n !== i),
                )
              }
            >
              Remove FAQ
            </button>
          </fieldset>
        ))}
        <button
          type="button"
          className="shop-button shop-secondary"
          disabled={draft.faqs.length >= 30}
          onClick={() =>
            field("faqs", [
              ...draft.faqs,
              {
                id: crypto.randomUUID(),
                question: "",
                answer: "",
                published: false,
              },
            ])
          }
        >
          Add FAQ
        </button>
      </details>
      <details className="shop-admin-section">
        <summary>Social links</summary>
        {draft.socials.map((l, i) => (
          <fieldset key={l.id}>
            <div className="shop-fields">
              <label>
                Platform / label
                <input
                  value={l.label}
                  maxLength={80}
                  onChange={(e) =>
                    field(
                      "socials",
                      draft.socials.map((v, n) =>
                        n === i ? { ...v, label: e.target.value } : v,
                      ),
                    )
                  }
                />
              </label>
              <label>
                Profile link
                <input
                  type="url"
                  value={l.url}
                  placeholder="https://instagram.com/yourprofile"
                  onChange={(e) =>
                    field(
                      "socials",
                      draft.socials.map((v, n) =>
                        n === i ? { ...v, url: e.target.value } : v,
                      ),
                    )
                  }
                />
              </label>
            </div>
            <label className="shop-admin-check">
              <input
                type="checkbox"
                checked={l.active}
                onChange={(e) =>
                  field(
                    "socials",
                    draft.socials.map((v, n) =>
                      n === i ? { ...v, active: e.target.checked } : v,
                    ),
                  )
                }
              />
              Publish link
            </label>
            <button
              type="button"
              className="shop-link-button"
              onClick={() =>
                field(
                  "socials",
                  draft.socials.filter((_, n) => n !== i),
                )
              }
            >
              Remove link
            </button>
          </fieldset>
        ))}
        <button
          type="button"
          className="shop-button shop-secondary"
          disabled={draft.socials.length >= 10}
          onClick={() =>
            field("socials", [
              ...draft.socials,
              { id: crypto.randomUUID(), label: "", url: "", active: false },
            ])
          }
        >
          Add social link
        </button>
      </details>
      <details className="shop-admin-section">
        <summary>Customer reviews and photos</summary>
        <p className="shop-muted">
          Add genuine feedback and customer photos only with permission. No
          example reviews are published.
        </p>
        {draft.reviews.map((r, i) => (
          <fieldset key={r.id}>
            <label>
              Customer display name
              <input
                value={r.name}
                maxLength={100}
                onChange={(e) =>
                  field(
                    "reviews",
                    draft.reviews.map((v, n) =>
                      n === i ? { ...v, name: e.target.value } : v,
                    ),
                  )
                }
              />
            </label>
            <label>
              Review
              <textarea
                value={r.text}
                maxLength={2000}
                rows={3}
                onChange={(e) =>
                  field(
                    "reviews",
                    draft.reviews.map((v, n) =>
                      n === i ? { ...v, text: e.target.value } : v,
                    ),
                  )
                }
              />
            </label>
            <ImagePicker
              value={r.image}
              images={images}
              onUploading={upload}
              optional
              onChange={(image) =>
                field(
                  "reviews",
                  draft.reviews.map((v, n) => (n === i ? { ...v, image } : v)),
                )
              }
            />
            <label className="shop-admin-check">
              <input
                type="checkbox"
                checked={r.permission}
                onChange={(e) =>
                  field(
                    "reviews",
                    draft.reviews.map((v, n) =>
                      n === i ? { ...v, permission: e.target.checked } : v,
                    ),
                  )
                }
              />
              Customer gave permission to publish this review and photo
            </label>
            <label className="shop-admin-check">
              <input
                type="checkbox"
                checked={r.published}
                onChange={(e) =>
                  field(
                    "reviews",
                    draft.reviews.map((v, n) =>
                      n === i ? { ...v, published: e.target.checked } : v,
                    ),
                  )
                }
              />
              Publish review
            </label>
            <button
              type="button"
              className="shop-link-button"
              onClick={() =>
                field(
                  "reviews",
                  draft.reviews.filter((_, n) => n !== i),
                )
              }
            >
              Remove review
            </button>
          </fieldset>
        ))}
        <button
          type="button"
          className="shop-button shop-secondary"
          disabled={draft.reviews.length >= 30}
          onClick={() =>
            field("reviews", [
              ...draft.reviews,
              {
                id: crypto.randomUUID(),
                name: "",
                text: "",
                image: "",
                permission: false,
                published: false,
              },
            ])
          }
        >
          Add review
        </button>
      </details>
      <button className="shop-button" disabled={busy || uploading > 0}>
        {busy ? "Saving…" : "Save website content"}
      </button>
    </form>
  );
}
export function DiscountAdmin({
  settings,
  onSaveSettings,
}: {
  settings: Settings;
  onSaveSettings: (s: Settings) => Promise<void>;
}) {
  const [bundles, setBundles] = useState(settings.bundles),
    [coupons, setCoupons] = useState<Coupon[]>([]),
    [draft, setDraft] = useState<Coupon | null>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    try {
      const data = await api<{ coupons: Coupon[] }>("coupons");
      setCoupons(data.coupons);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <div className="shop-form">
      {error && (
        <p className="shop-error shop-notice" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="shop-success shop-notice" role="status">
          {message}
        </p>
      )}
      <form
        className="shop-panel shop-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            await onSaveSettings({ ...settings, bundles });
          } finally {
            setBusy(false);
          }
        }}
      >
        <h3>Automatic print bundles</h3>
        <p>
          The best available discount wins. Coupons never stack on top of
          bundles. Deals can mix different artworks in the eligible category.
        </p>
        <label className="shop-admin-check">
          <input
            type="checkbox"
            checked={bundles.enabled}
            onChange={(e) =>
              setBundles({ ...bundles, enabled: e.target.checked })
            }
          />
          Enable bundle deals
        </label>
        <div className="shop-fields">
          <label>
            Eligible category ID
            <input
              required
              value={bundles.categoryId}
              maxLength={60}
              onChange={(e) =>
                setBundles({ ...bundles, categoryId: e.target.value })
              }
            />
          </label>
          <label>
            Small size label
            <input
              required
              value={bundles.smallSize}
              maxLength={80}
              onChange={(e) =>
                setBundles({ ...bundles, smallSize: e.target.value })
              }
            />
          </label>
          <label>
            Large size label
            <input
              required
              value={bundles.largeSize}
              maxLength={80}
              onChange={(e) =>
                setBundles({ ...bundles, largeSize: e.target.value })
              }
            />
          </label>
          {(["smallPair", "largePair", "mixedPair"] as const).map((key, i) => (
            <label key={key}>
              {["Two small prints", "Two large prints", "One of each"][i]} price
              ($)
              <input
                type="number"
                min={0}
                max={100000}
                step="0.01"
                required
                defaultValue={(bundles[key] / 100).toFixed(2)}
                onChange={(e) =>
                  setBundles({
                    ...bundles,
                    [key]: Math.round(Number(e.target.value) * 100),
                  })
                }
              />
            </label>
          ))}
        </div>
        <button className="shop-button" disabled={busy}>
          Save bundle deals
        </button>
      </form>
      <div className="shop-row shop-between">
        <h2>Coupon codes</h2>
        <button
          className="shop-button"
          onClick={() =>
            setDraft({
              id: crypto.randomUUID(),
              code: "",
              kind: "percent",
              amount: 10,
              minimum: 0,
              expires_at: null,
              active: false,
            })
          }
        >
          Add coupon
        </button>
      </div>
      <div className="shop-admin-layout">
        <div className="shop-admin-list">
          {coupons.map((c) => (
            <button
              type="button"
              className="shop-list-button"
              key={c.id}
              onClick={() => setDraft(c)}
              aria-pressed={draft?.id === c.id}
            >
              {c.code} ·{" "}
              {c.kind === "percent" ? c.amount + "%" : money(c.amount)}
              {!c.active ? " (inactive)" : ""}
            </button>
          ))}
        </div>
        {draft ? (
          <form
            key={draft.id}
            className="shop-panel shop-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setBusy(true);
              setError("");
              setMessage("");
              try {
                await api("coupons", {
                  method: "PUT",
                  body: JSON.stringify(draft),
                });
                await load();
                setMessage(
                  "Coupon saved. Inactive or expired coupons cannot be applied.",
                );
              } catch (e) {
                setError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Code
              <input
                required
                pattern="[A-Za-z0-9_-]{2,40}"
                maxLength={40}
                value={draft.code}
                onChange={(e) =>
                  setDraft({ ...draft, code: e.target.value.toUpperCase() })
                }
              />
            </label>
            <label>
              Discount type
              <select
                value={draft.kind}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    kind: e.target.value as Coupon["kind"],
                    amount: e.target.value === "percent" ? 10 : 100,
                  })
                }
              >
                <option value="percent">Percentage</option>
                <option value="fixed">Fixed amount (USD)</option>
              </select>
            </label>
            <label>
              {draft.kind === "percent" ? "Percentage off" : "Amount off ($)"}
              <input
                key={draft.id + draft.kind}
                type="number"
                required
                min={draft.kind === "percent" ? 1 : 0.01}
                max={draft.kind === "percent" ? 100 : 100000}
                step={draft.kind === "percent" ? 1 : 0.01}
                defaultValue={
                  draft.kind === "percent"
                    ? draft.amount
                    : (draft.amount / 100).toFixed(2)
                }
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    amount: Math.round(
                      Number(e.target.value) *
                        (draft.kind === "percent" ? 1 : 100),
                    ),
                  })
                }
              />
            </label>
            <label>
              Minimum artwork subtotal ($)
              <input
                type="number"
                required
                min={0}
                max={100000}
                step="0.01"
                defaultValue={(draft.minimum / 100).toFixed(2)}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    minimum: Math.round(Number(e.target.value) * 100),
                  })
                }
              />
            </label>
            <label>
              Expires (your local time, optional)
              <input
                type="datetime-local"
                defaultValue={
                  draft.expires_at
                    ? new Date(
                        new Date(draft.expires_at).getTime() -
                          new Date(draft.expires_at).getTimezoneOffset() *
                            60000,
                      )
                        .toISOString()
                        .slice(0, 16)
                    : ""
                }
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    expires_at: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                  })
                }
              />
            </label>
            <label className="shop-admin-check">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) =>
                  setDraft({ ...draft, active: e.target.checked })
                }
              />
              Enable coupon
            </label>
            <button className="shop-button" disabled={busy}>
              {busy ? "Saving…" : "Save coupon"}
            </button>
          </form>
        ) : (
          <div className="shop-panel">
            Choose a coupon or create one. Disable a coupon to remove it from
            use.
          </div>
        )}
      </div>
    </div>
  );
}
type Message = {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  resolved: boolean;
  created_at: string;
};
export function MessageInbox() {
  const [rows, setRows] = useState<Message[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    try {
      setRows((await api<{ messages: Message[] }>("messages")).messages);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  return (
    <div>
      <h2>Contact messages</h2>
      <p>
        Latest 200 messages. Contact submissions are saved here; emails are not
        sent automatically.
      </p>
      <button
        className="shop-button shop-secondary"
        onClick={() => void load()}
        disabled={busy}
      >
        Refresh inbox
      </button>
      {error && (
        <p className="shop-error shop-notice" role="alert">
          {error}
        </p>
      )}
      {!rows.length && !busy && (
        <p className="shop-notice">No contact messages yet.</p>
      )}
      {rows.map((m) => (
        <article className="shop-panel shop-order-card" key={m.id}>
          <h3>
            {m.name}
            {m.resolved ? " · resolved" : ""}
          </h3>
          <p>
            <a href={`mailto:${m.email}`}>{m.email}</a> · {m.phone} ·{" "}
            {new Date(m.created_at).toLocaleDateString()}
          </p>
          <p className="shop-preserve">{m.message}</p>
          <div className="shop-row">
            <a
              className="shop-button shop-secondary"
              href={`mailto:${m.email}?subject=Poke%20Print%20Shop%20inquiry`}
            >
              Reply by email
            </a>
            <button
              className="shop-button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api("messages", {
                    method: "PUT",
                    body: JSON.stringify({ id: m.id, resolved: !m.resolved }),
                  });
                  await load();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {m.resolved ? "Reopen" : "Mark resolved"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
type Subscriber = {
  id: string;
  email: string;
  active: boolean;
  created_at: string;
  consent_at: string;
};
export function SubscriberList() {
  const [rows, setRows] = useState<Subscriber[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load() {
    setBusy(true);
    try {
      setRows(
        (await api<{ subscribers: Subscriber[] }>("subscribers")).subscribers,
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  function download() {
    const cell = (s: string) =>
      '"' + (/^[=+@-]/.test(s) ? "'" : "") + s.replaceAll('"', '""') + '"';
    const content = [
      "email,consent_at",
      ...rows
        .filter((r) => r.active)
        .map((r) => [r.email, r.consent_at].map(cell).join(",")),
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "artwork-subscribers.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="shop-panel shop-form">
      <h3>Artwork email subscribers</h3>
      <p>
        Explicit signup consent is recorded. Export active subscribers for your
        email service; this site does not send newsletters automatically. Latest
        5,000 records are shown.
      </p>
      <div className="shop-row">
        <button
          className="shop-button"
          onClick={download}
          disabled={!rows.some((r) => r.active)}
        >
          Export active emails (CSV)
        </button>
        <button
          className="shop-button shop-secondary"
          disabled={busy}
          onClick={() => void load()}
        >
          Refresh
        </button>
      </div>
      {error && (
        <p className="shop-error shop-notice" role="alert">
          {error}
        </p>
      )}
      {!rows.length && !busy && <p>No subscribers yet.</p>}
      {rows.map((r) => (
        <div className="shop-subscriber-row" key={r.id}>
          <span>
            {r.email}
            <small>
              {r.active ? "Subscribed" : "Removed"} ·{" "}
              {new Date(r.consent_at).toLocaleDateString()}
            </small>
          </span>
          {r.active && (
            <button
              className="shop-button shop-secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await api("subscribers", {
                    method: "PUT",
                    body: JSON.stringify({ id: r.id, active: false }),
                  });
                  await load();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Remove subscriber
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
