"use client";

import { motion } from "motion/react";
import { fadeUp } from "@/components/motion/presets";

type PageHeaderProps = {
  title: string;
  description?: string;
  meta?: string;
  actions?: React.ReactNode;
};

export function PageHeader({ title, description, meta, actions }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-border/80 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="min-w-0 space-y-2"
      >
        {meta && (
          <p className="label-caps">
            <span className="mr-2 inline-block h-px w-6 align-middle bg-brand/40" />
            {meta}
          </p>
        )}
        <h1 className="text-2xl font-semibold tracking-tight sm:text-[1.875rem] sm:leading-tight">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </motion.div>
      {actions && (
        <motion.div
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
          className="flex shrink-0 items-center gap-2"
        >
          {actions}
        </motion.div>
      )}
    </div>
  );
}
