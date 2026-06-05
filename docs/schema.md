# Verifact — Database Schema

All tables live in Supabase (Postgres). RLS is enabled on every table.

## Tables

| Table | Purpose | Owner |
|-------|---------|-------|
| `patients` | Core patient record | Dev D |
| `doctors` | Doctor profiles | Dev D |
| `doctor_patients` | Assignment junction | Dev D |
| `voice_notes` | P3 check-in transcripts + extracted data | Dev A |
| `triage_results` | P3 triage output per note | Dev A |
| `prescriptions` | P2 + D3 prescriptions | Dev A / Dev B |
| `reminders` | P2 medication schedule | Dev A |
| `insurance_policies` | P4 policy JSON | Dev A |
| `vitals` | A2 vitals per visit | Dev C |
| `inventory` | A3 drug stock | Dev C |
| `inventory_log` | A3 dispense audit trail | Dev C |
| `care_circles` | P5 family/caregiver access | Dev A |
| `patient_baselines` | D4 30-day behaviour baseline | Dev B |
| `notifications` | All channels (in-app + WhatsApp) | Dev D |
| `priority_scores` | A1 live urgency scores | Dev C |

## Key JSONB fields

### `voice_notes.extracted_data`
```json
{
  "symptoms": ["headache", "dizziness"],
  "vitals": { "bp": "148/92", "temp": 98.6, "glucose": 220 },
  "medications_status": [{ "name": "Metformin", "taken": true }],
  "mood": "poor",
  "activity": "mostly resting",
  "red_flags": ["headache persisting for 3 days"],
  "confidence": 0.87
}
```

### `prescriptions.drugs`
```json
[
  {
    "name": "Metformin",
    "dosage": "500mg",
    "frequency": "Twice daily",
    "duration": "30 days",
    "translated_name": "ಮೆಟ್‌ಫಾರ್ಮಿನ್",
    "explanation": "Helps your body use sugar better",
    "avoid": ["alcohol", "heavy meals"]
  }
]
```

### `insurance_policies.policy_json`
```json
{
  "sum_insured": 500000,
  "sub_limits": { "daycare": 100000, "icu": 200000 },
  "exclusions": ["pre-existing for 2 years", "dental"],
  "copay_terms": "10% for non-network hospitals",
  "waiting_period_days": 30
}
```

## RLS Summary

| Table | Patient | Doctor | Admin |
|-------|---------|--------|-------|
| patients | own row | assigned | all |
| voice_notes | own | assigned patients | all |
| triage_results | — | assigned patients | all |
| prescriptions | own | assigned (r/w) | read |
| insurance_policies | own (r/w) | — | — |
| vitals | — | assigned | r/w |
| inventory | — | read | r/w |
| care_circles | own | — | — |
| notifications | own | own | own |
| priority_scores | — | assigned | r/w |
