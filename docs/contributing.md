# Contributing to Verifact

## Team

| Dev | Area |
|-----|------|
| Dev A | Patient Features (P1–P5) |
| Dev B | Doctor Features (D1–D4) |
| Dev C | Admin Features (A1–A4) |
| Dev D | DB, Auth, Infra, Shared Hooks |

---

## Workflow

### Starting work on a feature

```bash
git checkout dev
git pull origin dev
git checkout -b feature/p2-prescription-intel
```

Use the naming convention: `feature/<feature-code>-<short-description>`  
e.g. `feature/d1-living-brief`, `fix/whatsapp-webhook-parsing`, `feature/a3-inventory-ui`

### Committing

Keep commits small and descriptive:

```bash
git add supabase/functions/prescription-intel/index.ts
git commit -m "feat(P2): extract drugs via GPT-4o Vision, write to prescriptions table"
```

Prefix convention:
- `feat(P2):` — new feature
- `fix(D1):` — bug fix
- `chore:` — cleanup, deps, config
- `db:` — schema or migration changes

### Opening a PR

```bash
git push origin feature/p2-prescription-intel
```

Then open a PR on GitHub targeting `dev` (not `main`).  
Fill in the PR template. Tag your reviewer.  
Minimum 1 approval to merge.

### Never push directly to `main` or `dev`

`main` is auto-deployed. `dev` is the integration branch — always use PRs.

---

## Adding a new edge function

1. Create folder: `supabase/functions/<function-name>/index.ts`
2. Add env vars it needs to `.env.example` (not `.env`)
3. Test locally: `supabase functions serve <function-name> --env-file .env`
4. Document the endpoint at the top of the file (see existing functions for format)

## Adding a new DB table

1. Create a new migration file: `supabase/migrations/00X_description.sql`
2. Add RLS policies in the same file
3. Update `docs/schema.md`
4. Run `supabase db push` locally to verify
5. Mention it in your PR description

---

## Environment Variables

- Never commit `.env`
- Add new vars to `.env.example` with a placeholder value
- Tell the team in the PR what new env vars they need to set

---

## Local Dev Setup (reminder)

```bash
# Clone
git clone https://github.com/your-org/verifact.git
cd verifact
cp .env.example .env   # fill in your keys

# Supabase local
supabase start
supabase db push
node scripts/seed.js

# Edge functions
supabase functions serve --env-file .env

# Frontend
cd frontend && npm install && npm run dev
```
