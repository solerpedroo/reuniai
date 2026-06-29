import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  isAuthPath,
  isOnboardingPath,
  isPublicApiPath,
  isPublicPath,
  ONBOARDING_PATH,
} from "@/lib/auth/paths";
import { withSessionCookies } from "@/lib/auth/session-cookies";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

export async function updateSession(request: NextRequest) {
  // Webhooks e crons autenticam-se por segredo próprio — não passam pelo guard de sessão.
  if (isPublicApiPath(request.nextUrl.pathname)) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isAuthPath(pathname) && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    return withSessionCookies(
      supabaseResponse,
      NextResponse.redirect(loginUrl)
    );
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = "/";
    homeUrl.search = "";
    return withSessionCookies(supabaseResponse, NextResponse.redirect(homeUrl));
  }

  if (user && !isAuthPath(pathname)) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    const onboardingDone = profile?.onboarding_completed === true;

    if (!onboardingDone && !isOnboardingPath(pathname)) {
      const onboardingUrl = request.nextUrl.clone();
      onboardingUrl.pathname = ONBOARDING_PATH;
      onboardingUrl.search = "";
      return withSessionCookies(
        supabaseResponse,
        NextResponse.redirect(onboardingUrl)
      );
    }

    if (onboardingDone && isOnboardingPath(pathname)) {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = "/";
      homeUrl.search = "";
      return withSessionCookies(supabaseResponse, NextResponse.redirect(homeUrl));
    }
  }

  return supabaseResponse;
}
