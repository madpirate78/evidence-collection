# Survey & Analytics Platform

A full-stack survey and analytics platform built with Next.js 15, featuring real-time statistics, secure form submission, and comprehensive security testing.

## Features

- Anonymous data collection with zero user tracking
- Real-time statistical aggregation
- Security-first architecture for sensitive submissions
- GDPR compliance by design
- Iframe embedding support with CSP protection

**Privacy-first approach:** No user identification, no tracking, no analytics. All data aggregated and anonymized.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React 18, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes, Prisma ORM |
| Database | PostgreSQL (Railway) |
| UI | Radix UI, React Hook Form, Zod validation |
| Testing | Jest, OWASP ZAP, npm audit |
| Deployment | Railway (PaaS) |

## Features

- **Multi-step Survey Form** - Dynamic form with conditional logic and validation
- **Real-time Statistics Dashboard** - Animated counters, calculated percentages from live data
- **File-based Caching** - Statistics cached for fast API responses
- **Dark/Light Mode** - System-aware theme switching
- **Mobile Responsive** - Full responsive design

## Architecture Decisions

**Why file-based caching?**
Statistics expensive to calculate (500ms+ for complex aggregations). Cache updates on submissions, API serves from memory (10ms response).

**Why OWASP ZAP testing?**
Handling sensitive submissions required professional-grade security validation. Automated testing catches vulnerabilities before production.

**Why rate limiting?**
Protects against abuse while allowing legitimate use. IP + User-Agent fingerprinting for anonymous users.

## Security

| Check | Status |
|-------|--------|
| CVE Vulnerabilities | 0 |
| OWASP ZAP High/Critical | 0 |
| Security Tests Passed | 139 |
| Rate Limiting | Active |

```bash
npm run security:check     # Dependency audit + security tests
npm run security:pentest   # Full OWASP ZAP scan
```

## Testing

```bash
npm test                   # Run all tests
npm run test:coverage      # Coverage report
npm run test:security      # Rate limiter tests
```

## Quick Start

```bash
npm install
cp .env.example .env.local  # Configure DATABASE_URL
npx prisma migrate deploy
npm run dev
```

## Project Structure

```
app/
├── statement-portal/    # Survey form
├── statistics/          # Analytics dashboard
├── api/                 # REST endpoints
lib/
├── statistics-cache.ts  # Caching layer
├── rate-limiter.ts      # Request throttling
scripts/
├── security-check.sh    # Security validation
├── run-penetration-test.sh
```

## License

MIT
