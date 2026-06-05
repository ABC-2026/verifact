#!/usr/bin/env bash
# setup.sh — Run this once after cloning to get fully set up
# Usage: bash setup.sh

set -e

echo ""
echo "🏥 Verifact Setup"
echo "─────────────────────────────────────"

# 1. Check dependencies
echo ""
echo "Checking dependencies..."

command -v node >/dev/null 2>&1 || { echo "❌ Node.js not found. Install from https://nodejs.org"; exit 1; }
echo "✅ Node $(node -v)"

command -v npm >/dev/null 2>&1 || { echo "❌ npm not found"; exit 1; }
echo "✅ npm $(npm -v)"

if ! command -v supabase >/dev/null 2>&1; then
  echo "⚠️  Supabase CLI not found. Installing..."
  npm install -g supabase
fi
echo "✅ Supabase CLI $(supabase --version 2>&1 | head -1)"

# 2. Copy env file
echo ""
echo "Setting up environment..."
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ .env created from .env.example"
  echo "⚠️  Open .env and fill in your API keys before continuing."
  echo ""
  echo "   Keys needed:"
  echo "   - SUPABASE_URL + SUPABASE_ANON_KEY + SUPABASE_SERVICE_ROLE_KEY"
  echo "     → Get from: https://supabase.com/dashboard → your project → Settings → API"
  echo ""
  echo "   - GROQ_API_KEY"
  echo "     → Get from: https://console.groq.com/keys"
  echo ""
  echo "   - OPENAI_API_KEY (only needed for P2 prescription photos + P4 policy PDFs)"
  echo "     → Get from: https://platform.openai.com/api-keys"
  echo ""
  echo "   - TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_WHATSAPP_FROM"
  echo "     → Get from: https://console.twilio.com"
  echo ""
  read -p "Press Enter once .env is filled in to continue..."
else
  echo "✅ .env already exists"
fi

# 3. Install frontend deps
echo ""
echo "Installing frontend dependencies..."
cd frontend && npm install && cd ..
echo "✅ Frontend deps installed"

# 4. Start Supabase local
echo ""
echo "Starting local Supabase..."
supabase start

# 5. Run migrations
echo ""
echo "Running database migrations..."
supabase db push
echo "✅ Schema applied"

# 6. Seed dev data
echo ""
echo "Seeding mock patients and doctor..."
node scripts/seed.js

echo ""
echo "─────────────────────────────────────"
echo "✅ Setup complete!"
echo ""
echo "To start developing:"
echo ""
echo "  Terminal 1 — Edge functions:"
echo "  supabase functions serve --env-file .env"
echo ""
echo "  Terminal 2 — Frontend:"
echo "  cd frontend && npm run dev"
echo ""
echo "  Supabase Studio (DB viewer):"
echo "  http://localhost:54323"
echo ""
