"use client";

import { motion } from "motion/react";
import { ReuniaiLogo } from "@/components/brand/reuniai-logo";
import { AuthProductPreview } from "@/components/auth/auth-product-preview";
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn("w-full", className)}
    >
      <div className="mb-8 lg:hidden">
        <ReuniaiLogo compact className="mb-6" />
        <AuthProductPreview compact />
      </div>

      <div className="mb-8 space-y-3">
        {badge && (
          <p className="inline-flex rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {badge}
          </p>
        )}
        <h1 className="text-[1.75rem] font-semibold tracking-[-0.03em] text-foreground">
          {title}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>

      <div className="space-y-5">{children}</div>

      {footer && (
        <div className="mt-10 border-t border-border/60 pt-6 text-center text-sm text-muted-foreground">
          {footer}
        </div>
      )}
    </motion.div>
  );
}
