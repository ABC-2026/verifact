import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export interface Doctor { id: string; name: string; phone: string | null; }

export function useCurrentDoctor() {
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("doctors").select("id, name, phone").limit(1).maybeSingle();
      if (data) setDoctor({ id: data.id, name: data.name, phone: data.phone });
    })();
  }, []);
  return doctor;
}
