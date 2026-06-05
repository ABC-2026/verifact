// P3 — Daily WhatsApp Voice Check-in
// Owner: Dev A
// Endpoint: POST /functions/v1/whatsapp-checkin  (Twilio webhook)
//           POST /functions/v1/whatsapp-checkin/send-prompts  (cron trigger)
//
// Full pipeline: Twilio incoming media → Whisper transcription
//                → Groq extraction → Groq triage → Twilio reply

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_WHISPER_URL = "https://api.groq.com/openai/v1/audio/transcriptions";
const TWILIO_API = "https://api.twilio.com/2010-04-01";

// Condition → morning prompt mapping
const PROMPT_TEMPLATES: Record<string, string> = {
  diabetes: "Good morning! How were your sugar levels today? Any dizziness or blurred vision?",
  hypertension: "Good morning! Did you take your BP medication? Any headaches or chest discomfort?",
  post_surgery: "Good morning! How is the wound site? Any fever, redness, or unusual pain?",
  cardiac: "Good morning! Any chest pain, shortness of breath, or swelling in the legs?",
  default: "Good morning! How are you feeling today? Any symptoms or health concerns to share?",
};

serve(async (req) => {
  const url = new URL(req.url);

  // ── CRON: Send morning prompts ─────────────────────────────────────────────
  if (url.pathname.endsWith("/send-prompts")) {
    return await sendMorningPrompts();
  }

  // ── WEBHOOK: Receive voice reply from patient ──────────────────────────────
  const formData = await req.formData();
  const from = formData.get("From") as string;           // patient's WhatsApp number
  const mediaUrl = formData.get("MediaUrl0") as string;  // audio file URL

  if (!mediaUrl) {
    // Text reply — acknowledge
    return twilioResponse("Got it! Please send a voice note for your check-in.");
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Fetch patient by phone
  const phone = from.replace("whatsapp:", "");
  const { data: patient } = await supabase
    .from("patients")
    .select("id, language_pref, condition_tags")
    .eq("phone", phone)
    .single();

  if (!patient) {
    return twilioResponse("We couldn't find your record. Please contact the clinic.");
  }

  // ── Step 1: Download and transcribe audio ─────────────────────────────────
  const audioRes = await fetch(mediaUrl, {
    headers: {
      "Authorization": `Basic ${btoa(
        `${Deno.env.get("TWILIO_ACCOUNT_SID")}:${Deno.env.get("TWILIO_AUTH_TOKEN")}`
      )}`,
    },
  });
  const audioBuffer = await audioRes.arrayBuffer();

  const formPayload = new FormData();
  formPayload.append("file", new Blob([audioBuffer], { type: "audio/ogg" }), "checkin.ogg");
  formPayload.append("model", "whisper-large-v3");
  // Seed medical vocabulary for accuracy
  formPayload.append("prompt", `Medical check-in. Patient medications: ${patient.condition_tags.join(", ")}`);

  const whisperRes = await fetch(GROQ_WHISPER_URL, {
    method: "POST",
    headers: { "Authorization": `Bearer ${Deno.env.get("GROQ_API_KEY")}` },
    body: formPayload,
  });
  const { text: transcript } = await whisperRes.json();

  // ── Step 2: Extract structured health data ─────────────────────────────────
  const extractRes = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `Extract structured health data from this patient check-in transcript. 
Return ONLY valid JSON matching this schema exactly:
{
  "symptoms": string[],
  "vitals": { "bp": string|null, "temp": number|null, "glucose": number|null },
  "medications_status": [{ "name": string, "taken": boolean }],
  "mood": "good"|"neutral"|"poor",
  "activity": string,
  "red_flags": string[],
  "confidence": number
}`,
        },
        { role: "user", content: transcript },
      ],
      response_format: { type: "json_object" },
    }),
  });

  const extractData = await extractRes.json();
  const extracted = JSON.parse(extractData.choices[0].message.content);

  // Save voice note
  const { data: note } = await supabase
    .from("voice_notes")
    .insert({
      patient_id: patient.id,
      transcript,
      extracted_data: extracted,
    })
    .select()
    .single();

  // ── Step 3: Triage ─────────────────────────────────────────────────────────
  // Rule-based pre-check first (catches critical cases without LLM latency)
  let forcedRed = false;
  const flags = extracted.red_flags || [];
  const criticalKeywords = ["chest pain", "difficulty breathing", "cannot breathe", "unconscious"];
  if (
    criticalKeywords.some((kw) => transcript.toLowerCase().includes(kw)) ||
    flags.length > 2
  ) {
    forcedRed = true;
  }

  let severity: "green" | "amber" | "red" = "green";
  let triageSummary = "";
  let triageReasoning = "";

  if (forcedRed) {
    severity = "red";
    triageSummary = "Critical: immediate clinical review required.";
    triageReasoning = "Rule-based: critical keywords detected in transcript.";
  } else {
    // LLM triage for nuanced classification
    const triageRes = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("GROQ_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are a clinical triage assistant. Classify patient check-in data as:
- green: routine, no action needed
- amber: doctor should review within 24h  
- red: immediate attention needed
Return ONLY JSON: { "severity": "green"|"amber"|"red", "summary": string, "reasoning": string }`,
          },
          { role: "user", content: JSON.stringify(extracted) },
        ],
        response_format: { type: "json_object" },
      }),
    });
    const triageData = await triageRes.json();
    const triage = JSON.parse(triageData.choices[0].message.content);
    severity = triage.severity;
    triageSummary = triage.summary;
    triageReasoning = triage.reasoning;
  }

  // Save triage result
  const { data: triageResult } = await supabase
    .from("triage_results")
    .insert({
      note_id: note.id,
      patient_id: patient.id,
      severity,
      summary: triageSummary,
      reasoning: triageReasoning,
    })
    .select()
    .single();

  // Alert doctor if amber or red
  if (severity !== "green") {
    await alertDoctor(supabase, patient.id, severity, triageSummary);
  }

  // Alert caregivers if amber or red
  if (severity !== "green") {
    await alertCaregivers(supabase, patient.id, severity, triageSummary);
  }

  // Reply to patient
  const patientReply = severity === "red"
    ? "We received your check-in and noticed some concerns. Your doctor has been alerted and will contact you shortly. Please reach out to the clinic if you need immediate help."
    : severity === "amber"
    ? "Thanks for checking in. We've noted your symptoms and your doctor will review them. Take care today!"
    : "Thanks for checking in! Everything looks good. Keep it up and stay healthy!";

  return twilioResponse(patientReply);
});

async function sendMorningPrompts() {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: patients } = await supabase
    .from("patients")
    .select("id, phone, condition_tags, language_pref")
    .eq("monitoring_enrolled", true);

  for (const patient of patients || []) {
    const primaryCondition = patient.condition_tags?.[0] || "default";
    const prompt = PROMPT_TEMPLATES[primaryCondition] || PROMPT_TEMPLATES.default;

    await sendWhatsApp(patient.phone, prompt);
  }

  return new Response(JSON.stringify({ sent: patients?.length }), {
    headers: { "Content-Type": "application/json" },
  });
}

async function alertDoctor(supabase: any, patientId: string, severity: string, summary: string) {
  const { data: assignments } = await supabase
    .from("doctor_patients")
    .select("doctors(phone, name)")
    .eq("patient_id", patientId);

  for (const a of assignments || []) {
    const doctor = a.doctors;
    if (doctor?.phone) {
      await sendWhatsApp(
        doctor.phone,
        `⚠️ Verifact Alert [${severity.toUpperCase()}]: ${summary} — Patient requires attention.`
      );
    }
  }
}

async function alertCaregivers(supabase: any, patientId: string, severity: string, summary: string) {
  const { data: caregivers } = await supabase
    .from("care_circles")
    .select("member_phone")
    .eq("patient_id", patientId)
    .eq("access_level", "caregiver")
    .eq("invite_accepted", true);

  for (const c of caregivers || []) {
    await sendWhatsApp(
      c.member_phone,
      `Verifact update [${severity}]: ${summary}`
    );
  }
}

async function sendWhatsApp(to: string, message: string) {
  const phone = to.startsWith("+") ? `whatsapp:${to}` : `whatsapp:+${to}`;
  const body = new URLSearchParams({
    From: Deno.env.get("TWILIO_WHATSAPP_FROM")!,
    To: phone,
    Body: message,
  });

  await fetch(
    `${TWILIO_API}/Accounts/${Deno.env.get("TWILIO_ACCOUNT_SID")}/Messages.json`,
    {
      method: "POST",
      headers: {
        "Authorization": `Basic ${btoa(
          `${Deno.env.get("TWILIO_ACCOUNT_SID")}:${Deno.env.get("TWILIO_AUTH_TOKEN")}`
        )}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }
  );
}

function twilioResponse(message: string) {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`,
    { headers: { "Content-Type": "text/xml" } }
  );
}
