import { NextResponse, type NextRequest } from "next/server";
import {
  exchangeCodeForTokens,
  getGoogleEmail,
} from "@/lib/calendar/google";
import {
  exchangeOutlookCodeForTokens,
  getOutlookEmail,
} from "@/lib/calendar/outlook";
import { syncCalendarConnectionByProvider } from "@/lib/calendar/sync";
import { encryptToken } from "@/lib/crypto/token-encrypt";
import type { CalendarProvider } from "@/lib/supabase/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function settingsRedirect(request: NextRequest, status: string, provider?: CalendarProvider) {
  const url = new URL("/configuracoes", request.url);
  url.searchParams.set("calendar", status);
  if (provider) url.searchParams.set("provider", provider);
  return NextResponse.redirect(url);
}

function resolveProvider(value: string | undefined): CalendarProvider {
  return value === "outlook" ? "outlook" : "google";
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const provider = resolveProvider(request.cookies.get("calendar_oauth_provider")?.value);

  if (error || !code) {
    return settingsRedirect(request, "error", provider);
  }

  const expectedState = request.cookies.get("calendar_oauth_state")?.value;
  if (!expectedState || expectedState !== state) {
    return settingsRedirect(request, "error", provider);
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
    const admin = createAdminClient();

    let refreshToken: string;
    let email: string;

    if (provider === "outlook") {
      const tokens = await exchangeOutlookCodeForTokens(code, redirectUri);
      if (!tokens.refresh_token) {
        return settingsRedirect(request, "no_refresh", provider);
      }
      refreshToken = tokens.refresh_token;
      email = await getOutlookEmail(tokens.access_token);
    } else {
      const tokens = await exchangeCodeForTokens(code, redirectUri);
      if (!tokens.refresh_token) {
        return settingsRedirect(request, "no_refresh", provider);
      }
      refreshToken = tokens.refresh_token;
      email = await getGoogleEmail(tokens.access_token);
    }

    await admin
      .from("calendar_connections")
      .delete()
      .eq("user_id", user.id)
      .eq("provider", provider);

    const { data: connection, error: insertError } = await admin
      .from("calendar_connections")
      .insert({
        user_id: user.id,
        provider,
        email,
        refresh_token_encrypted: encryptToken(refreshToken),
      })
      .select("id")
      .single();

    if (insertError || !connection) {
      throw insertError ?? new Error("Falha ao salvar conexão de calendário.");
    }

    await syncCalendarConnectionByProvider(admin, {
      userId: user.id,
      connectionId: connection.id,
      refreshTokenEncrypted: encryptToken(refreshToken),
      provider,
    });

    const response = settingsRedirect(request, "connected", provider);
    response.cookies.delete("calendar_oauth_state");
    response.cookies.delete("calendar_oauth_provider");
    return response;
  } catch (err) {
    console.error(`Erro no callback do calendário (${provider}):`, err);
    return settingsRedirect(request, "error", provider);
  }
}
