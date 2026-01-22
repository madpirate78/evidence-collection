# Development Guide

## Setup

```bash
bun install
cp .env.example .env.local   # Set DATABASE_URL
bunx prisma migrate deploy
bun run dev
```

## Testing

```bash
bun test                     # All tests
bun run test:coverage        # With coverage
bun run test:rate-limit      # Rate limiter only
```

## Security Testing

```bash
bun run security:check       # Dependency audit + tests
bun run security:pentest     # OWASP ZAP scan (requires Docker)
```

## Security Features

| Feature | Implementation |
|---------|---------------|
| Input validation | Zod schemas |
| CSRF protection | Double-submit cookie |
| Rate limiting | 5 req/15min per IP |
| Honeypot | Hidden `website` field |
| Headers | CSP, HSTS, X-Frame-Options |

## Test Structure

```
__tests__/
├── lib/rate-limiter.test.ts
├── mocks/prisma.ts
└── utils/
```

## Scripts

| Script | Purpose |
|--------|---------|
| `start-test-env.sh` | Start local environment |
| `run-penetration-test.sh` | OWASP ZAP Docker scan |
| `security-check.sh` | Quick security validation |
