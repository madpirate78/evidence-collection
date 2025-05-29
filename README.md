# CMS Evidence Platform

**What it does**
Collects evidence of CMS issues for judicial review.

**Tech Stack**

- Next.js 15 + TypeScript
- Supabase (auth + database)
- Tailwind CSS
- Vercel hosting

**Key Features**

- [x] Evidence submission form
- [x] Auto-save drafts locally
- [ ] Live statistics
- [ ] 7-day auto-anonymization
- [ ] PDF download (client-side only)
- [ ] Email notifications

**Security**

- CSRF protection
- Input validation (Zod)
- Rate limiting
- 7-day data deletion
- No long-term personal data storage

**Quick Start**

```bash
npm install
cp .env.example .env.local
# Add Supabase credentials
npm run dev
```
