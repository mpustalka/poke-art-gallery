# Netlify deployment

This Next.js application deploys to Netlify from the `main` branch using `pnpm run build` and the `.next` publish directory. These settings are recorded in `netlify.toml`. Netlify automatically installs its Next.js adapter to handle routing, server rendering, and Next.js features.

Install dependencies with `pnpm install --frozen-lockfile`. For local development with Netlify emulation, run `netlify dev --port 8889`.

Vercel Analytics has been removed. The current application has no environment variables, database, authentication, or external storage integrations to transfer. The checked-in homepage is a placeholder.

The Netlify site is available at https://evileevee-gallery.netlify.app. If a custom domain is currently pointed at Vercel, add it to this site's domain settings and update its DNS records to the values Netlify provides. Verify the Netlify deployment before disabling the old Vercel deployment.
