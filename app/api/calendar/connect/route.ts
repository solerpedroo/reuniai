import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { buildGoogleAuthUrl } from "@/lib/calendar/google";
import { buildOutlookAuthUrl } from "@/lib/calendar/outlook";
import type { CalendarProvider } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function resolveProvider(value: string | null): CalendarProvider {
  return value === "outlook" ? "outlook" : "google";
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const provider = resolveProvider(request.nextUrl.searchParams.get("provider"));
  const redirectUri = new URL("/api/calendar/callback", request.url).toString();
  const state = randomBytes(16).toString("hex");
  const authUrl =
    provider === "outlook"
      ? buildOutlookAuthUrl(redirectUri, state)
      : buildGoogleAuthUrl(redirectUri, state);

  const response = NextResponse.redirect(authUrl);
  response.cookies.set("calendar_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  response.cookies.set("calendar_oauth_provider", provider, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
