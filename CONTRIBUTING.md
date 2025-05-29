## Deployment Setup

### Supabase Redirect URLs

Add these patterns to your Supabase project:

- `https://*.vercel.app/**`
- `https://*-*.vercel.app/**`
- `http://localhost:3000/**`

## CONTRIBUTING.md

```markdown
# Contributing

**Setup**

1. Fork repo
2. Clone locally
3. Copy `.env.example` to `.env.local`
4. Get test Supabase credentials from team
5. `npm install && npm run dev`

**Before You Code**

- [ ] Check existing issues
- [ ] Create feature branch
- [ ] Test locally
- [ ] No cons0le.logs in PR

**Key Rules**

- Never commit `.env` files
- All forms need CSRF tokens
- Validate with Zod schemas
- PRs require approval

**Current Priorities**

- [ ] Fix RLS policies
- [ ] Debug form validation
- [ ] Implement 7-day cron
- [ ] Add security headers

**Branch Names**

- `fix/issue-name`
- `feature/feature-name`
- `security/vulnerability-name`
```
