// A3 — Inventory Management
// Owner: Dev C
// Endpoints:
//   GET    /functions/v1/inventory           — list all stock
//   POST   /functions/v1/inventory           — add/update stock item
//   POST   /functions/v1/inventory/dispense  — deduct on prescription dispense
//   POST   /functions/v1/inventory/suggest   — AI reorder quantity suggestion (60d+ data)
//   GET    /functions/v1/inventory/expiring  — items expiring within 30 days

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const TWILIO_API = "https://api.twilio.com/2010-04-01";

serve(async (req) => {
  const url = new URL(req.url);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // GET /inventory — list stock
  if (req.method === "GET" && !url.pathname.includes("/expiring")) {
    const { data } = await supabase
      .from("inventory")
      .select("*")
      .order("drug_name");
    return json({ inventory: data });
  }

  // GET /inventory/expiring — drugs expiring in 30 days
  if (req.method === "GET" && url.pathname.includes("/expiring")) {
    const thirtyDaysAhead = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const { data } = await supabase
      .from("inventory")
      .select("*")
      .lte("expiry_date", thirtyDaysAhead)
      .gt("quantity", 0)
      .order("expiry_date");
    return json({ expiring: data });
  }

  const body = await req.json();

  // POST /inventory/dispense — deduct stock when prescription is dispensed
  if (url.pathname.includes("/dispense")) {
    const { prescriptionId, adminId } = body;

    const { data: prescription } = await supabase
      .from("prescriptions")
      .select("drugs")
      .eq("id", prescriptionId)
      .single();

    const drugs = prescription?.drugs || [];
    const logEntries: any[] = [];

    for (const drug of drugs) {
      // Match drug name (case-insensitive)
      const { data: stockItems } = await supabase
        .from("inventory")
        .select("id, quantity, reorder_threshold, drug_name")
        .ilike("drug_name", `%${drug.name}%`)
        .limit(1);

      const item = stockItems?.[0];
      if (!item) continue;

      // Parse quantity from dosage (e.g. "500mg x 2 tablets x 7 days" = 14)
      const qty = estimateDispenseQty(drug);
      const newQty = Math.max(0, item.quantity - qty);

      await supabase
        .from("inventory")
        .update({ quantity: newQty, last_updated: new Date().toISOString() })
        .eq("id", item.id);

      logEntries.push({
        drug_id: item.id,
        quantity_deducted: qty,
        prescription_id: prescriptionId,
        admin_id: adminId,
      });

      // Low stock alert
      if (newQty < item.reorder_threshold) {
        await triggerLowStockAlert(supabase, item.drug_name, newQty, item.reorder_threshold);
      }
    }

    await supabase.from("inventory_log").insert(logEntries);

    // Mark prescription as dispensed
    await supabase
      .from("prescriptions")
      .update({ status: "dispensed" })
      .eq("id", prescriptionId);

    return json({ dispensed: logEntries.length });
  }

  // POST /inventory/suggest — AI reorder quantity suggestion
  if (url.pathname.includes("/suggest")) {
    const { drugId } = body;
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    const [logRes, stockRes] = await Promise.all([
      supabase
        .from("inventory_log")
        .select("quantity_deducted, timestamp")
        .eq("drug_id", drugId)
        .gte("timestamp", sixtyDaysAgo),
      supabase.from("inventory").select("drug_name, quantity").eq("id", drugId).single(),
    ]);

    const totalDispensed = (logRes.data || []).reduce(
      (acc: number, row: any) => acc + row.quantity_deducted, 0
    );
    const monthlyAvg = totalDispensed / 2; // 60 days = 2 months

    const groqRes = await fetch(GROQ_API_URL, {
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
            content: `You are a pharmacy inventory assistant. Suggest an optimal reorder quantity.
Return ONLY JSON: { "suggestedQty": number, "reasoning": string }`,
          },
          {
            role: "user",
            content: `Drug: ${stockRes.data?.drug_name}, Current stock: ${stockRes.data?.quantity},
Monthly avg dispensed: ${Math.round(monthlyAvg)}, Buffer target: 3 weeks`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    const groqData = await groqRes.json();
    const suggestion = JSON.parse(groqData.choices[0].message.content);

    await supabase
      .from("inventory")
      .update({ suggested_order_qty: suggestion.suggestedQty })
      .eq("id", drugId);

    return json({ suggestion });
  }

  // POST /inventory — add or update stock item
  const { id, ...fields } = body;
  if (id) {
    const { data } = await supabase
      .from("inventory")
      .update({ ...fields, last_updated: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    return json({ item: data });
  }

  const { data } = await supabase.from("inventory").insert(fields).select().single();
  return json({ item: data });
});

async function triggerLowStockAlert(
  supabase: any,
  drugName: string,
  qty: number,
  threshold: number
) {
  // In-app notification
  await supabase.from("notifications").insert({
    recipient_type: "admin",
    message: `Low stock: ${drugName} — ${qty} remaining (threshold: ${threshold}). Reorder needed.`,
    channel: "in_app",
  });

  // WhatsApp alert (admin phone from env)
  const adminPhone = Deno.env.get("ADMIN_PHONE");
  if (adminPhone) {
    const body = new URLSearchParams({
      From: Deno.env.get("TWILIO_WHATSAPP_FROM")!,
      To: `whatsapp:${adminPhone}`,
      Body: `⚠️ Low stock alert: ${drugName} is down to ${qty} units (reorder threshold: ${threshold})`,
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
}

function estimateDispenseQty(drug: any): number {
  // Parse "Twice daily x 7 days" → 14 tablets
  const freq = drug.frequency?.toLowerCase() || "";
  const dur = drug.duration?.toLowerCase() || "";

  const timesPerDay = freq.includes("twice") || freq.includes("bd") ? 2
    : freq.includes("three") || freq.includes("tds") ? 3
    : freq.includes("four") || freq.includes("qid") ? 4
    : 1;

  const daysMatch = dur.match(/(\d+)\s*day/);
  const days = daysMatch ? parseInt(daysMatch[1]) : 7; // default 7 days

  return timesPerDay * days;
}

function json(data: any) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}
