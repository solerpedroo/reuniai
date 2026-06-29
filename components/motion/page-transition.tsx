"use client";

import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { easePremium } from "@/components/motion/presets";

export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.32, ease: easePremium }}
        className="flex-1"
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
