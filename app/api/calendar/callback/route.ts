import { NextResponse, type NextRequest } from "next/server";
import {
  exchangeCodeForTokens,
  getGoogleEmail,
  syncCalendarConnection,
} from "@/lib/calendar/google";
import { encryptToken } from "@/lib/crypto/token-encrypt";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function settingsRedirect(request: NextRequest, status: string) {
  const url = new URL("/configuracoes", request.url);
  url.searchParams.set("calendar", status);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code) {
    return settingsRedirect(request, "error");
  }

  const expectedState = request.cookies.get("calendar_oauth_state")?.value;
  if (!expectedState || expectedState !== state) {
    return settingsRedirect(request, "error");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const redirectUri = new URL("/api/calendar/callback", request.url).toString();
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    if (!tokens.refresh_token) {
      // Sem refresh token não conseguimos sincronizar depois.
      return settingsRedirect(request, "no_refresh");
    }

    const email = await getGoogleEmail(tokens.access_token);
    const admin = createAdminClient();

    // Garante uma única conexão Google por usuário.
    await admin
      .from("calendar_connections")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", "google");

    const { data: connection, error: insertError } = await admin
      .from("calendar_connections")
      .insert({
        user_id: user.id,
        provider: "google",
        email,
        refresh_token_encrypted: encryptToken(tokens.refresh_token),
      })
      .select("id")
      .single();

    if (insertError || !connection) {
      throw insertError ?? new Error("Falha ao salvar conexão de calendário.");
    }

    await syncCalendarConnection(admin, {
      userId: user.id,
      connectionId: connection.id,
      refreshTokenEncrypted: encryptToken(tokens.refresh_token),
    });

    const response = settingsRedirect(request, "connected");
    response.cookies.delete("calendar_oauth_state");
    return response;
  } catch (err) {
    console.error("Erro no callback do Google Calendar:", err);
    return settingsRedirect(request, "error");
  }
}
