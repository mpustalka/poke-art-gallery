# Poke Print Shop

The storefront preserves the original Pokémon artwork gallery’s dark blue, red, and yellow design and adds product tabs, product images, sizes and prices, an order builder, and custom artwork requests. The five original artworks are available as art prints, framed/matted prints, canvas prints, posters, and magnets. Images initially show the original artwork previews; upload photos of the actual products through the admin.

Canvas prints start at 12 x 20 inches for $39.99. Magnets start at 4 x 4 for $6.50, 4 x 6 for $7.50, and 5 x 7 for $8.50. The original print, frame, and poster prices are retained. All prices are in USD.

## Admin access

After the deployment completes:

1. Open the site’s **Identity** section in the Netlify dashboard and invite **admin@evileevee.com**. Use invite-only registration for this shop.
2. Accept the invitation and choose a password. Links landing on the homepage are forwarded to `/admin`, where invitation and recovery callbacks are handled.
3. Assign the **admin** role to that user in Netlify Identity, then sign in again at `/admin` to refresh the session. Creating an account alone never grants management access.
4. Open **Settings** to enter the shop’s Cash App cashtag, PayPal link, payment instructions, delivery information, and contact email.

The first administrator must be invited and assigned the role through Netlify Identity’s dashboard. The application does not assign roles based on a supplied email address, expose public signup, or use an environment password. Every admin API verifies the authenticated account’s server-controlled admin role.

## Managing products and tabs

Use **Products** to add listings, edit titles and descriptions, upload images, choose the cover image, set size/finish prices, and publish or archive listings. New products start as drafts. Each listing supports up to twelve PNG, JPEG, or WebP images, up to 4 MB each. Original images remain hosted locally; new uploads use Netlify Blobs. Removed image references do not delete the stored files, so past order snapshots retain their references.

Use **Categories** to add or edit the tabs above the gallery. Category defaults supply the sizes and prices for new products. Editing defaults does not overwrite existing listings; those may have their own prices. Changing an existing product’s category loads the new category’s defaults. The price guide shows category starting prices, while the product selector shows that listing’s exact price. Hidden categories hide their listings. Changes appear on the next storefront load without a rebuild.

## Orders and payments

Customers select products and sizes on the homepage, then open **Your order** at `/order` to review quantities and submit their contact and delivery details. The homepage retains a generic contact form with name, email, optional phone, message, and Submit. Cart links contain only validated product IDs, size IDs, and quantities so selections survive page navigation and refresh; no customer details are put in those URLs. Custom requests collect an artwork brief instead. Both are stored in Netlify Database and receive a reference number. Artwork subtotals are calculated on the server using current published listings. Client-supplied prices are ignored. Duplicate submissions use an idempotency key, and public order creation is limited per IP per hour.

Each existing artwork listing includes a $2.50 **Digital print version (email delivery)** option. Digital-only orders collect a delivery email without requesting a postal address or charging shipping. Mixed orders still require an address or pickup request. The server checks the actual product variants, independently of the customer’s submitted address. Admin product/category editors expose each size’s delivery type and price, so they remain editable. Existing category templates include the digital variant for future listings.

Digital orders display: “Digital orders are emailed within 1 hour after payment is confirmed. No physical print is included.” Digital files must be emailed manually by the shop owner after verifying payment; automated downloads, emails, and payment verification are not connected. The $2.50 option is for existing artwork and does not change the $40 custom digital commission price. The public admin login link was removed; administrators can still visit `/admin` directly, with the same protected access.

Payment is manual through Cash App or PayPal. No money is collected by the site, and Square is not connected. Because shipping and tax rules have not been established, the storefront explicitly treats displayed totals as artwork subtotals and tells customers to wait for confirmation before paying.

In **Orders**, review requests, set the final total including shipping and any applicable tax, and save a quote or status. **Prepare customer email** opens a draft in your mail app with the order reference, final total, and configured payment links for quoted/awaiting-payment orders. Review and send it yourself. No customer or admin emails are sent automatically by the application. Check Cash App or PayPal before marking an order paid; choosing a payment method does not verify a payment. Orders are paginated, fifty per page. Square checkout and automated payment verification require a separate integration once a provider is selected.

