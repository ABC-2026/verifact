(async () => {
  try {
    const base = "https://rngbrpitkkhplfwfmrym.supabase.co/rest/v1";
    const headers = {
      apikey: "sb_publishable_Eu-RCLE4ZNiTFRyJdoLpjQ_Eofr8p79",
      Authorization: "Bearer sb_publishable_Eu-RCLE4ZNiTFRyJdoLpjQ_Eofr8p79",
      "Content-Type": "application/json",
      Prefer: "return=representation"
    };

    const seeds = [
      { name: "Ravi Kumar", age: 62, phone: "+91 98201 11122", conds: ["Type 2 Diabetes","Hypertension"], score: 92, sev: "high", sum: "Composite risk has risen sharply over the last 14 days driven by uncontrolled fasting glucose (avg 184 mg/dL) and sustained BP elevation (avg 162/98).", reason: "Two self-reported dizziness episodes in the last 72h. Adherence trending down. Recommend tele-consult within 24h and consider medication titration." },
      { name: "Lakshmi Iyer", age: 58, phone: "+91 98765 43210", conds: ["CHF","Diabetes"], score: 88, sev: "high", sum: "CHF exacerbation risk elevated. Weight gain of 1.8 kg over 5 days suggests fluid retention.", reason: "HbA1c trending up. Diuretic adherence inconsistent. Escalate to cardiology review." },
      { name: "Suresh Nair", age: 45, phone: "+91 95440 11003", conds: ["Hypertension"], score: 52, sev: "moderate", sum: "BP within target on most days but morning spikes noted.", reason: "Consider shifting amlodipine to evening dose." }
    ];

    for (const s of seeds) {
      // Insert patient
      const pRes = await fetch(base + "/patients", { method: "POST", headers, body: JSON.stringify({ name: s.name, age: s.age, phone: s.phone, condition_tags: s.conds }) });
      const pJson = await pRes.json();
      const pid = pJson[0]?.id;
      console.log('Inserted patient', s.name, pid);
      if (!pid) continue;

      // Insert priority_score
      const psRes = await fetch(base + "/priority_scores", { method: "POST", headers, body: JSON.stringify({ patient_id: pid, score: s.score }) });
      console.log('Inserted priority score for', s.name, psRes.status);

      // Insert triage_results
      const trRes = await fetch(base + "/triage_results", { method: "POST", headers, body: JSON.stringify({ patient_id: pid, severity: s.sev, summary: s.sum, reasoning: s.reason }) });
      console.log('Inserted triage for', s.name, trRes.status);
    }

    // Create doctor if not exists: try to insert and ignore conflict via upsert
    const docRes = await fetch(base + "/doctors", { method: "POST", headers, body: JSON.stringify({ name: "Dr. Anita Sharma", phone: "+91 98200 00000" }) });
    console.log('Inserted doctor', docRes.status);

    console.log('Seeding complete');
  } catch (e) {
    console.error('ERROR', e);
    process.exit(1);
  }
})();
