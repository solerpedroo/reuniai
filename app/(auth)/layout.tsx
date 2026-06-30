import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AuthLegalFooter } from "@/components/auth/auth-legal-footer";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-canvas grid min-h-screen lg:grid-cols-[minmax(0,1.05fr)_minmax(0,480px)] xl:grid-cols-[minmax(0,1.15fr)_minmax(0,520px)]">
      <AuthBrandPanel />
      <div className="auth-form-column flex min-h-screen flex-col justify-between px-6 py-10 sm:px-10 lg:px-12 lg:py-14 xl:px-16">
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-[400px]">{children}</div>
        </div>
        <div className="mt-10 lg:mt-12">
          <AuthLegalFooter />
        </div>
      </div>
    </div>
  );
}