## Deployment and storage

Netlify deploys the Next.js application from `main` using the build settings in `netlify.toml`. The Netlify Next.js adapter supplies page routing and rendering. The shop API is a native Netlify Function at `/api/shop/*`.

Netlify Database stores products, categories, order snapshots, shop settings, and request limits. SQL files in `netlify/database/migrations/` create the tables and import the original artwork and requested product formats. Netlify applies these migrations during deployment; do not apply them manually. Existing data is preserved across deploys. Netlify Blobs stores uploaded images, with separate store namespaces for production and preview uploads. Identity activation is included in this change.

The original published markup and stylesheet were recovered from https://v0-evil-eevee-gallery.vercel.app/ because the original repository contained only a placeholder. Original artwork and Bungee/Rubik fonts are served from `public/artworks` and `public/fonts`; Vercel is not required at runtime.

## Local development and validation

Install with `pnpm install --frozen-lockfile`. Start the site and Netlify emulation with `netlify dev --port 8889`.

- `pnpm typecheck` checks the application and Netlify Function TypeScript.
- `pnpm test` verifies SQL migrations in an isolated test database, seed prices, server pricing, and order/payment validation.
- `pnpm exec playwright install chromium` installs the browser for UI checks.
- With the development server running, `pnpm test:e2e` checks gallery tabs, order/custom request flows, mobile overflow, and real unauthenticated API access. The storefront tests use catalog/order response fixtures seeded from the SQL migrations, not the live database.

Authenticated catalog edits, uploaded-image storage, and persistent order submission need a deployed environment with the migrations applied and the first admin configured. A future custom-domain cutover must be handled separately through Netlify domain settings and DNS.

## Website content and custom artwork

**Website** manages both hero images, their uploads, custom artwork pricing and formats, policies, FAQs, social links, and customer reviews/photos. Policies, FAQ answers, Instagram, and TikTok start as unpublished drafts. Add real text or profile links and publish when ready. Reviews require permission before publication. Clicking any gallery artwork opens a modal with its images, description, sizes, and add-to-order control.

`/custom-artwork` contains a dedicated banner and commission form. “Just Print - (Digital Version Only)” costs $40 and is delivered by email with no framing or shipping. Standard physical custom prints are 4 x 6 or 5 x 7 for $40, or 8 x 10 for $50. A “Larger than 8 x 10” checkbox reveals 11 x 14 at $100, 12 x 12 at $125, an 18 x 24 poster at $225, and a 20 x 30 poster at $350. These are black-and-white prices before framing, shipping, or tax; color adds $20 to any size. The custom 4 x 4 print option is inactive; regular gallery products are unchanged.

Print framing adds $5 through 8 x 10 or $10 for 11 x 14 / 12 x 12. Poster framing adds $15 for 18 x 24 or $25 for 20 x 30. A 12 x 20 canvas adds $39.99 to the artwork fee; magnets add their regular format price. Every charge is editable in Website, where each custom option can also be assigned to the larger-size group. Physical artwork requires shipping or local pickup. Shipping, availability, timeline, and tax still need confirmation before payment.

**Discounts** manages automatic bundles and coupon codes. Initial print bundles are two 4 x 4 for $6, two 4 x 6 for $8.75, or one of each for $7, across artworks in the prints category. Server pricing finds the best non-overlapping combinations and never increases a lower individual price. Coupons support percentages or fixed USD amounts, minimum subtotals, expiration, and disabling. A coupon and the bundles never stack: the greater saving wins. Gallery discounts exclude custom commissions. Changing bundle settings does not change product prices.

The homepage contact form saves general inquiries in **Messages**, separately from commission orders. **Subscribers** records explicit email signup consent, exports active addresses as CSV for an email service, and allows removal requests to be processed. Contact messages and newsletter signups do not send automatic emails. Public submissions have validation, a honeypot, and per-IP rate limits. New tables and order fields are introduced by a forward migration; existing migrations and listings remain intact.
