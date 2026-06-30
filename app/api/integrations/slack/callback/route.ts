import { NextResponse, type NextRequest } from "next/server";
import { exchangeSlackCode } from "@/lib/slack/oauth";
import { encryptToken } from "@/lib/crypto/token-encrypt";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function redirect(request: NextRequest, status: string) {
  const url = new URL("/configuracoes", request.url);
  url.searchParams.set("slack", status);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) return redirect(request, "error");

  const expectedState = request.cookies.get("slack_oauth_state")?.value;
  if (!expectedState || expectedState !== state) return redirect(request, "error");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  try {
    const redirectUri = new URL("/api/integrations/slack/callback", request.url).toString();
    const tokens = await exchangeSlackCode(code, redirectUri);
    const admin = createAdminClient();

    await admin.from("slack_connections").delete().eq("user_id", user.id);

    const { error: insertError } = await admin.from("slack_connections").insert({
      user_id: user.id,
      team_id: tokens.teamId,
      team_name: tokens.teamName,
      channel_id: tokens.channelId,
      channel_name: tokens.channelName,
      bot_token_encrypted: encryptToken(tokens.botToken),
    });

    if (insertError) throw insertError;

    const response = redirect(request, "connected");
    response.cookies.delete("slack_oauth_state");
    return response;
  } catch (err) {
    console.error("Erro no callback Slack:", err);
    return redirect(request, "error");
  }
}
