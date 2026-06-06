(async () => {
  try {
    const url = "https://rngbrpitkkhplfwfmrym.supabase.co/rest/v1/patients?select=*,priority_scores(*)";
    const headers = {
      apikey: "sb_publishable_Eu-RCLE4ZNiTFRyJdoLpjQ_Eofr8p79",
      Authorization: "Bearer sb_publishable_Eu-RCLE4ZNiTFRyJdoLpjQ_Eofr8p79",
      Accept: "application/json"
    };
    const res = await fetch(url, { headers });
    console.log('patients fetch status', res.status);
    const json = await res.json();
    // sort descending by priority_scores[0].score when present
    json.sort((a, b) => {
      const as = (a.priority_scores && a.priority_scores[0] && a.priority_scores[0].score) || 0;
      const bs = (b.priority_scores && b.priority_scores[0] && b.priority_scores[0].score) || 0;
      return bs - as;
    });
    console.log(JSON.stringify(json, null, 2));

    // check doctors
    const dres = await fetch("https://rngbrpitkkhplfwfmrym.supabase.co/rest/v1/doctors?select=*",{ headers });
    console.log('doctors fetch status', dres.status);
    console.log(await dres.text());
  } catch (e) {
    console.error('ERROR', e);
    process.exit(1);
  }
})();
