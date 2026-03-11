import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { X, Zap } from "lucide-react";

export default function FirstTimeOverlay() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const checkFirstTime = async () => {
      try {
        const user = await base44.auth.me();
        if (!user) return;

        const prefs = user.firstTimeOverlaySeen || false;
        if (!prefs) setShow(true);
      } catch (err) {
        // User not logged in or error; don't show overlay
      }
    };

    checkFirstTime();
  }, []);

  const handleDismiss = async () => {
    try {
      const user = await base44.auth.me();
      if (user?.id) {
        await base44.auth.updateMe({ firstTimeOverlaySeen: true });
      }
    } catch (err) {
      // Silent fail; just close overlay
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-lg max-w-sm w-full p-6 relative">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
        >
          <X size={20} />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="bg-green-100 rounded-full p-3">
            <Zap size={24} className="text-green-600" />
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-xl font-bold text-slate-900 text-center mb-2">
          Help your community find cheaper fuel
        </h2>

        {/* Description */}
        <p className="text-sm text-slate-600 text-center mb-6">
          Every price you report helps drivers in your area save money. Start by tapping "Logg pris" to report a fuel price.
        </p>

        {/* CTA Button */}
        <Link to={createPageUrl("LogPrice")} className="block mb-3">
          <Button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold">
            Start reporting prices
          </Button>
        </Link>

        {/* Dismiss link */}
        <button
          onClick={handleDismiss}
          className="w-full text-sm text-slate-500 hover:text-slate-700 text-center py-2"
        >
          I'll do this later
        </button>
      </div>
    </div>
  );
}