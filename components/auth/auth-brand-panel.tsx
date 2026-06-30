import { AuthShowcase } from "@/components/auth/auth-showcase";

export function AuthBrandPanel() {
  return (
    <div className="auth-panel relative hidden overflow-hidden lg:block">
      <div className="auth-panel-glow" aria-hidden />
      <AuthShowcase />
    </div>
  );
}
