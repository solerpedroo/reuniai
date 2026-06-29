import type { createClient } from "@/lib/supabase/server";
import type { CalendarConnection } from "@/lib/supabase/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export async function getCalendarConnection(
  supabase: Client
): Promise<CalendarConnection | null> {
  const { data, error } = await supabase
    .from("calendar_connections")
    .select("*")
    .eq("provider", "google")
    .maybeSingle();

  if (error) throw error;
  return data;
}
