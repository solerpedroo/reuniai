/** Rotas públicas (sem sessão obrigatória). */
export const AUTH_PATHS = ["/login", "/signup"] as const;

export const AUTH_PREFIX = "/auth";

export const ONBOARDING_PATH = "/onboarding";

/** Páginas públicas (acessíveis sem sessão). */
export const PUBLIC_PATHS = ["/recording-notice", "/privacidade", "/termos"] as const;

/** Prefixos de rotas públicas (ex.: links de compartilhamento `/s/[token]`, clips `/c/[token]`). */
export const PUBLIC_PATH_PREFIXES = ["/s", "/c"] as const;

/** Prefixos de API que se autenticam por conta própria (segredo), sem sessão. */
export const PUBLIC_API_PREFIXES = ["/api/webhooks", "/api/cron"] as const;

export function isAuthPath(pathname: string): boolean {
  return (
    AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    pathname.startsWith(AUTH_PREFIX)
  );
}

export function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) ||
    PUBLIC_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  );
}

export function isPublicApiPath(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function isOnboardingPath(pathname: string): boolean {
  return pathname === ONBOARDING_PATH || pathname.startsWith(`${ONBOARDING_PATH}/`);
}
