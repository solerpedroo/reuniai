import type { createClient } from "@/lib/supabase/server";
import type { CalendarConnection, CalendarProvider } from "@/lib/supabase/types";

type Client = Awaited<ReturnType<typeof createClient>>;

export async function getCalendarConnection(
  supabase: Client,
  provider: CalendarProvider = "google"
): Promise<CalendarConnection | null> {
  const { data, error } = await supabase
    .from("calendar_connections")
    .select("*")
    .eq("provider", provider)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getCalendarConnections(
  supabase: Client
): Promise<CalendarConnection[]> {
  const { data, error } = await supabase.from("calendar_connections").select("*");

  if (error) throw error;
  return data ?? [];
}
