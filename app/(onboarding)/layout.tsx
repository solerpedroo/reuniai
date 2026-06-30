export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-canvas min-h-screen">
      <div className="auth-grid pointer-events-none fixed inset-0 opacity-[0.18] lg:hidden" />
      {children}
    </div>
  );
}
