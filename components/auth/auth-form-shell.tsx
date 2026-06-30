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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={cn("w-full", className)}
    >
      <div className="auth-form-card p-7 sm:p-9">
        <div className="mb-8 space-y-6">
          <ReuniaiLogo compact className="lg:hidden" />
          <div className="space-y-2">
            {badge && (
              <p className="text-xs font-medium tracking-wide text-muted-foreground">{badge}</p>
            )}
            <h1 className="text-[1.625rem] font-semibold tracking-[-0.02em] text-foreground">
              {title}
            </h1>
            <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="space-y-5">{children}</div>

        {footer && (
          <div className="mt-8 border-t border-border/60 pt-6 text-center text-sm text-muted-foreground">
            {footer}
          </div>
        )}
      </div>
    </motion.div>
  );
}
