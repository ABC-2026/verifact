# Verifact

**AI-native remote patient monitoring for Indian healthcare.**  
Owns the between-visit signal. Voice-first. Vernacular-first. WhatsApp-delivered.

---

## Team & Ownership

| Area | Owner | Files |
|------|-------|-------|
| Patient Features (P1–P5) | **Dev A** | `frontend/src/components/patient/`, `supabase/functions/onboarding/`, `supabase/functions/whatsapp-checkin/`, `supabase/functions/insurance-agent/` |
| Doctor Features (D1–D4) | **Dev B** | `frontend/src/components/doctor/`, `supabase/functions/living-brief/`, `supabase/functions/drug-interaction/`, `supabase/functions/prescription-draft/`, `supabase/functions/deterioration-alerts/` |
| Admin Features (A1–A4) | **Dev C** | `frontend/src/components/admin/`, `supabase/functions/priority-queue/`, `supabase/functions/vitals-intake/`, `supabase/functions/inventory/`, `supabase/functions/outcomes-dashboard/` |
| DB Schema + Auth + Infra | **Dev D** | `supabase/migrations/`, `frontend/src/lib/`, `frontend/src/hooks/`, `.github/workflows/` |

---

## Tech Stack

| Layer | Tool |
|-------|------|
| Frontend | Lovable / v0 (React + Tailwind) |
| Backend | Supabase Edge Functions (Deno) |
| Database + Auth | Supabase (Postgres + RLS) |
| LLM | Groq `llama-3.3-70b-versatile` |
| Transcription | Groq Whisper |
| Vision | GPT-4o Vision |
| Messaging | Twilio WhatsApp |
| Vector Search | Supabase pgvector |

---

## Features at a Glance

### Patient
- **P1** Conversational Health Onboarding
- **P2** Prescription Intelligence (photo → drugs → reminders)
- **P3** Daily WhatsApp Voice Check-in
- **P4** Insurance Intelligence Agent
- **P5** Family & Caregiver Access

### Doctor
- **D1** Living Patient Brief (regenerated on every open)
- **D2** Personalised Drug Interaction Reasoning
- **D3** AI Prescription Drafting
- **D4** Pattern-Based Deterioration Alerts

### Admin
- **A1** AI Patient Priority Queue
- **A2** Vitals Intake with AI Contextualisation
- **A3** Inventory Management
- **A4** Hospital Outcomes Dashboard

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/your-org/verifact.git
cd verifact
cp .env.example .env        # fill in your keys
```

### 2. Set up Supabase

```bash
# Install Supabase CLI if you haven't
npm install -g supabase

# Login and link to your project
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Run all migrations (creates every table + RLS)
supabase db push

# Seed mock patients for local dev
node scripts/seed.js
```

### 3. Run edge functions locally

```bash
supabase functions serve --env-file .env
```

### 4. Run frontend

```bash
cd frontend
npm install
npm run dev
```

---

## Build Order (from spec)

| Phase | What | Owner | Est. |
|-------|------|-------|------|
| 1 | Supabase schema + auth + seed | Dev D | 2–3h |
| 2 | P2 Prescription Intelligence | Dev A | 3–4h |
| 3 | P1 Conversational Onboarding | Dev A | 4–5h |
| 4 | D1 Living Brief + D2 Drug Interaction | Dev B | 4–5h |
| 5 | P3 WhatsApp Check-in loop | Dev A | 6–8h |
| 6 | A1 Priority Queue + A2 Vitals | Dev C | 3–4h |
| 7 | A3 Inventory | Dev C | 3–4h |
| 8 | P4, P5, D3, D4 | All | 8–10h |

---

## Branching Strategy

```
main          ← protected, always deployable
dev           ← integration branch, all PRs merge here first
feature/*     ← your working branch (e.g. feature/p2-prescription-intel)
fix/*         ← bug fixes
```

**PR rule:** at least 1 approval before merging to `dev`. No direct pushes to `main`.

---

## Environment Variables

See `.env.example` for all required keys. Never commit `.env`.

---

## Docs

- [Database Schema](docs/schema.md)
- [API Reference](docs/api.md)
- [Contributing Guide](docs/contributing.md)
