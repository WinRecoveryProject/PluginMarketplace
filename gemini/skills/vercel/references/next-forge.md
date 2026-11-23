# Skill: next-forge

- Plugin: `vercel` (0.56.0-wrp.3)
- Source: `plugins/vercel/skills/next-forge/SKILL.md`

> next-forge expert guidance — production-grade Turborepo monorepo SaaS starter by Vercel. Use when working in a next-forge project, scaffolding with `npx next-forge init`, or editing @repo/* workspace packages.

## Instructions

### next-forge

next-forge is a production-grade Turborepo template for building Next.js SaaS applications. It provides a monorepo structure with multiple apps, shared packages, and integrations for authentication, database, payments, email, CMS, analytics, observability, security, and more.

#### Quick Start

Initialize a new project:

```bash
npx next-forge@latest init
```

The CLI prompts for a project name and package manager (bun, npm, yarn, or pnpm). After installation:

1. Set the `DATABASE_URL` in `packages/database/.env` pointing to a PostgreSQL database (Neon recommended).
2. Run database migrations: `bun run migrate`
3. Add any optional integration keys to the appropriate `.env.local` files.
4. Start development: `bun run dev`

All integrations besides the database are optional. Missing environment variables gracefully disable features rather than causing errors.

#### Architecture Overview

The monorepo contains apps and packages. Apps are deployable applications. Packages are shared libraries imported as `@repo/<package-name>`.

**Apps** (in `/apps/`):

| App | Port | Purpose |
|-----|------|---------|
| `app` | 3000 | Main authenticated SaaS application |
| `web` | 3001 | Marketing website with CMS and SEO |
| `api` | 3002 | Serverless API for webhooks, cron jobs |
| `email` | 3003 | React Email preview server |
| `docs` | 3004 | Documentation site (Mintlify) |
| `storybook` | 6006 | Design system component workshop |
| `studio` | 3005 | Prisma Studio for database editing |

**Core Packages**: `auth`, `database`, `payments`, `email`, `cms`, `design-system`, `analytics`, `observability`, `security`, `storage`, `seo`, `feature-flags`, `internationalization`, `webhooks`, `cron`, `notifications`, `collaboration`, `ai`, `rate-limit`, `next-config`, `typescript-config`.

For detailed structure, see `references/architecture.md`.

#### Key Concepts

##### Environment Variables

Environment variable files live alongside apps and packages:

- `apps/app/.env.local` — Main app keys (Clerk, Stripe, etc.)
- `apps/web/.env.local` — Marketing site keys
- `apps/api/.env.local` — API keys
- `packages/database/.env` — `DATABASE_URL` (required)
- `packages/cms/.env.local` — BaseHub token
- `packages/internationalization/.env.local` — Languine project ID

Each package has a `keys.ts` file that validates environment variables with Zod via `@t3-oss/env-nextjs`. Type safety is enforced at build time.

##### Inter-App URLs

Local URLs are pre-configured:

- `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- `NEXT_PUBLIC_WEB_URL=http://localhost:3001`
- `NEXT_PUBLIC_API_URL=http://localhost:3002`
- `NEXT_PUBLIC_DOCS_URL=http://localhost:3004`

Update these to production domains when deploying (e.g., `app.yourdomain.com`, `www.yourdomain.com`).

##### Server Components First

`page.tsx` and `layout.tsx` files are always server components. Client interactivity goes in separate files with `'use client'`. Access databases, secrets, and server-only APIs directly in server components and server actions.

##### Graceful Degradation

All integrations beyond the database are optional. Clients use optional chaining (e.g., `stripe?.prices.list()`, `resend?.emails.send()`). If the corresponding environment variable is not set, the feature is silently disabled.

#### Common Tasks

##### Running Development

```bash
bun run dev                  # All apps
bun dev --filter app         # Single app (port 3000)
bun dev --filter web         # Marketing site (port 3001)
```

##### Database Migrations

After changing `packages/database/prisma/schema.prisma`:

```bash
bun run migrate
```

This runs Prisma format, generate, and db push in sequence.

##### Adding shadcn/ui Components

```bash
npx shadcn@latest add [component] -c packages/design-system
```

Update existing components:

```bash
bun run bump-ui
```

##### Adding a New Package

Create a new directory in `/packages/` with a `package.json` using the `@repo/<name>` naming convention. Add it as a dependency in consuming apps.

##### Linting and Formatting

```bash
bun run lint                 # Check code style (Ultracite/Biome)
bun run format               # Fix code style
```

##### Testing

```bash
bun run test                 # Run tests across monorepo
```

##### Building

```bash
bun run build                # Build all apps and packages
bun run analyze              # Bundle analysis
```

##### Deployment

Deploy to Vercel by creating separate projects for `app`, `web`, and `api` — each pointing to its respective root directory under `/apps/`. Add environment variables per project or use Vercel Team Environment Variables.

For detailed setup and customization instructions, see:

- `references/setup.md` — Installation, prerequisites, environment variables, database and Stripe CLI setup
- `references/packages.md` — Detailed documentation for every package
- `references/customization.md` — Swapping providers, extending features, deployment configuration
- `references/architecture.md` — Full monorepo structure, Turborepo pipeline, scripts

## Bundled files

### File: `agents/openai.yaml`

```yaml
interface:
  display_name: "Next Forge"
  short_description: "'next-forge expert guidance — production-grade Turborepo monorepo SaaS starter by Vercel"
```

### File: `references/architecture.md`

#### Architecture

##### Monorepo Structure

next-forge uses Turborepo to manage a monorepo with apps and packages.

```
next-forge/
├── apps/
│   ├── app/          # Main SaaS app (port 3000)
│   ├── web/          # Marketing site (port 3001)
│   ├── api/          # Serverless API (port 3002)
│   ├── email/        # Email preview (port 3003)
│   ├── docs/         # Documentation (port 3004)
│   ├── storybook/    # Component workshop (port 6006)
│   └── studio/       # Prisma Studio (port 3005)
├── packages/
│   ├── ai/                    # AI/LLM integration
│   ├── analytics/             # PostHog, Google Analytics, Vercel Analytics
│   ├── auth/                  # Clerk authentication
│   ├── cms/                   # BaseHub CMS
│   ├── collaboration/         # Liveblocks real-time features
│   ├── cron/                  # Vercel cron jobs
│   ├── database/              # Prisma + Neon PostgreSQL
│   ├── design-system/         # shadcn/ui component library
│   ├── email/                 # Resend + React Email
│   ├── feature-flags/         # Vercel Flags SDK + PostHog
│   ├── internationalization/  # Languine i18n
│   ├── next-config/           # Shared Next.js configuration
│   ├── notifications/         # Knock notification platform
│   ├── observability/         # Sentry + BetterStack
│   ├── payments/              # Stripe integration
│   ├── rate-limit/            # Rate limiting utilities
│   ├── security/              # Arcjet WAF + bot detection
│   ├── seo/                   # Metadata, sitemap, JSON-LD
│   ├── storage/               # Vercel Blob
│   ├── typescript-config/     # Shared TS configs
│   └── webhooks/              # Svix outbound + Stripe/Clerk inbound
├── turbo.json
└── package.json
```

##### Apps

###### app (Port 3000)
The main user-facing SaaS application. Includes authentication via Clerk, database access via Prisma, collaboration features via Liveblocks, and notification feeds via Knock. Contains authenticated route layouts with security middleware.

###### web (Port 3001)
The marketing website. Integrates BaseHub CMS for blog posts and content, SEO optimization with metadata and sitemap generation, analytics tracking, and internationalization support.

###### api (Port 3002)
Serverless API endpoints for webhooks (Stripe, Clerk), cron jobs, and any dedicated API routes. Deployed as a separate Vercel project.

###### email (Port 3003)
React Email preview server for developing and testing email templates. Templates are React components in the `@repo/email` package.

###### docs (Port 3004)
Documentation site built with Mintlify. Requires the Mintlify CLI for local preview.

###### storybook (Port 6006)
Storybook instance for previewing and testing design system components in isolation.

###### studio (Port 3005)
Prisma Studio provides a visual interface for browsing and editing database records.

##### Package Naming

All packages use the `@repo/<name>` convention:

```typescript
import { database } from '@repo/database';
import { auth } from '@repo/auth';
import { stripe } from '@repo/payments';
```

Import from specific subpaths when needed:

```typescript
import { analytics } from '@repo/analytics/server';
import { upload } from '@repo/storage/client';
import { log } from '@repo/observability/log';
```

##### Turborepo Pipeline

Defined in `turbo.json`:

| Task | Dependencies | Outputs | Cached | Persistent |
|------|-------------|---------|--------|------------|
| `build` | `^build`, `test` | `.next`, `storybook-static`, `.react-email` | Yes | No |
| `test` | `^test` | — | Yes | No |
| `analyze` | `^analyze` | — | Yes | No |
| `dev` | — | — | No | Yes |
| `translate` | `^translate` | — | No | No |

Global dependencies include `.env.*local` files. Environment mode is loose. The `dev` task is persistent and never cached.

##### Root Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start all apps in development mode |
| `bun run build` | Build all apps and packages |
| `bun run test` | Run tests across the monorepo |
| `bun run lint` | Check code style (Ultracite/Biome) |
| `bun run format` | Fix code style |
| `bun run analyze` | Run bundle analysis |
| `bun run translate` | Run i18n translation via Languine |
| `bun run boundaries` | Check Turborepo workspace boundary violations |
| `bun run bump-deps` | Update all dependencies |
| `bun run bump-ui` | Update shadcn/ui components |
| `bun run migrate` | Push database schema (format, generate, db push) |
| `bun run clean` | Remove node_modules across the monorepo |
| `bun run changeset` | Manage changesets for releases |
| `bun run release` | Publish using changesets |

##### Filtering

Run commands for a specific app or package:

```bash
bun dev --filter app         # Only the main app
bun dev --filter web         # Only the marketing site
bun build --filter @repo/database  # Only the database package
```

##### Build Outputs

- `.next/` — Next.js build output (per app)
- `storybook-static/` — Storybook static export
- `.react-email/` — Compiled email templates
- `**/generated/**` — Auto-generated files (Prisma client, BaseHub SDK)

### File: `references/customization.md`

#### Customization

##### Swapping Providers

next-forge is designed to be modular. Each integration can be replaced by modifying its corresponding package.

###### Database / ORM

**Default**: Prisma + Neon PostgreSQL

**Alternatives**:
- **Drizzle** — Replace Prisma schema with Drizzle schema definitions. Update `@repo/database` exports to use Drizzle client.
- **PlanetScale** — Change the Prisma datasource provider or use PlanetScale's serverless driver.
- **Supabase** — Use Supabase's PostgreSQL connection string as `DATABASE_URL`, or swap to the Supabase client SDK.
- **Turso** — Use Turso's libSQL adapter with Prisma or Drizzle.
- **EdgeDB** — Replace Prisma with EdgeDB's schema and query builder.
- **Prisma Postgres** — Use Prisma's managed PostgreSQL service.

To swap: update `packages/database/`, change the client export, and update `DATABASE_URL`.

###### Authentication

**Default**: Clerk

**Alternatives**:
- **Supabase Auth** — Replace `@repo/auth` with Supabase Auth client. Update middleware and session handling.
- **Auth.js** — Implement Auth.js (NextAuth v5) with chosen providers. Update session access patterns.
- **Better Auth** — Use Better Auth's session management. Update `@repo/auth` exports.

To swap: replace `packages/auth/`, update the `AuthProvider` in the design system, and update webhook handlers.

###### CMS

**Default**: BaseHub

**Alternatives**:
- **Content Collections** — Use local MDX/Markdown files with content collections. Remove BaseHub SDK dependency.

To swap: replace `packages/cms/` with the new CMS client and update content queries in the `web` app.

###### Payments

**Default**: Stripe

**Alternatives**:
- **Paddle** — Replace Stripe SDK with Paddle SDK. Update webhook handlers at `/api/webhooks/payments`.
- **Lemon Squeezy** — Replace Stripe SDK with Lemon Squeezy SDK. Update webhook verification logic.

To swap: update `packages/payments/`, replace the webhook handler in `apps/api/`, and update pricing page logic.

###### Design System

**Default**: shadcn/ui (New York style, neutral colors)

**Alternatives**:
- **Tailwind Catalyst** — Replace shadcn/ui components with Catalyst components.
- Any Tailwind-based component library can be integrated.

To swap: replace components in `packages/design-system/`. Keep `DesignSystemProvider` as the wrapper.

###### Email

**Default**: Resend + React Email

To swap: replace the `resend` client in `packages/email/` with another provider SDK (SendGrid, Postmark, AWS SES). Keep React Email templates as they compile to standard HTML.

###### Documentation

**Default**: Mintlify

**Alternative**: Fumadocs — MDX-based documentation framework for Next.js.

To swap: replace the `docs` app with a Fumadocs Next.js app.

###### Notifications

**Default**: Knock

**Alternative**: Novu — similar workflow-based notification platform.

To swap: replace `packages/notifications/` with the new provider's SDK and update workflow triggers.

###### Code Formatting

**Default**: Ultracite (Biome-based)

**Alternative**: ESLint configurations.

Commands remain the same: `bun run lint`, `bun run format`.

##### Deployment to Vercel

###### Project Setup

Create three separate Vercel projects, one for each deployable app:

1. **app** — Root directory: `apps/app`
2. **web** — Root directory: `apps/web`
3. **api** — Root directory: `apps/api`

For each project:
1. Import the repository in Vercel.
2. Set the Root Directory to the app's path (e.g., `apps/app`).
3. Vercel auto-detects the Next.js framework.
4. Add all required environment variables.
5. Deploy.

###### Environment Variables on Vercel

Use Vercel Team Environment Variables to share common variables across projects (e.g., `DATABASE_URL`, Stripe keys). This avoids duplicating values per project.

Recommended: install the BetterStack and Sentry Vercel integrations to auto-inject their environment variables.

###### Production URLs

Update inter-app URL variables to production domains:

```bash
NEXT_PUBLIC_APP_URL="https://app.yourdomain.com"
NEXT_PUBLIC_WEB_URL="https://www.yourdomain.com"
NEXT_PUBLIC_API_URL="https://api.yourdomain.com"
NEXT_PUBLIC_DOCS_URL="https://docs.yourdomain.com"
```

###### Preview Deployments

Three strategies for preview environment inter-app communication:

1. **Point to production** — Preview apps use production URLs for other apps. Simplest setup.
2. **Branch-based URLs** — Use Vercel's deterministic branch URLs derived from `VERCEL_GIT_COMMIT_REF`. Each branch gets a stable preview URL.
3. **Manual override** — Set custom URLs per preview deployment in Vercel project settings.

##### Adding New Apps

1. Create a new directory under `/apps/`.
2. Initialize a Next.js app (or other framework).
3. Add `@repo/*` package dependencies as needed.
4. Add the app to `turbo.json` if it needs custom pipeline tasks.
5. Assign a unique development port.

##### Adding New Packages

1. Create a new directory under `/packages/`.
2. Add a `package.json` with the `@repo/<name>` naming convention.
3. Export the package's public API.
4. Add a `keys.ts` file if the package requires environment variables (use `@t3-oss/env-nextjs` with Zod).
5. Add the package as a dependency in consuming apps.

##### Design System Theming

###### Colors

The design system uses CSS custom properties for theming. Edit the theme in the design system's global CSS file. shadcn/ui provides a theme generator at ui.shadcn.com/themes.

###### Dark Mode

Dark mode is handled by `next-themes` via `DesignSystemProvider`. The provider supports system preference detection and manual theme toggling. Use the `dark:` Tailwind prefix for dark mode styles.

###### Fonts

Font configuration is centralized in the design system package. Update the font imports and CSS variables to change the application font.

###### Adding Components

Add new shadcn/ui components:

```bash
npx shadcn@latest add [component] -c packages/design-system
```

Create custom compound components following the composable pattern:

```typescript
import { Banner, BannerContent, BannerTitle, BannerDescription } from '@repo/design-system/components/banner';
```

##### Extending Features

###### Adding API Routes

Add routes in `apps/api/app/` following Next.js App Router conventions. Export named HTTP method handlers (`GET`, `POST`, etc.).

###### Adding Cron Jobs

1. Create a route at `apps/api/app/cron/[job-name]/route.ts` with a `GET` handler.
2. Add the schedule to `apps/api/vercel.json`:
   ```json
   { "path": "/cron/job-name", "schedule": "0 * * * *" }
   ```

###### Adding Webhook Handlers

Create routes in `apps/api/app/webhooks/` for inbound webhooks. Verify signatures using the provider's SDK.

###### Adding Feature Flags

1. Define the flag in `packages/feature-flags/index.ts` using `createFlag('key')`.
2. Create the flag in PostHog.
3. Use it: `const enabled = await myFlag()`.

###### Adding Email Templates

Create React components in the email package. Preview them at `http://localhost:3003`. Use the `resend` client to send them.

### File: `references/packages.md`

#### Packages

All packages live in `/packages/` and are imported as `@repo/<name>`.

##### Authentication (`@repo/auth`)

**Provider**: Clerk

Handles user authentication, organization management, and session handling.

**Key exports**:
- `AuthProvider` — wrapped inside `DesignSystemProvider`
- Pre-built Clerk components: `<OrganizationSwitcher>`, `<UserButton>`, `<SignIn>`, `<SignUp>`

**Webhooks**: Clerk sends user lifecycle events to `POST /api/webhooks/auth` (handled in the `api` app). Events include user creation, updates, and deletion.

**Swappable to**: Supabase Auth, Auth.js, Better Auth.

##### Database (`@repo/database`)

**ORM**: Prisma
**Default provider**: Neon PostgreSQL

**Key exports**:
- `database` — Prisma client instance

**Usage**:
```typescript
import { database } from '@repo/database';
const users = await database.user.findMany();
```

**Schema**: `packages/database/prisma/schema.prisma`
**Migrations**: `bun run migrate` (format → generate → db push)

**Swappable to**: Drizzle, PlanetScale, Supabase, Turso, EdgeDB, Prisma Postgres.

##### Payments (`@repo/payments`)

**Provider**: Stripe

**Key exports**:
- `stripe` — Stripe client instance (optional chaining: `stripe?.prices.list()`)

**Features**: Subscriptions, one-time payments, Stripe Radar fraud prevention.

**Webhooks**: `POST /api/webhooks/payments` handles Stripe events (payment success, subscription changes, etc.).

**Swappable to**: Paddle, Lemon Squeezy.

##### Email (`@repo/email`)

**Provider**: Resend + React Email

**Key exports**:
- `resend` — Resend client instance

**Usage**:
```typescript
import { resend } from '@repo/email';
import { WelcomeEmail } from '@repo/email/templates/welcome';

await resend?.emails.send({
  from: 'hello@example.com',
  to: 'user@example.com',
  subject: 'Welcome',
  react: <WelcomeEmail />,
});
```

**Templates**: React components in the email package. Preview at `http://localhost:3003`.

##### CMS (`@repo/cms`)

**Provider**: BaseHub

**Key exports**:
- `Feed`, `Body`, `TableOfContents`, `Image`, `Toolbar` — content rendering components

**Setup**: Fork the `basehub/next-forge` template, generate a Read Token, set `BASEHUB_TOKEN`.

**Features**: Type-safe content queries, Draft Mode preview, on-demand revalidation via webhooks.

**Swappable to**: Content Collections.

##### Design System (`@repo/design-system`)

**Library**: shadcn/ui (New York style, neutral colors)

**Key exports**:
- `DesignSystemProvider` — wraps tooltip, toast, analytics, auth, and theme providers
- Full component library (Button, Dialog, Form, Table, etc.)
- Font configuration
- Utility hooks

**Add components**:
```bash
npx shadcn@latest add [component] -c packages/design-system
```

**Update components**:
```bash
bun run bump-ui
```

**Dark mode**: Integrated via `next-themes`. The provider handles theme switching.

##### Analytics (`@repo/analytics`)

**Web analytics**: Vercel Web Analytics (enable in dashboard), Google Analytics (via `NEXT_PUBLIC_GA_MEASUREMENT_ID`).

**Product analytics**: PostHog (default).

**Key exports**:
- `analytics` from `@repo/analytics/server` — server-side tracking
- `analytics` from `@repo/analytics/posthog/client` — client-side tracking

**Usage**:
```typescript
import { analytics } from '@repo/analytics/server';
analytics?.capture({ event: 'user_signed_up', distinctId: userId });
```

**Ad-blocker bypass**: PostHog requests are reverse-proxied through Next.js rewrites (`/ingest/*`).

##### Observability (`@repo/observability`)

**Error tracking**: Sentry — captures exceptions and performance data.

**Logging**: BetterStack Logs in production, console in development.

**Key exports**:
- `log` from `@repo/observability/log` — logging interface (`log.info()`, `log.error()`, etc.)
- Sentry configuration via `instrumentation.ts` and `sentry.client.config.ts`

**Uptime monitoring**: BetterStack integration.

**Sentry tunneling**: Requests proxied through rewrites to bypass ad-blockers.

##### Storage (`@repo/storage`)

**Provider**: Vercel Blob

**Key exports**:
- `put` from `@repo/storage` — server-side upload
- `upload` from `@repo/storage/client` — client-side upload

**Note**: Server uploads are limited to 4.5MB. Use client uploads for larger files.

##### Security (`@repo/security`)

**Provider**: Arcjet

**Features**: Bot detection, Shield WAF (SQL injection, XSS, OWASP Top 10 prevention), rate limiting, IP geolocation.

**Configuration**: Central client at `@repo/security`, extended per app with specific rules.

**Bot policy**: Allows search engines and preview generators; blocks scrapers and AI crawlers.

**Web app**: Security middleware runs on all non-static routes.
**Main app**: Security checks in the authenticated layout.

**Usage**:
```typescript
const decision = await aj.protect(request);
if (decision.isDenied()) {
  // handle denial
}
```

##### SEO (`@repo/seo`)

**Key exports**:
- `createMetadata` from `@repo/seo/metadata` — generates Next.js metadata with deep merge

**Usage**:
```typescript
import { createMetadata } from '@repo/seo/metadata';
export const metadata = createMetadata({
  title: 'Page Title',
  description: 'Page description',
});
```

**Sitemap**: Auto-generated at build time. Scans `/app`, `/content/blog`, `/content/legal`. Filters `_` and `()` directories.

**JSON-LD**: Structured data support for search engines.

**Security headers**: Nosecone integration via `@repo/security/middleware`.

##### Feature Flags (`@repo/feature-flags`)

**System**: Vercel Flags SDK + PostHog

**Define flags** in `packages/feature-flags/index.ts`:
```typescript
export const myFlag = createFlag('myFlagKey');
```

**Usage**:
```typescript
const isEnabled = await myFlag();
```

Flags require an authenticated user context. Override flags in development via the Vercel Toolbar.

##### Internationalization (`@repo/internationalization`)

**Provider**: Languine

**Configuration**: `languine.json` defines source and target locales.

**Dictionaries**: TypeScript files per locale. Non-source locales are auto-translated.

**Usage**:
```typescript
const dict = await getDictionary(locale);
```

**Routing**: Language-specific paths (`/en/about`, `/fr/about`) with automatic language detection.

**Middleware**: `internationalizationMiddleware` configured for the `web` app.

**Translate**: `bun run translate`

##### Webhooks (`@repo/webhooks`)

###### Inbound
- **Stripe**: `POST /api/webhooks/payments` — payment and subscription events
- **Clerk**: `POST /api/webhooks/auth` — user lifecycle events
- **Local testing**: Stripe CLI auto-forwards to localhost

###### Outbound
**Provider**: Svix

**Key exports**:
- `webhooks.send(eventType, data)` — send a webhook event
- `webhooks.getAppPortal()` — get embeddable webhook management portal URL

Uses organization ID as the Svix app UID (stateless design).

##### Cron Jobs (`@repo/cron`)

**Platform**: Vercel Cron

**Location**: `apps/api/app/cron/[job-name]/route.ts`

**Configuration**: `apps/api/vercel.json`

```json
{ "path": "/cron/keep-alive", "schedule": "0 1 * * *" }
```

Cron routes must use the `GET` HTTP method. Test locally via direct HTTP GET.

##### Notifications (`@repo/notifications`)

**Provider**: Knock

**Key exports**:
- `notifications.workflows.trigger(workflowKey, { recipients, data })` — trigger a notification
- `<NotificationsTrigger>` — renders in-app notification feed

**Channels**: In-app, email, SMS, push, and chat — configured via Knock workflows.

##### Collaboration (`@repo/collaboration`)

**Provider**: Liveblocks

**Features**: Real-time presence indicators, multiplayer document editing, threaded comments.

**Hooks**: `useOthers()`, `useStorage()`, `useMutation()`, `useThreads()`

**Components**: `<Thread>`, `<Composer>`, `<InboxNotification>`

**Editor integration**: Tiptap or Lexical for collaborative rich text editing.

Requires `LIVEBLOCKS_SECRET` environment variable.

##### AI (`@repo/ai`)

AI/LLM integration package for adding AI-powered features to the application.

##### Rate Limit (`@repo/rate-limit`)

Rate limiting utilities used in conjunction with `@repo/security` for request throttling.

##### Next Config (`@repo/next-config`)

Shared Next.js configuration applied across apps:
- Image optimization (AVIF, WebP)
- Clerk image domain patterns
- Prisma webpack plugin for monorepo builds
- PostHog reverse proxy rewrites (`/ingest/*`)
- OpenTelemetry webpack compatibility fix
- Bundle analyzer support

##### TypeScript Config (`@repo/typescript-config`)

Shared TypeScript configurations extended by all apps and packages.

### File: `references/setup.md`

#### Setup

##### Prerequisites

- Node.js >= 18
- A PostgreSQL database (Neon recommended)
- Stripe CLI (for local webhook testing)
- Mintlify CLI (for docs preview)
- Supported OS: macOS, Linux (Ubuntu 24.04+), Windows 11

##### Installation

```bash
npx next-forge@latest init
```

The CLI prompts for:
1. **Project name** — used as the directory name
2. **Package manager** — bun (recommended), npm, yarn, or pnpm

Post-installation, the CLI installs dependencies and copies `.env.example` files to their working equivalents.

##### Required Environment Variables

###### Database (required)

Set in `packages/database/.env`:

```bash
DATABASE_URL="postgresql://user:password@host:5432/dbname"
```

Neon provides a free PostgreSQL database. Create one at neon.tech and copy the connection string.

###### Local URLs (pre-configured)

These defaults work out of the box for local development:

```bash
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_WEB_URL="http://localhost:3001"
NEXT_PUBLIC_API_URL="http://localhost:3002"
NEXT_PUBLIC_DOCS_URL="http://localhost:3004"
```

##### Optional Environment Variables

All integrations below are optional. If the corresponding environment variable is not set, the feature is disabled gracefully.

###### Authentication (Clerk)

Set in `apps/app/.env.local`:

```bash
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_WEBHOOK_SECRET="whsec_..."
```

###### Payments (Stripe)

Set in `apps/app/.env.local` and `apps/api/.env.local`:

```bash
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
```

###### CMS (BaseHub)

Set in `packages/cms/.env.local`:

```bash
BASEHUB_TOKEN="bshb_..."
```

Fork the `basehub/next-forge` template in BaseHub, then generate a Read Token.

###### Email (Resend)

Set in `apps/app/.env.local`:

```bash
RESEND_TOKEN="re_..."
```

###### Analytics (PostHog)

Set in `apps/app/.env.local` and `apps/web/.env.local`:

```bash
NEXT_PUBLIC_POSTHOG_KEY="phc_..."
NEXT_PUBLIC_POSTHOG_HOST="https://us.i.posthog.com"
```

###### Analytics (Google)

```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID="G-..."
```

###### Observability (Sentry)

```bash
SENTRY_ORG="..."
SENTRY_PROJECT="..."
NEXT_PUBLIC_SENTRY_DSN="https://..."
```

###### Logging (BetterStack)

```bash
BETTERSTACK_API_KEY="..."
BETTERSTACK_URL="..."
```

###### Security (Arcjet)

```bash
ARCJET_KEY="ajkey_..."
```

###### Storage (Vercel Blob)

```bash
BLOB_READ_WRITE_TOKEN="vercel_blob_..."
```

###### Feature Flags

```bash
FLAGS_SECRET="..."  # Generate: node -e "console.log(crypto.randomBytes(32).toString('base64url'))"
```

###### Notifications (Knock)

```bash
KNOCK_API_KEY="sk_..."
NEXT_PUBLIC_KNOCK_PUBLIC_API_KEY="pk_..."
NEXT_PUBLIC_KNOCK_FEED_CHANNEL_ID="..."
```

###### Collaboration (Liveblocks)

```bash
LIVEBLOCKS_SECRET="sk_..."
```

###### Webhooks (Svix)

```bash
SVIX_TOKEN="..."
```

###### Internationalization (Languine)

Set in `packages/internationalization/.env.local`:

```bash
LANGUINE_PROJECT_ID="..."
```

##### Database Setup

After setting `DATABASE_URL`, push the schema to the database:

```bash
bun run migrate
```

This runs three Prisma commands in sequence:
1. `prisma format` — formats the schema file
2. `prisma generate` — generates the Prisma client
3. `prisma db push` — pushes the schema to the database

The schema lives at `packages/database/prisma/schema.prisma`. Edit it, then run `bun run migrate` again after changes.

Browse the database visually with Prisma Studio:

```bash
bun dev --filter studio
```

##### Stripe CLI Setup

Install the Stripe CLI for local webhook testing:

```bash
brew install stripe/stripe-cli/stripe
stripe login
```

The Stripe CLI automatically forwards webhook events to `http://localhost:3000/api/webhooks/payments` during local development.

##### Running Development

Start all apps:

```bash
bun run dev
```

Start a specific app:

```bash
bun dev --filter app         # Port 3000
bun dev --filter web         # Port 3001
bun dev --filter api         # Port 3002
```

##### Environment Variable Validation

Each package validates its environment variables at build time using `@t3-oss/env-nextjs` with Zod schemas. The validation files are named `keys.ts` within each package. If a required variable is missing, the build fails with a descriptive error message.
