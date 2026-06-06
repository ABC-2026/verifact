#!/usr/bin/env python3
"""
Direct PostgreSQL connection to apply RLS policies using service_role credentials.
This requires the service_role JWT to be decoded to extract connection info, or
we can use Supabase's direct Postgres access if available.
"""

import subprocess
import json

SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJuZ2JycGl0a2tocGxmd2ZtcnltIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY1NzI4MywiZXhwIjoyMDk2MjMzMjgzfQ.ALS7wpddGonaCMyJkB15_n0YtpaO_XbJgKQMEB6UDIk'

# Supabase project details (can be inferred from the JWT 'ref' claim)
SUPABASE_URL = 'https://rngbrpitkkhplfwfmrym.supabase.co'
PROJECT_REF = 'rngbrpitkkhplfwfmrym'

print("To apply RLS policies, you'll need to connect directly to Postgres.")
print("\nOptions:")
print("1. Manually via Supabase Dashboard (recommended):")
print("   - Go to: https://app.supabase.com/project/rngbrpitkkhplfwfmrym/sql/new")
print("   - Copy SQL from: supabase/setup_rls.sql")
print("   - Click Run")
print("\n2. Via psql (if you have Postgres installed):")
print("   psql 'postgresql://postgres.[PROJECT_REF]@aws-0-[REGION].pooler.supabase.com:6543/postgres'")
print("   Then paste the SQL from supabase/setup_rls.sql")
print("\nFor now, please use Option 1 (Dashboard).")
