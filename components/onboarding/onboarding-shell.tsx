"use client";

import { motion } from "motion/react";
import { ReuniaiLogo } from "@/components/brand/reuniai-logo";
import { cn } from "@/lib/utils";

type OnboardingShellProps = {
  title: string;
  description: string;
  badge: string;
  step: number;
  totalSteps: number;
  children: React.ReactNode;
  footer: React.ReactNode;
  className?: string;
};

export function OnboardingShell({
  title,
  description,
  badge,
  step,
  totalSteps,
  children,
  footer,
  className,
}: OnboardingShellProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={cn("w-full max-w-[480px]", className)}
    >
      <div className="auth-glass surface-elevated overflow-hidden rounded-2xl border border-border/60 p-6 sm:p-8">
        <div className="mb-8 space-y-5">
          <ReuniaiLogo compact />

          <div className="space-y-3">
            <div className="flex gap-2">
              {Array.from({ length: totalSteps }, (_, index) => (
                <div
                  key={index}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors duration-300",
                    index <= step ? "bg-brand" : "bg-border"
                  )}
                />
              ))}
            </div>

            <div className="space-y-2">
              <p className="label-caps text-brand">{badge}</p>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.65rem]">
                {title}
              </h1>
              <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">{children}</div>

        <div className="mt-8 border-t border-border/60 pt-6">{footer}</div>
      </div>
    </motion.div>
  );
}
