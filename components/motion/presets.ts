"use client";

import { motion, type Variants } from "motion/react";

export const easePremium = [0.22, 1, 0.36, 1] as const;

/** Tokens de motion padronizados para toda a UI. */
export const MOTION = {
  duration: {
    fast: 0.2,
    base: 0.32,
    slow: 0.45,
  },
  stagger: 0.06,
  delayChildren: 0.04,
  spring: {
    bounce: 0.12,
    duration: 0.45,
  },
} as const;

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: MOTION.duration.slow, ease: easePremium },
  },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: MOTION.duration.base, ease: easePremium } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: MOTION.duration.base, ease: easePremium },
  },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: MOTION.stagger,
      delayChildren: MOTION.delayChildren,
    },
  },
};

export { motion };
