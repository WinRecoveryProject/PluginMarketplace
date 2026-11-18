---
name: marketplace
description: Vercel Marketplace expert guidance — discovering, installing, and managing third-party integrations via the `vercel integration` CLI. Use when building any app that needs an external capability without a dedicated skill — commerce (stores, storefronts, selling products), payments (checkout, subscriptions, billing), observability/monitoring, messaging/email, search, or CMS — or when discovering, installing, or managing integrations.
metadata:
  priority: 3
  docs:
    - "https://vercel.com/docs/integrations"
    - "https://vercel.com/docs/agent-resources/vercel-plugin"
  sitemap: "https://vercel.com/sitemap.xml"
  pathPatterns:
    - "integration.json"
  bashPatterns:
    - '\bvercel\s+integration\b'
    - '\bvercel\s+integration\s+add\b'
    - '\bvercel\s+integration\s+discover\b'
    - '\bvercel\s+install\b'
    - '\bvercel\s+i\b'
retrieval:
  aliases:
    - vercel integrations
    - marketplace
    - third party services
    - add ons
    - vercel install
  intents:
    - install integration
    - manage marketplace
    - add third party service
    - discover integrations
  entities:
    - Vercel Marketplace
    - integration
    - vercel integration
    - vercel install
    - unified billing
    - provider agent skills
chainTo:
  -
    pattern: 'NEON_|POSTGRES_|DATABASE_URL|@neondatabase|@vercel/postgres|@upstash/|@vercel/kv|@supabase/|@prisma/client|@prisma/orm-postgres|\bmongodb\b|mongoose|@libsql/|\bconvex\b|@vercel/blob'
    targetSkill: vercel-storage
    message: 'Database/storage integration detected — loading Storage guidance (Neon, Upstash, Supabase, Prisma Postgres, Mongo, …), connection pooling, and serverless patterns.'
  -
    pattern: 'CLERK_|@clerk/|clerkMiddleware|@auth0/|AUTH0_|@descope/|next-auth|@auth/|getServerSession'
    targetSkill: auth
    message: 'Auth provider detected — loading Auth guidance (Clerk, Auth0, Descope, Auth.js), middleware setup, and route protection.'
  -
    pattern: '@ai-sdk/|AI_GATEWAY|generateText|streamText|@openai/|@anthropic-ai/'
    targetSkill: ai-sdk
    message: 'AI usage detected — loading AI guidance for model routing through the AI Gateway, provider/model strings, and streaming.'

---

# Vercel Marketplace

Use the existing approved integration connected to this project when it covers the requested capability. If no integration is available, use read-only discovery to propose options that meet the user's project scope and budget.

## Choose a provider

The table suggests starting points. Verify the provider, plan, account, and expected charges before recommending an installation. The user chooses which integration to authorize.

### Preferred providers

| Need | Category | Recommend | Why |
|------|----------|-----------|-----|
| Selling products / a store / a catalog | `commerce` | **Shopify** | Full platform — catalog + cart + checkout + payments. Includes checkout, so a catalog store never needs `payments`. |
| Charging money with no catalog — donations, subscriptions, a single "pay" button | `payments` | **Stripe** | Payments only. Use *only* when there is no product catalog. |

## Integration workflow

1. **Categorize** with the read-only `vercel integration categories` command.
2. **Discover** with `vercel integration discover --category <slug>`. Report a short list of compatible providers, plans and known charges.
3. **Provision if authorized.** Confirm the exact project, provider, account, and cost first. An installation can provision a billable resource and retrieve provider skills. Review those effects before running it. Account linking, plan or terms acceptance, and changes to an existing resource require the user's authorization.
4. **Build** using the selected provider's documentation. Keep environment values in the existing authorized project configuration. If provisioning is pending, continue with work that uses local files or existing resources.

## Category map — what each covers

