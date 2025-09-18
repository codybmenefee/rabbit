# Deployment Guide (Vercel)

This app uses Clerk for authentication and Convex for data + functions. Deploy the Next.js app on Vercel and point it at your Convex production deployment.

## Prerequisites

- Vercel account
- Clerk account and application
- Convex account

## 1) Prepare Environment Variables

Copy `.env.example` to `.env.local` (for local) and set the same variables in Vercel Project Settings later:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_JWT_ISSUER_DOMAIN` (e.g. https://<your-tenant>.clerk.accounts.dev)
- `NEXT_PUBLIC_CONVEX_URL` (Convex deployment URL; see below)

Optional:
- `NEXT_PUBLIC_SITE_URL` (your canonical site URL)

## 2) Create Convex Production Deployment

From the app directory:

```bash
cd apps/web
npx convex deploy
# To print the URL later:
npx convex url
```

Use the printed production URL for `NEXT_PUBLIC_CONVEX_URL` in Vercel.

## 3) Configure Clerk

In Clerk dashboard (for your application):

- Allowed origins: add your Vercel domain (e.g. `https://<project>.vercel.app`) and any custom domains
- Set up `.env` values:
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `CLERK_JWT_ISSUER_DOMAIN`

No NextAuth is used in this project.

## 4) Create Vercel Project (Monorepo)

When importing the repo into Vercel:

- Root Directory: `apps/web`
- Framework Preset: Next.js
- Build Command: `npm run build`
- Install Command: `npm install`
- Output Directory: `.next`

Then add the environment variables under Project Settings → Environment Variables for Production, Preview, and Development as needed.

## 5) Deploy

Push to your default branch or trigger a manual deployment. Vercel will build and deploy the app from `apps/web`.

## Post-Deployment Checklist

- Sign in works with Clerk
- Convex queries/mutations succeed (dashboard loads data)
- File import/parsing runs without errors
- Charts and analytics render for a real user

## Troubleshooting

- Auth errors: Check Clerk keys and allowed origins/domains
- Convex errors: Confirm `NEXT_PUBLIC_CONVEX_URL` points to the production deployment
- Build issues: View Vercel build logs; run `npm run type-check` and `npm run lint` locally

## Notes

- `.env.local` must never be committed
- No SQL database is used; Convex is the primary data store
- For local development, run `npx convex dev` inside `apps/web` and use its printed URL in `.env.local`
