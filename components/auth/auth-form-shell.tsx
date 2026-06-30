"use client";

import { motion } from "motion/react";
import { ReuniaiLogo } from "@/components/brand/reuniai-logo";
import { cn } from "@/lib/utils";

type AuthFormShellProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  badge?: string;
};

export function AuthFormShell({
  title,
  description,
  children,
  footer,
  className,
  badge,
}: AuthFormShellProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn("w-full", className)}
    >
      <div className="auth-glass surface-elevated overflow-hidden rounded-2xl border border-border/60 p-6 sm:p-8">
        <div className="mb-8 space-y-5">
          <ReuniaiLogo compact />
          <div className="space-y-2">
            {badge && (
              <p className="label-caps text-brand">{badge}</p>
            )}
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
              {title}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="space-y-5">{children}</div>

        {footer && (
          <div className="mt-8 border-t border-border/60 pt-5 text-center text-sm text-muted-foreground">
            {footer}
          </div>
        )}
      </div>
    </motion.div>
  );
}
