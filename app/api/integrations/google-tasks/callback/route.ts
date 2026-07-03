import { NextResponse, type NextRequest } from "next/server";
import { encryptToken } from "@/lib/crypto/token-encrypt";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { exchangeGoogleTasksCode } from "@/lib/task-sync/google-tasks";

export const dynamic = "force-dynamic";

function redirect(request: NextRequest, status: string) {
  const url = new URL("/configuracoes", request.url);
  url.searchParams.set("google_tasks", status);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) return redirect(request, "error");

  const expectedState = request.cookies.get("google_tasks_oauth_state")?.value;
  if (!expectedState || expectedState !== state) return redirect(request, "error");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  try {
    const redirectUri = new URL("/api/integrations/google-tasks/callback", request.url).toString();
    const tokens = await exchangeGoogleTasksCode(code, redirectUri);
    const admin = createAdminClient();

    await admin
      .from("task_sync_connections")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", "google_tasks");

    const { error: insertError } = await admin.from("task_sync_connections").insert({
      user_id: user.id,
      provider: "google_tasks",
      access_token_encrypted: encryptToken(tokens.accessToken),
      refresh_token_encrypted: tokens.refreshToken
        ? encryptToken(tokens.refreshToken)
        : null,
      external_account_label: "Google Tasks",
      enabled: true,
    });

    if (insertError) throw insertError;

    const response = redirect(request, "connected");
    response.cookies.delete("google_tasks_oauth_state");
    return response;
  } catch (err) {
    console.error("Google Tasks callback:", err);
    return redirect(request, "error");
  }
}
