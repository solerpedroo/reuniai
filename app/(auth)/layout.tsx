import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-canvas grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <AuthBrandPanel />
      <div className="relative flex items-center justify-center px-4 py-10 sm:px-8 lg:px-12">
        <div className="auth-grid pointer-events-none absolute inset-0 opacity-[0.22] lg:hidden" />
        <div className="relative w-full max-w-[440px]">{children}</div>
      </div>
    </div>
  );
}
