# Development Guide

## Setup

```bash
npm install
cp .env.example .env.local   # Set DATABASE_URL
npx prisma migrate deploy
npm run dev
```

## Testing

```bash
npm test                     # All tests
npm run test:coverage        # With coverage
npm run test:rate-limit      # Rate limiter only
```

## Security Testing

```bash
npm run security:check       # Dependency audit + tests
npm run security:pentest     # OWASP ZAP scan (requires Docker)
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
