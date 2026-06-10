# Deploying GoodSeed

GoodSeed is a static Vite site (`npm run build` → `dist/`). It runs on any static
host. SPA routing and PWA configs are already in the repo
(`vercel.json`, `netlify.toml`, `public/_redirects`).

> The hosting steps below require **your** GitHub / Netlify / Vercel login — they
> can't be automated for you.

---

## 1. Push to GitHub

Create an empty repo at <https://github.com/new> named `goodseed` (no README), then:

```bash
cd "/Users/andrew1h/Desktop/Good Seed"
git remote add origin https://github.com/<your-username>/goodseed.git
git push -u origin main
```

(Or with the GitHub CLI if you install it: `gh repo create goodseed --private --source=. --push`.)

> `.env` is gitignored on purpose — your keys are **not** pushed. You'll set them
> on the host in step 3.

---

## 2. Deploy (pick one)

### Option A — Netlify (recommended, uses `netlify.toml`)
1. <https://app.netlify.com> → **Add new site → Import an existing project**.
2. Pick the `goodseed` repo. Build settings auto-fill (`npm run build`, publish `dist`).
3. Deploy. Every future `git push` redeploys automatically.

### Option B — Vercel (uses `vercel.json`)
1. <https://vercel.com/new> → import the `goodseed` repo.
2. Framework preset: **Vite** (auto-detected). Deploy.

### Option C — one-shot from the terminal (opens a browser to log in)
```bash
npx netlify deploy --prod      # or:  npx vercel --prod
```

---

## 3. Set environment variables (required for multi-device sync)

Vite inlines `VITE_*` vars **at build time**, so they must be set on the host
**before/at build**, not just at runtime. In your host's project settings →
Environment Variables, add:

| Key | Value |
|---|---|
| `VITE_SUPABASE_URL` | `https://jedqarsyvrpicvlztyrm.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_DX-QsiePkj_AmvaGDnoxXw_9y1CM87H` |

Then trigger a redeploy. (These are also in your local `.env`.)

> **Without these vars**, the deployed app still works perfectly — it just runs in
> single-device localStorage mode (no cross-device sync). The publishable key is
> safe to expose in a client app.

---

## 4. After it's live
- **Installable PWA:** on a phone, open the URL → browser menu → *Add to Home
  Screen*. Works offline after first load (HTTPS required — all these hosts give it).
- **Custom domain:** add one in the host's domain settings if you like.

## Notes
- SPA deep links (`/Tasks`, `/ChildProfile/:id`) resolve via the included rewrite
  configs — no extra setup.
- Security: access is capability-based (see the README). Harden with Supabase Auth
  before a public launch.
