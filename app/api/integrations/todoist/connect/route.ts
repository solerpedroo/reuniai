import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { buildTodoistAuthUrl } from "@/lib/task-sync/todoist";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  try {
    const redirectUri = new URL("/api/integrations/todoist/callback", request.url).toString();
    const state = randomBytes(16).toString("hex");
    const response = NextResponse.redirect(buildTodoistAuthUrl(redirectUri, state));
    response.cookies.set("todoist_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    return response;
  } catch (err) {
    console.error("Todoist connect:", err);
    const url = new URL("/configuracoes", request.url);
    url.searchParams.set("todoist", "error");
    return NextResponse.redirect(url);
  }
}
