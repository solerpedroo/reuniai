import { NextResponse, type NextRequest } from "next/server";
import { encryptToken } from "@/lib/crypto/token-encrypt";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { exchangeTodoistCode, fetchTodoistUser } from "@/lib/task-sync/todoist";

export const dynamic = "force-dynamic";

function redirect(request: NextRequest, status: string) {
  const url = new URL("/configuracoes", request.url);
  url.searchParams.set("todoist", status);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) return redirect(request, "error");

  const expectedState = request.cookies.get("todoist_oauth_state")?.value;
  if (!expectedState || expectedState !== state) return redirect(request, "error");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  try {
    const redirectUri = new URL("/api/integrations/todoist/callback", request.url).toString();
    const tokens = await exchangeTodoistCode(code, redirectUri);
    const label = await fetchTodoistUser(tokens.accessToken);
    const admin = createAdminClient();

    await admin.from("task_sync_connections").delete().eq("user_id", user.id).eq("provider", "todoist");

    const { error: insertError } = await admin.from("task_sync_connections").insert({
      user_id: user.id,
      provider: "todoist",
      access_token_encrypted: encryptToken(tokens.accessToken),
      external_account_label: label,
      enabled: true,
    });

    if (insertError) throw insertError;

    const response = redirect(request, "connected");
    response.cookies.delete("todoist_oauth_state");
    return response;
  } catch (err) {
    console.error("Todoist callback:", err);
    return redirect(request, "error");
  }
}
