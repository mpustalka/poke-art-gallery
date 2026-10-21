"use client";

import { useEffect, useState } from "react";
import {
  login,
  logout,
  getUser,
  handleAuthCallback,
  acceptInvite,
  updateUser,
  requestPasswordRecovery,
} from "@netlify/identity";
import { api, money, statuses, digitalDeliveryNote } from "@/lib/commerce";
import type {
  Catalog,
  Product,
  Category,
  Variant,
  Settings,
  Order,
} from "@/lib/commerce";

import {
  WebsiteEditor,
  DiscountAdmin,
  MessageInbox,
  SubscriberList,
} from "./admin-extras";

function VariantEditor({
  value,
  onChange,
}: {
  value: Variant[];
  onChange: (v: Variant[]) => void;
}) {
  const change = (i: number, patch: Partial<Variant>) =>
    onChange(value.map((v, n) => (n === i ? { ...v, ...patch } : v)));
  return (
    <fieldset>
      <legend>Sizes and prices (USD)</legend>
      <p className="shop-muted">
        Edit a size or its price below, add a new size, or remove one you no
        longer offer. Click Save product (or Save category) to apply your
        changes.
      </p>
      {value.map((v, i) => (
        <div className="shop-variant-row" key={v.id}>
          <label>
            Size / finish
            <input
              required
              maxLength={120}
              value={v.label}
              onChange={(e) => change(i, { label: e.target.value })}
              placeholder="4 x 6"
            />
          </label>
          <label>
            Price ($)
            <input
              required
              type="number"
              min="0.01"
              max="100000"
              step="0.01"
              defaultValue={(v.price / 100).toFixed(2)}
              onChange={(e) =>
                change(i, { price: Math.round(Number(e.target.value) * 100) })
              }
            />
          </label>
          <label>
            Delivery
            <select
              value={v.delivery || "physical"}
              onChange={(e) =>
                change(i, { delivery: e.target.value as Variant["delivery"] })
              }
            >
              <option value="physical">Physical print</option>
              <option value="digital">Digital email delivery</option>
            </select>
          </label>
          <button
            type="button"
            className="shop-button shop-secondary"
            aria-label={`Remove size ${v.label}`}
            disabled={value.length === 1}
            title={
              value.length === 1
                ? "Keep at least one size, or archive the product to stop selling it."
                : "Remove this size"
            }
            onClick={() => onChange(value.filter((_, n) => n !== i))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="shop-button shop-secondary"
        disabled={value.length >= 40}
        onClick={() =>
          onChange([
            ...value,
            {
              id: crypto.randomUUID(),
              label: "",
              price: 100,
              delivery: "physical",
            },
          ])
        }
      >
        Add size
      </button>
    </fieldset>
  );
}
function ProductEditor({
  product,
  categories,
  onSave,
  onUpload,
  busy,
}: {
  product: Product;
  categories: Category[];
  onSave: (p: Product) => Promise<void>;
  onUpload: (files: FileList) => Promise<string[]>;
  busy: boolean;
}) {
  const [draft, setDraft] = useState(product);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  return (
    <form
      className="shop-panel shop-form"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave(draft);
      }}
    >
      <h3>{product.title || "New product"}</h3>
      <label>
        Title
        <input
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          required
          maxLength={120}
        />
      </label>
      <label>
        Description
        <textarea
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          rows={3}
          maxLength={3000}
        />
      </label>
      <label>
        Category
        <select
          value={draft.category_id}
          onChange={(e) => {
            const c = categories.find((c) => c.id === e.target.value)!;
            setDraft({
              ...draft,
              category_id: c.id,
              variants: c.variants.map((v) => ({ ...v })),
            });
          }}
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {!c.active ? " (hidden)" : ""}
            </option>
          ))}
        </select>
      </label>
      <p className="shop-muted">
        Changing category loads that category’s default sizes and prices.
      </p>
      <VariantEditor
        key={draft.category_id}
        value={draft.variants}
        onChange={(variants) => setDraft({ ...draft, variants })}
      />
      <fieldset>
        <legend>Images ({draft.images.length}/12)</legend>
        <p className="shop-muted">
          First image is the cover. Upload actual canvas, poster, or magnet
          photos here. PNG, JPEG, or WebP, up to 4 MB each.
        </p>
        <div className="shop-upload-grid">
          {draft.images.map((src, i) => (
            <div className="shop-upload-tile" key={src + i}>
              <img src={src} alt={`Product image ${i + 1}`} />
              {i === 0 ? (
                <small>Cover image</small>
              ) : (
                <button
                  className="shop-link-button"
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      images: [src, ...draft.images.filter((_, n) => n !== i)],
                    })
                  }
                >
                  Make cover
                </button>
              )}
              <button
                type="button"
                className="shop-link-button"
                onClick={() =>
                  setDraft({
                    ...draft,
                    images: draft.images.filter((_, n) => n !== i),
                  })
                }
              >
                Remove image
              </button>
            </div>
          ))}
        </div>
        <label>
          Add images
          <input
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            disabled={busy || uploading || draft.images.length >= 12}
            onChange={async (e) => {
              const input = e.currentTarget;
              const files = input.files;
              if (!files?.length) return;
              if (draft.images.length + files.length > 12) {
                setUploadError("Maximum 12 images per product.");
                return;
              }
              setUploading(true);
              setUploadError("");
              try {
                const urls = await onUpload(files);
                setDraft((current) => ({
                  ...current,
                  images: [...current.images, ...urls],
                }));
              } catch (e) {
                setUploadError((e as Error).message);
              } finally {
                setUploading(false);
                input.value = "";
              }
            }}
          />
        </label>
        {uploading && <p role="status">Uploading images…</p>}
        {uploadError && (
          <p role="alert" className="shop-error shop-notice">
            {uploadError}
          </p>
        )}
      </fieldset>
      <label>
        Display order
        <input
          type="number"
          min={0}
          max={1000}
          value={draft.sort_order}
          onChange={(e) =>
            setDraft({ ...draft, sort_order: Number(e.target.value) })
          }
        />
      </label>
      <label className="shop-admin-check">
        <input
          type="checkbox"
          checked={draft.active}
          onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
        />
        Published in the shop
      </label>
      <p className="shop-muted">
        Uncheck to archive this listing. Past order details stay intact. Hidden
        categories also hide their products.
      </p>
      <button
        className="shop-button"
        type="submit"
        disabled={busy || uploading || !draft.images.length}
      >
        {busy ? "Saving…" : "Save product"}
      </button>
    </form>
  );
}
function CategoryEditor({
  category,
  isNew,
  onSave,
  busy,
}: {
  category: Category;
  isNew: boolean;
  onSave: (c: Category) => Promise<void>;
  busy: boolean;
}) {
  const [draft, setDraft] = useState(category);
  return (
    <form
      className="shop-panel shop-form"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave(draft);
      }}
    >
      <h3>{isNew ? "New product category" : category.name}</h3>
      <p className="shop-muted">
        Each published category becomes a tab above the gallery. Default sizes
        apply to newly created products; edit existing listings individually.
      </p>
      <label>
        Category ID
        <input
          value={draft.id}
          readOnly={!isNew}
          required
          pattern="[a-z0-9-]{1,60}"
          maxLength={60}
          placeholder="stickers"
          onChange={(e) => setDraft({ ...draft, id: e.target.value })}
        />
      </label>
      <label>
        Tab name
        <input
          value={draft.name}
          required
          maxLength={120}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </label>
      <label>
        Description
        <textarea
          value={draft.description}
          maxLength={1000}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
      </label>
      <VariantEditor
        value={draft.variants}
        onChange={(variants) => setDraft({ ...draft, variants })}
      />
      <label>
        Display order
        <input
          type="number"
          min={0}
          max={1000}
          value={draft.sort_order}
          onChange={(e) =>
            setDraft({ ...draft, sort_order: Number(e.target.value) })
          }
        />
      </label>
      <label className="shop-admin-check">
        <input
          type="checkbox"
          checked={draft.active}
          onChange={(e) => setDraft({ ...draft, active: e.target.checked })}
        />
        Show category and its products
      </label>
      <button className="shop-button" disabled={busy}>
        {busy ? "Saving…" : "Save category"}
      </button>
    </form>
  );
}
function SettingsEditor({
  settings,
  onSave,
  busy,
}: {
  settings: Settings;
  onSave: (s: Settings) => Promise<void>;
  busy: boolean;
}) {
  const [draft, setDraft] = useState(settings);
  return (
    <form
      className="shop-panel shop-form"
      onSubmit={(e) => {
        e.preventDefault();
        void onSave(draft);
      }}
    >
      <h3>Payment and delivery details</h3>
      <p>
        Payments are confirmed manually. These details are used when you prepare
        an order confirmation email. Square is not connected.
      </p>
      <label>
        Shop contact email
        <input
          type="email"
          required
          value={draft.contactEmail}
          onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })}
        />
      </label>
      <label>
        Cash App cashtag (optional)
        <input
          placeholder="$YourCashtag"
          value={draft.cashapp}
          maxLength={31}
          onChange={(e) => setDraft({ ...draft, cashapp: e.target.value })}
        />
      </label>
      <label>
        PayPal payment link (optional)
        <input
          type="url"
          placeholder="https://paypal.me/yourname"
          value={draft.paypal}
          onChange={(e) => setDraft({ ...draft, paypal: e.target.value })}
        />
      </label>
      <label>
        Payment instructions
        <textarea
          value={draft.paymentNote}
          maxLength={2000}
          rows={3}
          onChange={(e) => setDraft({ ...draft, paymentNote: e.target.value })}
        />
      </label>
      <label>
        Shipping / pickup information
        <textarea
          required
          value={draft.shippingNote}
          maxLength={2000}
          rows={3}
          onChange={(e) => setDraft({ ...draft, shippingNote: e.target.value })}
        />
      </label>
      <button className="shop-button" disabled={busy}>
        {busy ? "Saving…" : "Save shop settings"}
      </button>
    </form>
  );
}
function customDetail(key: string, value: unknown) {
  const labels: Record<string, string> = {
    pokemon: "Pokémon",
    theme: "Theme",
    color: "Color artwork",
    optionId: "Format ID",
    framed: "Framed",
    delivery: "Delivery",
    label: "Format",
    size: "Size",
    base: "Base artwork",
    colorCharge: "Color upgrade",
    formatCharge: "Format upgrade",
    frameCharge: "Frame",
    total: "Artwork estimate",
  };
  return `${labels[key] || key}: ${typeof value === "boolean" ? (value ? "Yes" : "No") : ["base", "colorCharge", "formatCharge", "frameCharge", "total"].includes(key) && typeof value === "number" ? money(value) : String(value)}`;
}
function OrderEditor({
  order,
  settings,
  onSave,
  busy,
}: {
  order: Order;
  settings: Settings;
  onSave: (o: Order) => Promise<void>;
  busy: boolean;
}) {
  const [draft, setDraft] = useState(order);
  const [saved, setSaved] = useState(order);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) {
      setDraft(order);
      setSaved(order);
    }
  }, [order, dirty]);
  function change(patch: Partial<Order>) {
    setDirty(true);
    setDraft({ ...draft, ...patch });
  }
  const digitalItems = saved.items.some((i) => i.delivery === "digital");
  const paymentLinks = [
    settings.cashapp
      ? `Cash App: https://cash.app/$${settings.cashapp.replace(/^\$/, "")}`
      : "",
    settings.paypal ? `PayPal: ${settings.paypal}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const emailBody = `Hi ${saved.name},\n\nYour ${saved.kind === "custom" ? "custom artwork request" : "order"} ${saved.reference} is ${saved.status.replaceAll("_", " ")}.\n\n${
    saved.custom_details
      ? Object.entries(saved.custom_details)
          .map(([key, value]) => customDetail(key, value))
          .join("\n")
      : ""
  }\n${saved.discount ? `Discount: ${saved.discount_label} -${money(saved.discount)}` : ""}\n${saved.items.map((i) => `${i.quantity} x ${i.title} / ${i.category} / ${i.size}: ${money(i.price * i.quantity)}`).join("\n")}\n\n${saved.final_total !== null ? `Final total including shipping and any applicable tax: ${money(saved.final_total)}.` : "Please wait for your final quote before payment."}\n\n${saved.final_total !== null && saved.final_total > 0 && ["quoted", "awaiting_payment"].includes(saved.status) ? paymentLinks + "\nInclude reference " + saved.reference + " with your payment." : ""}\n${digitalItems ? digitalDeliveryNote : ""}\n\nThank you,\nPoke Print Shop`;
  return (
    <form
      className="shop-panel shop-form shop-order-card"
      onSubmit={async (e) => {
        e.preventDefault();
        try {
          await onSave(draft);
          setSaved(draft);
          setDirty(false);
        } catch {}
      }}
    >
      <div className="shop-row shop-between">
        <h3>{order.reference}</h3>
        <span>
          {order.kind === "custom" ? "Custom quote" : "Product order"} ·{" "}
          {new Date(order.created_at).toLocaleDateString()}
        </span>
      </div>
      <div>
        <strong>{order.name}</strong>
        <p>
          <a href={`mailto:${order.email}`}>{order.email}</a> ·{" "}
          {order.payment_method}
        </p>
        <p>{order.phone}</p>
        <pre>{order.address}</pre>
      </div>
      {order.items.length > 0 && (
        <ul className="shop-order-items">
          {order.items.map((i, n) => (
            <li key={n}>
              {i.quantity} × {i.title} · {i.category} · {i.size} —{" "}
              {money(i.price * i.quantity)}
            </li>
          ))}
        </ul>
      )}
      {order.custom_details && (
        <div className="shop-panel shop-preserve">
          <strong>Custom artwork specifications</strong>
          {Object.entries(order.custom_details).map(([key, value]) => (
            <p key={key}>{customDetail(key, value)}</p>
          ))}
        </div>
      )}
      {order.items.some((i) => i.delivery === "digital") && (
        <p className="shop-notice">
          Digital delivery: email the purchased artwork within 1 hour of
          confirming payment. Mark fulfilled after delivery. Downloads are not
          sent automatically.
        </p>
      )}
      <p>Artwork subtotal: {money(order.subtotal)}</p>
      {!!order.discount && (
        <p>
          {order.discount_label}: −{money(order.discount)} · After discount:{" "}
          {money(order.subtotal - order.discount)}
        </p>
      )}
      <div>
        <strong>Customer notes / artwork brief</strong>
        <pre>{order.notes || "None"}</pre>
      </div>
      <div className="shop-fields">
        <label>
          Status
          <select
            value={draft.status}
            onChange={(e) =>
              change({ status: e.target.value as Order["status"] })
            }
          >
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label>
          Final total incl. shipping &amp; tax ($)
          <input
            type="number"
            min="0"
            max="100000"
            step="0.01"
            value={draft.final_total === null ? "" : draft.final_total / 100}
            onChange={(e) =>
              change({
                final_total:
                  e.target.value === ""
                    ? null
                    : Math.round(Number(e.target.value) * 100),
              })
            }
          />
        </label>
      </div>
      <label>
        Private admin notes
        <textarea
          value={draft.admin_notes}
          maxLength={5000}
          onChange={(e) => change({ admin_notes: e.target.value })}
        />
      </label>
      <p className="shop-muted">
        Mark paid only after checking your Cash App or PayPal account. A payment
        preference does not confirm payment. Saving does not send an email.
      </p>
      <div className="shop-row">
        <button className="shop-button" disabled={busy}>
          {busy ? "Saving…" : "Save order"}
        </button>
        {!dirty && (
          <a
            className="shop-button shop-secondary"
            href={`mailto:${saved.email}?subject=${encodeURIComponent("Poke Print Shop — " + saved.reference)}&body=${encodeURIComponent(emailBody)}`}
          >
            Prepare customer email
          </a>
        )}
        {dirty && <small>Save changes before preparing the email.</small>}
      </div>
    </form>
  );
}
export default function Admin() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [invite, setInvite] = useState<string | null>(null);
  const [reset, setReset] = useState(false);
  const [data, setData] = useState<Catalog | null>(null);
  const [tab, setTab] = useState("products");
  const [product, setProduct] = useState<Product | null>(null);
  const [category, setCategory] = useState<Category | null>(null);
  const [newCategory, setNewCategory] = useState(false);
  const [editorKey, setEditorKey] = useState(0);
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("");
  async function load() {
    const result = await api<Catalog>("admin");
    setData(result);
    setAuthenticated(true);
  }
  useEffect(() => {
    void (async () => {
      try {
        const callback = await handleAuthCallback();
        if (callback?.type === "invite") {
          if (!callback.token)
            throw new Error("Invalid invitation. Please request a new invite.");
          setInvite(callback.token);
          return;
        }
        if (callback?.type === "recovery") {
          setReset(true);
          return;
        }
        if (await getUser()) await load();
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setChecking(false);
      }
    })();
  }, []);
  async function action(fn: () => Promise<void>, success = "Saved.") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await fn();
      setMessage(success);
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setBusy(false);
    }
  }
  async function saveSiteSettings(settings: Settings) {
    try {
      await action(async () => {
        await api("settings", {
          method: "PUT",
          body: JSON.stringify(settings),
        });
        await load();
      }, "Website settings saved.");
    } catch {}
  }
  async function loadOrders(next = page) {
    const result = await api<{ orders: Order[] }>("orders?page=" + next);
    setOrders(result.orders);
    setPage(next);
  }
  async function saveProduct(p: Product) {
    try {
      await action(async () => {
        await api("products", { method: "PUT", body: JSON.stringify(p) });
        await load();
        setProduct(p);
      }, "Product saved. Published listings are now visible in the shop.");
    } catch {}
  }
  async function upload(files: FileList) {
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.set("file", file);
      const result = await api<{ url: string }>("upload", {
        method: "POST",
        body: form,
      });
      urls.push(result.url);
    }
    return urls;
  }
  async function saveCategory(c: Category) {
    try {
      await action(async () => {
        if (newCategory && data?.categories.some((x) => x.id === c.id))
          throw new Error(
            "That category ID already exists. Choose a unique ID.",
          );
        await api("categories", { method: "PUT", body: JSON.stringify(c) });
        await load();
        setCategory(c);
        setNewCategory(false);
      }, "Category saved.");
    } catch {}
  }
  async function authSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const values = new FormData(e.currentTarget);
    try {
      await action(async () => {
        const password = String(values.get("password"));
        if (invite) {
          await acceptInvite(invite, password);
          setInvite(null);
        } else if (reset) {
          await updateUser({ password });
          setReset(false);
        } else {
          await login(String(values.get("email")), password);
        }
        await load();
      }, "Signed in.");
    } catch {}
  }
  const feedback = (
    <>
      {error && (
        <p className="shop-notice shop-error shop-admin-status" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="shop-notice shop-success shop-admin-status" role="status">
          {message}
        </p>
      )}
    </>
  );
  if (checking)
    return (
      <main className="shop-admin">
        <p role="status">Checking admin access…</p>
      </main>
    );
  if (!authenticated)
    return (
      <main className="shop-admin">
        <a href="/">← Back to the shop</a>
        <div className="shop-login">
          <span className="shop-eyebrow">Poke Print Shop</span>
          <h1>Trainer’s Desk</h1>
          <p>Sign in to manage your artwork, products, and orders.</p>
          {feedback}
          <form className="shop-panel shop-form" onSubmit={authSubmit}>
            {!invite && !reset && (
              <label>
                Email
                <input
                  type="email"
                  name="email"
                  required
                  autoComplete="username"
                  defaultValue="admin@evileevee.com"
                />
              </label>
            )}
            <label>
              {invite || reset ? "Choose a new password" : "Password"}
              <input
                type="password"
                name="password"
                required
                minLength={invite || reset ? 12 : undefined}
                autoComplete={
                  invite || reset ? "new-password" : "current-password"
                }
              />
            </label>
            <button className="shop-button" disabled={busy}>
              {busy
                ? "Please wait…"
                : invite
                  ? "Accept invitation"
                  : reset
                    ? "Save new password"
                    : "Sign in"}
            </button>
          </form>
          {!invite && !reset && (
            <form
              className="shop-panel shop-form"
              style={{ marginTop: "1rem" }}
              onSubmit={(e) => {
                e.preventDefault();
                const email = String(
                  new FormData(e.currentTarget).get("email"),
                );
                void action(
                  () => requestPasswordRecovery(email),
                  "If the account exists, check your email for a password reset link.",
                ).catch(() => {});
              }}
            >
              <label>
                Forgot your password?
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="Your admin email"
                />
              </label>
              <button className="shop-button shop-secondary" disabled={busy}>
                Send reset link
              </button>
            </form>
          )}
          <p className="shop-muted" style={{ marginTop: "1rem" }}>
            Admin access is invitation only. The site owner invites
            admin@evileevee.com through Netlify Identity and assigns the admin
            role. No public signup is needed.
          </p>
        </div>
      </main>
    );
  if (!data) return <main className="shop-admin">Loading shop…</main>;
  return (
    <main className="shop-admin">
      <header className="shop-admin-head">
        <div>
          <span className="shop-eyebrow">Poke Print Shop / Admin</span>
          <h1>Trainer’s Desk</h1>
        </div>
        <div className="shop-row">
          <a href="/" target="_blank" rel="noreferrer">
            View shop ↗
          </a>
          <button
            className="shop-button shop-secondary"
            onClick={() =>
              void action(async () => {
                await logout();
                setAuthenticated(false);
                setData(null);
                setOrders([]);
              }, "Signed out.").catch(() => {})
            }
          >
            Sign out
          </button>
        </div>
      </header>
      <nav className="shop-tabs shop-admin-tabs" aria-label="Admin sections">
        {[
          "products",
          "categories",
          "orders",
          "website",
          "discounts",
          "messages",
          "subscribers",
          "settings",
        ].map((t) => (
          <button
            key={t}
            aria-pressed={tab === t}
            disabled={busy}
            onClick={() => {
              setTab(t);
              setError("");
              setMessage("");
              if (t === "orders")
                void action(() => loadOrders(0), "Orders refreshed.").catch(
                  () => {},
                );
            }}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </nav>
      {feedback}
      {tab === "products" && (
        <>
          <div className="shop-row shop-between" style={{ margin: "1.5rem 0" }}>
            <label>
              Filter listings
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Title or category…"
              />
            </label>
            <button
              className="shop-button"
              disabled={busy || !data.categories.length}
              onClick={() => {
                const c = data.categories[0];
                setProduct({
                  id: crypto.randomUUID(),
                  title: "",
                  description: "",
                  category_id: c.id,
                  images: [],
                  variants: c.variants.map((v) => ({ ...v })),
                  active: false,
                  sort_order: 0,
                });
                setEditorKey((k) => k + 1);
              }}
            >
              Add new product
            </button>
          </div>
          <div className="shop-admin-layout">
            <div className="shop-admin-list">
              {data.products
                .filter((p) =>
                  (
                    p.title +
                    " " +
                    data.categories.find((c) => c.id === p.category_id)?.name
                  )
                    .toLowerCase()
                    .includes(filter.toLowerCase()),
                )
                .map((p) => (
                  <button
                    key={p.id}
                    disabled={busy}
                    className="shop-list-button"
                    aria-pressed={p.id === product?.id}
                    onClick={() => {
                      setProduct(p);
                      setEditorKey((k) => k + 1);
                    }}
                  >
                    <img src={p.images[0]} alt="" />
                    <span>
                      {p.title}
                      <small>
                        {
                          data.categories.find((c) => c.id === p.category_id)
                            ?.name
                        }{" "}
                        · {p.active ? "Published" : "Draft / archived"}
                      </small>
                    </span>
                  </button>
                ))}
            </div>
            {product ? (
              <ProductEditor
                key={product.id + "-" + editorKey}
                product={product}
                categories={data.categories}
                onSave={saveProduct}
                onUpload={upload}
                busy={busy}
              />
            ) : (
              <div className="shop-panel shop-empty">
                Select a listing to edit, or add a new product. To remove a
                listing from the shop, uncheck “Published” and save.
              </div>
            )}
          </div>
        </>
      )}
      {tab === "categories" && (
        <>
          <button
            className="shop-button"
            disabled={busy}
            onClick={() => {
              setCategory({
                id: "",
                name: "",
                description: "",
                variants: [
                  {
                    id: crypto.randomUUID(),
                    label: "",
                    price: 100,
                    delivery: "physical",
                  },
                  {
                    id: "digital-print",
                    label: "Digital print version (email delivery)",
                    price: 250,
                    delivery: "digital",
                  },
                ],
                active: false,
                sort_order: data.categories.length,
              });
              setNewCategory(true);
              setEditorKey((k) => k + 1);
            }}
          >
            Add category / gallery tab
          </button>
          <div className="shop-admin-layout" style={{ marginTop: "1.5rem" }}>
            <div className="shop-admin-list">
              {data.categories.map((c) => (
                <button
                  key={c.id}
                  disabled={busy}
                  className="shop-list-button"
                  aria-pressed={c.id === category?.id}
                  onClick={() => {
                    setCategory(c);
                    setNewCategory(false);
                    setEditorKey((k) => k + 1);
                  }}
                >
                  {c.name}
                  {!c.active ? " (hidden)" : ""}
                </button>
              ))}
            </div>
            {category ? (
              <CategoryEditor
                key={category.id + "-" + editorKey}
                category={category}
                isNew={newCategory}
                onSave={saveCategory}
                busy={busy}
              />
            ) : (
              <div className="shop-panel shop-empty">
                Choose a category to manage its gallery tab and default sizes.
              </div>
            )}
          </div>
        </>
      )}
      {tab === "website" && (
        <WebsiteEditor catalog={data} busy={busy} onSave={saveSiteSettings} />
      )}
      {tab === "discounts" && (
        <DiscountAdmin
          settings={data.settings}
          onSaveSettings={saveSiteSettings}
        />
      )}
      {tab === "messages" && <MessageInbox />}
      {tab === "subscribers" && <SubscriberList />}
      {tab === "settings" && (
        <SettingsEditor
          settings={data.settings}
          busy={busy}
          onSave={async (settings) => {
            try {
              await action(async () => {
                await api("settings", {
                  method: "PUT",
                  body: JSON.stringify(settings),
                });
                await load();
              }, "Payment and delivery details saved.");
            } catch {}
          }}
        />
      )}
      {tab === "orders" && (
        <>
          <p>
            Review product orders and custom artwork requests. Save your quote
            or status, then prepare a customer email in your mail app. Emails
            are not sent automatically.
          </p>
          <button
            className="shop-button shop-secondary"
            disabled={busy}
            onClick={() =>
              void action(() => loadOrders(), "Orders refreshed.").catch(
                () => {},
              )
            }
          >
            Refresh orders
          </button>
          {orders.length ? (
            orders.map((o) => (
              <OrderEditor
                key={o.id}
                order={o}
                settings={data.settings}
                busy={busy}
                onSave={async (order) => {
                  await action(async () => {
                    await api("orders", {
                      method: "PUT",
                      body: JSON.stringify({
                        id: order.id,
                        status: order.status,
                        final_total: order.final_total,
                        admin_notes: order.admin_notes,
                      }),
                    });
                    await loadOrders();
                  }, "Order saved.");
                }}
              />
            ))
          ) : (
            <div className="shop-notice">No orders on this page yet.</div>
          )}
          <div className="shop-pager">
            <button
              disabled={busy || page === 0}
              className="shop-button shop-secondary"
              onClick={() =>
                void action(
                  () => loadOrders(page - 1),
                  "Orders refreshed.",
                ).catch(() => {})
              }
            >
              Previous
            </button>
            <span>Page {page + 1}</span>
            <button
              disabled={busy || orders.length < 50}
              className="shop-button shop-secondary"
              onClick={() =>
                void action(
                  () => loadOrders(page + 1),
                  "Orders refreshed.",
                ).catch(() => {})
              }
            >
              Next
            </button>
          </div>
        </>
      )}
    </main>
  );
}
