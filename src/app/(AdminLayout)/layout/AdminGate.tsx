"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/app/context/authContext";
import { Icon } from "@iconify/react";
import Link from "next/link";

/**
 * AdminGate — Client component that checks if the current user's email
 * is in the admin list. Fetches from /api/admin/check to avoid exposing
 * the admin email list to the client.
 */
const AdminGate = ({ children }: { children: React.ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;

    const checkAdmin = async () => {
      try {
        const res = await fetch("/api/admin/check");
        if (res.ok) {
          const data = await res.json();
          setIsAdmin(data.isAdmin === true);
        } else {
          setIsAdmin(false);
        }
      } catch {
        setIsAdmin(false);
      } finally {
        setChecking(false);
      }
    };

    checkAdmin();
  }, [user, authLoading]);

  if (authLoading || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-herobg dark:bg-dark">
        <div className="text-center animate-fade-in">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-error/20 border-t-error mx-auto mb-4" />
          <p className="text-muted text-sm">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-herobg dark:bg-dark">
        <div className="text-center animate-fade-in max-w-md mx-auto px-6">
          <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center mx-auto mb-6">
            <Icon icon="ph:shield-warning-duotone" height={32} className="text-error" />
          </div>
          <h1 className="text-2xl font-bold text-dark dark:text-white mb-2">
            Access Denied
          </h1>
          <p className="text-muted mb-6">
            You do not have administrator privileges. Please contact support if
            you believe this is an error.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
          >
            <Icon icon="ph:arrow-left-duotone" height={18} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default AdminGate;
