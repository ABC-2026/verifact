// scripts/seed.js
// Seeds 3 mock patients + 1 doctor for local development
// Usage: node scripts/seed.js

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const MOCK_PATIENTS = [
  {
    name: "Ramesh Kumar",
    phone: "+919876543210",
    language_pref: "kn",        // Kannada
    condition_tags: ["diabetes", "hypertension"],
    age: 62,
    allergies: ["penicillin"],
    family_history: { father: "diabetes", mother: "cardiac" },
  },
  {
    name: "Sunita Devi",
    phone: "+919876543211",
    language_pref: "hi",        // Hindi
    condition_tags: ["post_surgery"],
    age: 55,
    allergies: [],
    family_history: {},
  },
  {
    name: "Arun Patel",
    phone: "+919876543212",
    language_pref: "en",
    condition_tags: ["cardiac"],
    age: 70,
    allergies: ["sulfonamides"],
    family_history: { father: "cardiac", sibling: "hypertension" },
  },
];

const MOCK_DOCTOR = {
  name: "Dr. Priya Sharma",
  phone: "+919876500001",
  specialisation: "General Medicine",
};

async function seed() {
  console.log("🌱 Seeding Verifact dev database...\n");

  // Insert patients
  const { data: patients, error: pErr } = await supabase
    .from("patients")
    .upsert(MOCK_PATIENTS, { onConflict: "phone" })
    .select();

  if (pErr) { console.error("❌ Patients:", pErr.message); return; }
  console.log(`✅ ${patients.length} patients seeded`);

  // Insert doctor
  const { data: doctors, error: dErr } = await supabase
    .from("doctors")
    .upsert([MOCK_DOCTOR], { onConflict: "phone" })
    .select();

  if (dErr) { console.error("❌ Doctor:", dErr.message); return; }
  const doctor = doctors[0];
  console.log(`✅ Doctor seeded: ${doctor.name}`);

  // Assign all patients to doctor
  const assignments = patients.map((p) => ({
    doctor_id: doctor.id,
    patient_id: p.id,
  }));

  const { error: aErr } = await supabase
    .from("doctor_patients")
    .upsert(assignments, { onConflict: "doctor_id,patient_id" });

  if (aErr) { console.error("❌ Assignments:", aErr.message); return; }
  console.log(`✅ All patients assigned to ${doctor.name}`);

  // Seed some inventory
  const inventory = [
    { drug_name: "Metformin", generic_name: "Metformin HCl", quantity: 500, unit: "tablets", reorder_threshold: 100, expiry_date: "2026-12-31" },
    { drug_name: "Amlodipine", generic_name: "Amlodipine Besylate", quantity: 80, unit: "tablets", reorder_threshold: 50, expiry_date: "2026-08-15" },
    { drug_name: "Aspirin", generic_name: "Aspirin", quantity: 45, unit: "tablets", reorder_threshold: 50, expiry_date: "2025-11-30" },
  ];

  const { error: iErr } = await supabase.from("inventory").upsert(inventory, { onConflict: "drug_name" });
  if (iErr) { console.error("❌ Inventory:", iErr.message); return; }
  console.log(`✅ ${inventory.length} inventory items seeded (1 below threshold)`);

  console.log("\n🎉 Seed complete. Ready to demo!\n");
  console.log("Patient phones:", patients.map((p) => `${p.name}: ${p.phone}`).join("\n  "));
}

seed();
