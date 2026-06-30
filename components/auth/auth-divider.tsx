export function AuthDivider({ label = "ou continue com e-mail" }: { label?: string }) {
  return (
    <div className="relative py-1">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-border/80" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-background/80 px-3 text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground backdrop-blur-sm">
          {label}
        </span>
      </div>
    </div>
  );
}
