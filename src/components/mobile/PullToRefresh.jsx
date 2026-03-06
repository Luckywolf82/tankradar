import React, { useRef, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw } from "lucide-react";

/**
 * PullToRefresh Component
 * Controlled pull-to-refresh for mobile data pages.
 * 
 * Usage:
 * <PullToRefresh onRefresh={loadData} isLoading={loading}>
 *   <YourContent />
 * </PullToRefresh>
 */
export function PullToRefresh({ children, onRefresh, isLoading }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef(null);

  const handleTouchStart = (e) => {
    const scrollElement = containerRef.current;
    if (scrollElement && scrollElement.scrollTop === 0) {
      startY.current = e.touches[0].clientY;
    } else {
      startY.current = null;
    }
  };

  const handleTouchMove = (e) => {
    if (startY.current === null) return;

    const currentY = e.touches[0].clientY;
    const distance = currentY - startY.current;

    if (distance > 0) {
      setPullDistance(Math.min(distance, 120));
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 60 && !isRefreshing) {
      setIsRefreshing(true);
      setPullDistance(0);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    } else {
      setPullDistance(0);
    }
    startY.current = null;
  };

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute top-0 left-0 right-0 flex justify-center items-center h-12 overflow-hidden"
        style={{ y: -50 + pullDistance * 0.5 }}
        initial={false}
      >
        <motion.div
          animate={{
            rotate: isRefreshing ? 360 : (pullDistance / 120) * 180,
          }}
          transition={{ type: "tween", duration: isRefreshing ? 1 : 0 }}
          className="flex items-center justify-center"
        >
          <RefreshCw size={18} className={isRefreshing ? "text-blue-600" : "text-slate-400"} />
        </motion.div>
      </motion.div>

      {/* Content */}
      <motion.div
        style={{ y: pullDistance * 0.5 }}
        initial={false}
      >
        {children}
      </motion.div>
    </div>
  );
}