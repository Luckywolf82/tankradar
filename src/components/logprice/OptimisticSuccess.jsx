import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

/**
 * OptimisticSuccess Overlay
 * Shows immediate success feedback while API call runs in background.
 * If API fails, shows error and allows retry/reset.
 */
export function OptimisticSuccess({ 
  show, 
  isLoading, 
  error, 
  onReset,
  onDismiss 
}) {
  const [displayMode, setDisplayMode] = useState("success");

  useEffect(() => {
    if (error) {
      setDisplayMode("error");
    } else if (!isLoading) {
      setDisplayMode("success");
    }
  }, [error, isLoading]);

  if (!show) return null;

  return (
    <motion.div
      className="fixed inset-0 bg-black/20 flex items-center justify-center p-4 z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="max-w-sm w-full shadow-xl">
          <CardContent className="pt-10 pb-8 text-center">
            {displayMode === "success" && (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mb-4"
                >
                  <CheckCircle className="mx-auto text-green-500" size={56} />
                </motion.div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Takk for bidraget!</h2>
                <p className="text-slate-500 mb-6">Prisene er lagret og hjelper andre norske bilister.</p>
                {isLoading && (
                  <p className="text-xs text-slate-400 mb-4">Sender data...</p>
                )}
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={() => {
                    onReset?.();
                    onDismiss?.();
                  }}>
                    Logg en til
                  </Button>
                  <Link to={createPageUrl("Dashboard")}>
                    <Button className="bg-blue-600 hover:bg-blue-700">Se statistikk</Button>
                  </Link>
                </div>
              </>
            )}

            {displayMode === "error" && (
              <>
                <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
                <h2 className="text-xl font-bold text-slate-800 mb-2">Noe gikk galt</h2>
                <p className="text-slate-500 text-sm mb-6">{error || "Kunne ikke lagre prisene. Prøv igjen."}</p>
                <div className="flex gap-3 justify-center">
                  <Button variant="outline" onClick={onDismiss}>Lukk</Button>
                  <Button className="bg-red-600 hover:bg-red-700" onClick={onReset}>Prøv igjen</Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}