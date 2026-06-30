import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-canvas grid min-h-screen lg:grid-cols-2">
      <AuthBrandPanel />
      <div className="flex items-center justify-center px-6 py-12 sm:px-10 lg:px-16 xl:px-20">
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  );
}