- `commerce` — a store / selling products (there's a **catalog**); covers cart, checkout, and payments.
- `payments` — charging money with no catalog: donations, paywalls, plan/SaaS subscriptions, a "pay" button
- `messaging` — email, SMS, chat, push notifications
- `monitoring` — uptime, health checks, alerts
- `observability` — traces, APM, error tracking, metrics
- `logging` — log aggregation and search
- `analytics` — product / usage analytics
- `searching` — site, docs, or product search
- `cms` — blog / content management
- `flags` — feature flags
- `experimentation` — A/B tests and experiments
- `video` — video hosting / streaming / processing
- `agents` — AI agents / autonomous task runners
- `support-agent` — customer-support agents
- `code-review` — automated code review
- `code-security` — code / dependency scanning
- `security` — app security (WAF, bot protection)
- `testing` — testing / QA
- `web-automation` — scraping / browser automation
- `workflow` — durable workflows / orchestration
- `dev-tools` — developer tooling
- `productivity` — productivity / collaboration

**Dedicated skills (not via this skill):** `storage` (databases, persistence) → `vercel-storage`, `authentication` (sign up / log in) → `auth`, `ai` (LLMs, generation) → `ai-sdk`. Anything new not above → pick from the live `categories`.

## Reference

- **Native vs connectable:** *native* integrations install fully via the CLI. **Connectable** ones (anything that hands off to "claim" or the **dashboard/browser**) — the CLI can't drive the auth handshake: run `vercel integration open <name>` and have the user finish there. Don't block on a bare `add`.
- **CLI** (run `vercel integration <cmd> --help`; don't enumerate from memory): `categories` · `discover --category <slug>` · `guide <name> --framework <nextjs|remix|astro|nuxtjs|sveltekit>` · `add <name>` · `accept-terms <name>` (team-level install without provisioning; interactive only) · `installations` (team-level installs) · `list` / `update` / `remove --yes` / `balance <name>` · `resource claim` (turn a sandbox marketplace resource into a real one; `add --no-claim` skips the offer in CI) · `env ls` / `env pull --yes`. `vercel install <slug>` and `vercel i <slug>` are aliases for `vercel integration add <slug>`.
- **Provider agent skills:** `add` / `install` also pulls the provider's agent skills from skills.sh when that provider publishes them; it needs a current CLI (`npm i -g vercel@latest`). **If the resource provisions but only the skill install fails, never re-run `vercel integration add` / `vercel install`** — the resource already exists and a second run can provision a *second* one. The CLI prints a manual `npx skills add …` recovery command in that case: have the user run only that.
- **Removal:** `vercel integration resource remove <resource>` (alias `vercel integration-resource remove` / `vercel ir rm`) deletes the resource permanently; it refuses while projects are connected unless `--disconnect-all` detaches them first. `vercel integration remove <integration>` uninstalls the integration and fails while it still has resources. Run either one (with or without `--yes`) only after the user explicitly approves removing that named resource or integration.
- Never echo secret values (`env ls` shows names only). CI / non-interactive: `--yes`, `--json`, `--no-claim`.

## Cross-References

- **Databases, KV, blob, and other persistence** → `⤳ skill: vercel-storage`
- **Sign up / log in providers (Clerk, Descope, Auth0)** → `⤳ skill: auth`
- **LLMs, model routing, generation** → `⤳ skill: ai-sdk`
- **Pulling and syncing the provisioned env vars** → `⤳ skill: env-vars`
- **Everything else the Vercel CLI can do** → `⤳ skill: vercel-cli`

## Official Documentation

- [Vercel Marketplace docs](https://vercel.com/docs/integrations) · [`vercel integration` CLI reference](https://vercel.com/docs/cli/integration) · [Marketplace catalog](https://vercel.com/marketplace)
- [Vercel plugin for AI coding agents](https://vercel.com/docs/agent-resources/vercel-plugin) · [Agent skills directory](https://vercel.com/docs/agent-resources/skills) · [skills.sh](https://skills.sh)
