import React from "react";
import { useCurrentUser, canAccess } from "./useCurrentUser";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";

/**
 * Wraps a page component and requires a minimum role.
 * - Not logged in: redirects to login
 * - Logged in but wrong role: shows "Ingen tilgang"
 */
export default function ProtectedRoute({ children, requiredRole = "user" }) {
  const { user, role, loading } = useCurrentUser();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  if (!user) {
    // Redirect to login, come back after
    const next = window.location.pathname;
    base44.auth.redirectToLogin(next);
    return null;
  }

  if (!canAccess(role, requiredRole)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6">
        <div className="text-4xl">🚫</div>
        <h1 className="text-2xl font-bold text-slate-800">Ingen tilgang</h1>
        <p className="text-slate-500 text-center">
          Du har ikke tilgang til denne siden. Krever rolle: <strong>{requiredRole}</strong>.
        </p>
        <a
          href={createPageUrl("Dashboard")}
          className="mt-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          Tilbake til oversikt
        </a>
      </div>
    );
  }

  return children;
}