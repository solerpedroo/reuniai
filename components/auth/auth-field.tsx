"use client";

import type { Icon } from "@phosphor-icons/react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type AuthFieldProps = {
  id: string;
  label: string;
  hint?: string;
  icon?: Icon;
  error?: string;
  children: React.ReactNode;
  className?: string;
};

export function AuthField({ id, label, hint, icon: Icon, error, children, className }: AuthFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-[13px] font-medium text-foreground">
          {label}
        </Label>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      <div className="relative">
        {Icon && (
          <Icon
            size={18}
            className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
        )}
        <div className={cn(Icon && "[&_input]:pl-10 [&_[role=combobox]]:pl-10")}>{children}</div>
      </div>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
