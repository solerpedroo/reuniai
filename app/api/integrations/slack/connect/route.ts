import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { buildSlackAuthUrl } from "@/lib/slack/oauth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const redirectUri = new URL("/api/integrations/slack/callback", request.url).toString();
  const state = randomBytes(16).toString("hex");
  const response = NextResponse.redirect(buildSlackAuthUrl(redirectUri, state));
  response.cookies.set("slack_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
