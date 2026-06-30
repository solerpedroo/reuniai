import { NextResponse, type NextRequest } from "next/server";
import { exchangeNotionCode } from "@/lib/notion/oauth";
import { encryptToken } from "@/lib/crypto/token-encrypt";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function redirect(request: NextRequest, status: string) {
  const url = new URL("/configuracoes", request.url);
  url.searchParams.set("notion", status);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error || !code) return redirect(request, "error");

  const expectedState = request.cookies.get("notion_oauth_state")?.value;
  if (!expectedState || expectedState !== state) return redirect(request, "error");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  try {
    const redirectUri = new URL("/api/integrations/notion/callback", request.url).toString();
    const tokens = await exchangeNotionCode(code, redirectUri);
    const admin = createAdminClient();

    await admin.from("notion_connections").delete().eq("user_id", user.id);

    const { error: insertError } = await admin.from("notion_connections").insert({
      user_id: user.id,
      workspace_id: tokens.workspaceId,
      workspace_name: tokens.workspaceName,
      access_token_encrypted: encryptToken(tokens.accessToken),
    });

    if (insertError) throw insertError;

    const response = redirect(request, "connected");
    response.cookies.delete("notion_oauth_state");
    return response;
  } catch (err) {
    console.error("Erro no callback Notion:", err);
    return redirect(request, "error");
  }
}
