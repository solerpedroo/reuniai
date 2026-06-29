/** Rotas públicas (sem sessão obrigatória). */
export const AUTH_PATHS = ["/login", "/signup"] as const;

export const AUTH_PREFIX = "/auth";

export const ONBOARDING_PATH = "/onboarding";

export function isAuthPath(pathname: string): boolean {
  return (
    AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith(AUTH_PREFIX)
  );
}

export function isOnboardingPath(pathname: string): boolean {
  return pathname === ONBOARDING_PATH || pathname.startsWith(`${ONBOARDING_PATH}/`);
}
