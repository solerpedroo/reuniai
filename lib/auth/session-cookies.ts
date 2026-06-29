import type { NextResponse } from "next/server";

/** Preserva cookies de sessão Supabase em respostas de redirect. */
export function withSessionCookies(source: NextResponse, target: NextResponse): NextResponse {
  source.cookies.getAll().forEach(({ name, value }) => {
    target.cookies.set(name, value);
  });
  return target;
}
