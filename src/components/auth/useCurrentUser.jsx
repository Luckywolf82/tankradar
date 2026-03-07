import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Hook to get the current user and their role.
 * Returns { user, role, loading }
 * role is one of: "guest", "user", "curator", "admin"
 */
export function useCurrentUser() {
  const [user, setUser] = useState(undefined); // undefined = loading
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.me()
      .then(u => {
        setUser(u);
        setLoading(false);
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });
  }, []);

  const role = !user ? "guest" : (user.role || "user");

  return { user, role, loading };
}

export function canAccess(role, required) {
  const hierarchy = ["guest", "user", "curator", "admin"];
  return hierarchy.indexOf(role) >= hierarchy.indexOf(required);
}