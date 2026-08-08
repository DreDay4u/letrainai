"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <>{children}</>;
  }

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.main>
  );
}
