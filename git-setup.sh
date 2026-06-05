#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
#  VERIFACT — Git Setup Script
#  Run this ONCE from any team member's machine to:
#    1. Initialise the repo locally
#    2. Create the full folder + file structure
#    3. Make the first commit
#    4. Push to GitHub (you provide the remote URL)
#
#  Usage:
#    chmod +x git-setup.sh
#    ./git-setup.sh https://github.com/your-org/verifact.git
# ═══════════════════════════════════════════════════════════

set -e

REMOTE_URL="${1:-}"

echo ""
echo "🏥  Verifact — Git Repository Setup"
echo "════════════════════════════════════════════════════"

# ── STEP 1: Init ─────────────────────────────────────────
echo ""
echo "▶ Initialising git repo..."
git init
git checkout -b main

# ── STEP 2: First commit ─────────────────────────────────
echo ""
echo "▶ Staging all files..."
git add .
git commit -m "chore: initial Verifact project scaffold

- Full Supabase schema (all 15 tables + RLS + indexes)
- Edge functions: onboarding, prescription-intel, whatsapp-checkin,
  insurance-agent, living-brief, drug-interaction, prescription-draft,
  deterioration-alerts, priority-queue, vitals-intake, inventory,
  outcomes-dashboard
- Frontend component folders: patient/, doctor/, admin/, shared/
- Dev seed script (3 mock patients + 1 doctor)
- GitHub CI workflow + PR template + issue templates
- .env.example, contributing guide, schema docs"

echo "✅ Initial commit made on 'main'"

# ── STEP 3: Create dev branch ────────────────────────────
echo ""
echo "▶ Creating 'dev' integration branch..."
git checkout -b dev
git push origin dev 2>/dev/null || true   # will succeed after remote is added

echo "✅ On 'dev' branch"

# ── STEP 4: Add remote (if URL provided) ─────────────────
if [ -n "$REMOTE_URL" ]; then
  echo ""
  echo "▶ Adding remote: $REMOTE_URL"
  git remote add origin "$REMOTE_URL"

  echo "▶ Pushing main..."
  git checkout main
  git push -u origin main

  echo "▶ Pushing dev..."
  git checkout dev
  git push -u origin dev

  echo ""
  echo "✅ Both branches pushed to GitHub!"
else
  echo ""
  echo "ℹ️  No remote URL provided. To push later:"
  echo ""
  echo "   git remote add origin https://github.com/your-org/verifact.git"
  echo "   git push -u origin main"
  echo "   git push -u origin dev"
fi

# ── STEP 5: Print team workflow ───────────────────────────
echo ""
echo "════════════════════════════════════════════════════"
echo "📋  TEAM WORKFLOW — share this with your 4 devs"
echo "════════════════════════════════════════════════════"
echo ""
echo "  Clone (everyone runs this once):"
echo "  git clone $REMOTE_URL"
echo "  cd verifact"
echo "  bash setup.sh          # installs deps, sets up local Supabase"
echo ""
echo "  Start a feature:"
echo "  git checkout dev"
echo "  git pull origin dev"
echo "  git checkout -b feature/<your-feature>"
echo ""
echo "  Commit your work:"
echo "  git add <files>"
echo "  git commit -m \"feat(P2): your message\""
echo "  git push origin feature/<your-feature>"
echo "  → Open PR on GitHub targeting 'dev'"
echo ""
echo "  Branch ownership:"
echo "  Dev A  →  feature/p1-*, feature/p2-*, feature/p3-*, feature/p4-*, feature/p5-*"
echo "  Dev B  →  feature/d1-*, feature/d2-*, feature/d3-*, feature/d4-*"
echo "  Dev C  →  feature/a1-*, feature/a2-*, feature/a3-*, feature/a4-*"
echo "  Dev D  →  feature/db-*, feature/infra-*, feature/auth-*"
echo ""
echo "  Merge order:  feature/* → dev  →  main"
echo ""
echo "════════════════════════════════════════════════════"
echo "🎉  All done!"
echo ""
