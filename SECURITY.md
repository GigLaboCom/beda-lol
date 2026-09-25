# Security policy

## Reporting a vulnerability

Please report vulnerabilities **privately** through GitHub:
**Security → Advisories → Report a vulnerability** on this repository
(private vulnerability reporting). Do not open a public issue.

You will get an answer within a few days. Please give us reasonable time to fix
the problem before disclosing it.

## In scope

- The site https://beda.lol and its API under `/api/`
- The code in this repository: `apps/web`, `apps/api`, `packages/*`, `deploy/`, `.github/workflows/`
- Database access rules in `supabase/migrations/` (for example, data reachable through the Supabase Data API)

## Out of scope

- Denial of service and volumetric attacks
- Findings in third-party services (Supabase, GitHub, the hosting provider) — report those to the vendor
- Social engineering, physical attacks
- Missing best-practice headers without a demonstrated impact
