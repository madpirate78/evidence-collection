# Security

**Data Retention**

- 7 days: Full data (for corrections)
- After 7 days: Anonymized forever
- No retrieval after anonymization

**Current Measures**

- [x] Supabase Auth
- [x] CSRF tokens
- [x] Input validation
- [ ] Security headers (CSP, HSTS)
- [ ] Session auto-refresh
- [ ] Rate limiting (needs testing)

**No Storage Of**

- Passwords (Supabase handles)
- Payment details
- Children's full names
- Addresses

**Vulnerability Reporting**
Email: security@[domain]

- Describe issue
- Don't test on production
- Allow 48hrs response

**7-Day Anonymization Process**

```sql
-- Runs daily
UPDATE evidence_submissions
SET user_id = NULL,
    email = NULL,
    full_name = 'ANONYMIZED'
WHERE created_at < NOW() - INTERVAL '7 days';
```
