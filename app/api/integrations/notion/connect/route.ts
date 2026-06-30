import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { buildNotionAuthUrl } from "@/lib/notion/oauth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const redirectUri = new URL("/api/integrations/notion/callback", request.url).toString();
  const state = randomBytes(16).toString("hex");
  const response = NextResponse.redirect(buildNotionAuthUrl(redirectUri, state));
  response.cookies.set("notion_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
  return response;
}
