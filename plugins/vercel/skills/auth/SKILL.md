---
name: auth
description: Authentication integration guidance — Clerk (native Vercel Marketplace), Better Auth, Descope, and Auth0 setup for Next.js applications, plus Sign in with Vercel, Vercel Passport, and Vercel KMS. Covers server config, route handlers, proxy.ts auth patterns, sign-in/sign-up flows, and Marketplace provisioning. Use when implementing user authentication, sessions, protected routes, or protecting deployments.
metadata:
  priority: 6
  docs:
    - "https://authjs.dev/getting-started"
    - "https://nextjs.org/docs/app/guides/authentication"
    - "https://better-auth.com/llms.txt"
  sitemap: "https://authjs.dev/sitemap.xml"
  pathPatterns:
    - 'proxy.ts'
    - 'proxy.js'
    - 'src/proxy.ts'
    - 'src/proxy.js'
    - 'middleware.ts'
    - 'middleware.js'
    - 'src/middleware.ts'
    - 'src/middleware.js'
    - 'clerk.config.*'
    - 'app/sign-in/**'
    - 'app/sign-up/**'
    - 'src/app/sign-in/**'
    - 'src/app/sign-up/**'
    - 'app/(auth)/**'
    - 'src/app/(auth)/**'
    - 'auth.config.*'
    - 'auth.ts'
    - 'auth.js'
    - 'lib/auth.ts'
    - 'src/lib/auth.ts'
    - 'lib/auth-client.ts'
    - 'src/lib/auth-client.ts'
    - 'app/api/auth/[...all]/**'
    - 'src/app/api/auth/[...all]/**'
  bashPatterns:
    - '\bnpm\s+(install|i|add)\s+[^\n]*@clerk/nextjs\b'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*@clerk/nextjs\b'
    - '\bbun\s+(install|i|add)\s+[^\n]*@clerk/nextjs\b'
    - '\byarn\s+add\s+[^\n]*@clerk/nextjs\b'
    - '\bnpm\s+(install|i|add)\s+[^\n]*@descope/nextjs-sdk\b'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*@descope/nextjs-sdk\b'
    - '\bbun\s+(install|i|add)\s+[^\n]*@descope/nextjs-sdk\b'
    - '\byarn\s+add\s+[^\n]*@descope/nextjs-sdk\b'
    - '\bnpm\s+(install|i|add)\s+[^\n]*@auth0/nextjs-auth0\b'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*@auth0/nextjs-auth0\b'
    - '\bbun\s+(install|i|add)\s+[^\n]*@auth0/nextjs-auth0\b'
    - '\byarn\s+add\s+[^\n]*@auth0/nextjs-auth0\b'
    - '\bnpm\s+(install|i|add)\s+[^\n]*@vercel/kms\b'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*@vercel/kms\b'
    - '\bbun\s+(install|i|add)\s+[^\n]*@vercel/kms\b'
    - '\byarn\s+add\s+[^\n]*@vercel/kms\b'
    - '\bnpm\s+(install|i|add)\s+[^\n]*\bbetter-auth\b'
    - '\bpnpm\s+(install|i|add)\s+[^\n]*\bbetter-auth\b'
    - '\bbun\s+(install|i|add)\s+[^\n]*\bbetter-auth\b'
    - '\byarn\s+add\s+[^\n]*\bbetter-auth\b'
    - '\b(npx|bunx|pnpm\s+dlx)\s+(auth@latest|@better-auth/cli)\b'
  importPatterns:
    - "@vercel/kms"
    - "better-auth"
validate:
  -
    pattern: 'VERCEL_CLIENT_(ID|SECRET)|vercel\.com/oauth/(authorize|access_token|token)'
    message: 'Hand-rolled Vercel OAuth detected. Use the Sign in with Vercel OIDC provider (or the built-in `vercel` social provider in Better Auth) instead of manual token exchange.'
    severity: recommended
    skipIfFileContains: 'signInWithVercel|@vercel/auth|better-auth|socialProviders'
retrieval:
  aliases:
    - authentication
    - login system
    - sign in
    - auth flow
    - sign in with vercel
    - passport
    - kms
  intents:
    - add auth
    - protect routes
    - manage sessions
    - implement login
    - secure api endpoints
  entities:
    - NextAuth
    - Auth.js
    - Better Auth
    - betterAuth
    - authClient
    - JWT
    - OAuth
    - session
    - middleware
    - getServerSession
    - Vercel Passport
    - Okta
    - Microsoft Entra ID
    - Vercel KMS
    - signToken
  examples:
    - add login to my app
    - protect this route with auth
    - set up NextAuth
    - set up Better Auth
    - add better auth to my next app
chainTo:
  -
    pattern: 'export\s+(default\s+)?function\s+middleware'
    targetSkill: routing-middleware
    message: 'Auth logic in a middleware() export — Next.js 16 uses proxy.ts with a proxy() export. Loading Routing Middleware guidance for the migration.'
  -
    pattern: 'from\s+[''\"](jsonwebtoken)[''"]|require\s*\(\s*[''\"](jsonwebtoken)[''"]|jwt\.sign\s*\('
    targetSkill: auth
    message: 'Manual JWT handling with jsonwebtoken detected — use Clerk, Better Auth, or Auth.js for built-in session handling, CSRF protection, and token rotation.'
    skipIfFileContains: 'better-auth|@clerk|next-auth'
  -
    pattern: 'from\s+[''\"](next-auth)[''"]|NextAuthOptions|authOptions\s*:'
    targetSkill: auth
    message: 'Legacy next-auth (v4) pattern detected — loading auth guidance for Auth.js v5 migration with the new universal auth() helper.'
  -
    pattern: 'from\s+[''"]@clerk/nextjs[''"]'
    targetSkill: auth
    message: 'Clerk import detected — loading Auth guidance for Clerk v7 patterns, middleware setup, organization handling, and Vercel Marketplace integration.'
    skipIfFileContains: 'clerkMiddleware|ClerkProvider'
  -
    pattern: "bcrypt|argon2"
    targetSkill: auth
    message: 'Manual password hashing detected (bcrypt/argon2) — use Clerk, Better Auth, or Auth0 for authentication with built-in password hashing and rate limiting.'
    skipIfFileContains: "@clerk|@auth0|better-auth"
  -
    pattern: 'from\s+[''"]better-auth[''"]|betterAuth\s*\('
    targetSkill: auth
    message: 'Better Auth config detected — loading Auth guidance for the Next.js route handler, nextCookies plugin, cookie-only middleware checks, cookie cache, and Marketplace Postgres/Redis wiring.'
    skipIfFileContains: 'nextCookies|toNextJsHandler'
---

# Auth

1. Identify the provider, target application and existing session or integration. Choose a supported flow for that provider.
2. Review callback URLs, session handling and protected routes in the intended environment. Verify unauthenticated and authorized requests.

Read the relevant section of the [full guide](guide.md) before applying its examples.
