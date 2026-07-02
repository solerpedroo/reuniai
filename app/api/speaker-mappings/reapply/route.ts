import { NextResponse } from "next/server";
import { reapplySpeakerMappingsToRecentMeetings } from "@/lib/speakers/mappings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const admin = createAdminClient();
  const result = await reapplySpeakerMappingsToRecentMeetings(admin, user.id, 20);

  return NextResponse.json(result);
}
