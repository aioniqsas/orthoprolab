"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

/**
 * Fade + small upward translate when the block enters the viewport.
 * Communicates reading sequence; only opacity/transform are animated and
 * reduced-motion users get the final state instantly.
 *
 * The initial state is the same on server and client on purpose: the SSR HTML
 * carries opacity:0, so rendering a plain div for reduced motion left that
 * inline style behind after hydration and the block never became visible.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={reduce ? { duration: 0 } : { duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
