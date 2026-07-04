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
    <div className="mb-6 flex flex-col gap-4 border-b border-border/80 pb-5 sm:mb-8 sm:pb-6 lg:flex-row lg:items-end lg:justify-between">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="min-w-0 space-y-1.5 sm:space-y-2"
      >
        {meta && (
          <p className="label-caps">
            <span className="mr-2 inline-block h-px w-6 align-middle bg-brand/40" />
            {meta}
          </p>
        )}
        <h1 className="text-display text-2xl font-semibold leading-tight sm:text-3xl lg:text-[2rem]">
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
          className="-mx-3 w-[calc(100%+1.5rem)] overflow-x-auto px-3 scrollbar-none sm:mx-0 sm:w-auto sm:overflow-visible sm:px-0"
        >
          <div className="flex w-max min-w-full items-center gap-2 sm:w-auto sm:min-w-0 sm:flex-wrap">
            {actions}
          </div>
        </motion.div>
      )}
    </div>
  );
}
