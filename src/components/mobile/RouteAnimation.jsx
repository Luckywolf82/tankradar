import React from "react";
import { motion } from "framer-motion";

/**
 * RouteAnimation Wrapper
 * Applies slide animation on mobile only for main shell routes.
 * Desktop: no animation
 * Mobile: slides in from right on route change
 */
export function RouteAnimation({ children, pageName }) {
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <motion.div
      key={pageName}
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}