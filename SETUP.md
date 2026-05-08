# BillClear — Setup & Deployment

## Prerequisites

### 1. Install Node.js
Download LTS from https://nodejs.org — run the installer, accept defaults.
Verify: `node --version` (should show v20+ or v22+).

### 2. Create accounts (all free to start)

| Service | URL | What you need |
|---------|-----|---------------|
| GitHub | github.com | Free account |
| Vercel | vercel.com | Sign in with GitHub (Hobby tier, free) |
| Anthropic | console.anthropic.com | Load $20 credit, set $50/mo spending cap |
| Stripe | dashboard.stripe.com | Start in Test mode (free until you charge) |
| Resend | resend.com | Free 100 emails/day (for future reminder emails) |

## Local setup

```bash
cd billclear
npm install
```

### Configure environment variables

Edit `.env.local` in the project root — replace the placeholder values:

```
CLAUDE_API_KEY=sk-ant-api03-...       ← from console.anthropic.com → API Keys
STRIPE_SECRET_KEY=sk_test_...         ← from Stripe Dashboard → Developers → API Keys
STRIPE_PUBLISHABLE_KEY=pk_test_...    ← same place
SITE_URL=http://localhost:3000
```

### Run locally

```bash
npm run dev
```

Open http://localhost:3000. Test with a real bill photo, confirm extraction + analysis work. Test Stripe with card number `4242 4242 4242 4242`, any future expiry, any CVC.

## Deploy to production

```bash
git init
git add .
git commit -m "v3 with vision OCR"
```

Create an empty repo on GitHub called `billclear`. Push with the two commands GitHub shows you:

```bash
git remote add origin https://github.com/YOUR_USERNAME/billclear.git
git branch -M main
git push -u origin main
```

On vercel.com: Add New → Project → pick `billclear` repo.
Before clicking Deploy, expand Environment Variables and add all four:
- `CLAUDE_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_PUBLISHABLE_KEY`
- `SITE_URL` → set to your Vercel URL (e.g. `https://billclear.vercel.app`)

Deploy. Live in ~90 seconds.

## Go live with Stripe

1. In Stripe Dashboard, toggle Test → Live
2. Copy live keys
3. In Vercel: Settings → Environment Variables → replace test keys → Redeploy
4. Real cards now charge real money

## Optional: Custom domain

Buy a domain at Porkbun (~$10/year). In Vercel: Settings → Domains → add custom domain.
Update `SITE_URL` env var to match.
