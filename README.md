<div align="center">

<br />

# ⚡ Phigen

### AI-powered changelog generator for GitHub repositories

Generate beautiful, shareable changelogs from commit history using Claude AI — in seconds.

<br />

[![Health](https://img.shields.io/website?url=https%3A%2F%2Fphigen-main-9a45e2b.kuberns.cloud&label=health&style=flat-square&logo=statuspage)](https://phigen-main-9a45e2b.kuberns.cloud)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square&logo=prisma)](https://prisma.io)
[![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)

<br />

[![Instagram](https://img.shields.io/badge/@lacopydepastel-E4405F?style=flat-square&logo=instagram&logoColor=white)](https://instagram.com/lacopydepastel)
[![YouTube](https://img.shields.io/badge/@rvorine-FF0000?style=flat-square&logo=youtube&logoColor=white)](https://youtube.com/@rvorine)

<br />

<a href="https://kuberns.com/login/"> <img src="https://i.postimg.cc/vTCQshqV/Gemini-Generated-Image-wfgcgowfgcgowfgc.png" alt="Deploy with Kuberns" width="200"/> </a>

<br />

![Phigen Screenshot](https://placehold.co/900x500/0f0f1a/6366f1?text=Phigen+—+AI+Changelog+Generator&font=montserrat)

</div>

---

## ✨ Features

| Feature | Free | Pro |
|---------|------|-----|
| Unlimited public repos | ✅ | ✅ |
| Shareable changelog links | ✅ | ✅ |
| Branch-specific changelogs | ✅ | ✅ |
| 1 private repo | ✅ | ✅ |
| Unlimited private repos | — | ✅ |
| Up to 1 year of history | — | ✅ |
| Admin panel | — | — (admin only) |
| Built-in server migration tool | — | — (admin only) |

---

## 🧱 Tech Stack

- **Framework** — [Next.js 16](https://nextjs.org) App Router (SSR)
- **Auth** — [NextAuth v5](https://authjs.dev) with GitHub OAuth
- **Database** — PostgreSQL via [Prisma 5](https://prisma.io)
- **AI** — [Claude API](https://anthropic.com) (`claude-opus-4-7`)
- **Payments** — [Razorpay](https://razorpay.com) (domestic + international)
- **Deployment** — Docker + Docker Compose

---

## 🚀 Quick Deploy

### Option 1 — Kuberns (one click)

<a href="https://kuberns.com/login/"> <img src="https://i.postimg.cc/vTCQshqV/Gemini-Generated-Image-wfgcgowfgcgowfgc.png" alt="Deploy with Kuberns" width="200"/> </a>

Kuberns auto-provisions a PostgreSQL instance alongside the app. Set your env vars in the Kuberns dashboard after deploy.

### Option 2 — Self-host with Docker

```bash
# 1. Clone
git clone https://github.com/yourusername/phigen.git
cd phigen

# 2. Copy env and fill in values
cp .env.example .env
nano .env

# 3. Start everything (app + postgres)
docker compose up -d

# 4. Run DB migrations
docker compose exec app npx prisma migrate deploy
```

App runs at `http://localhost:3000`.

---

## ⚙️ Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_CLIENT_ID` | ✅ | GitHub OAuth App client ID |
| `GITHUB_CLIENT_SECRET` | ✅ | GitHub OAuth App client secret |
| `NEXTAUTH_SECRET` | ✅ | Random string — `openssl rand -base64 32` |
| `NEXTAUTH_URL` | ✅ | Your app's public URL (e.g. `https://yourdomain.com`) |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `ANTHROPIC_API_KEY` | ✅ | Claude API key from [console.anthropic.com](https://console.anthropic.com) |
| `RAZORPAY_KEY_ID` | ✅ | Razorpay key ID |
| `RAZORPAY_KEY_SECRET` | ✅ | Razorpay key secret |
| `RAZORPAY_PLAN_ID` | ✅ | Razorpay subscription plan ID |
| `RAZORPAY_WEBHOOK_SECRET` | ✅ | Razorpay webhook secret |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | ✅ | Same as `RAZORPAY_KEY_ID` (exposed to browser) |
| `NEXT_PUBLIC_APP_URL` | ✅ | Same as `NEXTAUTH_URL` (exposed to browser) |
| `ADMIN_GITHUB_USERNAME` | ⬜ | GitHub username for admin account. Empty = no admin. |
| `MIGRATION_SECRET` | ⬜ | Enables server migration endpoint. Set on old server, unset after migration. |

---

## 🔐 GitHub OAuth Setup

1. Go to [github.com/settings/developers](https://github.com/settings/developers) → **New OAuth App**
2. Set **Authorization callback URL** to:
   ```
   https://yourdomain.com/api/auth/callback/github
   ```
   Use `http://localhost:3000/api/auth/callback/github` for local dev.
3. Copy **Client ID** and **Client Secret** → `.env`

---

## 💳 Razorpay Setup

1. Create account at [razorpay.com](https://razorpay.com)
2. Dashboard → Subscriptions → Plans → Create a monthly plan
3. Copy **Plan ID** → `RAZORPAY_PLAN_ID`
4. Settings → API Keys → Generate → copy to `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`
5. Settings → Webhooks → Add endpoint:
   ```
   https://yourdomain.com/api/subscription/webhook
   ```
   Select events: `subscription.activated`, `subscription.charged`, `subscription.cancelled`, `subscription.expired`

---

## 🗄️ Database

PostgreSQL managed via Prisma. Run migrations:

```bash
# Development
npx prisma migrate dev

# Production
npx prisma migrate deploy
```

Schema overview:

```
User ──< SavedRepo
     ──< Changelog
     ──  Subscription
```

---

## 🛡️ Admin Panel

Set `ADMIN_GITHUB_USERNAME` to your GitHub username. Log in → Dashboard → **Admin Panel** link appears in the sidebar.

Admin features:
- 📊 User & changelog stats
- 👥 All users with plan breakdown
- 📝 Recent changelog history
- 🚚 **Built-in migration tool** — move entire DB to a new server without SSH

---

## 🚚 Server Migration (Zero Downtime)

Phigen ships a built-in migration tool — no `pg_dump`, no SSH, no stress.

**On old server** — set `MIGRATION_SECRET=some-long-random-string` in `.env`, restart.

**On new server** — Admin Panel → **Migration** tab → enter old server URL + secret → **Run Full Migration**.

Steps execute automatically:

```
1. Verify connection        → ping old server, confirm reachable
2. Import users             → upsert by GitHub ID
3. Import saved repos       → upsert by composite key
4. Import changelogs        → paginated, handles large history
5. Import subscriptions     → Razorpay refs + status preserved
6. Verify counts            → compare old vs new row counts
7. Post-migration checklist → DNS, Razorpay webhook URL, GitHub OAuth callback
```

After migration, unset `MIGRATION_SECRET` on both servers — export endpoint goes dead.

---

## 🏗️ Architecture

```
Browser
  │
  ├── /                    → Landing page
  ├── /dashboard           → Repo management + changelog history
  ├── /generate            → Repo + branch + date picker → AI generation
  ├── /changelog/[token]   → Public shareable changelog (no auth required)
  ├── /pricing             → Plan comparison + Razorpay checkout
  └── /admin               → Stats, users, migration tool (admin only)

API Routes
  ├── /api/auth            → NextAuth GitHub OAuth
  ├── /api/repos           → GitHub repos list
  ├── /api/repos/branches  → Branch list for a repo
  ├── /api/repos/saved     → Add / remove saved repos
  ├── /api/generate        → Commits → Claude AI → save changelog
  ├── /api/subscription    → Razorpay create / cancel / webhook
  ├── /api/user/me         → Current user data
  └── /api/admin           → Stats, migration export & run
```

---

## 🤝 Contributing

```bash
# Fork + clone
git clone https://github.com/yourusername/phigen.git
cd phigen

# Install dependencies
npm install

# Setup local env
cp .env.example .env
# Fill in .env values

# Run DB migrations
npx prisma migrate dev

# Start dev server
npm run dev
```

PRs welcome. Please open an issue first for large changes.

---

## 📄 License

MIT — free to self-host, fork, and modify. See [LICENSE](LICENSE).

---

<div align="center">

<br />

Made with ☕ by [rvorine](https://youtube.com/@rvorine)

<br />

[![Instagram](https://img.shields.io/badge/@lacopydepastel-E4405F?style=flat-square&logo=instagram&logoColor=white)](https://instagram.com/lacopydepastel)
[![YouTube](https://img.shields.io/badge/@rvorine-FF0000?style=flat-square&logo=youtube&logoColor=white)](https://youtube.com/@rvorine)

<br />

</div>
